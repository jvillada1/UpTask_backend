import { Router } from "express";  
import { ProjectController } from "../controllers/ProjectController"; 
import { body, param} from "express-validator";
import { habndleInputErrors } from "../middleware/validation"; 
import { TaskController } from "../controllers/TaskController";
import { hasAuthorization, isProjectMember, validateProjectExists } from "../middleware/project";
import { taskBelongsToProject, taskExists } from "../middleware/task";
import { authenticate } from "../middleware/auth";
import { TeamMemberController } from "../controllers/TeamController";
import { NoteController } from "../controllers/NoteController";


const router = Router()  
router.use(authenticate)
const onlyNumbers = /^[\d\s,.]+$/

router.param('projectId', validateProjectExists)
router.param('projectId', isProjectMember)
router.post('/', 
    body('projectName')
    .isString().withMessage('El nombre del proyecto no es válido').bail()
    .trim()
    .notEmpty().withMessage('El nombre del proyecto es obligatorio').bail()
    .not().matches(onlyNumbers).withMessage('El nombre del proyecto no puede contener solo números'), 

    body('clientName')
    .isString().withMessage('El nombre del cliente no es válido').bail()
    .trim()
    .notEmpty().withMessage('El nombre del cliente es obligatorio').bail()
    .not().matches(onlyNumbers).withMessage('El nombre del cliente no puede contener solo números'), 
    
    body('description')
    .isString().withMessage('La descripción del proyecto no es válida').bail()
    .trim()
    .notEmpty().withMessage('La descripción del proyecto es obligatoria').bail()
    .not().matches(onlyNumbers).withMessage('La descripción del proyecto no puede contener solo números'), 
    habndleInputErrors,
    ProjectController.createProject ) 


router.get('/',  ProjectController.getAllProjects) 
router.get('/:id',
    param('id').isMongoId().withMessage('ID no válido'), 
    habndleInputErrors,
    ProjectController.getProjectById)  

router.put('/:id',
    param('id').isMongoId().withMessage('ID no válido'),  
    body('projectName')
    .notEmpty().withMessage('El nombre del proyecto es obligatorio'), 

    body('clientName')
    .notEmpty().withMessage('El nombre del cliente es obligatorio'), 
    
    body('description')
    .notEmpty().withMessage('La descripción del proyecto es obligatoria'), 
    habndleInputErrors,
    ProjectController.updateProject)  

router.delete('/:id',
    param('id').isMongoId().withMessage('ID no válido'), 
    habndleInputErrors,
    ProjectController.deleteProjectById)   


// routes for tasks 

router.post('/:projectId/tasks',  
    hasAuthorization,
    body('name')
    .notEmpty().withMessage('El nombre de la tarea es obligatorio'), 

    body('description')
    .notEmpty().withMessage('La descripción de la tarea es obligatoria'), 
    
    habndleInputErrors,
    TaskController.createTask
) 

router.get('/:projectId/tasks',  
    TaskController.getProjectTasks
)  

router.param('taskId', taskExists) 
router.param('taskId', taskBelongsToProject) 


router.get('/:projectId/tasks/:taskId',   
    param('taskId').isMongoId().withMessage('ID no válido'), 
    habndleInputErrors,
    TaskController.getTaskById
)  

router.put('/:projectId/tasks/:taskId',   
    hasAuthorization, 
    param('taskId').isMongoId().withMessage('ID no válido'),   
    body('name')
    .notEmpty().withMessage('El nombre de la tarea es obligatorio'), 

    body('description')
    .notEmpty().withMessage('La descripción de la tarea es obligatoria'), 
    habndleInputErrors,
    TaskController.updateTask
)  

router.delete('/:projectId/tasks/:taskId',   
    hasAuthorization, 
    param('taskId').isMongoId().withMessage('ID no válido'), 
    habndleInputErrors,
    TaskController.deleteTask
)   

router.post('/:projectId/tasks/:taskId/status', 
    param('taskId').isMongoId().withMessage('ID no válido'), 
    body('status') 
        .notEmpty().withMessage('El estado es obligatorio')
        .isIn(['pending', 'onHold', 'inProgress', 'underReview', 'completed']).withMessage('Estado no válido'),
    habndleInputErrors, 
    TaskController.updateStatus
) 


router.post('/:projectId/team/find',
    hasAuthorization,
    body('email')
        .isEmail().toLowerCase().withMessage('Email no válido'), 
    habndleInputErrors, 
    TeamMemberController.findMemberByEmail 
        

) 

router.get('/:projectId/team',
    hasAuthorization,
    TeamMemberController.getProjectTeam
)

router.post('/:projectId/team/',
    hasAuthorization,
    body('id')
        .isMongoId().withMessage('ID no válido'), 
    habndleInputErrors, 
    TeamMemberController.addMemberById

) 

router.delete('/:projectId/team/:userId',
    hasAuthorization,
    param('userId')
        .isMongoId().withMessage('ID no válido'), 
    habndleInputErrors, 
    TeamMemberController.removeMemberById

) 

// routes for notes 
router.post('/:projectId/tasks/:taskId/notes', 
    body('content')
        .notEmpty().withMessage('El contenido de la nota es obligatorio'), 
    habndleInputErrors,
    NoteController.createNote
) 

router.get('/:projectId/tasks/:taskId/notes', 
    NoteController.getTaskNotes
)

router.delete('/:projectId/tasks/:taskId/notes/:noteId',  
    param('noteId').isMongoId().withMessage('ID no válido'), 
    habndleInputErrors,
    
    NoteController.removeNote
)



export default router