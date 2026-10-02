import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'models/*.onnx'],
      manifest: {
        name: 'Calcink - Digital Ink Calculator',
        short_name: 'Calcink',
        description: 'On-device handwritten math evaluation scratchpad',
        theme_color: '#ffffff',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,onnx,wasm}'],
      },
    }),
  ],
});