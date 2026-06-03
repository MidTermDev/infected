"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { INFECTED } from "@/lib/infected";

const MINT = new PublicKey(INFECTED.mint);
const INDEXER = process.env.NEXT_PUBLIC_INDEXER_URL || "https://api.infected.dev";
const COL = { zero: "#ff2e88", station: "#2ce5d6", host: "#9dff1f", edge: "#9dff1f" };

type Kind = "zero" | "station" | "host";
interface RawNode { address: string; balance: number; infector: string | null; kind: Kind; }
interface Graph { nodes: RawNode[]; edges: { from: string; to: string }[]; holders: number; source: "indexer" | "rpc"; }

interface Sim {
  address: string; balance: number; kind: Kind; infector: string | null;
  x: number; y: number; vx: number; vy: number; r: number; depth: number;
}

async function fromIndexer(): Promise<Graph | null> {
  try {
    const r = await fetch(`${INDEXER}/graph`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const g = await r.json();
    if (!Array.isArray(g?.nodes)) return null;
    return { nodes: g.nodes, edges: g.edges ?? [], holders: g.holders ?? g.nodes.length, source: "indexer" };
  } catch { return null; }
}
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
  const nodes: RawNode[] = Object.entries(byOwner).filter(([, b]) => b > 0)
    .map(([address, balance]) => ({ address, balance, infector: null, kind: address === INFECTED.creator ? "zero" : "host" }));
  return { nodes, edges: [], holders: nodes.length, source: "rpc" };
}

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function OutbreakMap() {
  const { connection } = useConnection();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const sim = useRef<Sim[]>([]);
  const edges = useRef<{ a: number; b: number; teal: boolean }[]>([]);
  const idx = useRef<Record<string, number>>({});
  const cam = useRef({ zoom: 1, x: 0, y: 0 });
  const hover = useRef<number>(-1);
  const drag = useRef<{ on: boolean; px: number; py: number }>({ on: false, px: 0, py: 0 });
  const raf = useRef(0);

  const [status, setStatus] = useState<"loading" | "empty" | "error" | "ok">("loading");
  const [stats, setStats] = useState({ infected: 0, links: 0, biggest: 0, source: "" as string });

  const build = useCallback((g: Graph) => {
    const W = wrapRef.current?.clientWidth ?? 760;
    const H = 460, cx = W / 2, cy = H / 2;
    const nodes = [...g.nodes].sort((a, b) => b.balance - a.balance).slice(0, 300);
    const max = Math.max(1, ...nodes.map((n) => n.balance));
    const map: Record<string, number> = {};
    const arr: Sim[] = nodes.map((n, i) => {
      map[n.address] = i;
      const r = n.kind === "zero" ? 16 : 4 + 16 * Math.sqrt(n.balance / max);
      const ang = i * 2.39996, rad = n.kind === "zero" ? 0 : 30 + (i % 40) * 6;
      return { ...n, r, depth: 0, x: cx + rad * Math.cos(ang) + (Math.random() - 0.5) * 8, y: cy + rad * Math.sin(ang) + (Math.random() - 0.5) * 8, vx: 0, vy: 0 };
    });
    // edges (real lineage, or synth burst from zero)
    let E: { a: number; b: number; teal: boolean }[] = [];
    if (g.edges.length) {
      for (const e of g.edges) { const a = map[e.from], b = map[e.to]; if (a != null && b != null && a !== b) E.push({ a, b, teal: arr[a].kind === "station" }); }
    }
    if (!E.length) {
      const z = arr.findIndex((n) => n.kind === "zero");
      const root = z >= 0 ? z : 0;
      arr.forEach((_, i) => { if (i !== root) E.push({ a: root, b: i, teal: false }); });
    }
    // BFS depth from zero (for layout seeding)
    const adj: number[][] = arr.map(() => []);
    for (const e of E) { adj[e.a].push(e.b); }
    const z = arr.findIndex((n) => n.kind === "zero");
    if (z >= 0) {
      const q = [z]; arr[z].depth = 0; const seen = new Set([z]);
      while (q.length) { const u = q.shift()!; for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); arr[v].depth = arr[u].depth + 1; q.push(v); } }
    }
    sim.current = arr; edges.current = E; idx.current = map;
    cam.current = { zoom: 1, x: 0, y: 0 }; hover.current = -1;
    setStats({ infected: g.holders, links: g.edges.length, biggest: max, source: g.source });
    setStatus(arr.length ? "ok" : "empty");
    // warm up the layout
    for (let k = 0; k < 220; k++) step(W, H);
  }, []);

  const load = useCallback(async () => {
    const g = (await fromIndexer()) ?? (await fromRpc(connection.rpcEndpoint).catch(() => null));
    if (!g) { setStatus("error"); return; }
    if (!g.nodes.length) { setStats({ infected: 0, links: 0, biggest: 0, source: g.source }); setStatus("empty"); sim.current = []; edges.current = []; return; }
    build(g);
  }, [connection, build]);

  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  // physics
  function step(W: number, H: number) {
    const n = sim.current; const E = edges.current; const cx = W / 2, cy = H / 2;
    for (let i = 0; i < n.length; i++) {
      const a = n[i];
      for (let j = i + 1; j < n.length; j++) {
        const b = n[j];
        let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy; if (d2 < 1) d2 = 1;
        const f = 520 / d2; const d = Math.sqrt(d2); const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      // center gravity (strong for zero)
      const g = a.kind === "zero" ? 0.06 : 0.012;
      a.vx += (cx - a.x) * g; a.vy += (cy - a.y) * g;
    }
    for (const e of E) {
      const a = n[e.a], b = n[e.b]; const rest = 46 + (a.r + b.r);
      let dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - rest) * 0.015; const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
    for (const a of n) {
      if (a.kind === "zero") { a.vx *= 0.5; a.vy *= 0.5; }
      a.vx *= 0.86; a.vy *= 0.86;
      a.vx = Math.max(-6, Math.min(6, a.vx)); a.vy = Math.max(-6, Math.min(6, a.vy));
      a.x += a.vx; a.y += a.vy;
    }
  }

  // render loop
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let t0 = performance.now();
    const draw = (now: number) => {
      const W = wrapRef.current?.clientWidth ?? 760, H = 460;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px"; }
      const time = (now - t0) / 1000;
      if (sim.current.length) step(W, H);
      const n = sim.current, E = edges.current, c = cam.current, hv = hover.current;
      const sx = (x: number) => (x - W / 2) * c.zoom + W / 2 + c.x;
      const sy = (y: number) => (y - H / 2) * c.zoom + H / 2 + c.y;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // backdrop glow
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
      bg.addColorStop(0, "rgba(157,255,31,0.05)"); bg.addColorStop(1, "rgba(7,11,10,0)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const neighbor = new Set<number>();
      if (hv >= 0) { neighbor.add(hv); for (const e of E) { if (e.a === hv) neighbor.add(e.b); if (e.b === hv) neighbor.add(e.a); } }

      // edges + traveling infection pulses
      for (const e of E) {
        const a = n[e.a], b = n[e.b]; if (!a || !b) continue;
        const hot = hv < 0 ? false : (e.a === hv || e.b === hv);
        ctx.strokeStyle = e.teal ? COL.station : COL.edge;
        ctx.globalAlpha = hv < 0 ? 0.1 : hot ? 0.55 : 0.03;
        ctx.lineWidth = hot ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
        // pulse dot traveling infector -> host
        if (hv < 0 || hot) {
          const ph = (time * 0.35 + (e.a * 0.13 + e.b * 0.07)) % 1;
          const px = sx(a.x + (b.x - a.x) * ph), py = sy(a.y + (b.y - a.y) * ph);
          ctx.globalAlpha = hv < 0 ? 0.5 : 0.9; ctx.fillStyle = e.teal ? COL.station : COL.edge;
          ctx.beginPath(); ctx.arc(px, py, hot ? 2.4 : 1.6, 0, 7); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // nodes
      for (let i = 0; i < n.length; i++) {
        const a = n[i]; const X = sx(a.x), Y = sy(a.y), R = a.r * c.zoom;
        const col = COL[a.kind]; const dim = hv >= 0 && !neighbor.has(i);
        // pulsing halo for zero/station
        if (a.kind !== "host") {
          const pr = R + 6 + Math.sin(time * 2 + (a.kind === "zero" ? 0 : 1)) * 4;
          ctx.globalAlpha = 0.18; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(X, Y, pr, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = dim ? 0.18 : 1;
        ctx.shadowColor = col; ctx.shadowBlur = a.kind === "host" ? 8 : 18;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(X, Y, R, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#070b0a"; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // labels for hubs + hovered
      ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center";
      for (let i = 0; i < n.length; i++) {
        const a = n[i];
        if (a.kind === "host" && i !== hv) continue;
        ctx.fillStyle = a.kind === "zero" ? COL.zero : a.kind === "station" ? COL.station : "#eafff2";
        const label = a.kind === "zero" ? "patient zero" : a.kind === "station" ? "station" : short(a.address);
        ctx.fillText(label, sx(a.x), sy(a.y) - a.r * c.zoom - 7);
      }
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // interaction
  function pick(e: React.PointerEvent) {
    const cv = canvasRef.current!, rect = cv.getBoundingClientRect();
    const W = wrapRef.current?.clientWidth ?? 760, H = 460, c = cam.current;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = -1, bd = 16 * 16;
    const n = sim.current;
    for (let i = 0; i < n.length; i++) {
      const X = (n[i].x - W / 2) * c.zoom + W / 2 + c.x, Y = (n[i].y - H / 2) * c.zoom + H / 2 + c.y;
      const d = (mx - X) ** 2 + (my - Y) ** 2; const rr = Math.max(10, n[i].r * c.zoom + 6) ** 2;
      if (d < rr && d < bd) { bd = d; best = i; }
    }
    return { best, mx, my };
  }
  function onMove(e: React.PointerEvent) {
    if (drag.current.on) {
      cam.current.x += e.clientX - drag.current.px; cam.current.y += e.clientY - drag.current.py;
      drag.current.px = e.clientX; drag.current.py = e.clientY; return;
    }
    const { best, mx, my } = pick(e); hover.current = best;
    const tip = tipRef.current!;
    if (best >= 0) {
      const a = sim.current[best];
      const inf = a.infector ? `infected by ${short(a.infector)}` : a.kind === "zero" ? "the origin" : "—";
      tip.style.display = "block"; tip.style.left = mx + 14 + "px"; tip.style.top = my + 12 + "px";
      tip.innerHTML = `<b style="color:${COL[a.kind]}">${a.kind === "zero" ? "PATIENT ZERO" : a.kind === "station" ? "INFECTION STATION" : short(a.address)}</b><br/>${fmt(a.balance / 1e6)} $VIRUS<br/><span style="color:#86a89a">${inf}</span>`;
      canvasRef.current!.style.cursor = "pointer";
    } else { tip.style.display = "none"; canvasRef.current!.style.cursor = drag.current.on ? "grabbing" : "grab"; }
  }
  function onDown(e: React.PointerEvent) { const { best } = pick(e); if (best < 0) { drag.current = { on: true, px: e.clientX, py: e.clientY }; } }
  function onUp() { drag.current.on = false; }
  function onLeave() { hover.current = -1; if (tipRef.current) tipRef.current.style.display = "none"; }
  function onWheel(e: React.WheelEvent) { const z = cam.current.zoom * (e.deltaY < 0 ? 1.12 : 0.89); cam.current.zoom = Math.max(0.4, Math.min(4, z)); }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-display font-700 text-xl">🗺️ live outbreak map</div>
        <div className="flex gap-2 flex-wrap">
          <span className="chip">{stats.infected ? `${stats.infected} infected` : "—"}</span>
          <span className="chip">{stats.links ? `${stats.links} infection links` : stats.source === "rpc" ? "lineage: pending" : "—"}</span>
        </div>
      </div>
      <p className="text-mute text-sm mt-1 mb-4">
        Every wallet holding $VIRUS, sized by bag, pulsing along the chains of infection.
        Hover to trace a host · scroll to zoom · drag to pan.
      </p>

      {status === "loading" && <div className="font-mono text-sm text-mute py-16 text-center">scanning the population…</div>}
      {status === "error" && <div className="font-mono text-sm text-mute py-16 text-center">couldn&apos;t reach the network — retrying…</div>}
      {status === "empty" && <div className="font-mono text-sm text-mute py-16 text-center">no infections yet — the map comes alive as $VIRUS spreads. 🦠</div>}

      <div ref={wrapRef} className={`relative ${status === "ok" ? "" : "hidden"}`}>
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl border border-line bg-bg2 touch-none select-none"
          style={{ height: 460 }}
          onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onLeave} onWheel={onWheel}
        />
        <div ref={tipRef} className="pointer-events-none absolute z-10 hidden rounded-lg border border-line bg-bg/95 px-2.5 py-1.5 text-xs font-mono leading-relaxed shadow-lg" style={{ display: "none" }} />
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 font-mono text-[11px] text-mute bg-bg/60 rounded-lg px-2 py-1">
          <Legend c={COL.zero} label="patient zero" />
          <Legend c={COL.station} label="station" />
          <Legend c={COL.host} label="host" />
        </div>
      </div>
    </div>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />{label}</span>;
}
