import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// Same-origin proxy to mainnet Helius — keeps the API key server-side.
export async function POST(req: Request) {
  const target = process.env.HELIUS_RPC_URL;
  if (!target) return NextResponse.json({ error: "HELIUS_RPC_URL not configured" }, { status: 503 });
  const body = await req.text();
  const res = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" } });
}
