import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ossimulator/',
  plugins: [react()],
  server: {
    port: 5174,
  },
  preview: {
    host: '127.0.0.1',
    port: 8082,
    allowedHosts: ['ddyoru.duckdns.org'],
  },
});
