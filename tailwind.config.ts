import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8744A',
          dark: '#C9572D',
          soft: '#FCD9C5',
          tint: '#FFEADB',
        },
        ink: {
          DEFAULT: '#2B1F15',
          soft: '#4F3D2D',
          muted: '#8C7B6A',
          light: '#C2B5A4',
          faint: '#E8DFCE',
        },
        paper: {
          DEFAULT: '#FDF8F0',
          cream: '#F7EFE3',
          bright: '#FFFFFF',
        },
        accent: {
          peach: '#FCE4D2',
          peachBright: '#FFCCA8',
          butter: '#FFE9B0',
          butterBright: '#FFD66B',
          mint: '#D8EBDC',
          mintDeep: '#5A9168',
          sky: '#DCE9F2',
          skyDeep: '#5A8AA8',
        },
        status: {
          success: '#6BA475',
          warning: '#E89C2D',
          error: '#C04830',
          gold: '#F4B73E',
        }
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        numeric: ['var(--font-manrope)', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
