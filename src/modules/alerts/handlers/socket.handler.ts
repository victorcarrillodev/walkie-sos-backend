import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'
import { prisma } from '../../../shared/infra/prisma'

export const registerAlertHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user

  // 1. EL GRITO DE GUERRA (Inicia la alerta y guarda el punto cero)
  socket.on(
    'send-alert',
    async (payload: {
      channelId: string
      lat: number
      lng: number
      type: 'THEFT' | 'PANIC' | 'MEDICAL' | 'SUSPICIOUS'
    }) => {
      try {
        // Corregido: Usamos 'alias', ya no 'username'
        console.log(`🚨 ALERTA RECIBIDA del compa ${user?.alias}: ${payload.type}`)

        // Guardar Alerta en Base de Datos (Historial)
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

        // Notificar en Tiempo Real a todos en el canal
        io.to(payload.channelId).emit('emergency-alert', {
          id: alert.id,
          type: alert.type,
          user: { id: user?.id, alias: user?.alias }, // Corregido a alias
          location: { lat: alert.latitude, lng: alert.longitude },
          timestamp: alert.createdAt,
        })

        // VITAL: Le devolvemos el ID de la alerta al celular para que empiece a mandar su GPS
        socket.emit('alert-created', { alertId: alert.id })
      } catch (error) {
        console.error('Error procesando alerta:', error)
        socket.emit('error', { message: 'No se pudo enviar la alerta' })
      }
    },
  )

  // 2. EL RASTREO EN VIVO (Puro Socket, modo ráfaga)
  // El celular va a disparar esto cada que el compa dé 5 pasos
  socket.on('stream-location', (payload: { channelId: string; alertId: string; lat: number; lng: number }) => {
    // Retransmitimos las coordenadas exactas a la tribu al instante
    socket.to(payload.channelId).emit('live-location-update', {
      alertId: payload.alertId,
      userId: user?.id,
      location: { lat: payload.lat, lng: payload.lng },
      timestamp: new Date().toISOString(),
    })
  })

  // 3. APAGAR LA ALERTA (Cuando ya llegó la ayuda)
  socket.on('resolve-alert', async (payload: { alertId: string; channelId: string }) => {
    try {
      // Actualizamos la base de datos para cerrar el evento
      await prisma.alert.update({
        where: { id: payload.alertId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      })

      console.log(`✅ Alerta ${payload.alertId} resuelta por ${user?.alias}`)

      // Avisamos a todos para que cierren el mapa y apaguen las sirenas
      io.to(payload.channelId).emit('alert-resolved', { alertId: payload.alertId })
    } catch (error) {
      console.error('Error resolviendo alerta:', error)
    }
  })
}
