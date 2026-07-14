import { createWorkerApp, startWorker } from "../lib/paywall.js";
import { generate } from "../lib/brain.js";

const PORT = process.env.COPYWRITING_PORT || 4002;

const app = createWorkerApp({
  name: "copywriting",
  routes: [
    {
      method: "POST",
      path: "/draft",
      priceBaseUnits: 20_000, // 0.02 USDC
      description: "Copywriting agent: drafts Web3 education content from research",
    },
  ],
});

app.post("/draft", async (req, res) => {
  const { topic, facts } = req.body ?? {};
  if (!topic) return res.status(400).json({ error: "missing topic" });
  try {
    const draft = await generate(
      `You are the copywriting agent of AgentMesh, producing Web3 education content for ChainConnect NG, a crypto education community in Port Harcourt, Nigeria. Audience: everyday Nigerians curious about crypto, mostly on mobile.

Write a short educational post (200-300 words) about: ${topic}

Ground it in these researched facts (do not invent statistics):
${JSON.stringify(facts ?? [], null, 2)}

Requirements: plain accessible English, concrete local relevance where natural (e.g. mobile money, remittances), a hook first line, and one practical takeaway at the end. Output only the post text.`,
    );
    res.json({ worker: "copywriting", topic, draft, at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "draft failed", detail: String(err) });
  }
});

startWorker(app, { name: "copywriting", port: PORT });
