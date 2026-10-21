import { Router } from "express";  
import { body, param } from "express-validator";
import { AuthController } from "../controllers/AuthController";
import { habndleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { loginLimiter, tokenLimiter } from "../middleware/rateLimit";

const router = Router () 

router.post('/create-account', 
    tokenLimiter,
    body('name')
        .isString().notEmpty().withMessage('El nombre no puede ir vacío'),
    body('password')
        .isString().isLength({min:8, max:72}).withMessage('El password es muy corto, debe contener mínimo 8 caracteres'), 
    body('password_confirmation').custom((value,{req})=>{  
        if(value !== req.body.password){ 
            throw new Error('Los password no son iguales')
        } 
        return true

    }),
    body('email')
        .isEmail().withMessage('Email no válido'), 
    habndleInputErrors,
    AuthController.createAccunt
)

router.post('/confirm-account',
    tokenLimiter,
    body('token')
        .isString().withMessage('Token no válido').bail()
        .notEmpty().withMessage('El token no puede ir vacío').bail()
        .isNumeric().isLength({min: 6, max: 6}).withMessage('Token no válido'), 
    habndleInputErrors,  
    AuthController.confirmAccount
)  

router.post('/login',
    loginLimiter,
    body('email')
        .isEmail().withMessage('Email no válido'),   
    body('password')
        .isString().notEmpty().withMessage('El password no puede ir vacío'),
    
    habndleInputErrors,  
    AuthController.login
) 

router.post('/request-code',
    tokenLimiter,
    body('email')
        .isEmail().withMessage('Email no válido'),   
    
    habndleInputErrors,  
    AuthController.requestConfirmationCode
)  

router.post('/forgot-password',
    tokenLimiter,
    body('email')
        .isEmail().withMessage('Email no válido'),   
    
    habndleInputErrors,  
    AuthController.forgotPassword
) 

router.post('/validate-token',
    tokenLimiter,
    body('token')
        .isString().withMessage('Token no válido').bail()
        .notEmpty().withMessage('El token no puede ir vacío').bail()
        .isNumeric().isLength({min: 6, max: 6}).withMessage('Token no válido'), 
    habndleInputErrors,  
    AuthController.validateToken
) 


router.post('/update-password/:token', 
    tokenLimiter,
    param('token')
        .isNumeric().isLength({min: 6, max: 6}).withMessage('Token no válido'),
    body('password')
        .isString().isLength({min:8, max:72}).withMessage('El password es muy corto, debe contener mínimo 8 caracteres'), 
    body('password_confirmation').custom((value,{req})=>{  
        if(value !== req.body.password){ 
            throw new Error('Los password no son iguales')
        } 
        return true

    }),
    habndleInputErrors,  
    AuthController.updatePassword
) 

router.get('/user',
    authenticate, 
    AuthController.user
) 


//profile 

router.put('/profile',  
    authenticate, 
    body('name')
        .isString().notEmpty().withMessage('El nombre no puede ir vacío'), 
    body('email')
        .isEmail().withMessage('Email no válido'), 
    habndleInputErrors,
    AuthController.updateProfile
) 

router.post('/update-password',
    authenticate, 
    loginLimiter,
    body('current_password')
        .isString().notEmpty().withMessage('El password actual no puede ir vacío'),
    body('password')
        .isString().isLength({min:8, max:72}).withMessage('El password es muy corto, debe contener mínimo 8 caracteres'), 
    body('password_confirmation').custom((value,{req})=>{  
        if(value !== req.body.password){ 
            throw new Error('Los password no son iguales')
        } 
        return true
    }), 
    habndleInputErrors,
    AuthController.updateProfilepassword
)

router.post('/check-password',
    authenticate, 
    loginLimiter,
    body('password')
        .isString().isLength({min:8, max:72}).withMessage('El password es muy corto, debe contener mínimo 8 caracteres'), 
    habndleInputErrors,
    AuthController.checkPassword
)



export default router