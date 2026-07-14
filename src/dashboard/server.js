import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runJob } from "../orchestrator/index.js";
import { ATTRIBUTION_TAG, PAYTO_ADDRESS } from "../lib/config.js";

const PORT = process.env.DASHBOARD_PORT || 4000;
const here = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(here, "public")));

// Server-sent events: every connected browser sees the live job feed.
const clients = new Set();
const history = [];
function broadcast(event) {
  history.push(event);
  if (history.length > 500) history.shift();
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(line);
}

app.get("/api/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  for (const e of history.slice(-100)) res.write(`data: ${JSON.stringify(e)}\n\n`);
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

let busy = false;
app.post("/api/jobs", async (req, res) => {
  const topic = String(req.body?.topic ?? "").trim().slice(0, 140);
  if (!topic) return res.status(400).json({ error: "topic required" });
  if (busy) return res.status(429).json({ error: "a job is already running — watch the feed" });
  busy = true;
  res.json({ ok: true, topic });
  try {
    const result = await runJob(topic, broadcast);
    broadcast({ type: "result", at: new Date().toISOString(), english: result.english, pidgin: result.pidgin, svg: result.svg, factcheck: result.factcheck, sources: result.sources, payments: result.payments });
  } catch (err) {
    broadcast({ type: "job_error", at: new Date().toISOString(), error: String(err.message ?? err) });
  } finally {
    busy = false;
  }
});

app.get("/api/info", (_req, res) =>
  res.json({ attributionTag: ATTRIBUTION_TAG, payTo: PAYTO_ADDRESS, network: "Celo mainnet" }),
);

app.listen(PORT, () => {
  console.log(`[dashboard] live demo at http://localhost:${PORT}`);
});
