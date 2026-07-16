import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { runJob } from "../orchestrator/index.js";
import { topicForToday } from "./topics.js";

// Daily production mode: one real content job per day for ChainConnect NG.
// Run via `npm run daily` (cron/scheduled task) — skips if today already ran.
const MARKER_DIR = "output/.daily";
const today = new Date().toISOString().slice(0, 10);
const marker = path.join(MARKER_DIR, today);

if (fs.existsSync(marker)) {
  console.log(`[daily] job for ${today} already completed — nothing to do`);
  process.exit(0);
}

const topic = process.argv.slice(2).join(" ") || topicForToday();
console.log(`[daily] ${today} — producing: "${topic}"`);

try {
  const result = await runJob(topic);
  fs.mkdirSync(MARKER_DIR, { recursive: true });
  fs.writeFileSync(marker, JSON.stringify({ topic, dir: result.dir, payments: result.payments.length }));
  console.log(`[daily] done — ${result.payments.length} x402 payments, content in ${result.dir}/`);
  console.log(`[daily] post it to ChainConnect NG, then it counts as genuine utility for anti-sybil review`);
} catch (err) {
  console.error(`[daily] failed: ${err.message ?? err}`);
  process.exit(1);
}
