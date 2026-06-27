module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      // Skyroom design tokens (bound to the CSS variables defined in
      // src/skyroom-theme.css). Lets components use e.g. bg-skyroom-surface,
      // text-skyroom-ink, border-skyroom-border, ring-skyroom-accent.
      colors: {
        skyroom: {
          bg: 'var(--color-background)',
          surface: 'var(--skyroom-surface)',
          surface2: 'var(--skyroom-surface-2)',
          surface3: 'var(--skyroom-surface-3)',
          border: 'var(--skyroom-border)',
          borderStrong: 'var(--skyroom-border-strong)',
          ink: 'var(--skyroom-text-primary)',
          inkSecondary: 'var(--skyroom-text-secondary)',
          inkMuted: 'var(--skyroom-text-muted)',
          accent: 'var(--skyroom-accent)',
          brand: {
            50: 'var(--skyroom-brand-50)',
            100: 'var(--skyroom-brand-100)',
            200: 'var(--skyroom-brand-200)',
            300: 'var(--skyroom-brand-300)',
            400: 'var(--skyroom-brand-400)',
            500: 'var(--skyroom-brand-500)',
            600: 'var(--skyroom-brand-600)',
            700: 'var(--skyroom-brand-700)',
          },
        },
      },
      fontFamily: {
        sans: ['IRANYekan', 'Source Sans Pro', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
