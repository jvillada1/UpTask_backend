import type { Request, Response } from "express"
import Project from "../models/Project"
export class ProjectController {  
    
    static createProject= async (req: Request, res: Response) => {  
        const {projectName, clientName, description} = req.body
        const project = new Project({projectName, clientName, description})  

        // asigna un manager 
        project.manager = req.user._id

        try {
            await project.save() 
            res.send('Proyecto creado correctamente...')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
        
    }
    static getAllProjects = async (req: Request, res: Response) => {  
        try {
            const projects = await Project.find({
                $or: [
                    {manager: req.user._id},
                    {team: req.user._id}
                ]
            }) 
            res.json(projects)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
       
    }  

    static getProjectById = async (req: Request, res:Response )=>{ 
        const {id} = req.params
        try { 
            
            const project = await Project.findById(id).populate('tasks')
            if(!project){  
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message })
            }  
            if(project.manager.toString() !== req.user._id.toString() &&!project.team.includes(req.user._id)){ 
                const error = new Error('Acción no válida')
                return res.status(404).json({error: error.message })
            }
            res.json(project)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
    } 

    static updateProject = async (req: Request, res:Response )=>{ 
        const {id} = req.params
        try { 
            const project = await Project.findById(id)   
            if(!project){  
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message })
            }   

            if(project.manager.toString() !== req.user._id.toString()){ 
                const error = new Error('Solo el manager puede actualizar un proyecto')
                return res.status(404).json({error: error.message })
            }
            project.clientName = req.body.clientName
            project.projectName = req.body.projectName
            project.description = req.body.description

            await project.save() 
            res.send('Proyecto actualizado')

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
    } 
    

    static deleteProjectById = async (req: Request, res:Response )=>{ 
        const {id} = req.params
        try { 
            const project = await Project.findById(id)   
            if(!project){  
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message })
            }  

            if(project.manager.toString() !== req.user._id.toString()){ 
                const error = new Error('Solo el manager puede eliminar un proyecto')
                return res.status(404).json({error: error.message })
            }
            await project.deleteOne() 
            res.send('Proyecto eliminado')
        
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un error'})
        }
    } 

    
}