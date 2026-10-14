import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Supabase 기본 Site URL(http://localhost:3000)과 맞춰 이메일 인증 링크가 바로 앱으로 돌아오게 함
    port: 3000,
    strictPort: true,
  },
});
