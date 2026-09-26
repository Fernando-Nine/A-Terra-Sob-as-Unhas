import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// O codigo-fonte fica em fonte/. O build sai em dist/ e scripts/publicar.js
// copia para a raiz do repositorio, que e o que o GitHub Pages serve.
const raiz = resolve(import.meta.dirname, 'fonte');

export default defineConfig({
  root: raiz,
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: resolve(raiz, 'index.html'),
        mestre: resolve(raiz, 'mestre.html'),
      },
    },
  },
});
