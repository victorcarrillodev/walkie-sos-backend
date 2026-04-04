"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAlertHandlers = void 0;
const prisma_1 = require("../../../shared/infra/prisma");
const registerAlertHandlers = (io, socket) => {
    const authSocket = socket;
    const user = authSocket.user;
    socket.on('send-alert', async (payload) => {
        try {
            console.log(`🚨 ALERTA RECIBIDA del compa ${user?.alias}: ${payload.type}`);
            const alert = await prisma_1.prisma.alert.create({
                data: {
                    type: payload.type,
                    latitude: payload.lat,
                    longitude: payload.lng,
                    userId: user.id,
                    channelId: payload.isGroup ? payload.channelId : undefined,
                    targetUserId: !payload.isGroup ? payload.channelId : undefined,
                    status: 'ACTIVE',
                },
            });
            io.to(payload.channelId).emit('emergency-alert', {
                id: alert.id,
                type: alert.type,
                user: { id: user?.id, alias: user?.alias },
                location: { lat: alert.latitude, lng: alert.longitude },
                timestamp: alert.createdAt,
            });
            socket.emit('alert-created', { alertId: alert.id });
        }
        catch (error) {
            console.error('Error procesando alerta:', error);
            socket.emit('error', { message: 'No se pudo enviar la alerta' });
        }
    });
    socket.on('stream-location', (payload) => {
        socket.to(payload.channelId).emit('live-location-update', {
            alertId: payload.alertId,
            userId: user?.id,
            location: { lat: payload.lat, lng: payload.lng },
            timestamp: new Date().toISOString(),
        });
    });
    socket.on('resolve-alert', async (payload) => {
        try {
            await prisma_1.prisma.alert.update({
                where: { id: payload.alertId },
                data: { status: 'RESOLVED', resolvedAt: new Date() },
            });
            console.log(`✅ Alerta ${payload.alertId} resuelta por ${user?.alias}`);
            io.to(payload.channelId).emit('alert-resolved', { alertId: payload.alertId });
        }
        catch (error) {
            console.error('Error resolviendo alerta:', error);
        }
    });
    socket.on('cancel-alert', async (payload) => {
        try {
            await prisma_1.prisma.alert.update({
                where: { id: payload.alertId },
                data: { status: 'DISMISSED', resolvedAt: new Date() },
            });
            console.log(`❌ Alerta ${payload.alertId} cancelada por ${user?.alias}`);
            if (payload.channelId) {
                io.to(payload.channelId).emit('alert-resolved', { alertId: payload.alertId });
            }
        }
        catch (error) {
            console.error('Error cancelando alerta:', error);
        }
    });
    socket.on('get-alerts-history', async (data, callback) => {
        if (typeof data === 'function') {
            callback = data;
        }
        try {
            if (!user?.id)
                return;
            const userChannels = await prisma_1.prisma.channelMember.findMany({
                where: { userId: user.id },
                select: { channelId: true }
            });
            const channelIds = userChannels.map(c => c.channelId);
            const alerts = await prisma_1.prisma.alert.findMany({
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
            });
            if (callback)
                callback({ success: true, alerts });
        }
        catch (e) {
            console.error('Error obteniendo historial de alertas:', e);
            if (callback)
                callback({ success: false, error: 'Error al obtener alertas' });
        }
    });
};
exports.registerAlertHandlers = registerAlertHandlers;
