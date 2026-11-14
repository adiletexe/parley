import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync} from 'node:fs';

// The icon sprite (pastel tiles, larpmotion style A) is inlined into the page: its tiles reference gradients
// by url(#…), which only resolve when the symbols live in the same document.
const icons = {name: 'inline-icons', transformIndexHtml: (html: string) => html.replace('<!--icons-->', readFileSync('src/icons.svg.html', 'utf8'))};

// The API runs on 8787 in dev; the built server serves dist/ itself in production.
export default defineConfig({
  plugins: [react(), icons],
  server: {port: 5173, proxy: {'/api': 'http://localhost:8787'}},
  build: {outDir: 'dist', sourcemap: false},
});
