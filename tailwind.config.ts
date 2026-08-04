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
          DEFAULT: '#DDA0DD',
          dark: '#8A4E8A',
          soft: '#FFB6C1',
          tint: '#DDA0DD',
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
          peach: '#FFB6C1',
          peachBright: '#FFCCA8',
          butter: '#F0E68C',
          butterBright: '#FFD66B',
          mint: '#90EE90',
          mintDeep: '#3E7648',
          sky: '#87CEEB',
          skyDeep: '#3B718F',
        },
        status: {
          success: '#3E7648',
          warning: '#A88414',
          error: '#B82E1E',
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
        "glass-gradient": "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 100%)",
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(43, 31, 21, 0.01), 0 1px 3px 0 rgba(43, 31, 21, 0.01)',
        'DEFAULT': '0 2px 4px 0 rgba(43, 31, 21, 0.02), 0 4px 12px 0 rgba(43, 31, 21, 0.03), 0 0 0 1px rgba(43, 31, 21, 0.01)',
        'md': '0 4px 6px -1px rgba(43, 31, 21, 0.02), 0 8px 16px -2px rgba(43, 31, 21, 0.03), 0 0 0 1px rgba(43, 31, 21, 0.01)',
        'lg': '0 10px 15px -3px rgba(43, 31, 21, 0.03), 0 16px 32px -4px rgba(43, 31, 21, 0.04), 0 0 0 1px rgba(43, 31, 21, 0.01)',
        'xl': '0 20px 25px -5px rgba(43, 31, 21, 0.03), 0 25px 50px -12px rgba(43, 31, 21, 0.04), 0 0 0 1px rgba(43, 31, 21, 0.01)',
        '2xl': '0 25px 50px -12px rgba(43, 31, 21, 0.04), 0 35px 80px -15px rgba(43, 31, 21, 0.05), 0 0 0 1px rgba(43, 31, 21, 0.01)',
        'glass': '0 8px 32px 0 rgba(43, 31, 21, 0.03), 0 0 0 1px rgba(255, 255, 255, 0.5)',
        'glass-hover': '0 12px 40px 0 rgba(43, 31, 21, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.6)',
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '12px',
        '3xl': '12px',
        'full': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
