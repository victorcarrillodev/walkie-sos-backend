"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelService = void 0;
const prisma_1 = require("../../shared/infra/prisma");
const client_1 = require("@prisma/client");
class ChannelService {
    async createChannel(userId, data) {
        if (!data.password)
            throw new Error('La contraseña es obligatoria.');
        const exists = await prisma_1.prisma.channel.findUnique({ where: { name: data.name } });
        if (exists)
            throw new Error('Ya existe un grupo con ese nombre.');
        return await prisma_1.prisma.channel.create({
            data: {
                name: data.name,
                description: data.description,
                password: data.password,
                maxMessageDuration: data.maxMessageDuration || 60,
                isGroup: true,
                ownerId: userId,
                members: {
                    create: {
                        userId: userId,
                        role: client_1.MemberRole.ADMIN,
                    },
                },
            },
        });
    }
    async getUserChannels(userId) {
        return await prisma_1.prisma.channel.findMany({
            where: {
                members: { some: { userId: userId } },
            },
            include: {
                _count: { select: { members: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getPublicChannels() {
        return [];
    }
    async addMemberToGroup(channelId, targetUserId, requesterId) {
        const channel = await prisma_1.prisma.channel.findUnique({
            where: { id: channelId },
            include: { members: true },
        });
        if (!channel)
            throw new Error('El canal no existe, mi compa.');
        const requesterMember = channel.members.find((m) => m.userId === requesterId);
        if (!requesterMember)
            throw new Error('Tú ni estás en este grupo, no puedes invitar a nadie.');
        if (requesterMember.role === client_1.MemberRole.USER) {
            throw new Error('Solo los administradores pueden meter gente nueva.');
        }
        return await prisma_1.prisma.channelMember.create({
            data: {
                channelId: channelId,
                userId: targetUserId,
                role: client_1.MemberRole.USER,
            },
            include: { user: { select: { id: true, alias: true, firstName: true } } },
        });
    }
    async joinChannelByName(channelName, userId, passwordAttempt) {
        const channel = await prisma_1.prisma.channel.findUnique({
            where: { name: channelName },
        });
        if (!channel)
            throw new Error('El grupo no existe.');
        if (channel.password !== passwordAttempt) {
            throw new Error('La contraseña es incorrecta.');
        }
        const existingMember = await prisma_1.prisma.channelMember.findUnique({
            where: {
                userId_channelId: {
                    userId: userId,
                    channelId: channel.id,
                },
            },
        });
        if (existingMember) {
            throw new Error('Ya eres miembro de este grupo.');
        }
        return await prisma_1.prisma.channelMember.create({
            data: {
                channelId: channel.id,
                userId: userId,
                role: client_1.MemberRole.USER,
            },
        });
    }
    async getChannelMembers(channelId) {
        return await prisma_1.prisma.channelMember.findMany({
            where: { channelId },
            include: {
                user: { select: { id: true, alias: true, firstName: true } }
            },
            orderBy: { joinedAt: 'asc' }
        });
    }
    async toggleMuteChannel(channelId, requesterId, isMuted) {
        await this.verifyAdmin(channelId, requesterId);
        return await prisma_1.prisma.channel.update({
            where: { id: channelId },
            data: { isMuted }
        });
    }
    async updateChannelSettings(channelId, requesterId, data) {
        await this.verifyAdmin(channelId, requesterId);
        const updateData = {};
        if (data.password)
            updateData.password = data.password;
        if (data.maxMessageDuration)
            updateData.maxMessageDuration = data.maxMessageDuration;
        return await prisma_1.prisma.channel.update({
            where: { id: channelId },
            data: updateData
        });
    }
    async penalizeMember(channelId, targetUserId, requesterId, minutes) {
        const requesterMember = await this.verifyAdminOrModerator(channelId, requesterId);
        if (targetUserId === requesterId) {
            throw new Error('No te puedes penalizar a ti mismo compa.');
        }
        let mutedUntil = null;
        if (minutes !== null && minutes > 0) {
            mutedUntil = new Date(Date.now() + minutes * 60000);
        }
        const targetMember = await prisma_1.prisma.channelMember.findUnique({
            where: { userId_channelId: { userId: targetUserId, channelId: channelId } }
        });
        if (!targetMember)
            throw new Error('El usuario no está en este grupo.');
        if (targetMember.role === client_1.MemberRole.ADMIN) {
            throw new Error('No puedes penalizar a un Administrador.');
        }
        if (requesterMember.role === client_1.MemberRole.MODERATOR && targetMember.role === client_1.MemberRole.MODERATOR) {
            throw new Error('Un Moderador no puede penalizar a otro Moderador.');
        }
        return await prisma_1.prisma.channelMember.update({
            where: { id: targetMember.id },
            data: { mutedUntil }
        });
    }
    async changeMemberRole(channelId, targetUserId, requesterId, newRole) {
        await this.verifyAdmin(channelId, requesterId);
        if (targetUserId === requesterId) {
            throw new Error('No te puedes cambiar el rol a ti mismo (eres el patrón).');
        }
        const targetMember = await prisma_1.prisma.channelMember.findUnique({
            where: { userId_channelId: { userId: targetUserId, channelId: channelId } }
        });
        if (!targetMember)
            throw new Error('El usuario no está en este grupo.');
        if (targetMember.role === client_1.MemberRole.ADMIN)
            throw new Error('No puedes modificar a otro administrador.');
        return await prisma_1.prisma.channelMember.update({
            where: { id: targetMember.id },
            data: { role: newRole }
        });
    }
    async deleteChannel(channelId, requesterId) {
        const channel = await prisma_1.prisma.channel.findUnique({
            where: { id: channelId },
            include: { members: true }
        });
        if (!channel)
            throw new Error('El canal no existe.');
        if (channel.ownerId !== requesterId) {
            throw new Error('Solo el dueño puede destruir el grupo.');
        }
        await prisma_1.prisma.channelMember.deleteMany({ where: { channelId } });
        await prisma_1.prisma.channel.delete({ where: { id: channelId } });
        return { success: true };
    }
    async verifyAdmin(channelId, requesterId) {
        const member = await prisma_1.prisma.channelMember.findUnique({
            where: { userId_channelId: { userId: requesterId, channelId: channelId } }
        });
        if (!member)
            throw new Error('No perteneces a este grupo.');
        if (member.role !== client_1.MemberRole.ADMIN)
            throw new Error('Puro administrador puede hacer esto, mijo.');
        return member;
    }
    async verifyAdminOrModerator(channelId, requesterId) {
        const member = await prisma_1.prisma.channelMember.findUnique({
            where: { userId_channelId: { userId: requesterId, channelId: channelId } }
        });
        if (!member)
            throw new Error('No perteneces a este grupo.');
        if (member.role !== client_1.MemberRole.ADMIN && member.role !== client_1.MemberRole.MODERATOR) {
            throw new Error('Solo los Administradores o Moderadores pueden hacer esto.');
        }
        return member;
    }
}
exports.ChannelService = ChannelService;
