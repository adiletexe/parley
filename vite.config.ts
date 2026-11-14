import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync} from 'node:fs';

// The icon sprites (pastel tiles, larpmotion style A) are inlined into the page: their tiles reference gradients
// by url(#…), which only resolve when the symbols live in the same document. icons-parley.svg.html is the drawn
// one-per-meaning set (made by scripts/build-icons.mjs) and reuses the first sprite's tile gradients.
const icons = {name: 'inline-icons', transformIndexHtml: (html: string) => html.replace('<!--icons-->',
  readFileSync('src/icons.svg.html', 'utf8') + readFileSync('src/icons-parley.svg.html', 'utf8'))};

// The API runs on 8787 in dev; the built server serves dist/ itself in production.
export default defineConfig({
  plugins: [react(), icons],
  server: {port: 5173, proxy: {'/api': 'http://localhost:8787'}},
  build: {outDir: 'dist', sourcemap: false},
});
