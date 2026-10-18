/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#FAFAFA',
        ink: '#1A1A1A',
        muted: '#6B7280',
        accent: '#0D9488',
        'accent-soft': '#CCFBF1',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      maxWidth: {
        prose: '720px',
      },
    },
  },
  plugins: [],
};
