"use client";

import { useEffect, useState } from "react";
import { Faq } from "@/components/Faq";
import { INFECTED, LINKS } from "@/lib/infected";

const CA = INFECTED.mint;

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ priceUsd: string | null; mcap: number | null } | null>(null);

  // Live price/mcap from DexScreener (public, CORS-ok). "—" until the token is live.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CA}`);
        const j = await r.json();
        const pair = j?.pairs?.find((p: { chainId?: string }) => p.chainId === "solana") ?? j?.pairs?.[0];
        if (alive && pair) setStats({ priceUsd: pair.priceUsd ?? null, mcap: pair.marketCap ?? pair.fdv ?? null });
        else if (alive) setStats({ priceUsd: null, mcap: null });
      } catch {
        if (alive) setStats({ priceUsd: null, mcap: null });
      }
    };
    pull();
    const id = setInterval(pull, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  function copyCa() {
    navigator.clipboard?.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  const mcapStr = stats?.mcap != null ? `$${Math.round(stats.mcap).toLocaleString()}` : "—";

  return (
    <main className="overflow-x-hidden">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <img src="/infected.png" alt="Infected" className="h-9 w-9 object-contain" />
            <span className="font-display font-700 text-xl">Infected</span>
            <span className="chip text-toxic border-toxic/40">$VIRUS</span>
          </a>
          <nav className="hidden sm:flex items-center gap-2">
            <a href="#spread" className="chip hover:text-ink">how it spreads</a>
            <a href="#faq" className="chip hover:text-ink">faq</a>
            <a href={LINKS.x} target="_blank" rel="noopener noreferrer" className="chip hover:text-ink">𝕏</a>
            <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="btn-toxic !py-2 text-sm">Buy on Jupiter</a>
          </nav>
          <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="btn-toxic !py-2 text-sm sm:hidden">Buy</a>
        </div>
      </header>

      {/* hero */}
      <section id="top" className="max-w-6xl mx-auto px-4 pt-12 sm:pt-16 pb-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="chip text-toxic border-toxic/40">Solana · Token-2022 · live on Jupiter</span>
            <h1 className="font-display font-700 text-6xl sm:text-7xl leading-[0.95] mt-4">
              you can only buy<br />if you&apos;re{" "}
              <span className="text-toxic glow-toxic">infected</span>.
            </h1>
            <p className="font-body text-lg text-mute mt-5 max-w-md">
              $VIRUS is a Solana token with one rule, enforced on-chain: <b className="text-ink">no buying
              unless you already hold it.</b> You get your first tokens when someone <b className="text-ink">infects
              you</b> — sends you some. Then you can buy, and spread it. 🦠
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="btn-toxic text-lg">Buy on Jupiter →</a>
              <a href="#spread" className="btn-ghost text-lg">how it works</a>
            </div>
            <button onClick={copyCa} className="mt-6 flex items-center gap-2 card px-4 py-2.5 hover:border-toxic/50 transition max-w-full">
              <span className="font-mono text-xs text-mute shrink-0">CA</span>
              <span className="font-mono text-xs sm:text-sm truncate">{CA}</span>
              <span className="chip text-toxic border-toxic/40 shrink-0">{copied ? "copied" : "copy"}</span>
            </button>
          </div>

          {/* phage */}
          <div className="relative grid place-items-center">
            <div className="absolute h-64 w-64 sm:h-80 sm:w-80 rounded-full ring-toxic" />
            <img src="/infected.png" alt="Infected — $VIRUS" className="relative w-[88%] max-w-md anim-float" />
            <div className="absolute -bottom-1 chip text-ink border-toxic/40">
              <span className="h-2 w-2 rounded-full bg-toxic inline-block" /> market cap: <span className="text-toxic tnum">{mcapStr}</span>
            </div>
          </div>
        </div>
      </section>

      {/* marquee */}
      <div className="border-y border-line bg-toxic text-bg overflow-hidden">
        <div className="whitespace-nowrap py-2 font-display font-700">
          <div className="anim-marquee inline-block">
            {Array(2).fill("$VIRUS  🦠  YOU CAN ONLY BUY IF YOU HOLD  🦠  GET INFECTED  🦠  SPREAD IT  🦠  ").map((t, i) => (
              <span key={i} className="px-3">{t.repeat(2)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* how it spreads */}
      <section id="spread" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="font-display font-700 text-4xl sm:text-5xl text-center">how the infection spreads</h2>
        <p className="text-center text-mute text-lg mt-2">three steps. no cure.</p>
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          <Step n="01" color="text-magenta" title="get infected" emoji="🩸">
            You can&apos;t buy with a clean wallet. An existing holder has to <b className="text-ink">send you
            $VIRUS</b> first. That&apos;s your infection.
          </Step>
          <Step n="02" color="text-toxic" title="now you can buy" emoji="🧪">
            The instant you hold a balance, the chain lets you buy more — straight on{" "}
            <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="text-toxic underline">Jupiter</a>.
          </Step>
          <Step n="03" color="text-teal" title="infect others" emoji="🦠">
            Send $VIRUS to fresh wallets to infect them. Every host you create can buy and spread it
            further. Exponential.
          </Step>
        </div>
      </section>

      {/* the rule / hook */}
      <section id="rule" className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="chip text-teal border-teal/40">on-chain · open source</span>
            <h2 className="font-display font-700 text-4xl sm:text-5xl mt-4">the rule lives in the coin</h2>
            <p className="text-mute text-lg mt-3 max-w-md">
              The infection rule isn&apos;t a website gimmick — it&apos;s a <b className="text-ink">Token-2022
              transfer hook</b>, a tiny Solana program that runs on every transfer. A buy from the pool
              only goes through if your wallet was <b className="text-ink">already a holder</b>. Otherwise it
              reverts. No frontend can bypass it.
            </p>
            <ul className="mt-5 space-y-2 text-mute">
              <li className="flex items-center gap-2"><Dot c="bg-toxic" /> buys require a pre-existing balance (infected)</li>
              <li className="flex items-center gap-2"><Dot c="bg-teal" /> peer transfers always allowed — that&apos;s the spread</li>
              <li className="flex items-center gap-2"><Dot c="bg-magenta" /> selling always allowed; creator is patient zero</li>
              <li className="flex items-center gap-2"><Dot c="bg-grape" /> stays on the bonding curve forever — rule never lifts</li>
            </ul>
            <div className="flex flex-wrap gap-3 mt-6">
              <a href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer" className="btn-ghost">view source ↗</a>
              <a href={LINKS.hookProgramSolscan} target="_blank" rel="noopener noreferrer" className="btn-ghost">view program ↗</a>
            </div>
          </div>
          <div className="card p-6">
            <div className="font-mono text-xs text-mute">transfer hook · Execute</div>
            <pre className="mt-3 text-sm font-mono leading-relaxed overflow-x-auto text-ink/90">
{`if recipient is whitelisted   → allow   // patient zero
if dest is a pool vault        → allow   // selling / LP
if source is a pool vault      →         // a BUY…
    require prior_balance > 0            // …only if infected
    else  revert NotInfected
else                           → allow   // peer transfer = spread`}
            </pre>
            <div className="mt-4 font-mono text-[11px] text-mute break-all">
              program: <span className="text-teal">{INFECTED.hookProgram}</span>
            </div>
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="font-display font-700 text-4xl sm:text-5xl text-center mb-2">questions</h2>
        <p className="text-center text-mute mb-10">tap to open.</p>
        <Faq />
      </section>

      {/* footer */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/infected.png" alt="Infected" className="h-10 w-10 object-contain" />
                <span className="font-display font-700 text-2xl">Infected</span>
                <span className="chip text-toxic border-toxic/40">$VIRUS</span>
              </div>
              <p className="text-mute mt-2 max-w-sm">you can only buy if you&apos;re infected. get a holder to send you some, then spread it.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="btn-toxic !py-2 text-sm" href={LINKS.jupiter} target="_blank" rel="noopener noreferrer">Buy on Jupiter ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.x} target="_blank" rel="noopener noreferrer">𝕏 follow</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.dexscreener} target="_blank" rel="noopener noreferrer">chart ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.solscanToken} target="_blank" rel="noopener noreferrer">token ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer">hook source ↗</a>
            </div>
          </div>
          <div className="card mt-8 p-3 font-mono text-xs break-all text-mute">CA: {CA}</div>
          <p className="text-mute/70 text-xs mt-6 leading-relaxed">
            Not financial advice. Infected ($VIRUS) is a community meme token with no intrinsic value or
            expectation of return — only spend what you can afford to lose. The infection rule is enforced
            on-chain by an open-source Token-2022 transfer hook.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Step({ n, color, title, emoji, children }: { n: string; color: string; title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className={`font-display font-700 text-3xl ${color}`}>{n}</span>
        <span className="text-3xl">{emoji}</span>
      </div>
      <div className="font-display font-700 text-2xl mt-3">{title}</div>
      <p className="text-mute mt-2 leading-relaxed">{children}</p>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}
