import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { NETWORK } from "../lib/config.js";

const account = privateKeyToAccount(process.env.ORCHESTRATOR_PRIVATE_KEY);
const paidFetch =
  process.env.FREE_MODE === "1"
    ? fetch
    : wrapFetchWithPaymentFromConfig(fetch, {
        schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }],
      });

const WORKERS = {
  research: process.env.RESEARCH_URL || "http://localhost:4001",
  copywriting: process.env.COPYWRITING_URL || "http://localhost:4002",
  translation: process.env.TRANSLATION_URL || "http://localhost:4003",
  factcheck: process.env.FACTCHECK_URL || "http://localhost:4004",
  image: process.env.IMAGE_URL || "http://localhost:4005",
};

const receipts = [];

async function hire(name, url, options = {}) {
  const started = Date.now();
  console.log(`[orchestrator] hiring ${name} agent...`);
  const res = await paidFetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const receiptHeader = res.headers.get("x-payment-response");
  let receipt = null;
  if (receiptHeader) {
    receipt = JSON.parse(Buffer.from(receiptHeader, "base64").toString("utf8"));
    receipts.push({ worker: name, ...receipt });
    console.log(`[orchestrator] paid ${name} — settlement tx: ${receipt.transaction ?? "(see receipt)"}`);
  }
  if (!res.ok) {
    throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  }
  const out = await res.json();
  console.log(`[orchestrator] ${name} done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return out;
}

export async function runJob(topic) {
  console.log(`[orchestrator] job start: "${topic}" (payer ${account.address})`);

  const research = await hire(
    "research",
    `${WORKERS.research}/research?topic=${encodeURIComponent(topic)}`,
  );

  const draft = await hire("copywriting", `${WORKERS.copywriting}/draft`, {
    method: "POST",
    body: JSON.stringify({ topic, facts: research.facts }),
  });

  const check = await hire("factcheck", `${WORKERS.factcheck}/factcheck`, {
    method: "POST",
    body: JSON.stringify({ draft: draft.draft, facts: research.facts }),
  });
  const finalEnglish = check.corrected_draft || draft.draft;

  const pidgin = await hire("translation", `${WORKERS.translation}/translate`, {
    method: "POST",
    body: JSON.stringify({ text: finalEnglish }),
  });

  const takeaway = finalEnglish.split("\n").filter(Boolean).at(-1) ?? "";
  const card = await hire("image", `${WORKERS.image}/card`, {
    method: "POST",
    body: JSON.stringify({ title: topic, takeaway }),
  });

  // Save the finished content package
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const dir = path.join("output", `${new Date().toISOString().slice(0, 10)}-${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "post-english.md"), finalEnglish);
  fs.writeFileSync(path.join(dir, "post-pidgin.md"), pidgin.translated);
  fs.writeFileSync(path.join(dir, "card.svg"), card.svg);
  fs.writeFileSync(
    path.join(dir, "job.json"),
    JSON.stringify(
      { topic, factcheck: { verdict: check.verdict, issues: check.issues }, sources: research.facts.map((f) => f.source), payments: receipts, at: new Date().toISOString() },
      null,
      2,
    ),
  );

  console.log(`\n[orchestrator] job complete — ${receipts.length} x402 payments made`);
  console.log(`[orchestrator] output saved to ${dir}/`);
  return { dir, receipts };
}

const topic = process.argv.slice(2).join(" ");
if (topic) {
  runJob(topic).catch((err) => {
    console.error("[orchestrator] job failed:", err.message ?? err);
    process.exit(1);
  });
}
