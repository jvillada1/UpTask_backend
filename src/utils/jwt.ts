import jwt from 'jsonwebtoken'  
import { Types } from 'mongoose'

type userPayload = { 
    id: Types.ObjectId
}

export const generateJWT = (payload: userPayload) => {   

    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: '7d'
    }) 
    return token
}