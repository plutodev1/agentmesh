import { createWorkerApp, startWorker } from "../lib/paywall.js";

const PORT = process.env.IMAGE_PORT || 4005;

const app = createWorkerApp({
  name: "image",
  routes: [
    {
      method: "POST",
      path: "/card",
      priceBaseUnits: 10_000, // 0.01 USDC
      description: "Image agent: generates a shareable SVG info-card for a post",
    },
  ],
});

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 4);
}

// Deterministic SVG info-card (1080x1080, social-ready) — no LLM needed.
function buildCard({ title, takeaway }) {
  const titleLines = wrapText(title, 26);
  const takeLines = wrapText(takeaway ?? "", 44);
  const titleSvg = titleLines
    .map((l, i) => `<text x="80" y="${300 + i * 78}" font-size="64" font-weight="700" fill="#FFF8F0" font-family="Georgia, serif">${escapeXml(l)}</text>`)
    .join("\n");
  const takeSvg = takeLines
    .map((l, i) => `<text x="80" y="${700 + i * 44}" font-size="30" fill="#FFD9B3" font-family="Verdana, sans-serif">${escapeXml(l)}</text>`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a4731"/>
      <stop offset="1" stop-color="#0b2318"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect x="60" y="60" width="960" height="960" fill="none" stroke="#E07B39" stroke-width="3" rx="24"/>
  <text x="80" y="170" font-size="34" fill="#E07B39" font-weight="600" font-family="Verdana, sans-serif" letter-spacing="4">CHAINCONNECT NG</text>
  ${titleSvg}
  <line x1="80" y1="640" x2="420" y2="640" stroke="#E07B39" stroke-width="4"/>
  ${takeSvg}
  <text x="80" y="990" font-size="26" fill="#9db8a8" font-family="Verdana, sans-serif">Web3 education • Port Harcourt • built by AgentMesh on Celo</text>
</svg>`;
}

app.post("/card", (req, res) => {
  const { title, takeaway } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "missing title" });
  res.json({
    worker: "image",
    svg: buildCard({ title, takeaway }),
    at: new Date().toISOString(),
  });
});

startWorker(app, { name: "image", port: PORT });
