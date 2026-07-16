// Editorial calendar for ChainConnect NG daily production jobs.
// One topic per day, rotating; edit freely — real posts for a real community.
export const TOPICS = [
  "What is a blockchain, explained with a market ledger analogy",
  "How stablecoins protect savings from inflation",
  "What is a crypto wallet and how do seed phrases work",
  "Why you should never share your seed phrase — common scams in Nigeria",
  "How remittances work on crypto rails vs traditional transfers",
  "What is Celo and why was it built for mobile phones",
  "Gas fees explained: why transactions cost money",
  "What is USDC and how is it different from the naira",
  "How to spot a Ponzi scheme dressed as a crypto project",
  "What is DeFi? Banks without buildings, explained",
  "Mobile money vs crypto wallets: what's the difference",
  "What are smart contracts, explained with an agreement analogy",
  "How AI agents can pay each other with stablecoins (x402)",
  "What is an NFT beyond the hype: digital ownership explained",
  "Dollar-cost averaging: a calm way to build crypto savings",
  "What happens when you send crypto to a wrong address",
  "Custodial vs non-custodial wallets: who holds your keys",
  "How exchanges work and what happened with FTX: lessons",
  "What is Web3 and how is it different from the internet today",
  "Crypto and the CBN: the state of regulation in Nigeria",
  "How stablecoin savings circles (ajo/esusu) could work on-chain",
  "What is staking and how does it earn rewards",
  "Layer 2s explained: why Celo is an Ethereum L2",
  "How to verify a transaction yourself on a block explorer",
  "Public and private keys explained with a mailbox analogy",
  "Why decentralization matters: who controls the network",
  "What is tokenization: putting real-world assets on-chain",
  "Airdrops: real ones, fake ones, and how to tell them apart",
  "How merchants can accept stablecoin payments in Nigeria",
  "The future of agentic payments: when your AI runs errands with money",
];

export function topicForToday(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return TOPICS[dayIndex % TOPICS.length];
}
