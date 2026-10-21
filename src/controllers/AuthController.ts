import type { Request,Response } from "express"
import User from "../models/User"
import { checkPassword, hashPassword } from "../utils/auth"
import Token from "../models/Token"
import { generateToken } from "../utils/token"
import { AuthEmail } from "../emails/AuthEmail"
import { generateJWT } from "../utils/jwt"
export class AuthController { 
    static createAccunt = async(req:Request, res:Response) => { 
        try {  
            const {password, email, name} = req.body
            const user = new User({email, name})   

            //prevenir duplicados 
            const userExists = await User.findOne({email}) 
            if(userExists){ 
                const error = new Error('El usuario ya está registrado') 
                return res.status(409).json({error: error.message})
            }

            //hash password   
            
            user.password = await hashPassword(password) 

            //generar token jwt  
            const token = new Token()  
            token.token = generateToken() 
            token.user = user._id 

            //enviar el email 
            AuthEmail.sendConfirmationEmail({ 
                email: user.email, 
                name: user.name,  
                token: token.token

            })
                  


            await Promise.allSettled([user.save(), token.save()])
            res.send('Cuenta creada, revisa tu email para confirmarla')
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    } 

    static confirmAccount = async(req:Request, res:Response) => { 
        try {
            const {token} = req.body  
            const tokenExists = await Token.findOne({token}) 
            if(!tokenExists){ 
                const error = new Error('Token no válido') 
                return res.status(404).json({error:error.message})
            } 
            const user = await User.findById(tokenExists.user)
            if(!user){
                const error = new Error('Usuario no encontrado')
                return res.status(404).json({error:error.message})
            }
            user.confirmed = true

            await Promise.allSettled([user.save(),tokenExists.deleteOne()])

            res.send('Cuenta confirmada correctamente')

        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un error'})
        } 
    } 

    static login = async(req:Request, res:Response) => { 
        try {
            const {email, password} = req.body 
            const user = await User.findOne({email}) 
            const isPasswordCorrect = user ? await checkPassword(password, user.password) : false
            if(!user || !isPasswordCorrect){ 
                const error = new Error('Email o password incorrecto') 
                return res.status(401).json({error:error.message})
            } 
            if(!user.confirmed){  
                const token = new Token() 
                token.user= user._id 
                token.token= generateToken() 
                await token.save() 

                AuthEmail.sendConfirmationEmail({ 
                    email: user.email, 
                    name: user.name,  
                    token: token.token
                })

                const error = new Error('La cuenta no ha sido confirmada, hemos enviado un email de confirmación') 
                return res.status(401).json({error:error.message})
            } 

            const token = generateJWT({id: user._id})
            res.send(token)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        } 
    } 


    static requestConfirmationCode = async(req:Request, res:Response) => { 
        try {  
            const {email} = req.body

            //Usuario existe
            const user = await User.findOne({email})
            if(!user){
                const error = new Error('El usuario no está registrado')
                return res.status(404).json({error: error.message})
            }
            if(user.confirmed){
                const error = new Error('El usuario ya está confirmado')
                return res.status(403).json({error: error.message})
            }

            //generar token
            const token = new Token()
            token.token = generateToken()
            token.user = user._id
            await token.save()

            //enviar el email
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send('Se envió un nuevo token a tu email')
        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un error'})
        }
    } 


    static forgotPassword = async(req:Request, res:Response) => { 
        try {  
            const {email} = req.body

            //Usuario existe
            const user = await User.findOne({email})
            if(!user){
                const error = new Error('El usuario no está registrado')
                return res.status(404).json({error: error.message})
            }

            //generar token
            const token = new Token()
            token.token = generateToken()
            token.user = user._id
            await token.save()

            //enviar el email
            AuthEmail.sendPasswordResetToken({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send('Revisa tu email para instrucciones')
        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un error'})
        }
    } 

    static validateToken = async(req:Request, res:Response) => { 
        try {
            const {token} = req.body  
            const tokenExists = await Token.findOne({token}) 
            if(!tokenExists){ 
                const error = new Error('Token no válido') 
                return res.status(404).json({error:error.message})
            } 
            

            res.send('Token válido, define tu nuevo password')

        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un error'})
        } 
    }  

    static updatePassword = async(req:Request, res:Response) => { 
        try {
            const {token} = req.params  
            const tokenExists = await Token.findOne({token}) 
            if(!tokenExists){ 
                const error = new Error('Token no válido') 
                return res.status(404).json({error:error.message})
            }  

            const user = await User.findById(tokenExists.user) 
            user.password = await hashPassword(req.body.password) 
            await Promise.allSettled([user.save(), tokenExists.deleteOne()])
            

            res.send('El password se modificó correctamente')

        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un error'})
        } 
    }  

    static user = async(req:Request, res:Response) => { 
        return res.json(req.user)
    }  

    static updateProfile = async(req:Request, res:Response) => {
        const {name, email} = req.body  

        const userExists = await User.findOne({email}) 
        if(userExists && userExists._id.toString() !== req.user._id.toString()){ 
            const error = new Error('Ese email ya está registrado') 
            return res.status(409).json({error: error.message})
        }

        req.user.name = name 
        req.user.email = email 

        try {
            await req.user.save() 
            res.send('Perfil actualizado correctamente')
        } catch (error) {
            res.status(500).send('Hubo un error')
        }
    } 

    static updateProfilepassword = async(req:Request, res:Response) => { 
        const {current_password, password} = req.body 
        const user = await User.findById(req.user._id) 

        const isPasswordCorrect = await checkPassword(current_password, user.password) 
        if(!isPasswordCorrect){ 
            const error = new Error('El password actual es incorrecto') 
            return res.status(401).json({error: error.message})
        } 

        try {
            user.password = await hashPassword(password) 
            await user.save() 
            res.send('El password se modificó correctamente')
        } catch (error) {
            res.status(500).send('Hubo un error')
        }
        
    } 

    static checkPassword = async(req:Request, res:Response) => { 
        const {password} = req.body 
        const user = await User.findById(req.user._id) 

        const isPasswordCorrect = await checkPassword(password, user.password) 
        if(!isPasswordCorrect){ 
            const error = new Error('El password actual es incorrecto') 
            return res.status(401).json({error: error.message})
        } 
        
        res.send('Password correcto')
        
    }
}