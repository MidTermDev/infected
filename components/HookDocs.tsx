import { INFECTED, LINKS } from "@/lib/infected";

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 rounded-xl border border-line bg-bg2 p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-ink/90">
      {children}
    </pre>
  );
}

function H({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 pt-2">
      <div className="font-mono text-xs text-toxic/80 tracking-widest uppercase">{kicker}</div>
      <h3 className="font-display font-700 text-2xl sm:text-3xl mt-1">{children}</h3>
    </div>
  );
}

export function HookDocs() {
  return (
    <div className="space-y-14">
      {/* OVERVIEW */}
      <section className="space-y-3">
        <H id="docs-overview" kicker="reference / 01">the transfer hook</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          The infection rule is a <b className="text-ink">Token-2022 transfer hook</b> — a small Solana
          program that Token-2022 invokes (CPI) on <i>every</i> transfer of $VIRUS. It can read the
          transfer&apos;s accounts and <b className="text-ink">reject</b> the transfer by returning an
          error. That&apos;s the entire enforcement mechanism: the token polices itself, and no UI,
          aggregator, or RPC can route around it.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <Meta k="program" v={INFECTED.hookProgram} mono />
          <Meta k="framework" v="Anchor 0.31 · Rust" />
          <Meta k="interface" v="spl-transfer-hook-interface 0.9" />
          <Meta k="license" v="MIT — open source" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <a href={LINKS.hookRepo} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2 text-sm">source ↗</a>
          <a href={LINKS.hookProgramSolscan} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2 text-sm">program ↗</a>
        </div>
      </section>

      {/* THE RULE */}
      <section className="space-y-3">
        <H id="docs-rule" kicker="reference / 02">the rule</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          On every transfer the hook looks at <b className="text-ink">where the tokens are going</b> and{" "}
          <b className="text-ink">where they came from</b>, and decides:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mt-2">
            <thead>
              <tr className="text-left font-mono text-xs text-mute">
                <th className="py-2 pr-4 border-b border-line">condition</th>
                <th className="py-2 pr-4 border-b border-line">meaning</th>
                <th className="py-2 border-b border-line">result</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              <Tr c="recipient is whitelisted" m="creator / patient zero" r="allow" ok />
              <Tr c="destination is a pool vault" m="selling into the pool, or migration" r="allow" ok />
              <Tr c="source is a pool vault" m="a BUY from the pool" r="allow only if infected" warn />
              <Tr c="anything else" m="wallet → wallet (the spread)" r="allow" ok />
            </tbody>
          </table>
        </div>
        <p className="text-mute leading-relaxed max-w-2xl mt-3">
          The only gated case is a <b className="text-ink">buy</b>: tokens leaving a pool vault to a normal
          wallet. That wallet must have been <b className="text-toxic">already infected</b> — held a positive
          balance <i>before</i> this transfer — or the whole transfer reverts with{" "}
          <code className="text-magenta">NotInfected</code>.
        </p>
      </section>

      {/* HOW IT KNOWS A BUY */}
      <section className="space-y-3">
        <H id="docs-detection" kicker="reference / 03">detecting a buy</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          A &quot;buy&quot; is just a transfer whose <b className="text-ink">source token account is owned by a
          pool-vault authority</b>. Meteora&apos;s pool vaults are owned by known program-derived
          addresses, hard-coded as constants — so the hook can tell pool↔wallet flows apart from
          wallet↔wallet flows without any extra data:
        </p>
        <Code>{`DBC      pool authority  FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM
DAMM v2  pool authority  HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC
DAMM v1  pool authority  CuVzw6GRdU44uPaeoNiGBFe2BpfyeAMd5iwGKuwCYRkh`}</Code>
        <p className="text-mute leading-relaxed max-w-2xl mt-3">
          Source owned by one of these → tokens are <i>leaving</i> a pool → it&apos;s a buy. Destination
          owned by one of these → tokens are <i>entering</i> a pool → it&apos;s a sell (always allowed).
        </p>
      </section>

      {/* EXECUTE */}
      <section className="space-y-3">
        <H id="docs-execute" kicker="reference / 04">Execute logic</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          Token-2022 hands the hook the post-transfer state, so the recipient&apos;s balance already
          includes the incoming <code>amount</code>. The pre-transfer balance is therefore{" "}
          <code className="text-teal">destination.amount − amount</code> — if that&apos;s zero, the buyer
          had nothing before and isn&apos;t infected.
        </p>
        <Code>{`#[interface(spl_transfer_hook_interface::execute)]
pub fn transfer_hook(ctx, amount: u64) -> Result<()> {
    let dst = ctx.accounts.destination_token.owner;
    let src = ctx.accounts.source_token.owner;

    if config.whitelist.contains(&dst)      { return Ok(()); } // patient zero
    if POOL_AUTHORITIES.contains(&dst)       { return Ok(()); } // sell / migration

    if POOL_AUTHORITIES.contains(&src) {                        // a BUY…
        let prior = destination.amount.checked_sub(amount)?;    // balance before
        require!(prior > 0, InfectionError::NotInfected);       // …infected only
        return Ok(());
    }
    Ok(())                                                      // peer transfer = spread
}`}</Code>
      </section>

      {/* ACCOUNTS */}
      <section className="space-y-3">
        <H id="docs-accounts" kicker="reference / 05">accounts &amp; PDAs</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          Two PDAs per mint. The <code className="text-teal">ExtraAccountMetaList</code> tells Token-2022
          which extra accounts to pass into <code>Execute</code>; the <code className="text-teal">HookConfig</code>{" "}
          holds the per-mint whitelist.
        </p>
        <Code>{`ExtraAccountMetaList   PDA seeds = ["extra-account-metas", mint]
                       declares 1 extra account: the HookConfig PDA

HookConfig             PDA seeds = ["config", mint]
  authority: Pubkey      // may edit the whitelist
  mint:      Pubkey
  bump:      u8
  whitelist: Vec<Pubkey> // exempt wallets (max 16), seeded with the creator`}</Code>
        <p className="text-mute leading-relaxed max-w-2xl mt-3">
          <code>Execute</code> receives the standard transfer-hook account list, in order:
        </p>
        <Code>{`0  source_token        (TokenAccount)   // read .owner
1  mint                (Mint)
2  destination_token   (TokenAccount)   // read .owner, .amount
3  owner               (source authority)
4  extra_account_meta_list
5  config              (HookConfig)     // resolved from seeds automatically`}</Code>
      </section>

      {/* INSTRUCTIONS */}
      <section className="space-y-3">
        <H id="docs-instructions" kicker="reference / 06">instructions</H>
        <div className="space-y-3">
          <Ix
            name="initialize_extra_account_meta_list(creator)"
            who="anyone (payer)"
            desc="Creates the mint's ExtraAccountMetaList + HookConfig PDAs and whitelists `creator` (patient zero). Run once per mint, after the mint exists and before the first trade."
          />
          <Ix name="add_to_whitelist(address)" who="config authority" desc="Exempt another wallet so it can buy without being infected." />
          <Ix name="remove_from_whitelist(address)" who="config authority" desc="Remove an exemption." />
          <Ix name="transfer_hook(amount)" who="Token-2022 (CPI)" desc="The Execute entrypoint enforcing the rule. Not called directly." />
        </div>
        <p className="text-mute text-sm mt-2 font-mono">
          errors: NotInfected · AlreadyWhitelisted · WhitelistFull · Unauthorized · MathOverflow
        </p>
      </section>

      {/* INTEGRATION */}
      <section className="space-y-3">
        <H id="docs-integration" kicker="reference / 07">launching a token with it</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          On Meteora&apos;s Dynamic Bonding Curve (DBC 0.2.0), in order:
        </p>
        <Code>{`1. createConfigWithTransferHook({ transferHookProgram: <this program>, ... })
2. createPoolWithTransferHook(...)          // do NOT bundle a first-buy
3. initialize_extra_account_meta_list(creator)   // this program; whitelists creator
4. trade  (Jupiter routes swap2_with_transfer_hook)`}</Code>
        <p className="text-mute leading-relaxed max-w-2xl mt-3">
          The meta-list must exist before the first transfer, so a bundled first-buy at pool creation
          would fail (<code className="text-magenta">MissingRemainingAccountForTransferHook</code>) — create
          the pool, then initialize, then trade.
        </p>
        <div className="rounded-xl border border-magenta/40 bg-magenta/10 p-4 mt-3">
          <div className="font-display font-700 text-magenta">⚠ never graduate</div>
          <p className="text-mute text-sm mt-1 leading-relaxed">
            DBC <b className="text-ink">auto-revokes the transfer hook the instant the bonding curve
            completes</b> (it nulls the mint&apos;s hook program + authority so the token can migrate to
            DAMM v2). The infection rule would vanish. So $VIRUS sets its migration market cap absurdly
            high — the curve effectively never fills, and the rule holds forever.
          </p>
        </div>
      </section>

      {/* PROPERTIES */}
      <section className="space-y-3">
        <H id="docs-properties" kicker="reference / 08">properties &amp; edge cases</H>
        <ul className="space-y-2 text-mute leading-relaxed max-w-2xl">
          <Li>The rule logic is <b className="text-ink">fixed in the program</b>; only the per-mint whitelist is mutable, and only by its authority.</Li>
          <Li><b className="text-ink">Selling is never blocked</b> — destination is a pool vault, which is always allowed.</Li>
          <Li>Sell your entire balance to zero and you&apos;re <b className="text-ink">&quot;cured&quot;</b> — you&apos;d have to get infected again before you can buy.</Li>
          <Li><b className="text-ink">Peer transfers are unrestricted</b>, including to brand-new wallets — that&apos;s the infection vector.</Li>
          <Li>The whitelist starts with the creator only; the team can add wallets (e.g. a treasury, a market maker) via <code>add_to_whitelist</code>.</Li>
          <Li>No frontend bypass: the check runs inside Token-2022&apos;s transfer, so it applies to every wallet, swap and route equally.</Li>
        </ul>
      </section>

      {/* VERIFIED */}
      <section className="space-y-3">
        <H id="docs-verified" kicker="reference / 09">verified on devnet</H>
        <p className="text-mute leading-relaxed max-w-2xl">
          End-to-end against the live DBC 0.2.0 program: create config + pool with the hook → initialize →
        </p>
        <ul className="space-y-1.5 font-mono text-sm">
          <Check>creator buys at zero balance (whitelisted)</Check>
          <Check>fresh wallet buy → rejected (NotInfected)</Check>
          <Check>creator sends it tokens (peer transfer) → infected</Check>
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
    <div className="card p-3">
      <div className="font-mono text-[11px] uppercase tracking-wider text-mute">{k}</div>
      <div className={`mt-0.5 break-all ${mono ? "font-mono text-xs text-teal" : "font-display font-600"}`}>{v}</div>
    </div>
  );
}
function Tr({ c, m, r, ok, warn }: { c: string; m: string; r: string; ok?: boolean; warn?: boolean }) {
  return (
    <tr className="align-top">
      <td className="py-2 pr-4 border-b border-line/60 text-ink">{c}</td>
      <td className="py-2 pr-4 border-b border-line/60 text-mute">{m}</td>
      <td className={`py-2 border-b border-line/60 ${ok ? "text-toxic" : warn ? "text-magenta" : "text-ink"}`}>{r}</td>
    </tr>
  );
}
function Ix({ name, who, desc }: { name: string; who: string; desc: string }) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="font-mono text-sm text-toxic">{name}</code>
        <span className="chip">{who}</span>
      </div>
      <p className="text-mute text-sm mt-2">{desc}</p>
    </div>
  );
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><span className="text-toxic mt-1">▹</span><span>{children}</span></li>;
}
function Check({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2 text-mute"><span className="text-toxic">✓</span>{children}</li>;
}
