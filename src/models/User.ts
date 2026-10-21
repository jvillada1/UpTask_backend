import mongoose, {Schema, Document} from "mongoose"; 

export interface IUSser extends Document { 
    email: string 
    password: string 
    name: string 
    confirmed : boolean
} 

export const userSchema: Schema = new Schema ({ 
    email: { 
        type: String, 
        required: true, 
        lowercase: true, 
        unique: true
    }, 

    password: { 
        type: String, 
        required: true
    }, 

    name: { 
        type: String, 
        required: true 

    }, 

    confirmed: { 
        type: Boolean, 
        default:false
    },
}) 

const User = mongoose.model<IUSser>('User',userSchema) 
export default User