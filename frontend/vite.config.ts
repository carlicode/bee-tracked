import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true, // Permite acceso desde la red local
    // Para acceso desde celular en la misma WiFi:
    // Usa la IP de tu computadora: http://192.168.x.x:3000
  }
})

