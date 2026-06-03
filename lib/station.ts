"use client";

import {
  Connection, PublicKey, SystemProgram, TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getMint,
} from "@solana/spl-token";
import { Buffer } from "buffer";
import { INFECTED } from "@/lib/infected";

export const MINT = new PublicKey(INFECTED.mint);
export const HOOK = new PublicKey(INFECTED.hookProgram);
export const STATION_PROGRAM = new PublicKey(INFECTED.stationProgram);
export const TREASURY = new PublicKey(INFECTED.treasury);

const INFECT_DISC = Uint8Array.from([200, 225, 156, 228, 161, 126, 41, 46]);

export const stationPda = () => PublicKey.findProgramAddressSync([Buffer.from("station"), MINT.toBuffer()], STATION_PROGRAM)[0];
export const vaultAta = () => getAssociatedTokenAddressSync(MINT, stationPda(), true, TOKEN_2022_PROGRAM_ID);
export const hookMetaList = () => PublicKey.findProgramAddressSync([Buffer.from("extra-account-metas"), MINT.toBuffer()], HOOK)[0];
export const hookConfig = () => PublicKey.findProgramAddressSync([Buffer.from("config"), MINT.toBuffer()], HOOK)[0];

export interface StationState {
  basePrice: bigint;
  increment: bigint;
  dose: bigint;
  infections: bigint;
  priceLamports: bigint; // current price for the next infection
  decimals: number;
  reserve: bigint; // tokens left in the vault
}

const u64 = (b: Buffer, o: number) => b.readBigUInt64LE(o);

/** Read the station account + mint decimals + vault balance. null if not initialized yet. */
export async function readStation(connection: Connection): Promise<StationState | null> {
  const acc = await connection.getAccountInfo(stationPda(), "confirmed");
  if (!acc) return null;
  const d = acc.data;
  // 8 disc | authority 32 | mint 32 | treasury 32 | base_price 8 | increment 8 | dose 8 | infections 8 | bump 1
  let o = 8 + 32 + 32 + 32;
  const basePrice = u64(d, o); o += 8;
  const increment = u64(d, o); o += 8;
  const dose = u64(d, o); o += 8;
  const infections = u64(d, o); o += 8;
  const priceLamports = basePrice + increment * infections;

  let decimals = 6;
  try { decimals = (await getMint(connection, MINT, "confirmed", TOKEN_2022_PROGRAM_ID)).decimals; } catch { /* keep default */ }
  let reserve = 0n;
  try {
    const v = await connection.getTokenAccountBalance(vaultAta(), "confirmed");
    reserve = BigInt(v.value.amount);
  } catch { /* no vault yet */ }

  return { basePrice, increment, dose, infections, priceLamports, decimals, reserve };
}

/** Build the `infect` instruction (payer pays current price, receives one dose). */
export function buildInfectIx(payer: PublicKey): TransactionInstruction {
  const station = stationPda();
  return new TransactionInstruction({
    programId: STATION_PROGRAM,
    data: Buffer.from(INFECT_DISC),
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: station, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: vaultAta(), isSigner: false, isWritable: true },
      { pubkey: getAssociatedTokenAddressSync(MINT, payer, true, TOKEN_2022_PROGRAM_ID), isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // remaining: hook program + ExtraAccountMetaList + HookConfig (hook-aware payout)
      { pubkey: HOOK, isSigner: false, isWritable: false },
      { pubkey: hookMetaList(), isSigner: false, isWritable: false },
      { pubkey: hookConfig(), isSigner: false, isWritable: false },
    ],
  });
}

export const fmtSol = (lamports: bigint) => (Number(lamports) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 });
export const fmtTokens = (raw: bigint, decimals: number) =>
  (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 0 });
