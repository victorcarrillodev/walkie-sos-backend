import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { register, login, checkAvailability } from './auth.controller'

// 1. Configuración de Multer (Dónde y cómo guardar la foto)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars'
    // Si la carpeta no existe, la crea automáticamente
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    // Genera un nombre único para evitar que fotos con el mismo nombre se sobreescriban
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({ storage })
const router = Router()

// 2. Rutas
// upload.single('avatar') intercepta el archivo que venga con la llave 'avatar'
router.post('/register', upload.single('avatar'), register)
router.post('/login', login)

// Nueva ruta para comprobar si el alias/email ya existe mientras el usuario escribe
router.post('/check-availability', checkAvailability)

export default router
