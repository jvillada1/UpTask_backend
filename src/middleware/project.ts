//middleware para revisar desde la url 
import Project, { IProject } from '../models/Project'
import type {Request, Response, NextFunction} from 'express'  

declare global { 
    namespace Express { 
        interface Request { 
            project: IProject
        }
    }
}

export async function validateProjectExists (req:Request, res: Response, next: NextFunction) {  
         
        try {  
            const {projectId} = req.params 
            const project = await Project.findById(projectId) 
            if(!project){  
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message })
            }  
            req.project  = project
            next()

            
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
    }

// solo el manager o los miembros del equipo pueden acceder a las rutas de un proyecto
export function isProjectMember (req:Request, res: Response, next: NextFunction) {
    const userId = req.user._id.toString()
    const isManager = req.project.manager.toString() === userId
    const isTeamMember = req.project.team.some(member => member.toString() === userId)
    if(!isManager && !isTeamMember){
        const error = new Error('Acción no válida')
        return res.status(403).json({error: error.message})
    }
    next()
}

export function hasAuthorization (req:Request, res: Response, next: NextFunction) {
    if(req.user._id.toString() !== req.project.manager.toString()){
        const error = new Error('Acción no válida')
        return res.status(403).json({error: error.message})
    }
    next()
}