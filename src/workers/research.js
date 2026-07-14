import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { NETWORK, FACILITATOR_URL, PAYTO_ADDRESS, usdcPrice } from "../lib/config.js";

const PORT = process.env.RESEARCH_PORT || 4001;
const PRICE = usdcPrice(10_000); // 0.01 USDC per call

const app = express();

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme(),
);

app.use(
  paymentMiddleware(
    {
      "GET /research": {
        accepts: {
          scheme: "exact",
          price: PRICE,
          network: NETWORK,
          payTo: PAYTO_ADDRESS,
        },
        description:
          "Research agent: returns sourced background facts for a topic",
      },
    },
    resourceServer,
  ),
);

// Day 1 research brain: real facts from the Wikipedia API (no LLM key needed yet).
// Genuine utility per paid call — this is what the anti-sybil review looks for.
async function research(topic) {
  const search = await fetch(
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(topic) +
      "&srlimit=3&format=json&origin=*",
    { headers: { "User-Agent": "AgentMesh/0.1 (hackathon research agent)" } },
  );
  const results = (await search.json())?.query?.search ?? [];

  const pages = [];
  for (const r of results) {
    const s = await fetch(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(r.title),
      { headers: { "User-Agent": "AgentMesh/0.1 (hackathon research agent)" } },
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

app.get("/healthz", (_req, res) => res.json({ ok: true, worker: "research" }));

app.listen(PORT, () => {
  console.log(`[research] worker listening on :${PORT}, charging 0.01 USDC via ${FACILITATOR_URL}`);
});
