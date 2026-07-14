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

async function hire(ctx, name, url, options = {}) {
  const started = Date.now();
  ctx.emit({ type: "hiring", worker: name });
  const res = await paidFetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const receiptHeader = res.headers.get("x-payment-response");
  if (receiptHeader) {
    const receipt = JSON.parse(Buffer.from(receiptHeader, "base64").toString("utf8"));
    ctx.receipts.push({ worker: name, ...receipt });
    ctx.emit({ type: "payment", worker: name, tx: receipt.transaction ?? null, receipt });
  }
  if (!res.ok) {
    throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  }
  const out = await res.json();
  ctx.emit({ type: "done", worker: name, seconds: (Date.now() - started) / 1000 });
  return out;
}

export async function runJob(topic, onEvent = () => {}) {
  const ctx = {
    receipts: [],
    emit: (e) => {
      const event = { ...e, at: new Date().toISOString() };
      console.log(`[orchestrator] ${event.type}${event.worker ? ` ${event.worker}` : ""}${event.tx ? ` tx=${event.tx}` : ""}`);
      onEvent(event);
    },
  };
  ctx.emit({ type: "job_start", topic, payer: account.address });

  const research = await hire(
    ctx,
    "research",
    `${WORKERS.research}/research?topic=${encodeURIComponent(topic)}`,
  );

  const draft = await hire(ctx, "copywriting", `${WORKERS.copywriting}/draft`, {
    method: "POST",
    body: JSON.stringify({ topic, facts: research.facts }),
  });

  const check = await hire(ctx, "factcheck", `${WORKERS.factcheck}/factcheck`, {
    method: "POST",
    body: JSON.stringify({ draft: draft.draft, facts: research.facts }),
  });
  const finalEnglish = check.corrected_draft || draft.draft;

  const pidgin = await hire(ctx, "translation", `${WORKERS.translation}/translate`, {
    method: "POST",
    body: JSON.stringify({ text: finalEnglish }),
  });

  const takeaway = finalEnglish.split("\n").filter(Boolean).at(-1) ?? "";
  const card = await hire(ctx, "image", `${WORKERS.image}/card`, {
    method: "POST",
    body: JSON.stringify({ title: topic, takeaway }),
  });

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const dir = path.join("output", `${new Date().toISOString().slice(0, 10)}-${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "post-english.md"), finalEnglish);
  fs.writeFileSync(path.join(dir, "post-pidgin.md"), pidgin.translated);
  fs.writeFileSync(path.join(dir, "card.svg"), card.svg);
  fs.writeFileSync(
    path.join(dir, "job.json"),
    JSON.stringify(
      { topic, factcheck: { verdict: check.verdict, issues: check.issues }, sources: research.facts.map((f) => f.source), payments: ctx.receipts, at: new Date().toISOString() },
      null,
      2,
    ),
  );

  const result = {
    dir,
    payments: ctx.receipts,
    english: finalEnglish,
    pidgin: pidgin.translated,
    svg: card.svg,
    factcheck: { verdict: check.verdict, issues: check.issues },
    sources: research.facts.map((f) => f.source),
  };
  ctx.emit({ type: "job_complete", payments: ctx.receipts.length, dir });
  return result;
}

// CLI usage: node src/orchestrator/index.js "topic"
const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
const topic = process.argv.slice(2).join(" ");
if (isMain && topic) {
  runJob(topic).catch((err) => {
    console.error("[orchestrator] job failed:", err.message ?? err);
    process.exit(1);
  });
}
