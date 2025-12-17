/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /**
       * Anthropic Warm color palette
       * Elegant, minimal design with warm tones
       */
      colors: {
        // Primary accent - coral/terracotta
        primary: {
          50: '#FEF6F3',
          100: '#FDE9E3',
          200: '#FBD5CA',
          300: '#F4AA96',
          400: '#E8846A',
          500: '#E07A5F', // Main accent
          600: '#C9604A',
          700: '#A84D3D',
          800: '#8A4035',
          900: '#723830',
        },
        // Warm backgrounds
        warm: {
          50: '#FAF9F7',   // Light mode background
          100: '#F5F3EF',
          200: '#EBE8E2',
          300: '#DDD8CE',
          400: '#C4BDB0',
          500: '#A9A193',
          600: '#8E8678',
          700: '#736C60',
          800: '#5C564C',
          900: '#1a1a1a',  // Dark mode background
          950: '#141414',
        },
        // Warm gray for text
        warmGray: {
          50: '#FAF9F7',
          100: '#F3F1ED',
          200: '#E8E5DE',
          300: '#D5D0C6',
          400: '#B5AE9F',
          500: '#968E7E',
          600: '#7A7367',
          700: '#5F5850',
          800: '#2D3436', // Main text
          900: '#1C1E1F',
        },
        // Era colors (keeping for timeline)
        era: {
          foundations: '#8E8678',
          birthOfAi: '#9F7F5F',
          symbolic: '#7A8B7A',
          statistical: '#6B8E7A',
          deepLearning: '#D4A373',
          transformers: '#E07A5F',
          scaling: '#C9604A',
          alignment: '#A84D3D',
          multimodal: '#8E6B5A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'warm-sm': '0 1px 2px 0 rgba(45, 52, 54, 0.05)',
        'warm': '0 1px 3px 0 rgba(45, 52, 54, 0.1), 0 1px 2px -1px rgba(45, 52, 54, 0.1)',
        'warm-md': '0 4px 6px -1px rgba(45, 52, 54, 0.1), 0 2px 4px -2px rgba(45, 52, 54, 0.1)',
        'warm-lg': '0 10px 15px -3px rgba(45, 52, 54, 0.1), 0 4px 6px -4px rgba(45, 52, 54, 0.1)',
      },
    },
  },
  plugins: [],
};
