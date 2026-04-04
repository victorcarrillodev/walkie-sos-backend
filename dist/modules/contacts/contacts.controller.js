"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addContact = exports.getContacts = void 0;
const contacts_service_1 = require("./contacts.service");
const zod_1 = require("zod");
const contactsService = new contacts_service_1.ContactsService();
const addContactSchema = zod_1.z.object({
    alias: zod_1.z.string().min(3, 'El alias debe tener al menos 3 caracteres'),
});
const getContacts = async (req, res) => {
    try {
        const userId = req.user.id;
        const contacts = await contactsService.getRecentContacts(userId);
        res.status(200).json(contacts);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error al obtener el historial' });
    }
};
exports.getContacts = getContacts;
const addContact = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = addContactSchema.parse(req.body);
        const result = await contactsService.addContactByAlias(userId, data.alias);
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues.map((e) => e.message).join(', ') });
            return;
        }
        res.status(400).json({ error: error.message });
    }
};
exports.addContact = addContact;
