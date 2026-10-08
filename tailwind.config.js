/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grey: '#f2f2f2',
        black: '#000000',
        green: '#5e7333',
        'dark-grey': '#333333',
        white: '#ffffff',
      },
      fontFamily: {
        primary: ['"TAY Makawao"', 'sans-serif'],
        body: ['"PT Mono"', 'monospace'],
        buttons: ['"Roboto Slab"', 'serif'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '15px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'full': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-in-out',
        'fade-in-slow': 'fadeIn 1.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
