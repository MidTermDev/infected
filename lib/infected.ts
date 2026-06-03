// Infected — $VIRUS. Central constants for the site.
export const INFECTED = {
  name: "Infected",
  ticker: "$VIRUS",
  mint: "SqY8dqKUSJNcD1YG3xHkLhsZvReHXT7B8s535Hn1666",
  hookProgram: "2hdbA2wNSqCDg3RLSd4Gm1TTzbBAHCvhnrrKR8bqR7xk",
};

export const QUOTE_MINT = "So11111111111111111111111111111111111111112"; // wSOL

export const LINKS = {
  x: "https://x.com/InfectedDotDev",
  jupiter: `https://jup.ag/?buy=${INFECTED.mint}&sell=${QUOTE_MINT}`,
  dexscreener: `https://dexscreener.com/solana/${INFECTED.mint}`,
  solscanToken: `https://solscan.io/token/${INFECTED.mint}`,
  hookRepo: "https://github.com/MidTermDev/infection-hook",
  hookProgramSolscan: `https://solscan.io/account/${INFECTED.hookProgram}`,
};
