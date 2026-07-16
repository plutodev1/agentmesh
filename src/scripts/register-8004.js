import "dotenv/config";
import "../lib/config.js"; // IPv4 fix
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ATTRIBUTION_TAG } from "../lib/config.js";
import { toDataSuffix } from "@celo/attribution-tags";

// ERC-8004 Identity Registry on Celo mainnet (verified via docs.celo.org).
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const AGENT_CARD_URI = "https://raw.githubusercontent.com/plutodev1/agentmesh/main/agent-card.json";

const abi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ type: "string", name: "tokenURI_" }],
    outputs: [{ type: "uint256" }],
  },
];

const account = privateKeyToAccount(process.env.ORCHESTRATOR_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: celo, transport: http() });
const wallet = createWalletClient({ account, chain: celo, transport: http() });

const balance = await publicClient.getBalance({ address: account.address });
console.log(`wallet ${account.address} — CELO balance: ${Number(balance) / 1e18}`);
if (balance === 0n) {
  console.log("No CELO for gas yet. Fund a little CELO (~$0.10 worth) and re-run.");
  process.exit(1);
}

console.log(`registering agent identity with card: ${AGENT_CARD_URI}`);
const { request, result } = await publicClient.simulateContract({
  account,
  address: IDENTITY_REGISTRY,
  abi,
  functionName: "register",
  args: [AGENT_CARD_URI],
  // Attribution tag on our own transactions counts for Track 1 volume.
  dataSuffix: toDataSuffix(ATTRIBUTION_TAG),
});
const hash = await wallet.writeContract(request);
console.log(`tx sent: https://celoscan.io/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`status: ${receipt.status} — agentId: ${result}`);
console.log(`8004scan: https://www.8004scan.io/agents/celo/${result}`);
console.log(`NFT: https://celoscan.io/nft/${IDENTITY_REGISTRY.toLowerCase()}/${result}`);
