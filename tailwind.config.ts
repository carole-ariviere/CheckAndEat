import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7F77DD',
        accent: '#D4537E',
        danger: '#E24B4A',
        warning: '#EF9F27',
        success: '#4CAF50',
        bg: '#EEEDFE',
        card: '#F7F5FF',
        text: '#26215C',
        muted: '#888780',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        title: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
