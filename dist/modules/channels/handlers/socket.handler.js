"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChannelHandlers = void 0;
const prisma_1 = require("../../../shared/infra/prisma");
const client_1 = require("@prisma/client");
const canUserTalk = async (channelId, userId) => {
    if (channelId.startsWith('direct_')) {
        const parts = channelId.split('_');
        if (parts.length >= 3 && (parts[1] === userId || parts[2] === userId)) {
            return { allowed: true };
        }
        return { allowed: false, reason: 'No formas parte de esta charla directa.' };
    }
    try {
        const channel = await prisma_1.prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                members: {
                    where: { userId },
                },
            },
        });
        if (!channel)
            return { allowed: false, reason: 'El canal no existe.' };
        const member = channel.members[0];
        if (!member)
            return { allowed: false, reason: 'No perteneces a este grupo.' };
        if (member.mutedUntil && member.mutedUntil > new Date()) {
            return { allowed: false, reason: 'Estás penalizado o silenciado temporalmente.' };
        }
        if (channel.isMuted && member.role !== client_1.MemberRole.ADMIN) {
            return { allowed: false, reason: 'El administrador ha silenciado este grupo.' };
        }
        return { allowed: true };
    }
    catch (error) {
        console.error('❌ Error en canUserTalk:', error);
        return { allowed: false, reason: 'Error interno verificando permisos del grupo.' };
    }
};
const registerChannelHandlers = (io, socket) => {
    const authSocket = socket;
    const user = authSocket.user;
    if (user?.id) {
        socket.join(user.id);
        console.log(`📡 [${user.alias}] conectado`);
    }
    socket.on('join-channel', (channelId) => {
        socket.join(channelId);
        console.log(`📻 [${user?.alias}] sintonizó: ${channelId}`);
        socket.to(channelId).emit('channel-event', {
            type: 'JOINED',
            message: `${user?.alias} se unió`,
            userId: user?.id,
        });
    });
    socket.on('leave-channel', (channelId) => {
        socket.leave(channelId);
    });
    socket.on('ptt-start', async (channelId) => {
        if (!user?.id)
            return;
        const check = await canUserTalk(channelId, user.id);
        if (!check.allowed) {
            socket.emit('talk-error', { message: check.reason });
            return;
        }
        console.log(`🎙️ PTT START: ${user?.alias}`);
        socket.to(channelId).emit('ptt-status', {
            channelId: channelId,
            userId: user?.id,
            alias: user?.alias,
            isTalking: true,
        });
    });
    socket.on('ptt-end', (channelId) => {
        console.log(`🔇 PTT END: ${user?.alias}`);
        socket.to(channelId).emit('ptt-status', {
            channelId: channelId,
            userId: user?.id,
            alias: user?.alias,
            isTalking: false,
        });
    });
    socket.on('webrtc-offer', async (payload) => {
        if (!user?.id)
            return;
        const check = await canUserTalk(payload.channelId, user.id);
        if (!check.allowed)
            return;
        console.log(`📤 Offer de ${user?.alias} → canal ${payload.channelId}`);
        socket.to(payload.channelId).emit('webrtc-offer', {
            channelId: payload.channelId,
            userId: user?.id,
            alias: user?.alias,
            offer: payload.offer,
        });
    });
    socket.on('webrtc-answer', async (payload) => {
        if (!user?.id)
            return;
        const check = await canUserTalk(payload.channelId, user.id);
        if (!check.allowed)
            return;
        console.log(`📥 Answer de ${user?.alias} → canal ${payload.channelId}`);
        socket.to(payload.channelId).emit('webrtc-answer', {
            channelId: payload.channelId,
            userId: user?.id,
            answer: payload.answer,
        });
    });
    socket.on('webrtc-ice-candidate', async (payload) => {
        if (!user?.id)
            return;
        const check = await canUserTalk(payload.channelId, user.id);
        if (!check.allowed)
            return;
        socket.to(payload.channelId).emit('webrtc-ice-candidate', {
            channelId: payload.channelId,
            userId: user?.id,
            candidate: payload.candidate,
        });
    });
    socket.on('send-audio', async (...args) => {
        if (!user?.id)
            return;
        const payload = args[0];
        if (!payload?.channelId || !payload?.audioData) {
            console.log(`❌ Payload inválido:`, payload);
            return;
        }
        const check = await canUserTalk(payload.channelId, user.id);
        if (!check.allowed)
            return;
        console.log(`🔊 Audio de ${user?.alias} → canal ${payload.channelId} (${payload.audioData.length} chars)`);
        socket.to(payload.channelId).emit('receive-audio', {
            channelId: payload.channelId,
            userId: user?.id,
            alias: user?.alias,
            audioData: payload.audioData,
        });
    });
    socket.on('check-online-status', async (targetUserId) => {
        const socketsInRoom = await io.in(targetUserId).fetchSockets();
        const isOnline = socketsInRoom.length > 0;
        socket.emit('online-status', {
            userId: targetUserId,
            isOnline,
        });
    });
    socket.on('check-users-status', async (userIds) => {
        if (!Array.isArray(userIds))
            return;
        const results = [];
        for (const userId of userIds) {
            const socketsInRoom = await io.in(userId).fetchSockets();
            results.push({ userId, isOnline: socketsInRoom.length > 0 });
        }
        socket.emit('users-status', results);
    });
};
exports.registerChannelHandlers = registerChannelHandlers;
