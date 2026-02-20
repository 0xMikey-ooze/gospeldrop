import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Nunito'", "sans-serif"],
      },
      colors: {
        primary: "#654AF5",
        "primary-hover": "#533bd6",
        "accent-lavender": "#EBE5FF",
        "accent-orange": "#FFC064",
        "accent-cyan": "#AEEFF0",
        "accent-pink": "#FFC2D1",
        "text-main": "#18181b",
        "text-sub": "#52525b",
      },
      borderRadius: {
        card: "32px",
      },
      boxShadow: {
        primary: "0 12px 30px -8px rgba(101, 74, 245, 0.4)",
        soft: "0 4px 20px rgba(0,0,0,0.06)",
        "primary-hover": "0 15px 35px -5px rgba(101, 74, 245, 0.5)",
        input: "0 8px 40px rgba(0,0,0,0.08)",
      },
      keyframes: {
        floaty: {
          "0%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(2deg)" },
          "100%": { transform: "translateY(0px) rotate(0deg)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
