import { createWorkerApp, startWorker } from "../lib/paywall.js";
import { generate } from "../lib/brain.js";

const PORT = process.env.TRANSLATION_PORT || 4003;

const app = createWorkerApp({
  name: "translation",
  routes: [
    {
      method: "POST",
      path: "/translate",
      priceBaseUnits: 10_000, // 0.01 USDC
      description: "Translation agent: English to Nigerian Pidgin",
    },
  ],
});

app.post("/translate", async (req, res) => {
  const { text } = req.body ?? {};
  if (!text) return res.status(400).json({ error: "missing text" });
  try {
    const translated = await generate(
      `Translate the following English text into natural, fluent Nigerian Pidgin as spoken in Port Harcourt / South-South Nigeria. Keep technical crypto terms (like "wallet", "blockchain", "stablecoin") in English where Pidgin speakers normally would. Preserve the meaning and the friendly educational tone. Output only the translation.

Text:
${text}`,
    );
    res.json({ worker: "translation", translated, at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "translation failed", detail: String(err) });
  }
});

startWorker(app, { name: "translation", port: PORT });
