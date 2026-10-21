import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet"
import dotenv from 'dotenv'   
import cors from 'cors'  
import morgan from "morgan";
import { corsConfig } from "./config/cors";
import { connectDB } from "./config/db"; 
import projectRoutes from "./routes/projectRoutes";
import authRoutes from "./routes/authRoutes";
dotenv.config() 
connectDB()
const app = express()  
app.disable('x-powered-by')
// detrás de un proxy (Render, Railway, Nginx...) define TRUST_PROXY=1 para que el rate limit vea la IP real
if(process.env.TRUST_PROXY){ app.set('trust proxy', Number(process.env.TRUST_PROXY)) }
app.use(helmet())
app.use(cors(corsConfig))  
app.use(morgan('dev'))
app.use(express.json({limit: '10kb'}))

//routes  
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)

// manejo de errores: nunca expone el stack al cliente
app.use((err: Error & {status?: number}, req: Request, res: Response, next: NextFunction) => {
    if(err.message === 'Error de CORS'){
        return res.status(403).json({error: 'Origen no permitido'})
    }
    console.log(err)
    res.status(err.status || 500).json({error: 'Hubo un error'})
})

export default app