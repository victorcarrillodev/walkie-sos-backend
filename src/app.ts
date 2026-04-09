import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import authRoutes from './modules/auth/auth.routes' // <--- IMPORTAR
import channelRoutes from './modules/channels/channels.routes'
import contactRoutes from './modules/contacts/contacts.routes'
import alertRoutes from './modules/alerts/alerts.routes'

import { env } from './config/env'

import swaggerJsDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import path from 'path'

// Inicializamos la app
const app: Application = express()

// Middlewares Globales
app.use(helmet()) // Headers de seguridad
app.use(
  cors({
    origin: env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json()) // Body parser para JSON
app.use(morgan('dev')) // Logger de peticiones HTTP

// Rutas
app.use('/api/auth', authRoutes) // <--- AGREGAR RUTA BASE
app.use('/api/channels', channelRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/alerts', alertRoutes)
// Health Check (Útil para saber si el VPS está vivo)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() })
})

// Aquí importarás tus rutas modulares más adelante
// app.use('/api/auth', authRoutes);

// 1. Opciones de configuración de Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Backend',
      version: '1.0.0',
      description: 'Documentación de los endpoints de la API',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Cambiarás esto por el dominio de tu VPS luego
      },
    ],
  },
  // 2. Dónde buscará Swagger los comentarios (apunta a tus rutas/controladores)
  apis: [path.join(__dirname, './routes/*.ts')],
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

// 3. Montar la interfaz de Swagger en una ruta
app.use('/docs/api', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
export default app
