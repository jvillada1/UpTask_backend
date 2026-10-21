import rateLimit from "express-rate-limit"

const limiter = (max: number) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {error: 'Demasiados intentos, intenta de nuevo en unos minutos'}
})

// login y verificación de password
export const loginLimiter = limiter(20)

// endpoints que usan o generan tokens de 6 dígitos (evita fuerza bruta y spam de correos)
export const tokenLimiter = limiter(30)
