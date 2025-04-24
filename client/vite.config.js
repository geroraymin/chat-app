import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // Vercel 배포를 위한 base 설정
  server: {
    port: 5177,
    fs: {
      strict: false,
    },
    historyApiFallback: true,  // ✅ 추가: /room/abc 등 새로고침 시 index.html로 fallback
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',  // 코드 최적화
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
  }
});
