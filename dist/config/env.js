"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('3000').transform(Number),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().url({ message: 'DATABASE_URL debe ser una URL válida' }),
    JWT_SECRET: zod_1.z.string().min(10, { message: 'JWT_SECRET debe tener al menos 10 caracteres' }),
    CORS_ORIGIN: zod_1.z.string().default('*'),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Variables de entorno inválidas:', _env.error.format());
    process.exit(1);
}
exports.env = _env.data;
