import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'
import { prisma } from '../../../shared/infra/prisma' // Para guardar la alerta en DB

export const registerAlertHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user

  // Evento: ALERTA DE ROBO / PÁNICO
  socket.on(
    'send-alert',
    async (payload: { channelId: string; lat: number; lng: number; type: 'THEFT' | 'PANIC' | 'MEDICAL' }) => {
      try {
        console.log(`🚨 ALERTA RECIBIDA de ${user?.username}: ${payload.type}`)

        // 1. Guardar Alerta en Base de Datos (Historial)
        const alert = await prisma.alert.create({
          data: {
            type: payload.type,
            latitude: payload.lat,
            longitude: payload.lng,
            userId: user!.id,
            channelId: payload.channelId,
            status: 'ACTIVE',
          },
        })

        // 2. Notificar en Tiempo Real a todos en el canal (PRIORIDAD ALTA)
        io.to(payload.channelId).emit('emergency-alert', {
          id: alert.id,
          type: alert.type,
          user: { id: user?.id, username: user?.username },
          location: { lat: alert.latitude, lng: alert.longitude },
          timestamp: alert.createdAt,
        })
      } catch (error) {
        console.error('Error procesando alerta:', error)
        socket.emit('error', { message: 'No se pudo enviar la alerta' })
      }
    },
  )
}
