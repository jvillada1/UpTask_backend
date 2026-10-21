import { Request, Response, NextFunction } from "express"; 
import  jwt  from "jsonwebtoken";
import User, { IUSser } from "../models/User"; 

declare global { 
    namespace Express { 
        interface Request { 
            user?: IUSser
        }
    }
}
export const authenticate = async (req: Request, res:Response, next: NextFunction) => { 
    const bearer = req.headers.authorization 
    if(!bearer){ 
        const error = new Error('No autorizado') 
        return res.status(401).json({error: error.message})
    }  
    const token = bearer.split(' ')[1]
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)  
        if(typeof decoded === 'object' && decoded.id){ 
            const user = await  User.findById(decoded.id).select('_id name email')
            if(user){ 
                req.user=user
                return next()
            }
        }
        return res.status(401).json({error: 'Token no válido'})
    } catch (error) {
        res.status(401).json({error: 'Token no válido'})
    }
    
}