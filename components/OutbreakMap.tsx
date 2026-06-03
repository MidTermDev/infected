"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { INFECTED } from "@/lib/infected";

const MINT = new PublicKey(INFECTED.mint);
const INDEXER = process.env.NEXT_PUBLIC_INDEXER_URL || "https://api.infected.dev";

interface Node { address: string; balance: number; infector: string | null; kind: "zero" | "station" | "host"; }
interface Graph { nodes: Node[]; edges: { from: string; to: string }[]; holders: number; source: "indexer" | "rpc"; }

// Preferred: the lineage indexer (real infector → host edges).
async function fromIndexer(): Promise<Graph | null> {
  try {
    const r = await fetch(`${INDEXER}/graph`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const g = await r.json();
    if (!Array.isArray(g?.nodes)) return null;
    return { nodes: g.nodes, edges: g.edges ?? [], holders: g.holders ?? g.nodes.length, source: "indexer" };
  } catch { return null; }
}

// Fallback: list holders straight from the RPC (no lineage → spread from patient zero).
async function fromRpc(rpc: string): Promise<Graph> {
  const body = { jsonrpc: "2.0", id: 1, method: "getProgramAccounts", params: [TOKEN_2022_PROGRAM_ID.toBase58(),
    { encoding: "base64", dataSlice: { offset: 0, length: 72 }, filters: [{ memcmp: { offset: 0, bytes: MINT.toBase58() } }] }] };
  const res = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  const byOwner: Record<string, number> = {};
  for (const a of json?.result ?? []) {
    const buf = Buffer.from(a.account.data[0], "base64");
    if (buf.length < 72) continue;
    const owner = new PublicKey(buf.subarray(32, 64)).toBase58();
    byOwner[owner] = (byOwner[owner] || 0) + Number(buf.readBigUInt64LE(64));
  }
  const nodes: Node[] = Object.entries(byOwner).filter(([, b]) => b > 0)
    .map(([address, balance]) => ({ address, balance, infector: null, kind: address === INFECTED.creator ? "zero" : "host" }));
  return { nodes, edges: [], holders: nodes.length, source: "rpc" };
}

export function OutbreakMap() {
  const { connection } = useConnection();
  const [graph, setGraph] = useState<Graph | null | "error">(null);

  const load = useCallback(async () => {
    const g = (await fromIndexer()) ?? (await fromRpc(connection.rpcEndpoint).catch(() => null));
    setGraph(g ?? "error");
  }, [connection]);

  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  const W = 760, H = 460, cx = W / 2, cy = H / 2;

  const { laid, edges, total, source } = useMemo(() => {
    if (!graph || graph === "error") return { laid: [], edges: [], total: 0, source: "" as const };
    const sorted = [...graph.nodes].sort((a, b) => (b.kind === "zero" ? 1 : 0) - (a.kind === "zero" ? 1 : 0) || b.balance - a.balance).slice(0, 150);
    const maxAmt = Math.max(1, ...sorted.map((n) => n.balance));
    const pos: Record<string, { x: number; y: number; r: number; kind: string; address: string; balance: number }> = {};
    const laid = sorted.map((n, i) => {
      const r = n.kind === "zero" ? 18 : 5 + 20 * Math.sqrt(n.balance / maxAmt);
      let x = cx, y = cy;
      if (n.kind !== "zero") {
        const ring = 1 + Math.floor(i / 14);
        const radius = 70 + ring * 50 + (i % 3) * 7;
        const ang = i * 2.399963;
        x = Math.max(r, Math.min(W - r, cx + radius * Math.cos(ang)));
        y = Math.max(r, Math.min(H - r, cy + radius * Math.sin(ang)));
      }
      const node = { x, y, r, kind: n.kind, address: n.address, balance: n.balance };
      pos[n.address] = node;
      return node;
    });
    // real edges from indexer; else synthesize spread from patient zero
    let edges: { x1: number; y1: number; x2: number; y2: number; teal: boolean }[] = [];
    if (graph.edges.length) {
      edges = graph.edges.map((e) => ({ a: pos[e.from], b: pos[e.to], teal: pos[e.from]?.kind === "station" }))
        .filter((e) => e.a && e.b).map((e) => ({ x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, teal: e.teal }));
    } else {
      const zero = laid.find((n) => n.kind === "zero") ?? { x: cx, y: cy };
      edges = laid.filter((n) => n.kind !== "zero").map((n) => ({ x1: zero.x, y1: zero.y, x2: n.x, y2: n.y, teal: false }));
    }
    return { laid, edges, total: graph.holders, source: graph.source };
  }, [graph]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-display font-700 text-xl">🗺️ live outbreak map</div>
        <span className="chip">{total ? `${total} infected wallets` : "—"}</span>
      </div>
      <p className="text-mute text-sm mt-1 mb-4">
        Every wallet holding $VIRUS, sized by bag.{" "}
        {source === "indexer" ? <>Edges trace <span className="text-toxic">who infected whom</span>.</> : <>Spreading out from <span className="text-toxic">patient zero</span>.</>}
      </p>

      {graph === null && <div className="font-mono text-sm text-mute py-10 text-center">scanning the population…</div>}
      {graph === "error" && <div className="font-mono text-sm text-mute py-10 text-center">couldn&apos;t reach the network — retrying…</div>}
      {graph && graph !== "error" && total === 0 && (
        <div className="font-mono text-sm text-mute py-10 text-center">no infections yet — the map fills in as $VIRUS spreads. 🦠</div>
      )}

      {laid.length > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-bg2">
            {edges.map((e, i) => (
              <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.teal ? "#2ce5d6" : "#9dff1f"} strokeOpacity={0.14} strokeWidth={1} />
            ))}
            {laid.map((n, i) => {
              const fill = n.kind === "zero" ? "#ff2e88" : n.kind === "station" ? "#2ce5d6" : "#9dff1f";
              return (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r={n.r} fill={fill} fillOpacity={n.kind === "host" ? 0.78 : 0.95} stroke="#070b0a" strokeWidth={1.5}>
                    <title>{`${n.address}\n${n.balance.toLocaleString()} (raw)`}</title>
                  </circle>
                  {n.kind === "zero" && <text x={n.x} y={n.y - n.r - 6} textAnchor="middle" fill="#ff2e88" fontSize="11" fontFamily="monospace">patient zero</text>}
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap gap-4 mt-3 font-mono text-xs text-mute">
            <Legend c="#ff2e88" label="patient zero" />
            <Legend c="#2ce5d6" label="infection station" />
            <Legend c="#9dff1f" label="infected host (size = bag)" />
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{label}</span>;
}
