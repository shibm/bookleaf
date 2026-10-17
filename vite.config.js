import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = `http://127.0.0.1:${process.env.PORT || env.PORT || 3000}`;
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: { manualChunks: { react: ['react', 'react-dom'] } },
      },
    },
    server: {
      proxy: {
        '/api': backend,
        '/health': backend,
      },
    },
  };
});
