import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'

export const registerChannelHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user

  if (user?.id) {
    socket.join(user.id)
    console.log(`📡 [${user.alias}] conectado y listo para recibir audio.`)
  }

  socket.on('join-channel', (channelId: string) => {
    socket.join(channelId)
    console.log(`📻 [${user?.alias}] sintonizó la frecuencia: ${channelId}`)
  })

  // ==========================================
  // 🎙️ NUEVA LÓGICA DE AUDIO CON DEBUG
  // ==========================================
  socket.on('send-audio', (payload: { channelId: string; audioData: string }) => {
    // 1. Este log nos dirá si el paquete llegó al servidor
    console.log(`🚀 RECIBIENDO AUDIO de ${user?.alias} (${payload.audioData.length} bytes)`)

    // 2. Reenviamos el audio
    socket.to(payload.channelId).emit('receive-audio', {
      userId: user?.id,
      alias: user?.alias,
      audioData: payload.audioData,
    })

    // 3. Confirmación de reenvío
    console.log(`🔊 REENVIADO: Audio de ${user?.alias} enviado al canal ${payload.channelId}`)
  })

  socket.on('ptt-start', (channelId: string) => {
    console.log(`🎙️ PTT START: ${user?.alias} presionó el botón`)
    socket.to(channelId).emit('ptt-status', { userId: user?.id, isTalking: true })
  })

  socket.on('ptt-end', (channelId: string) => {
    console.log(`🔇 PTT END: ${user?.alias} soltó el botón`)
    socket.to(channelId).emit('ptt-status', { userId: user?.id, isTalking: false })
  })
}
