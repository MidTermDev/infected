// Infected — $VIRUS. Central constants for the site.
export const INFECTED = {
  name: "Infected",
  ticker: "$VIRUS",
  mint: "SqY8dqKUSJNcD1YG3xHkLhsZvReHXT7B8s535Hn1666",
  hookProgram: "2hdbA2wNSqCDg3RLSd4Gm1TTzbBAHCvhnrrKR8bqR7xk",
  stationProgram: "B3fVADLLzusKTDKKoE5ukBHFcRskcv5UYRzaHzi5yAni",
  treasury: "7BtwAHaXCki5BKFQz2fKQQAjmNWiq6JkmTS6GwTX5kfi",
  creator: "B4bvVXp9H1ZSkNsBzMmQzNcpUDJtcHhjNnwGkDSUKhsB", // patient zero
};

export const QUOTE_MINT = "So11111111111111111111111111111111111111112"; // wSOL

export const LINKS = {
  x: "https://x.com/InfectedDotDev",
  telegram: "https://t.me/Infected_Portal",
  jupiter: `https://jup.ag/?buy=${INFECTED.mint}&sell=${QUOTE_MINT}`,
  dexscreener: `https://dexscreener.com/solana/${INFECTED.mint}`,
  solscanToken: `https://solscan.io/token/${INFECTED.mint}`,
  hookRepo: "https://github.com/MidTermDev/infection-hook",
  stationRepo: "https://github.com/MidTermDev/infection-station",
  hookProgramSolscan: `https://solscan.io/account/${INFECTED.hookProgram}`,
};

/** Same-origin RPC proxy (mainnet Helius, key kept server-side). */
export function rpcUrl(): string {
  if (typeof window === "undefined") return "https://api.mainnet-beta.solana.com";
  return `${window.location.origin}/api/rpc`;
}
