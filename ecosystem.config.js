module.exports = {
  apps: [
    {
      name: "walkie-talkie-backend", // Nombre para identificarlo en los logs (pm2 logs)

      // ¡IMPORTANTE! En producción corremos el JS compilado, no el TS.
      script: "./dist/server.js",

      // --- RENDIMIENTO (Cluster Mode) ---
      instances: "max",       // Usa todos los CPUs disponibles (vital para audio)
      exec_mode: "cluster",   // Activa el balanceo de carga

      // --- ROBUSTEZ ---
      autorestart: true,      // Si la app crashea, la reinicia automáticamente
      watch: false,           // En producción NO queremos que vigile cambios de archivos (gasta CPU)
      max_memory_restart: '1G', // Si la app consume más de 1GB de RAM, reiníciala (evita fugas de memoria)

      // --- LOGS ---
      // PM2 guardará los logs aquí, aparte de Winston
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,       // Mezcla los logs de todos los clusters (núcleos)

      // --- VARIABLES DE ENTORNO ---
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Aquí podrías sobreescribir otras variables si quisieras
      }
    }
  ]
};