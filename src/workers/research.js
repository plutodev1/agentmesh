import { createWorkerApp, startWorker } from "../lib/paywall.js";

const PORT = process.env.RESEARCH_PORT || 4001;

const app = createWorkerApp({
  name: "research",
  routes: [
    {
      method: "GET",
      path: "/research",
      priceBaseUnits: 10_000, // 0.01 USDC
      description: "Research agent: returns sourced background facts for a topic",
    },
  ],
});

// Wikipedia fetches occasionally flake (transient DNS/socket errors) — retry.
async function fetchRetry(url, options, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

// Real facts from the Wikipedia API — genuine utility per paid call.
async function research(topic) {
  const headers = { "User-Agent": "AgentMesh/0.1 (hackathon research agent)" };
  const search = await fetchRetry(
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(topic) +
      "&srlimit=3&format=json&origin=*",
    { headers },
  );
  const results = (await search.json())?.query?.search ?? [];

  const pages = [];
  for (const r of results) {
    const s = await fetchRetry(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(r.title),
      { headers },
    );
    if (!s.ok) continue;
    const page = await s.json();
    pages.push({
      title: page.title,
      summary: page.extract,
      source: page.content_urls?.desktop?.page,
    });
  }
  return pages;
}

app.get("/research", async (req, res) => {
  const topic = req.query.topic;
  if (!topic) return res.status(400).json({ error: "missing ?topic=" });
  try {
    const facts = await research(topic);
    res.json({ worker: "research", topic, facts, at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "research failed", detail: String(err) });
  }
});

startWorker(app, { name: "research", port: PORT });
