import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1d4ed8',
          dark: '#1e40af',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
