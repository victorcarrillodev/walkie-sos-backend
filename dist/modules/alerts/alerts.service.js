"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = void 0;
const prisma_1 = require("../../shared/infra/prisma");
const client_1 = require("@prisma/client");
class AlertsService {
    async getActiveAlertsByChannel(channelId) {
        const alerts = await prisma_1.prisma.alert.findMany({
            where: {
                channelId: channelId,
                status: client_1.AlertStatus.ACTIVE,
            },
            include: {
                user: {
                    select: { id: true, alias: true, firstName: true, avatarUrl: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return alerts;
    }
    async getMyAlertHistory(userId) {
        const alerts = await prisma_1.prisma.alert.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return alerts;
    }
}
exports.AlertsService = AlertsService;
