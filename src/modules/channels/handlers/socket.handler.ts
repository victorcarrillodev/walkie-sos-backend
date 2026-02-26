import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'

export const registerChannelHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user // Ya trae el alias gracias al middleware

  // 1. Unirse a una Frecuencia
  socket.on('join-channel', (channelId: string) => {
    socket.join(channelId)
    console.log(`📻 El compa ${user?.alias} sintonizó el canal ${channelId}`)

    socket.to(channelId).emit('channel-event', {
      type: 'JOINED',
      message: `${user?.alias} se ha unido.`,
      userId: user?.id,
    })
  })

  // 2. Salir de la Frecuencia
  socket.on('leave-channel', (channelId: string) => {
    socket.leave(channelId)
    console.log(`🔇 ${user?.alias} salió del canal ${channelId}`)
  })

  // 3. PTT (Push To Talk)
  socket.on('ptt-start', (channelId: string) => {
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      alias: user?.alias, // Cambiado de username a alias
      isTalking: true,
    })
  })

  socket.on('ptt-end', (channelId: string) => {
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      alias: user?.alias,
      isTalking: false,
    })
  })

  // 4. STREAM DE VOZ
  socket.on('voice-stream', (payload: { channelId: string; audioChunk: ArrayBuffer }) => {
    const { channelId, audioChunk } = payload

    if (!socket.rooms.has(channelId)) {
      console.warn(`⚠️ Compa ${user?.alias} intentó transmitir sin unirse al canal.`)
      return
    }

    socket.to(channelId).emit('voice-stream', {
      userId: user?.id,
      audioChunk: audioChunk,
    })
  })
}
