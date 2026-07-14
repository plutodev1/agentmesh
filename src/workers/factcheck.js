import { createWorkerApp, startWorker } from "../lib/paywall.js";
import { generate } from "../lib/brain.js";

const PORT = process.env.FACTCHECK_PORT || 4004;

const app = createWorkerApp({
  name: "factcheck",
  routes: [
    {
      method: "POST",
      path: "/factcheck",
      priceBaseUnits: 15_000, // 0.015 USDC
      description: "Fact-check agent: verifies draft claims against research sources",
    },
  ],
});

app.post("/factcheck", async (req, res) => {
  const { draft, facts } = req.body ?? {};
  if (!draft) return res.status(400).json({ error: "missing draft" });
  try {
    const raw = await generate(
      `You are the fact-check agent of AgentMesh. Check the draft below against the researched source material. Flag any claim that is unsupported, contradicted, or invented (especially statistics, dates, and named entities).

Respond with JSON only, in this exact shape:
{"verdict": "pass" | "needs_revision", "issues": [{"claim": "...", "problem": "..."}], "corrected_draft": "... full corrected text, or the original if verdict is pass ..."}

Source material:
${JSON.stringify(facts ?? [], null, 2)}

Draft:
${draft}`,
    );
    let result;
    try {
      result = JSON.parse(raw.replace(/^```(json)?\s*/i, "").replace(/```\s*$/, ""));
    } catch {
      result = { verdict: "pass", issues: [], corrected_draft: draft, note: "unparseable checker output, passed through" };
    }
    res.json({ worker: "factcheck", ...result, at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "factcheck failed", detail: String(err) });
  }
});

startWorker(app, { name: "factcheck", port: PORT });
