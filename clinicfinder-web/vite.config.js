import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Only split heavy libraries by their own path so shared deps (scheduler, etc.) stay in the entry chunk.
        manualChunks(id) {
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'react';
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run|@babel)\//.test(id)) return 'react';
          if (/node_modules\/framer-motion\//.test(id)) return 'motion';
          if (/node_modules\/(three|three-stdlib|@react-three|troika|camera-controls|maath|meshline|stats-gl)/.test(id)) return 'three';
          if (/node_modules\/(recharts|d3-|victory-vendor)/.test(id)) return 'charts';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
  },
});
