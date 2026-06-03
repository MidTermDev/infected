"use client";

import { useCallback, useEffect, useState } from "react";
import { ComputeBudgetProgram, Transaction, type Connection, type TransactionSignature } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LINKS } from "@/lib/infected";
import { buildInfectIx, readStation, fmtSol, fmtTokens, type StationState } from "@/lib/station";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function confirmBySig(connection: Connection, sig: TransactionSignature) {
  for (let i = 0; i < 40; i++) {
    const { value } = await connection.getSignatureStatus(sig, { searchTransactionHistory: true });
    if (value) { if (value.err) throw new Error("transaction failed"); if (value.confirmationStatus === "confirmed" || value.confirmationStatus === "finalized") return; }
    await sleep(1500);
  }
  throw new Error("timed out confirming — check your wallet");
}

export function Infect() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [st, setSt] = useState<StationState | null | undefined>(undefined); // undefined=loading, null=not live
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setSt(await readStation(connection)); } catch { setSt(null); }
  }, [connection]);

  useEffect(() => { refresh(); const id = setInterval(refresh, 20_000); return () => clearInterval(id); }, [refresh]);

  async function infect() {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setBusy(true); setError(null); setDone(null); setStatus("preparing…");
    try {
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 80_000 }),
        buildInfectIx(wallet.publicKey),
      );
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash; tx.feePayer = wallet.publicKey;
      setStatus("approve in your wallet…");
      const signed = await wallet.signTransaction(tx);
      setStatus("sending…");
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 5 });
      setStatus("confirming…");
      await confirmBySig(connection, sig);
      setDone(sig); setStatus(null); refresh();
    } catch (e) {
      const m = (e as Error).message || String(e);
      setError(/ReserveEmpty|0x1770/i.test(m) ? "The station's reserve is empty — ask a holder to infect you instead." : m.length > 120 ? "Transaction failed (see your wallet)." : m);
      setStatus(null);
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-6 max-w-xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-display font-700 text-xl">🧫 Infection Station</div>
        {st && <span className="chip">{st.infections.toString()} infected</span>}
      </div>

      <p className="text-mute mt-2 leading-relaxed">
        The real way in is to get a holder to <b className="text-ink">send you $VIRUS</b> — ask around.
        No takers? Infect yourself here: pay the fee and the station doses you straight from its reserve.
      </p>

      {st === undefined ? (
        <div className="mt-5 text-mute font-mono text-sm">reading station…</div>
      ) : st === null ? (
        <div className="mt-5 card bg-bg2 p-4 text-mute text-sm">
          The Infection Station goes live with the token. Check back at launch — or buy on{" "}
          <a href={LINKS.jupiter} target="_blank" rel="noopener noreferrer" className="text-toxic underline">Jupiter</a>{" "}
          once you&apos;re infected.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Stat label="dose" value={`${fmtTokens(st.dose, st.decimals)} $VIRUS`} />
            <Stat label="price now" value={`${fmtSol(st.priceLamports)} SOL`} accent />
            <Stat label="next jumps to" value={`${fmtSol(st.priceLamports + st.increment)} SOL`} />
          </div>
          <div className="text-[11px] text-mute font-mono mt-2">
            +{fmtSol(st.increment)} SOL per infection · {fmtTokens(st.reserve, st.decimals)} $VIRUS left in reserve
          </div>

          <div className="mt-5">
            {!wallet.publicKey ? (
              <WalletMultiButton style={{ width: "100%", justifyContent: "center" }} />
            ) : (
              <button onClick={infect} disabled={busy || st.reserve < st.dose} className="btn-toxic w-full text-lg disabled:opacity-50">
                {busy ? status ?? "working…" : st.reserve < st.dose ? "reserve empty" : `Infect me — ${fmtSol(st.priceLamports)} SOL`}
              </button>
            )}
          </div>
          {wallet.publicKey && (
            <button onClick={() => wallet.disconnect()} className="block mx-auto mt-2 text-xs text-mute underline font-mono">
              {wallet.publicKey.toBase58().slice(0, 4)}…{wallet.publicKey.toBase58().slice(-4)} · disconnect
            </button>
          )}
        </>
      )}

      {error && <div className="mt-3 rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm">⚠ {error}</div>}
      {done && (
        <div className="mt-3 rounded-lg border border-toxic/40 bg-toxic/10 px-3 py-2 text-sm">
          ✅ infected!{" "}
          <a className="underline text-toxic" href={`https://solscan.io/tx/${done}`} target="_blank" rel="noopener noreferrer">view tx ↗</a>
          {" — "}now buy more on{" "}
          <a className="underline text-toxic" href={LINKS.jupiter} target="_blank" rel="noopener noreferrer">Jupiter ↗</a>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-mute">{label}</div>
      <div className={`font-display font-700 text-sm mt-0.5 ${accent ? "text-toxic" : "text-ink"}`}>{value}</div>
    </div>
  );
}
