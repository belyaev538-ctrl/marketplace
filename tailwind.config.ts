import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    /** `lib/catalog-category-tiles.ts` и др. — динамические `bg-[#…]` у плиток каталога */
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        blueDark: "#004DFF",
        blue: "#0075FF",
        blueNavy: "#052850",
        blueSteel: "#3E6897",
        blueSteel2: "#032339",
        blueExtraLight: "#DEECFF",
        blueUltraLight: "#F3F8FF",
        blueLight: "#6CABFF",
        green: "#66C638",
        graySoft: "#B7C5D5",
      },
    },
  },
  plugins: [],
};
export default config;
