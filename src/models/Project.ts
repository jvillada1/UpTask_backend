import mongoose, {Schema, Document, PopulatedDoc, Types} from "mongoose"; 
import Task, { ITask } from "./Task";
import { IUSser } from "./User";

export interface IProject extends Document { //tipo de typescript
    projectName: string 
    clientName: string 
    description: string 
    tasks: PopulatedDoc<ITask & Document>[] 
    manager: PopulatedDoc<IUSser & Document> 
    team: PopulatedDoc<IUSser & Document>[]
} 

const ProjectSchema: Schema = new Schema({ // tipo de mongoose
    projectName:{ 
        type: String, 
        required: true, 
        trim: true,  
    
    },  

    clientName:{ 
        type: String, 
        required: true, 
        trim: true,  
    
    },  

    description:{ 
        type: String, 
        required: true, 
        trim: true,  
    
    },  

    tasks: [
        { 
            type: Types.ObjectId, 
            ref: 'Task'
        }
    ], 

    manager: {
        type: Types.ObjectId, 
        ref: 'User'
    },

    team: [
        { 
            type: Types.ObjectId, 
            ref: 'User'
        }
    ], 

}, {timestamps: true}) 

// al eliminar un proyecto se eliminan sus tareas (y por el hook de Task, las notas de cada tarea)
ProjectSchema.pre('deleteOne', {document: true, query: false}, async function() {
    const tasks = await Task.find({$or: [{project: this._id}, {_id: {$in: this.tasks as Types.ObjectId[]}}]})
    for (const task of tasks) {
        await task.deleteOne()
    }
})

const Project = mongoose.model<IProject>('Project', ProjectSchema) 
export default Project