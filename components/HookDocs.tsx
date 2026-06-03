import { INFECTED, LINKS } from "@/lib/infected";

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-4 rounded-xl border border-line bg-bg2 p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-ink/90">
      {children}
    </pre>
  );
}

function H({ id, n, children }: { id: string; n: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 flex items-center gap-3">
      <span className="font-mono text-[11px] text-toxic border border-toxic/30 rounded-md px-1.5 py-1 leading-none">{n}</span>
      <h3 className="font-display font-700 text-2xl sm:text-3xl">{children}</h3>
    </div>
  );
}

export function HookDocs() {
  return (
    <div className="space-y-16">
      {/* 01 OVERVIEW */}
      <section className="space-y-4">
        <H id="docs-overview" n="01">the transfer hook</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          The infection rule is a <b className="text-ink">Token-2022 transfer hook</b> — a small Solana
          program that Token-2022 calls on <i>every</i> transfer of $VIRUS. It reads the transfer and can{" "}
          <b className="text-ink">reject</b> it. That&apos;s the whole enforcement mechanism: the token
          polices itself, so no interface, aggregator, or RPC can route around it.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Meta k="program" v={INFECTED.hookProgram} mono />
          <Meta k="framework" v="Anchor 0.31 · Rust" />
          <Meta k="interface" v="spl-transfer-hook-interface 0.9" />
          <Meta k="source" v="MIT · open & verifiable" />
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2 text-sm">source ↗</a>
          <a href={LINKS.hookProgramSolscan} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2 text-sm">program ↗</a>
        </div>
      </section>

      {/* 02 THE RULE */}
      <section className="space-y-4">
        <H id="docs-rule" n="02">the rule</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          On every transfer the hook looks at where the tokens are going and where they came from, and
          decides:
        </p>
        <div className="card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-mute bg-bg2/60">
                <th className="py-2.5 px-4">condition</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">meaning</th>
                <th className="py-2.5 px-4 text-right sm:text-left">result</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              <Tr c="recipient is whitelisted" m="creator / patient zero" r="allow" tone="ok" />
              <Tr c="destination is a pool vault" m="selling, or migration" r="allow" tone="ok" />
              <Tr c="source is a pool vault" m="a BUY from the pool" r="infected only" tone="warn" />
              <Tr c="anything else" m="wallet → wallet (the spread)" r="allow" tone="ok" last />
            </tbody>
          </table>
        </div>
        <p className="text-mute leading-relaxed max-w-2xl">
          The only gated case is a <b className="text-ink">buy</b> — tokens leaving a pool vault to a normal
          wallet. That wallet must have been <b className="text-toxic">already infected</b> (held a balance
          before this transfer), or it reverts with <code className="text-magenta">NotInfected</code>.
        </p>
      </section>

      {/* 03 DETECTING A BUY */}
      <section className="space-y-4">
        <H id="docs-detection" n="03">detecting a buy</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          A buy is simply a transfer whose <b className="text-ink">source is owned by a pool-vault
          authority</b>. Meteora&apos;s vaults are owned by known program addresses, baked in as constants,
          so the hook tells pool↔wallet flows from wallet↔wallet flows with no extra data:
        </p>
        <Code>{`DBC      pool authority  FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM
DAMM v2  pool authority  HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC
DAMM v1  pool authority  CuVzw6GRdU44uPaeoNiGBFe2BpfyeAMd5iwGKuwCYRkh`}</Code>
        <p className="text-mute leading-relaxed max-w-2xl">
          Source is one of these → tokens are leaving a pool → a buy. Destination is one of these → tokens
          are entering a pool → a sell (always allowed).
        </p>
      </section>

      {/* 04 EXECUTE */}
      <section className="space-y-4">
        <H id="docs-execute" n="04">Execute logic</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          Token-2022 passes the post-transfer state, so the recipient&apos;s balance already includes the
          incoming <code>amount</code>. The balance <i>before</i> the transfer is therefore{" "}
          <code className="text-teal">destination.amount − amount</code> — if that&apos;s zero, they had
          nothing and aren&apos;t infected.
        </p>
        <Code>{`#[interface(spl_transfer_hook_interface::execute)]
pub fn transfer_hook(ctx, amount: u64) -> Result<()> {
    let dst = ctx.accounts.destination_token.owner;
    let src = ctx.accounts.source_token.owner;

    if config.whitelist.contains(&dst)  { return Ok(()); }  // patient zero
    if POOL_AUTHORITIES.contains(&dst)  { return Ok(()); }  // sell / migration

    if POOL_AUTHORITIES.contains(&src) {                    // a BUY…
        let prior = destination.amount.checked_sub(amount)?;
        require!(prior > 0, InfectionError::NotInfected);   // …infected only
        return Ok(());
    }
    Ok(())                                                  // peer transfer = spread
}`}</Code>
      </section>

      {/* 05 ACCOUNTS */}
      <section className="space-y-4">
        <H id="docs-accounts" n="05">accounts &amp; PDAs</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          Two PDAs per mint. The <code className="text-teal">ExtraAccountMetaList</code> tells Token-2022
          which extra accounts to hand to <code>Execute</code>; the <code className="text-teal">HookConfig</code>{" "}
          holds the per-mint whitelist.
        </p>
        <Code>{`ExtraAccountMetaList   seeds = ["extra-account-metas", mint]
                       declares 1 extra account → the HookConfig PDA

HookConfig             seeds = ["config", mint]
  authority: Pubkey      // may edit the whitelist
  mint:      Pubkey
  whitelist: Vec<Pubkey> // exempt wallets (max 16), seeded with the creator`}</Code>
        <p className="text-mute leading-relaxed max-w-2xl">
          <code>Execute</code> receives the standard transfer-hook accounts, in order: source, mint,
          destination, owner, the meta-list, and the config (resolved from its seeds automatically).
        </p>
      </section>

      {/* 06 INSTRUCTIONS */}
      <section className="space-y-4">
        <H id="docs-instructions" n="06">instructions</H>
        <div className="space-y-3">
          <Ix name="initialize_extra_account_meta_list(creator)" who="setup" desc="Creates the mint's meta-list + config PDAs and whitelists the creator (patient zero). Once per mint." />
          <Ix name="add_to_whitelist(address)" who="authority" desc="Exempt another wallet so it can buy without being infected." />
          <Ix name="remove_from_whitelist(address)" who="authority" desc="Remove an exemption." />
          <Ix name="transfer_hook(amount)" who="Token-2022" desc="The Execute entrypoint enforcing the rule, called by Token-2022 on every transfer." />
        </div>
        <p className="text-mute text-sm font-mono">errors · NotInfected · AlreadyWhitelisted · WhitelistFull · Unauthorized · MathOverflow</p>
      </section>

      {/* 07 PROPERTIES */}
      <section className="space-y-4">
        <H id="docs-properties" n="07">properties</H>
        <ul className="space-y-2.5 text-mute leading-relaxed max-w-2xl">
          <Li>The rule is <b className="text-ink">fixed in the program</b>; only the per-mint whitelist is mutable, and only by its authority.</Li>
          <Li><b className="text-ink">Selling is never blocked</b> — a pool vault is always a valid destination.</Li>
          <Li>Sell to zero and you&apos;re <b className="text-ink">cured</b> — you&apos;d need to get infected again to buy.</Li>
          <Li><b className="text-ink">Peer transfers are unrestricted</b>, including to brand-new wallets — that&apos;s the infection vector.</Li>
          <Li>The rule <b className="text-ink">never lifts</b>: $VIRUS stays on its bonding curve, so the hook is never revoked.</Li>
          <Li>No frontend bypass — the check runs inside the Token-2022 transfer, so every wallet, swap and route obeys it.</Li>
        </ul>
      </section>

      {/* 08 VERIFIED */}
      <section className="space-y-4">
        <H id="docs-verified" n="08">verified on-chain</H>
        <p className="text-mute leading-relaxed max-w-2xl">Tested end-to-end against the live program:</p>
        <ul className="space-y-1.5 font-mono text-sm">
          <Check>creator buys at zero balance (whitelisted)</Check>
          <Check>fresh wallet buy → rejected (NotInfected)</Check>
          <Check>holder sends it tokens → infected</Check>
          <Check>now-infected wallet buys → allowed</Check>
          <Check>it infects another wallet → that wallet can buy</Check>
          <Check>never-infected wallet → rejected</Check>
        </ul>
      </section>
    </div>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="card p-3.5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-mute">{k}</div>
      <div className={`mt-1 break-all ${mono ? "font-mono text-xs text-teal" : "font-display font-600"}`}>{v}</div>
    </div>
  );
}
function Tr({ c, m, r, tone, last }: { c: string; m: string; r: string; tone: "ok" | "warn"; last?: boolean }) {
  const b = last ? "" : "border-b border-line/60";
  return (
    <tr className="align-top">
      <td className={`py-2.5 px-4 text-ink ${b}`}>{c}</td>
      <td className={`py-2.5 px-4 text-mute hidden sm:table-cell ${b}`}>{m}</td>
      <td className={`py-2.5 px-4 text-right sm:text-left ${tone === "ok" ? "text-toxic" : "text-magenta"} ${b}`}>{r}</td>
    </tr>
  );
}
function Ix({ name, who, desc }: { name: string; who: string; desc: string }) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="font-mono text-sm text-toxic break-all">{name}</code>
        <span className="chip">{who}</span>
      </div>
      <p className="text-mute text-sm mt-2">{desc}</p>
    </div>
  );
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2.5"><span className="text-toxic mt-1 shrink-0">▹</span><span>{children}</span></li>;
}
function Check({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2 text-mute"><span className="text-toxic">✓</span>{children}</li>;
}
