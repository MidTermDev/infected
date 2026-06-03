"use client";

import { useState } from "react";
import { LINKS } from "@/lib/infected";

interface QA { q: string; a: React.ReactNode; }

const ITEMS: QA[] = [
  {
    q: "How do I buy $VIRUS?",
    a: (
      <>
        You can only buy if you&apos;re <b>already infected</b> — i.e. you already hold some $VIRUS.
        So step one is to get infected: have an existing holder <b>send you a little $VIRUS</b>, or —
        if no one will — dose yourself at the{" "}
        <a href="#infect" className="text-toxic underline">Infection Station</a> for a fee. The moment
        your wallet holds a balance, you can buy more — on{" "}
        <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="text-toxic underline">Jupiter</a>{" "}
        like any normal token.
      </>
    ),
  },
  {
    q: "Then how does anyone buy at all?",
    a: (
      <>
        Patient zero — the creator wallet — is whitelisted and seeds the outbreak by sending $VIRUS
        out. Everyone they touch can now buy <i>and</i> infect others. From there it spreads wallet to
        wallet. You don&apos;t buy your way in; someone infects you — or you infect yourself at the{" "}
        <a href="#infect" className="text-toxic underline">Infection Station</a>.
      </>
    ),
  },
  {
    q: "How do I infect someone?",
    a: <>Just send them $VIRUS. Any amount. The instant their wallet holds a balance, they&apos;re infected and can buy. Spread responsibly. 🦠</>,
  },
  {
    q: "What's the Infection Station?",
    a: (
      <>
        Your last resort. If nobody will infect you for free, the{" "}
        <a href="#infect" className="text-toxic underline">Infection Station</a> doses you on demand:
        pay the fee and it sends you a dose of $VIRUS (10 tokens) straight from its reserve, infecting
        you so you can buy. The price starts at <b>0.1 SOL</b> and ratchets up{" "}
        <b>+0.01 SOL every infection</b> — so the earlier you cave, the cheaper. Getting infected by a
        real holder is always free and always better; the station is just there so the outbreak never
        stalls.
      </>
    ),
  },
  {
    q: "It's on Jupiter — won't a buy just work there?",
    a: (
      <>
        Jupiter now routes the Token-2022 transfer-hook swap, so the <i>interface</i> works. But the
        rule is enforced <b>on-chain by the token itself</b> — if you&apos;re not infected, even a
        Jupiter buy reverts. Get infected first, then Jupiter works normally.
      </>
    ),
  },
  {
    q: "Can I sell?",
    a: <>Always. Selling back into the pool is never blocked. (Heads up: if you sell down to zero you&apos;re &quot;cured&quot; — you&apos;d need to get infected again to buy.)</>,
  },
  {
    q: "Does the rule ever switch off?",
    a: (
      <>
        No. $VIRUS is built to <b>stay on its bonding curve forever</b> — it won&apos;t graduate or
        migrate (Meteora strips transfer hooks at graduation, so we simply never graduate). The
        infection rule keeps enforcing for good. The hook is open source:{" "}
        <a href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer" className="text-toxic underline">read it here</a>.
      </>
    ),
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {ITEMS.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="card overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center gap-3 text-left px-5 py-4">
              <span className={`shrink-0 h-7 w-7 grid place-items-center rounded-full border border-toxic/60 text-toxic font-mono transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              <span className="font-display font-600 text-lg">{it.q}</span>
            </button>
            {isOpen && <div className="px-5 pb-5 pl-[3.75rem] text-mute leading-relaxed">{it.a}</div>}
          </div>
        );
      })}
    </div>
  );
}
