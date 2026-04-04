"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const channels_routes_1 = __importDefault(require("./modules/channels/channels.routes"));
const contacts_routes_1 = __importDefault(require("./modules/contacts/contacts.routes"));
const alerts_routes_1 = __importDefault(require("./modules/alerts/alerts.routes"));
const env_1 = require("./config/env");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
}));
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/channels', channels_routes_1.default);
app.use('/api/contacts', contacts_routes_1.default);
app.use('/api/alerts', alerts_routes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API Backend',
            version: '1.0.0',
            description: 'Documentación de los endpoints de la API',
        },
        servers: [
            {
                url: 'http://localhost:3000',
            },
        ],
    },
    apis: [path_1.default.join(__dirname, './routes/*.ts')],
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/docs/api', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
exports.default = app;
