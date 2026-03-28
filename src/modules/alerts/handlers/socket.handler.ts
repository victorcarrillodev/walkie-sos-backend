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
      isGroup?: boolean
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
            channelId: payload.isGroup ? payload.channelId : undefined,
            targetUserId: !payload.isGroup ? payload.channelId : undefined,
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

  // 3.5 CANCELAR ALERTA (Falsa alarma o cancelada por el usuario)
  socket.on('cancel-alert', async (payload: { alertId: string; channelId?: string }) => {
    try {
      await prisma.alert.update({
        where: { id: payload.alertId },
        data: { status: 'DISMISSED', resolvedAt: new Date() },
      })

      console.log(`❌ Alerta ${payload.alertId} cancelada por ${user?.alias}`)

      if (payload.channelId) {
        io.to(payload.channelId).emit('alert-resolved', { alertId: payload.alertId })
      }
    } catch (error) {
      console.error('Error cancelando alerta:', error)
    }
  })

  // 4. OBTENER HISTORIAL DE ALERTAS
  socket.on('get-alerts-history', async (data: any, callback?: (data: any) => void) => {
    if (typeof data === 'function') {
      callback = data
    }
    try {
      if (!user?.id) return

      // Obtenemos los canales a los que pertenece para incluir las alertas grupales
      const userChannels = await prisma.channelMember.findMany({
         where: { userId: user.id },
         select: { channelId: true }
      })
      const channelIds = userChannels.map(c => c.channelId)

      const alerts = await prisma.alert.findMany({
        where: {
          OR: [
             { userId: user.id },
             { targetUserId: user.id },
             { channelId: { in: channelIds } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
           user: { select: { alias: true, id: true } },
           targetUser: { select: { alias: true, id: true } },
           channel: { select: { name: true, id: true } }
        }
      })
      
      if (callback) callback({ success: true, alerts })
    } catch (e) {
      console.error('Error obteniendo historial de alertas:', e)
      if (callback) callback({ success: false, error: 'Error al obtener alertas' })
    }
  })
}
