import http from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { env } from './config/env'
import app from './app'

// 1. Importamos el Middleware de Auth
import { socketAuthMiddleware, AuthenticatedSocket } from './shared/middlewares/auth.socket'

// 2. Importamos los Handlers Modulares
import { registerChannelHandlers } from './modules/channels/handlers/socket.handler'
import { registerAlertHandlers } from './modules/alerts/handlers/socket.handler'

// 3. Importamos el Logger (Winston) para logs profesionales
import { Logger } from './shared/utils/logger'

// // Cargar variables de entorno
// dotenv.config()

const PORT = env.PORT || 3000

// Crear servidor HTTP crudo
const httpServer = http.createServer(app)

// Inicializar Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Transporte optimizado para audio binario (Walkie Talkie)
  maxHttpBufferSize: 1e6, // 1MB por mensaje
  pingTimeout: 60000, // Timeout extendido para móviles
})

// --- SEGURIDAD GLOBAL ---
// Middleware que rechaza conexiones sin Token válido
io.use(socketAuthMiddleware)

// --- LÓGICA DE CONEXIÓN ---
io.on('connection', (socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user

  // Log de conexión exitosa
  Logger.info(`✅ Conectado: ${user?.username} (ID: ${user?.id})`)

  // ---------------------------------------------------------
  // CARGA DE MÓDULOS
  // ---------------------------------------------------------

  // 1. Walkie Talkie
  registerChannelHandlers(io, authSocket)

  // 2. Alertas
  registerAlertHandlers(io, authSocket)

  // ---------------------------------------------------------

  // Evento global de desconexión
  socket.on('disconnect', (reason) => {
    Logger.info(`❌ Desconectado: ${user?.username} (Razón: ${reason})`)
  })
})

// Manejo de errores de autenticación (Handshake fallido)
io.engine.on('connection_error', (err) => {
  const req = err.req as any
  Logger.warn(`🔒 Conexión rechazada: ${err.message} - IP: ${req?.socket?.remoteAddress}`)
})

// Levantar el servidor
httpServer.listen(PORT, () => {
  Logger.info(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  Logger.info(`🔌 Sistema de Walkie Talkie & Alertas ACTIVO`)
})
