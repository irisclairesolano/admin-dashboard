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
          DEFAULT: '#0D1B3D',
          dark: '#060C1B',
          soft: '#2C5E7A',
          tint: '#EBF0F6',
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#334155',
          muted: '#64748B',
          light: '#94A3B8',
          faint: '#E2E8F0',
        },
        paper: {
          DEFAULT: '#F4F7FC',
          cream: '#E2E8F0',
          bright: '#FFFFFF',
        },
        accent: {
          peach: '#FFC5D0',
          peachBright: '#FFDBE2',
          butter: '#FDF289',
          butterBright: '#FEF7C3',
          mint: '#98FB98',
          mintDeep: '#1E4D2B',
          sky: '#B0E2FF',
          skyDeep: '#1D4ED8',
        },
        status: {
          success: '#15803D',
          warning: '#D97706',
          error: '#B91C1C',
          gold: '#EAB308',
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
        'sm': '0 2px 4px rgba(13, 27, 61, 0.03), 0 1px 2px rgba(13, 27, 61, 0.03)',
        'DEFAULT': '0 6px 16px rgba(13, 27, 61, 0.05), 0 1px 3px rgba(13, 27, 61, 0.03)',
        'md': '0 10px 20px -3px rgba(13, 27, 61, 0.06), 0 4px 6px -2px rgba(13, 27, 61, 0.04)',
        'lg': '0 20px 32px -4px rgba(13, 27, 61, 0.07), 0 8px 16px -4px rgba(13, 27, 61, 0.05)',
        'xl': '0 25px 45px -5px rgba(13, 27, 61, 0.08), 0 12px 24px -6px rgba(13, 27, 61, 0.06)',
        '2xl': '0 35px 60px -10px rgba(13, 27, 61, 0.12), 0 15px 30px -5px rgba(13, 27, 61, 0.08)',
        'glass': '0 8px 32px rgba(13, 27, 61, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'glass-hover': '0 16px 48px rgba(13, 27, 61, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
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
