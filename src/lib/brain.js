import "dotenv/config";
import { execFile } from "node:child_process";

// Worker "brain": Anthropic API when a key is configured, otherwise the
// locally installed claude CLI (headless mode) so development works today.
const MODEL = process.env.WORKER_MODEL || "claude-opus-4-8";

let anthropicClient = null;
async function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

function generateViaCli(prompt) {
  // Strip the Claude Code session marker so the CLI can run as a child process
  const env = { ...process.env };
  delete env.CLAUDECODE;
  return new Promise((resolve, reject) => {
    execFile(
      "claude",
      ["-p", "--output-format", "text", "--model", "opus", prompt],
      { timeout: 300_000, maxBuffer: 10 * 1024 * 1024, env },
      (err, stdout, stderr) => {
        if (err) reject(new Error(`claude CLI failed: ${stderr || err.message}`));
        else resolve(stdout.trim());
      },
    );
  });
}

export async function generate(prompt) {
  if (process.env.STUB_BRAIN === "1") {
    // Structural-testing stand-in — never used in demo or production.
    if (prompt.includes('"verdict"')) {
      return JSON.stringify({ verdict: "pass", issues: [], corrected_draft: prompt.slice(prompt.lastIndexOf("Draft:") + 6).trim() });
    }
    return `[stub output] ${prompt.slice(0, 120)}...`;
  }
  const client = await getAnthropicClient();
  if (client) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      throw new Error("model declined the request");
    }
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
  return generateViaCli(prompt);
}
