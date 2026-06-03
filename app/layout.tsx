import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Infected — $VIRUS. you can only buy if you're infected.",
  description:
    "Infected ($VIRUS) is a Solana token with an on-chain infection rule: you can only buy if you already hold it. Get infected — have a holder send you some — then spread it.",
  openGraph: {
    title: "Infected — $VIRUS",
    description: "You can only buy if you're infected. Get someone to send you $VIRUS, then spread it.",
    images: ["/infected.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
