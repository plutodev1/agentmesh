# AgentMesh

A small network of specialist AI **worker agents**, each gated behind an
[x402](https://docs.celo.org/build-on-celo/build-with-ai/x402) micropayment
paywall on **Celo mainnet**, coordinated by an **orchestrator agent** that
hires and pays workers in real time to complete a content job.

Built for the [Celo Agentic Payments & DeFAI Hackathon](https://celobuilders.xyz)
(July 7 – August 3, 2026). Attribution tag: `celo_266a6aa0aec8`.

## How it works

```
job (topic) ─→ orchestrator ─→ pays 0.01 USDC per call via x402 ─→ worker agents
                                (facilitator: api.x402.celo.org)     ├─ research
                                                                     ├─ copywriting   (soon)
                                                                     ├─ translation   (soon)
                                                                     ├─ image/chart   (soon)
                                                                     └─ fact-check    (soon)
```

- Every worker is an Express service using `@x402/express`; unpaid requests
  get HTTP 402 with payment terms (USDC on Celo, EIP-3009 gasless transfer).
- The orchestrator uses `@x402/fetch` + a viem account to sign payment
  authorizations; the Celo facilitator settles on-chain and pays the gas.
- Every completed job produces real content for
  [ChainConnect NG](https://github.com/plutodev1/agentmesh), a Web3 education
  community in Port Harcourt, Nigeria — genuine utility per transaction.

## Run it

```bash
npm install
cp .env.example .env   # fill in your keys
npm run worker:research   # terminal 1
npm run orchestrate "history of mobile money in Nigeria"   # terminal 2
```

## Status

- [x] Day 1 — registration, attribution tag, wallets, first worker +
      orchestrator, payment pipeline verified against the live facilitator
- [ ] Remaining workers (copywriting, translation, image, fact-check)
- [ ] Full pipeline job on mainnet
- [ ] Daily production mode (scheduled real content jobs)
- [ ] Live demo dashboard with real-time payment feed
- [ ] ERC-8004 on-chain agent identity
