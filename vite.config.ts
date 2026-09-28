/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  server: { port: 5180, strictPort: true, open: '/#gas' },
  preview: { port: 4180, strictPort: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
