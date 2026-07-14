// Debug helper: build a payment for the worker's 402 terms, then ask the
// facilitator /verify directly so we can see its exact accept/reject reason.
import "dotenv/config";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { NETWORK, FACILITATOR_URL } from "../lib/config.js";

const account = privateKeyToAccount(process.env.ORCHESTRATOR_PRIVATE_KEY);
const RESEARCH_URL = process.env.RESEARCH_URL || "http://localhost:4001";

const res = await fetch(`${RESEARCH_URL}/research?topic=debug`);
const header = res.headers.get("payment-required");
const required = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
console.log("402 terms:", JSON.stringify(required.accepts[0]));

const client = new x402Client().register(NETWORK, new ExactEvmScheme(account));
const payload = await client.createPaymentPayload(required);
console.log("payment payload created, scheme:", payload.scheme ?? "(v2)");

const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    x402Version: 2,
    paymentPayload: payload,
    paymentRequirements: required.accepts[0],
  }),
});
console.log("facilitator /verify status:", verifyRes.status);
console.log("facilitator /verify says:", await verifyRes.text());
