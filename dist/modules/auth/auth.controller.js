"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAvailability = exports.login = exports.register = void 0;
const auth_service_1 = require("./auth.service");
const zod_1 = require("zod");
const authService = new auth_service_1.AuthService();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    alias: zod_1.z.string().min(3),
    firstName: zod_1.z.string().min(2, 'El nombre es muy corto'),
    lastName: zod_1.z.string().min(2, 'El apellido es muy corto'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const checkSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().optional(),
    alias: zod_1.z.string().min(3).optional(),
})
    .refine((data) => data.email || data.alias, {
    message: 'Debes enviar un email o un alias para verificar',
});
const register = async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        let avatarUrl = null;
        if (req.file) {
            avatarUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`;
        }
        const result = await authService.register({ ...data, avatarUrl });
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') });
        }
        res.status(400).json({ error: error.message || 'Error al registrar' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);
        const result = await authService.login(data);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(401).json({ error: error.message || 'Error de autenticación' });
    }
};
exports.login = login;
const checkAvailability = async (req, res) => {
    try {
        const data = checkSchema.parse(req.body);
        const isAvailable = await authService.checkAvailability(data.email, data.alias);
        res.status(200).json({ available: isAvailable });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.checkAvailability = checkAvailability;
