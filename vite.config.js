import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { target: 'chrome140', chunkSizeWarningLimit: 1100 } });
