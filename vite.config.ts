import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

// Сайт публикуется на GitHub Pages по адресу https://tsum323.github.io/dashbord/
export default defineConfig({
  base: '/dashbord/',
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
