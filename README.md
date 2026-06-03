# Infected — $VIRUS 🦠

The site for **Infected ($VIRUS)** — a Solana token with one on-chain rule: **you can only buy if you
already hold it.** You get your first tokens when an existing holder *infects* you (sends you some);
then you can buy and spread it.

- **Token (CA):** `SqY8dqKUSJNcD1YG3xHkLhsZvReHXT7B8s535Hn1666`
- **Buy on Jupiter:** https://jup.ag/?buy=SqY8dqKUSJNcD1YG3xHkLhsZvReHXT7B8s535Hn1666&sell=So11111111111111111111111111111111111111112
- **X:** https://x.com/InfectedDotDev
- **The hook (open source):** https://github.com/MidTermDev/infection-hook — program `2hdbA2wNSqCDg3RLSd4Gm1TTzbBAHCvhnrrKR8bqR7xk`

## Stack

- Next.js 15 (App Router) + Tailwind — dark "viral / biohazard" theme
- Static landing page: no backend, no wallet adapter, no RPC key. Trading happens on Jupiter
  (which now routes the Token-2022 transfer-hook swap).
- Live market cap is pulled client-side from the public DexScreener API (shows "—" until the token
  is trading).

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3940
```

## Deploy to Vercel

Import the repo in Vercel (framework auto-detects as Next.js) and deploy. **No environment variables
required** — there are no secrets and no server routes.

## The rule (enforced on-chain)

```
if recipient is whitelisted   → allow   // patient zero / creator
if dest is a pool vault       → allow   // selling / LP / migration
if source is a pool vault     →         // a BUY from the pool…
    require prior_balance > 0           // …only if already infected
    else  revert NotInfected
else                          → allow   // peer transfer = the infection spreads
```

It's a Token-2022 transfer hook (open source, link above). $VIRUS is designed to **stay on its
bonding curve forever** so the rule never lifts — Meteora strips transfer hooks at graduation, so it
never graduates.

Not financial advice. Community meme token; only spend what you can afford to lose.
