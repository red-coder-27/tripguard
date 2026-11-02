/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Navigation Sidebar
        nav: {
          bg: '#101B2D',
          secondary: '#17243A',
          border: '#1E2D45',
          muted: '#A7B4C8',
          active: '#22354A',
          accent: '#22C58B',
          hover: '#192A40',
        },
        // Light Workspace
        workspace: {
          bg: '#F5F7FA',
          card: '#FFFFFF',
          muted: '#F0F4F7',
          border: '#E5EAF0',
          text: '#172033',
          secondary: '#64748B',
          subtle: '#94A3B8',
        },
        // Emerald Fintech Accents
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Warning tokens
        warning: {
          bg: '#FEF3C7',
          subtle: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
          primary: '#D97706',
        },
        // Critical tokens
        critical: {
          bg: '#FEE2E2',
          subtle: '#FEF2F2',
          border: '#FECACA',
          text: '#991B1B',
          primary: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
