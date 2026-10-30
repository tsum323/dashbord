import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Сайт публикуется на GitHub Pages по адресу https://tsum323.github.io/dashbord/
export default defineConfig({
  base: '/dashbord/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
