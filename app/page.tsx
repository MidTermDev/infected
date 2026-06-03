"use client";

import { useEffect, useState } from "react";
import { Faq } from "@/components/Faq";
import { HookDocs } from "@/components/HookDocs";
import { Infect } from "@/components/Infect";
import { OutbreakMap } from "@/components/OutbreakMap";
import { INFECTED, LINKS } from "@/lib/infected";

const CA = INFECTED.mint;

const NAV: { id: string; label: string; sub?: boolean }[] = [
  { id: "top", label: "Overview" },
  { id: "spread", label: "How it spreads" },
  { id: "infect", label: "Infect yourself" },
  { id: "map", label: "Outbreak map" },
  { id: "hook", label: "Transfer hook" },
  { id: "docs-rule", label: "The rule", sub: true },
  { id: "docs-detection", label: "Detecting a buy", sub: true },
  { id: "docs-execute", label: "Execute logic", sub: true },
  { id: "docs-accounts", label: "Accounts & PDAs", sub: true },
  { id: "docs-instructions", label: "Instructions", sub: true },
  { id: "docs-properties", label: "Properties", sub: true },
  { id: "docs-verified", label: "Verified", sub: true },
  { id: "faq", label: "FAQ" },
];

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [mcap, setMcap] = useState<number | null>(null);
  const [active, setActive] = useState("top");

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CA}`);
        const j = await r.json();
        const pair = j?.pairs?.find((p: { chainId?: string }) => p.chainId === "solana") ?? j?.pairs?.[0];
        if (alive) setMcap(pair ? (pair.marketCap ?? pair.fdv ?? null) : null);
      } catch { /* ignore */ }
    };
    pull();
    const id = setInterval(pull, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  function copyCa() {
    navigator.clipboard?.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  const mcapStr = mcap != null ? `$${Math.round(mcap).toLocaleString()}` : "—";

  return (
    <div className="lg:flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-72 border-r border-line bg-bg2/60 backdrop-blur z-20">
        <a href="#top" className="flex items-center gap-2.5 px-5 h-16 border-b border-line">
          <img src="/infected.png" alt="Infected" className="h-9 w-9 object-contain" />
          <span className="font-display font-700 text-lg">Infected</span>
          <span className="chip text-toxic border-toxic/40">$VIRUS</span>
        </a>

        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mute">market cap</span>
          <span className="font-mono text-sm text-toxic tnum flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-toxic animate-pulse" />{mcapStr}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={`block rounded-lg px-3 py-1.5 text-sm transition ${n.sub ? "ml-3 text-[13px]" : "font-display font-600"} ${
                active === n.id ? "bg-toxic/10 text-toxic" : "text-mute hover:text-ink"
              }`}
            >
              {n.sub && <span className="text-line mr-2">›</span>}{n.label}
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-line space-y-2">
          <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="btn-toxic w-full !py-2.5 text-sm">Buy on Jupiter ↗</a>
          <div className="flex gap-2">
            <a href={LINKS.x} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 !py-2 text-sm">𝕏</a>
            <a href={LINKS.telegram} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 !py-2 text-sm">TG</a>
            <a href={LINKS.dexscreener} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 !py-2 text-sm">chart</a>
            <a href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 !py-2 text-sm">src</a>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="px-4 h-14 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2">
            <img src="/infected.png" alt="Infected" className="h-8 w-8 object-contain" />
            <span className="font-display font-700">Infected</span>
            <span className="chip text-toxic border-toxic/40">$VIRUS</span>
          </a>
          <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="btn-toxic !py-1.5 text-sm">Buy</a>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="lg:ml-72 flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">

          {/* OVERVIEW / HERO */}
          <section id="top" className="scroll-mt-20 pt-12 pb-14">
            <div className="grid sm:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <span className="chip text-toxic border-toxic/40">case file · Solana · Token-2022</span>
                <h1 className="font-display font-700 text-5xl sm:text-6xl leading-[0.98] mt-4">
                  you can only buy<br />if you&apos;re <span className="text-toxic glow-toxic">infected</span>.
                </h1>
                <p className="text-mute leading-relaxed mt-5 max-w-md">
                  $VIRUS enforces one rule on-chain: <b className="text-ink">no buying unless you already
                  hold it.</b> Someone has to <b className="text-ink">infect you</b> first — send you a
                  little. Then you can buy, and infect others. 🦠
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <a href="#infect" className="btn-toxic">🧫 Infect yourself →</a>
                  <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="btn-ghost">Buy on Jupiter ↗</a>
                </div>
                <a href="#infect" className="mt-3 inline-block text-sm text-toxic/90 hover:text-toxic">
                  → no one will infect you? dose yourself at the Infection Station
                </a>
              </div>
              <div className="relative grid place-items-center sm:w-56">
                <div className="absolute h-44 w-44 rounded-full ring-toxic" />
                <img src="/infected.png" alt="Infected — $VIRUS" className="relative w-44 anim-float" />
              </div>
            </div>
            <button onClick={copyCa} className="mt-8 w-full flex items-center gap-2 card px-4 py-2.5 hover:border-toxic/50 transition">
              <span className="font-mono text-xs text-mute shrink-0">CONTRACT</span>
              <span className="font-mono text-xs sm:text-sm truncate">{CA}</span>
              <span className="chip text-toxic border-toxic/40 shrink-0 ml-auto">{copied ? "copied" : "copy"}</span>
            </button>
          </section>

          <Divider />

          {/* HOW IT SPREADS — vertical numbered timeline (distinct from card grid) */}
          <section id="spread" className="scroll-mt-20 py-14">
            <div className="font-mono text-xs text-toxic/80 tracking-widest uppercase">transmission</div>
            <h2 className="font-display font-700 text-3xl sm:text-4xl mt-1">how the infection spreads</h2>
            <ol className="mt-8 space-y-6 border-l border-line pl-8 relative">
              <Phase n="1" color="text-magenta" dot="bg-magenta" title="get infected" emoji="🩸">
                A clean wallet can&apos;t buy. An existing holder has to <b className="text-ink">send you
                $VIRUS</b> first — that&apos;s your infection.
              </Phase>
              <Phase n="2" color="text-toxic" dot="bg-toxic" title="now you can buy" emoji="🧪">
                The instant you hold a balance, the chain lets you buy more — on{" "}
                <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="text-toxic underline">Jupiter</a>, normally.
              </Phase>
              <Phase n="3" color="text-teal" dot="bg-teal" title="infect others" emoji="🦠">
                Send $VIRUS to fresh wallets to infect them. Each new host can buy and spread it further.
              </Phase>
            </ol>
          </section>

          <Divider />

          {/* INFECT YOURSELF */}
          <section id="infect" className="scroll-mt-20 py-14">
            <div className="font-mono text-xs text-toxic/80 tracking-widest uppercase">last resort</div>
            <h2 className="font-display font-700 text-3xl sm:text-4xl mt-1 mb-2">infect yourself</h2>
            <p className="text-mute mb-8 max-w-2xl">
              Can&apos;t find anyone to infect you? Pay the station and dose yourself. The price climbs with
              every infection — the longer you wait, the more it costs. And{" "}
              <b className="text-ink">every fee is used to buy back &amp; burn $VIRUS</b> 🔥, so impatience
              feeds the supply burn.
            </p>
            <Infect />
          </section>

          <Divider />

          {/* OUTBREAK MAP */}
          <section id="map" className="scroll-mt-20 py-14">
            <div className="font-mono text-xs text-toxic/80 tracking-widest uppercase">surveillance</div>
            <h2 className="font-display font-700 text-3xl sm:text-4xl mt-1 mb-6">outbreak map</h2>
            <OutbreakMap />
          </section>

          <Divider />

          {/* TRANSFER HOOK DOCS */}
          <section id="hook" className="scroll-mt-20 py-14">
            <div className="font-mono text-xs text-toxic/80 tracking-widest uppercase">documentation</div>
            <h2 className="font-display font-700 text-3xl sm:text-4xl mt-1 mb-2">transfer-hook docs</h2>
            <p className="text-mute mb-10 max-w-2xl">Exactly how the on-chain rule works — read it and verify it yourself.</p>
            <HookDocs />
          </section>

          <Divider />

          {/* FAQ */}
          <section id="faq" className="scroll-mt-20 py-14">
            <div className="font-mono text-xs text-toxic/80 tracking-widest uppercase">questions</div>
            <h2 className="font-display font-700 text-3xl sm:text-4xl mt-1 mb-8">faq</h2>
            <Faq />
          </section>

          {/* footer */}
          <footer className="border-t border-line py-10">
            <div className="flex flex-wrap items-center gap-2">
              <a className="btn-toxic !py-2 text-sm" href={LINKS.jupiter} target="_blank" rel="noopener noreferrer">Buy on Jupiter ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.x} target="_blank" rel="noopener noreferrer">𝕏 follow</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.telegram} target="_blank" rel="noopener noreferrer">Telegram ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.dexscreener} target="_blank" rel="noopener noreferrer">chart ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.solscanToken} target="_blank" rel="noopener noreferrer">token ↗</a>
              <a className="btn-ghost !py-2 text-sm" href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer">hook source ↗</a>
            </div>
            <p className="text-mute/70 text-xs mt-6 leading-relaxed max-w-2xl">
              Not financial advice. Infected ($VIRUS) is a community meme token with no intrinsic value or
              expectation of return — only spend what you can afford to lose. The infection rule is enforced
              on-chain by an open-source Token-2022 transfer hook.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />;
}

function Phase({ n, color, dot, title, emoji, children }: {
  n: string; color: string; dot: string; title: string; emoji: string; children: React.ReactNode;
}) {
  return (
    <li className="relative">
      <span className={`absolute -left-[2.6rem] top-0.5 h-5 w-5 rounded-full ${dot} grid place-items-center text-bg font-display font-700 text-[11px]`}>{n}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <h3 className={`font-display font-700 text-xl ${color}`}>{title}</h3>
      </div>
      <p className="text-mute mt-1.5 leading-relaxed max-w-xl">{children}</p>
    </li>
  );
}
