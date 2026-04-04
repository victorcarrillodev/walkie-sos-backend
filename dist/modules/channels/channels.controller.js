"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.destroy = exports.changeRole = exports.penalize = exports.toggleMute = exports.getMembers = exports.joinChannel = exports.addMember = exports.getPublic = exports.listMyChannels = exports.create = void 0;
const channels_service_1 = require("./channels.service");
const zod_1 = require("zod");
const channelService = new channels_service_1.ChannelService();
const createGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'El nombre debe tener al menos 3 letras'),
    password: zod_1.z.string().min(1, 'La contraseña es obligatoria'),
    description: zod_1.z.string().optional(),
    maxMessageDuration: zod_1.z.number().optional(),
});
const addMemberSchema = zod_1.z.object({
    targetUserId: zod_1.z.string().uuid('El ID del usuario no es válido'),
});
const joinByNameSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre del canal es obligatorio'),
    password: zod_1.z.string().min(1, 'La contraseña es obligatoria'),
});
const toggleMuteSchema = zod_1.z.object({
    isMuted: zod_1.z.boolean(),
});
const penalizeMemberSchema = zod_1.z.object({
    minutes: zod_1.z.number().nullable(),
});
const changeRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['MODERATOR', 'USER']),
});
const updateSettingsSchema = zod_1.z.object({
    password: zod_1.z.string().optional(),
    maxMessageDuration: zod_1.z.number().optional(),
});
const create = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = createGroupSchema.parse(req.body);
        const channel = await channelService.createChannel(userId, data);
        res.status(201).json(channel);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') });
            return;
        }
        res.status(400).json({ error: error.message });
    }
};
exports.create = create;
const listMyChannels = async (req, res) => {
    try {
        const userId = req.user.id;
        const channels = await channelService.getUserChannels(userId);
        res.json(channels);
    }
    catch (error) {
        res.status(500).json({ error: 'Fallo al obtener los grupos: ' + error.message });
    }
};
exports.listMyChannels = listMyChannels;
const getPublic = async (req, res) => {
    try {
        const channels = await channelService.getPublicChannels();
        res.json(channels);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al buscar canales públicos' });
    }
};
exports.getPublic = getPublic;
const addMember = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const channelId = req.params.channelId;
        const data = addMemberSchema.parse(req.body);
        const newMember = await channelService.addMemberToGroup(channelId, data.targetUserId, requesterId);
        res.status(201).json({ message: 'Compa agregado al batallón', member: newMember });
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Este compa ya está en el grupo.' });
            return;
        }
        res.status(400).json({ error: error.message });
    }
};
exports.addMember = addMember;
const joinChannel = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = joinByNameSchema.parse(req.body);
        const newMember = await channelService.joinChannelByName(data.name, userId, data.password);
        res.status(200).json({ message: 'Te has unido al grupo con éxito', member: newMember });
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Ya eres miembro de este grupo.' });
            return;
        }
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') });
            return;
        }
        res.status(400).json({ error: error.message });
    }
};
exports.joinChannel = joinChannel;
const getMembers = async (req, res) => {
    try {
        const channelId = req.params.channelId;
        const members = await channelService.getChannelMembers(channelId);
        res.json(members);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.getMembers = getMembers;
const toggleMute = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const channelId = req.params.channelId;
        const data = toggleMuteSchema.parse(req.body);
        const updated = await channelService.toggleMuteChannel(channelId, requesterId, data.isMuted);
        res.json({ message: data.isMuted ? 'Grupo silenciado' : 'Grupo desilenciado', channel: updated });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.toggleMute = toggleMute;
const penalize = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const channelId = req.params.channelId;
        const targetUserId = req.params.userId;
        const data = penalizeMemberSchema.parse(req.body);
        await channelService.penalizeMember(channelId, targetUserId, requesterId, data.minutes);
        res.json({ message: data.minutes ? `Usuario penalizado por ${data.minutes} minutos.` : 'Penalización retirada.' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.penalize = penalize;
const changeRole = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const channelId = req.params.channelId;
        const targetUserId = req.params.userId;
        const data = changeRoleSchema.parse(req.body);
        const updatedMember = await channelService.changeMemberRole(channelId, targetUserId, requesterId, data.role);
        res.json({ message: `Rol actualizado a ${data.role}`, member: updatedMember });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') });
            return;
        }
        res.status(400).json({ error: error.message });
    }
};
exports.changeRole = changeRole;
const destroy = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const channelId = req.params.channelId;
        await channelService.deleteChannel(channelId, requesterId);
        res.json({ message: 'Grupo destruido exitosamente.' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.destroy = destroy;
const updateSettings = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const channelId = req.params.channelId;
        const data = updateSettingsSchema.parse(req.body);
        const updated = await channelService.updateChannelSettings(channelId, requesterId, data);
        res.json({ message: 'Ajustes del grupo actualizados', channel: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') });
            return;
        }
        res.status(400).json({ error: error.message });
    }
};
exports.updateSettings = updateSettings;
