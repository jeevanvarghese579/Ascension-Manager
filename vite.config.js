import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for Firebase Hosting
export default defineConfig({
  plugins: [react()],
  // Use relative paths for development, but absolute root paths for production
  // so Firebase Hosting can locate the assets correctly.
  base: process.env.NODE_ENV === 'production' ? '/' : './',
  build: {
    outDir: 'dist',
    rollupOptions: {},
  },
});