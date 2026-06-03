import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070b0a",
        bg2: "#0b1311",
        panel: "#0e1714",
        line: "#1c2a25",
        ink: "#eafff2",
        mute: "#86a89a",
        toxic: "#9dff1f", // neon lime — primary
        teal: "#2ce5d6",
        grape: "#a368ff",
        magenta: "#ff2e88",
        blood: "#ff3b3b",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        body: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontWeight: { "400": "400", "500": "500", "600": "600", "700": "700", "800": "800" },
    },
  },
  plugins: [],
} satisfies Config;
