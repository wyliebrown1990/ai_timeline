/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /**
       * Custom color palette for AI Timeline
       * Era colors used for timeline bands and event markers
       */
      colors: {
        era: {
          foundations: '#6B7280',
          birthOfAi: '#8B5CF6',
          symbolic: '#3B82F6',
          statistical: '#10B981',
          deepLearning: '#F59E0B',
          transformers: '#EF4444',
          scaling: '#EC4899',
          alignment: '#8B5CF6',
          multimodal: '#06B6D4',
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
    },
  },
  plugins: [],
};
