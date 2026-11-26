import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Where the holo's page fetches what the game loads at run time (the fixture
// holo and model.prism.json): the live Pages site, since a holo's page runs in
// a sandboxed frame with no files of its own beside it.
const holoAssetBase = process.env.HOLO_ASSET_BASE ?? 'https://afflom.github.io/karst-zero/';

export default defineConfig(({mode}) => {
  // `vite build --mode holo` writes the game into view/, the page of the Prism
  // holo: one self-contained script and stylesheet, no chunks, no public files.
  const holo = mode === 'holo';
  return {
    base: './',
    ...(holo
      ? {
          define: {'import.meta.env.BASE_URL': JSON.stringify(holoAssetBase)},
          build: {
            outDir: 'view',
            emptyOutDir: true,
            copyPublicDir: false,
            cssCodeSplit: false,
            modulePreload: false,
            assetsInlineLimit: Number.MAX_SAFE_INTEGER,
            chunkSizeWarningLimit: 4096,
            rollupOptions: {
              output: {
                codeSplitting: false,
                entryFileNames: 'game.js',
                assetFileNames: 'game[extname]',
              },
            },
          },
        }
      : {}),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        'node:crypto': path.resolve(import.meta.dirname, './src/shims/node-crypto.ts'),
        'node:fs/promises': path.resolve(import.meta.dirname, './src/shims/node-empty.ts'),
        'node:http': path.resolve(import.meta.dirname, './src/shims/node-empty.ts'),
        'node:path': path.resolve(import.meta.dirname, './src/shims/node-empty.ts'),
        'node:url': path.resolve(import.meta.dirname, './src/shims/node-empty.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
