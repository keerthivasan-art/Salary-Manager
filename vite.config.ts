import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [
    react(),
    electron([
      {
        entry: resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist-electron/main'),
            rollupOptions: {
              external: ['electron'],
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
            },
          },
        },
      },
      {
        entry: resolve(__dirname, 'src/main/preload.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist-electron/main'),
          },
        },
      },
    ]),
    renderer(),
  ],
});
