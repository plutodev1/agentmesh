import "dotenv/config";

// Celo mainnet — the only network the Celo x402 facilitator supports.
export const NETWORK = "eip155:42220";

// Confirmed live 2026-07-14 (hackathon page overrides docs.celo.org here):
// api.x402.celo.org is the facilitator the Track 2 leaderboard counts.
export const FACILITATOR_URL = "https://api.x402.celo.org";

// USDC on Celo mainnet. cUSD/USDm are NOT supported by the facilitator
// (they lack EIP-3009 transferWithAuthorization).
export const USDC = {
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  decimals: 6,
  eip712: { name: "USDC", version: "2" },
};

// Attribution tag assigned at hackathon registration (locked to this repo).
export const ATTRIBUTION_TAG = "celo_266a6aa0aec8";

// Where worker earnings land (registered as agentWalletAddress on the submission).
export const PAYTO_ADDRESS = process.env.PAYTO_ADDRESS;

// AssetAmount shape @x402/evm expects: asset as plain address, EIP-712
// signing domain in `extra` (the paying client reads extra.name/version).
export function usdcPrice(amountBaseUnits) {
  return {
    amount: String(amountBaseUnits),
    asset: USDC.address,
    extra: { name: USDC.eip712.name, version: USDC.eip712.version },
  };
}
