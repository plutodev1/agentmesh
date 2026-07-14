import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { NETWORK, FACILITATOR_URL, PAYTO_ADDRESS, usdcPrice } from "./config.js";

// Shared scaffolding for every worker agent: an Express app whose routes sit
// behind an x402 paywall. FREE_MODE=1 skips the paywall for local logic tests
// only — demo and production always run paid.
export function createWorkerApp({ name, routes }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  if (process.env.FREE_MODE === "1") {
    console.log(`[${name}] FREE_MODE — paywall disabled (local testing only)`);
  } else {
    const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
    const resourceServer = new x402ResourceServer(facilitatorClient).register(
      NETWORK,
      new ExactEvmScheme(),
    );
    const routeConfig = {};
    for (const r of routes) {
      routeConfig[`${r.method} ${r.path}`] = {
        accepts: {
          scheme: "exact",
          price: usdcPrice(r.priceBaseUnits),
          network: NETWORK,
          payTo: PAYTO_ADDRESS,
        },
        description: r.description,
      };
    }
    app.use(paymentMiddleware(routeConfig, resourceServer));
  }

  app.get("/healthz", (_req, res) => res.json({ ok: true, worker: name }));
  return app;
}

export function startWorker(app, { name, port }) {
  app.listen(port, () => {
    console.log(`[${name}] worker listening on :${port}`);
  });
}
