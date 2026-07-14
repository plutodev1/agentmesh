import "dotenv/config";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { NETWORK } from "../lib/config.js";

const account = privateKeyToAccount(process.env.ORCHESTRATOR_PRIVATE_KEY);

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }],
});

const RESEARCH_URL = process.env.RESEARCH_URL || "http://localhost:4001";

async function hireResearcher(topic) {
  console.log(`[orchestrator] paying wallet: ${account.address}`);
  console.log(`[orchestrator] hiring research worker for topic: "${topic}"`);

  const res = await fetchWithPayment(
    `${RESEARCH_URL}/research?topic=${encodeURIComponent(topic)}`,
  );

  const receipt = res.headers.get("x-payment-response");
  if (receipt) {
    const decoded = JSON.parse(Buffer.from(receipt, "base64").toString("utf8"));
    console.log("[orchestrator] payment settled:", JSON.stringify(decoded, null, 2));
  }
  if (!res.ok) {
    throw new Error(`worker call failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const topic = process.argv.slice(2).join(" ") || "Celo blockchain";
hireResearcher(topic)
  .then((out) => {
    console.log("[orchestrator] worker output:");
    console.log(JSON.stringify(out, null, 2));
  })
  .catch((err) => {
    console.error("[orchestrator] job failed:", err.message ?? err);
    process.exit(1);
  });
