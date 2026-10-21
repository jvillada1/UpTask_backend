//middleware para revisar desde la url 
import Task, { ITask } from '../models/Task'
import type {Request, Response, NextFunction} from 'express'  

declare global { 
    namespace Express { 
        interface Request { 
            task: ITask
        }
    }
}

export async function taskExists (req:Request, res: Response, next: NextFunction) {  
         
        try {  
            const {taskId} = req.params 
            const task = await Task.findById(taskId) 
            if(!task){  
                const error = new Error('Tarea no encontrada')
                return res.status(404).json({error: error.message })
            }  
            req.task  = task
            next()

            
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
    } 


export function taskBelongsToProject (req:Request, res: Response, next: NextFunction) { 
    if(req.task.project.toString() !== req.project._id.toString() ){ 
        const error = new Error('Acción no válida')
        return res.status(400).json({error: error.message })
    }  
    next()
} 

export function hasAuthorization(req:Request, res: Response, next: NextFunction) { 
    if(req.user._id.toString() !== req.project.manager.toString()){ 
        const error = new Error('Acción no válida')
        return res.status(400).json({error: error.message })
    }  
    next()
}