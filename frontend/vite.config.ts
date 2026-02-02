import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0', // Escucha en todas las interfaces de red
    strictPort: false, // Permite usar otro puerto si 3000 está ocupado
    // Permite hosts de ngrok y otros servicios de túnel
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      'localhost',
    ],
    // Para acceso desde celular en la misma WiFi:
    // Usa la IP de tu computadora: http://192.168.0.81:3000
    // Para acceso desde cualquier red:
    // Usa ngrok: npm run dev:tunnel
  }
})

