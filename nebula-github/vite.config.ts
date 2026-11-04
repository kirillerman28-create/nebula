import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// host: true — чтобы потом можно было открыть Nebula с телефона по Wi-Fi (пригодится для PWA).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    // OneDrive/сетевые папки плохо дружат с «родным» слежением за файлами:
    // включаем опрос, чтобы Vite не падал с EBUSY при сохранении.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
