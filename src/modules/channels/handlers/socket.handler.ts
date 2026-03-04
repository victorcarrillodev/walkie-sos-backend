import { Server, Socket } from 'socket.io'
import { AuthenticatedSocket } from '../../../shared/middlewares/auth.socket'

export const registerChannelHandlers = (io: Server, socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket
  const user = authSocket.user // Ya trae el alias gracias al middleware

  if (user?.id) {
    socket.join(user.id)
    console.log(`📡 ${user.alias} está a la escucha en su frecuencia personal.`)
  }

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

  // 3. PTT (Push To Talk) - Opcional con WebRTC, pero útil para la UI
  socket.on('ptt-start', (channelId: string) => {
    socket.to(channelId).emit('ptt-status', {
      userId: user?.id,
      alias: user?.alias,
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

  // ==========================================
  // 🌟 4. NUEVO: SEÑALIZACIÓN WEBRTC (P2P)
  // ==========================================

  // A. El Usuario 1 inicia la transmisión y envía una "Oferta"
  socket.on('webrtc-offer', (payload: { channelId: string; offer: any }) => {
    socket.to(payload.channelId).emit('webrtc-offer', {
      userId: user?.id,
      alias: user?.alias,
      offer: payload.offer,
    })
  })

  // B. El Usuario 2 recibe la oferta y responde con una "Respuesta"
  socket.on('webrtc-answer', (payload: { channelId: string; answer: any }) => {
    socket.to(payload.channelId).emit('webrtc-answer', {
      userId: user?.id,
      answer: payload.answer,
    })
  })

  // C. Ambos usuarios intercambian posibles rutas de conexión (Candidatos ICE)
  socket.on('webrtc-ice-candidate', (payload: { channelId: string; candidate: any }) => {
    socket.to(payload.channelId).emit('webrtc-ice-candidate', {
      userId: user?.id,
      candidate: payload.candidate,
    })
  })
  // ==========================================
  // 🎙️ 5. NUEVO: ENVÍO DE AUDIO POR SOCKETS
  // ==========================================
  socket.on('send-audio', (payload: { channelId: string; audioData: string }) => {
    // Reenviamos el audio a todos en el canal (excepto al que lo envió)
    socket.to(payload.channelId).emit('receive-audio', {
      userId: user?.id,
      alias: user?.alias,
      audioData: payload.audioData,
    })
    console.log(`🔊 ${user?.alias} envió un mensaje de voz al canal ${payload.channelId}`)
  })
}
