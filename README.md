# UpTask – Backend (API REST)

API REST construida con **Node.js + Express 5 + TypeScript + MongoDB (Mongoose)**.
Sirve los datos de **proyectos** y de sus **tareas** al frontend de UpTask (React).

Este documento está pensado para aprender: explica *qué* hace cada pieza, *por qué* está ahí y *cómo* se conecta con las demás.

---

## Índice

1. [¿Qué es este proyecto?](#1-qué-es-este-proyecto)
2. [Tecnologías y para qué sirve cada una](#2-tecnologías-y-para-qué-sirve-cada-una)
3. [Cómo ejecutarlo](#3-cómo-ejecutarlo)
4. [Estructura de carpetas (arquitectura)](#4-estructura-de-carpetas-arquitectura)
5. [Cómo viaja una petición (ciclo de vida)](#5-cómo-viaja-una-petición-ciclo-de-vida)
6. [Explicación archivo por archivo](#6-explicación-archivo-por-archivo)
7. [Base de datos y modelos](#7-base-de-datos-y-modelos)
8. [Relación Proyectos ↔ Tareas](#8-relación-proyectos--tareas)
9. [Middlewares](#9-middlewares)
10. [Validaciones con express-validator](#10-validaciones-con-express-validator)
11. [Controladores](#11-controladores)
12. [Todas las rutas (endpoints)](#12-todas-las-rutas-endpoints)
13. [Formato de las respuestas](#13-formato-de-las-respuestas)
14. [CORS](#14-cors)
15. [Consultas a la base de datos (Mongoose)](#15-consultas-a-la-base-de-datos-mongoose)
16. [Problemas conocidos y mejoras](#16-problemas-conocidos-y-mejoras)
17. [Glosario](#17-glosario)

---

## 1. ¿Qué es este proyecto?

Es el "servidor" de una aplicación de gestión de proyectos (tipo Trello simplificado):

- Un **proyecto** tiene nombre, cliente y descripción.
- Un proyecto tiene muchas **tareas** (nombre, descripción y un estado).
- El servidor no tiene interfaz: solo recibe peticiones HTTP (`GET`, `POST`, `PUT`, `DELETE`), habla con la base de datos y responde con texto o JSON.

El frontend (otro proyecto, React) es quien consume esta API.

---

## 2. Tecnologías y para qué sirve cada una

| Paquete | Para qué se usa aquí |
|---|---|
| **express** (v5) | Framework web. Recibe las peticiones HTTP, las enruta y devuelve respuestas. |
| **typescript** + **ts-node** | Escribimos en TypeScript y `ts-node` lo ejecuta directamente sin compilar a mano. |
| **nodemon** | Reinicia el servidor automáticamente cuando guardas un archivo. |
| **mongoose** | ODM: te deja usar MongoDB con objetos/clases de JavaScript, definiendo *esquemas* y *modelos*. |
| **express-validator** | Valida y limpia los datos que llegan en `body` y `params`. |
| **cors** | Permite que el navegador acepte peticiones desde otro origen (el frontend). |
| **dotenv** | Carga las variables de `.env` a `process.env`. |
| **morgan** | Imprime en consola un log de cada petición (`GET /api/projects 200 12ms`). |
| **colors** | Colores en los `console.log` de la consola. |

---

## 3. Cómo ejecutarlo

### Requisitos
- Node.js 18+
- Una base de datos MongoDB (local o en MongoDB Atlas)

### Variables de entorno (`.env`)

Crea un archivo `.env` en la raíz del backend:

```env
DATABASE_URL=mongodb+srv://<usuario>:<password>@<cluster>/<nombre_bd>
FRONTEND_URL=http://localhost:5173
PORT=4000          # opcional, por defecto 4000
```

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Cadena de conexión a MongoDB. **Es un secreto**, nunca la subas a GitHub. |
| `FRONTEND_URL` | Origen exacto del frontend (lo usa CORS para decidir quién puede llamar a la API). |
| `PORT` | Puerto del servidor. |

### Comandos

```bash
npm install
npm run dev      # nodemon --exec ts-node src/index.ts
```

Si todo va bien verás:

```
MongoDB conectando en : <host>:<puerto>
REST API funcionando en el puerto 4000
```

La API queda en `http://localhost:4000/api/projects`.

---

## 4. Estructura de carpetas (arquitectura)

```
src/
├── index.ts                 ← Punto de entrada: arranca el servidor (listen)
├── server.ts                ← Crea la app de Express y registra middlewares y rutas
│
├── config/                  ← Configuración
│   ├── db.ts                ← Conexión a MongoDB
│   └── cors.ts              ← Reglas de CORS
│
├── routes/
│   └── projectRoutes.ts     ← Define las URLs y qué middlewares/controlador usa cada una
│
├── middleware/              ← Funciones que corren ANTES del controlador
│   ├── validation.ts        ← Devuelve 400 si express-validator encontró errores
│   ├── project.ts           ← Verifica que el proyecto de la URL exista
│   └── task.ts              ← Verifica que la tarea exista y pertenezca al proyecto
│
├── controllers/             ← La lógica de cada endpoint
│   ├── ProjectController.ts
│   └── TaskController.ts
│
└── models/                  ← Esquemas/modelos de Mongoose (la forma de los datos)
    ├── Project.ts
    └── Task.ts
```

### Patrón: separación por responsabilidades (tipo MVC sin vistas)

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Entrada/Configuración | `index.ts`, `server.ts`, `config/` | Arrancar y configurar la app |
| Rutas | `routes/` | "Si llega `GET /x`, ejecuta estos pasos" |
| Middlewares | `middleware/` | Pasos intermedios reutilizables (validar, buscar, autorizar) |
| Controladores | `controllers/` | La lógica de negocio de cada endpoint |
| Modelos | `models/` | Estructura de los datos y acceso a la BD |

La idea clave: **cada archivo hace una sola cosa**. Las rutas no tienen lógica, los controladores no validan URLs, los modelos no saben de HTTP.

---

## 5. Cómo viaja una petición (ciclo de vida)

Ejemplo: `PUT /api/projects/65f.../tasks/66a...` (editar una tarea).

```
Cliente (navegador / frontend)
        │
        ▼
 ┌─────────────────────────── server.ts ───────────────────────────┐
 │ 1. cors(corsConfig)     → ¿el origen está permitido?             │
 │ 2. morgan('dev')        → imprime el log de la petición          │
 │ 3. express.json()       → convierte el body JSON en req.body     │
 │ 4. app.use('/api/projects', projectRoutes) → entra al Router     │
 └──────────────────────────────────────────────────────────────────┘
        │
        ▼
 ┌────────────────────── projectRoutes.ts ──────────────────────────┐
 │ 5. router.param('projectId') → validateProjectExists             │
 │       busca el proyecto en BD y lo guarda en req.project         │
 │ 6. router.param('taskId')    → taskExists                        │
 │       busca la tarea y la guarda en req.task                     │
 │                              → taskBelongsToProject              │
 │       confirma que task.project === project._id                  │
 │ 7. param('taskId').isMongoId() + body('name')... (validaciones)  │
 │ 8. habndleInputErrors   → si hay errores responde 400 y corta    │
 │ 9. TaskController.updateTask → hace el trabajo y responde        │
 └──────────────────────────────────────────────────────────────────┘
        │
        ▼
   Respuesta al cliente
```

**Regla de oro de Express:** cada middleware recibe `(req, res, next)`.
- Si todo está bien llama a `next()` y la petición pasa al siguiente paso.
- Si algo falla, responde con `res.status(...).json(...)` y **no** llama a `next()`: la cadena se corta ahí.

---

## 6. Explicación archivo por archivo

### `src/index.ts` – el arranque

```ts
import server from './server'
const port = process.env.PORT || 4000
server.listen(port, () => { console.log(`REST API funcionando en el puerto ${port}`) })
```

Solo importa la app y la pone a escuchar en un puerto. Separar `index.ts` de `server.ts` es una buena práctica: `server.ts` exporta la app sin "encenderla", lo que facilita probarla.

### `src/server.ts` – la app de Express

```ts
dotenv.config()          // 1. carga el .env
connectDB()              // 2. conecta a MongoDB
const app = express()    // 3. crea la aplicación

app.use(cors(corsConfig))   // permite al frontend llamar a la API
app.use(morgan('dev'))      // logs
app.use(express.json())     // lee body JSON → req.body

app.use('/api/projects', projectRoutes)   // prefijo para todas las rutas de proyectos
export default app
```

**El orden de los `app.use` importa**: Express ejecuta los middlewares en el orden en que se registran. `express.json()` debe ir *antes* de las rutas; si no, `req.body` llegaría `undefined`.

`app.use('/api/projects', projectRoutes)` significa: *"todo lo que empiece con `/api/projects` se lo paso al router `projectRoutes`"*. Por eso dentro del router las rutas se escriben como `'/'`, `'/:id'`, etc. (el prefijo ya está puesto).

### `src/config/db.ts` – conexión a MongoDB

```ts
const connection = await mongoose.connect(process.env.DATABASE_URL)
```

- `mongoose.connect` abre la conexión usando la URL del `.env`. Devuelve una promesa, por eso `async/await`.
- Si falla, imprime el error y hace `process.exit(1)` (cierra el servidor: no tiene sentido una API sin base de datos).
- Se conecta **una sola vez** al arrancar; Mongoose reutiliza esa conexión en todos los modelos.

### `src/config/cors.ts` – ver [sección 14](#14-cors).

### `src/routes/projectRoutes.ts` – el mapa de la API

Es el archivo más importante para entender el flujo. Define cada URL y la "tubería" de pasos que sigue. Se detalla en las secciones 9, 10 y 12.

---

## 7. Base de datos y modelos

### MongoDB no tiene tablas

MongoDB es una base **NoSQL orientada a documentos**:

| SQL | MongoDB |
|---|---|
| Base de datos | Base de datos |
| Tabla | **Colección** |
| Fila | **Documento** (parecido a un objeto JSON) |
| Columna | Campo |
| Clave primaria | `_id` (un `ObjectId` generado automáticamente) |

Mongoose crea las colecciones `projects` y `tasks` automáticamente a partir de los nombres de los modelos (`'Project'` → `projects`, `'Task'` → `tasks`).

### Interface vs Schema (dos cosas distintas)

En cada modelo hay dos definiciones, y es normal confundirse:

| | Interface (`IProject`) | Schema (`ProjectSchema`) |
|---|---|---|
| Es de… | **TypeScript** | **Mongoose** |
| Sirve para… | Autocompletado y errores al programar | Validar y estructurar los datos reales en la BD |
| Existe en… | Solo en desarrollo (se borra al compilar) | En ejecución |

`mongoose.model<IProject>('Project', ProjectSchema)` las une: le dice a Mongoose el schema y a TypeScript el tipo.

### `models/Project.ts`

```ts
export interface IProject extends Document {
    projectName: string
    clientName: string
    description: string
    tasks: PopulatedDoc<ITask & Document>[]
}

const ProjectSchema = new Schema({
    projectName: { type: String, required: true, trim: true },
    clientName:  { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tasks: [{ type: Types.ObjectId, ref: 'Task' }]
}, { timestamps: true })
```

- `required: true` → Mongoose rechaza guardar sin ese campo.
- `trim: true` → elimina espacios al inicio y al final.
- `timestamps: true` → agrega y mantiene solos `createdAt` y `updatedAt`.
- `tasks` → **arreglo de IDs** que apuntan a documentos de la colección `tasks` (`ref: 'Task'`).
- `PopulatedDoc` → tipo de Mongoose que dice "este campo puede ser un ID o, si hago `populate`, el documento completo".

### `models/Task.ts`

```ts
const taskStatus = {
    PENDING: 'pending', ON_HOLD: 'onHold', IN_PROGRESS: 'inProgress',
    UNDER_REVIEW: 'underReview', COMPLETE: 'completed'
} as const

export type TaskStatusType = typeof taskStatus[keyof typeof taskStatus]
```

- `as const` vuelve el objeto de solo lectura y hace que TypeScript conozca los valores exactos.
- `typeof taskStatus[keyof typeof taskStatus]` genera el tipo unión `'pending' | 'onHold' | 'inProgress' | 'underReview' | 'completed'`. Así `status` solo puede ser uno de esos valores.

```ts
export const TaskSchema = new Schema({
    name:        { type: String, trim: true, required: true },
    description: { type: String, trim: true, required: true },
    project:     { type: Types.ObjectId, ref: 'Project' },
    status:      { type: String, enum: Object.values(taskStatus), defualt: taskStatus.PENDING }
})
```

- `enum: Object.values(taskStatus)` → Mongoose solo acepta uno de los 5 estados.
- `project` → ID del proyecto al que pertenece la tarea.
- ⚠️ Ver [errores conocidos](#16-problemas-conocidos-y-mejoras): `defualt` está mal escrito y por eso el estado por defecto no se aplica.

---

## 8. Relación Proyectos ↔ Tareas

Es una relación **uno a muchos**: *un proyecto tiene muchas tareas; cada tarea pertenece a un solo proyecto.*

En este proyecto la relación está guardada **en los dos lados** (referencia bidireccional):

```
  Colección projects                         Colección tasks
 ┌───────────────────────────┐              ┌───────────────────────────┐
 │ _id: "P1"                 │              │ _id: "T1"                 │
 │ projectName: "Web ACME"   │◄─────────────│ project: "P1"             │
 │ tasks: ["T1", "T2"]  ─────┼─────────────►│ name: "Diseñar logo"      │
 └───────────────────────────┘              ├───────────────────────────┤
                                            │ _id: "T2"                 │
                                            │ project: "P1"             │
                                            └───────────────────────────┘
```

- `Project.tasks` → arreglo con los `_id` de sus tareas.
- `Task.project` → el `_id` del proyecto dueño.

### ¿Por qué guardarlo en ambos lados?

- Desde el proyecto: `Project.findById(id).populate('tasks')` trae el proyecto con todas sus tareas.
- Desde la tarea: `Task.find({ project: id })` trae las tareas de un proyecto, y `.populate('project')` trae el proyecto de una tarea.

### `populate()`: el "JOIN" de MongoDB

Sin `populate`, `project.tasks` es solo una lista de IDs:

```json
{ "projectName": "Web ACME", "tasks": ["66a1...", "66a2..."] }
```

Con `.populate('tasks')`, Mongoose hace una segunda consulta y reemplaza cada ID por el documento completo:

```json
{ "projectName": "Web ACME", "tasks": [ { "_id": "66a1...", "name": "Diseñar logo", ... } ] }
```

### Mantener la relación sincronizada

Como el dato vive en dos lugares, **cada vez que se crea o borra una tarea hay que actualizar ambos**:

**Crear tarea** (`TaskController.createTask`):
```ts
const task = new Task(req.body)
task.project = req.project._id          // 1. la tarea apunta al proyecto
req.project.tasks.push(task._id)        // 2. el proyecto apunta a la tarea
await Promise.allSettled([task.save(), req.project.save()])   // 3. guarda ambos
```

**Eliminar tarea** (`TaskController.deleteTask`):
```ts
req.project.tasks = req.project.tasks.filter(t => t.toString() !== req.task._id.toString())
await Promise.allSettled([req.task.deleteOne(), req.project.save()])
```
Se quita el ID del arreglo del proyecto **y** se borra la tarea.

> `Promise.allSettled([a, b])` ejecuta las dos operaciones en paralelo y espera a que terminen ambas (aunque alguna falle). Es más rápido que hacer un `await` tras otro.

---

## 9. Middlewares

Un **middleware** es una función `(req, res, next)` que se ejecuta *entre* que llega la petición y que la atiende el controlador.

### Middlewares globales (en `server.ts`)

| Middleware | Función |
|---|---|
| `cors(corsConfig)` | Añade las cabeceras CORS o rechaza el origen |
| `morgan('dev')` | Registra cada petición en consola |
| `express.json()` | Parsea el body JSON a `req.body` |

### Middlewares propios

#### `validation.ts` → `habndleInputErrors`
Lee el resultado de las validaciones de `express-validator`. Si hay errores responde `400` con la lista; si no, `next()`.

```ts
const errors = validationResult(req)
if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
next()
```

#### `project.ts` → `validateProjectExists`
Busca el proyecto cuyo id viene en la URL (`:projectId`). Si no existe → `404`. Si existe lo **guarda en `req.project`** para que los siguientes pasos no tengan que volver a consultarlo.

```ts
const project = await Project.findById(projectId)
if (!project) return res.status(404).json({ error: 'Proyect no encontrado' })
req.project = project
next()
```

#### `task.ts` → `taskExists` y `taskBelongsToProject`
- `taskExists`: busca la tarea por `:taskId`; si no existe → `404`; si existe → `req.task`.
- `taskBelongsToProject`: compara `req.task.project` con `req.project._id`. Si no coinciden → `400`. Evita que alguien edite una tarea del proyecto A usando la URL del proyecto B.

> Se usa `.toString()` en la comparación porque los `ObjectId` son objetos: `objA === objB` casi siempre da `false` aunque tengan el mismo valor.

### Extender el tipo `Request` (`declare global`)

```ts
declare global {
    namespace Express {
        interface Request { project: IProject }
    }
}
```

`req.project` no existe en Express por defecto. Este bloque le *enseña* a TypeScript que `Request` ahora tiene la propiedad `project` (y `task` en el otro archivo). Sin esto, TypeScript marcaría error al escribir `req.project`.

### `router.param()`: middleware por parámetro de URL

```ts
router.param('projectId', validateProjectExists)
router.param('taskId', taskExists)
router.param('taskId', taskBelongsToProject)
```

Express ejecuta automáticamente esa función **siempre que una ruta contenga ese parámetro** (`:projectId` o `:taskId`). Así no repites el middleware en cada ruta. Se ejecutan en el orden en que aparecen los parámetros en la URL: primero `projectId` y luego `taskId`, y por eso `taskBelongsToProject` ya puede usar `req.project`.

---

## 10. Validaciones con express-validator

Se escriben como una **cadena de métodos** dentro de la ruta, antes del controlador:

```ts
body('projectName')
    .isString().withMessage('El nombre del proyecto no es válido').bail()
    .trim()
    .notEmpty().withMessage('El nombre del proyecto es obligatorio').bail()
    .not().matches(onlyNumbers).withMessage('El nombre del proyecto no puede contener solo números'),
```

| Método | Qué hace |
|---|---|
| `body('campo')` / `param('campo')` | Elige qué campo del body o de la URL validar |
| `.isString()` | Debe ser texto |
| `.trim()` | Limpia espacios (es un *sanitizer*: modifica el valor) |
| `.notEmpty()` | No puede estar vacío |
| `.not().matches(regex)` | **No** debe cumplir la expresión regular |
| `.isMongoId()` | Debe ser un `ObjectId` válido de 24 caracteres hexadecimales |
| `.withMessage('...')` | Mensaje de error si falla la validación anterior |
| `.bail()` | Si esta validación falla, **no** ejecuta las siguientes de la cadena |

`onlyNumbers = /^[\d\s,.]+$/` detecta textos formados únicamente por dígitos, espacios, comas o puntos (para impedir nombres como `"12345"`).

> Las validaciones **solo acumulan** errores. Quien responde `400` es el middleware `habndleInputErrors` que se coloca justo después. Si olvidas ponerlo, las validaciones no detienen nada.

---

## 11. Controladores

Un controlador es la función final: ya se validó todo, aquí se hace el trabajo y se responde. Están como **métodos estáticos de una clase** (`static createProject = async (req, res) => {...}`), lo que permite llamarlos sin instanciar: `ProjectController.createProject`.

### `ProjectController`

| Método | Qué hace | Consulta Mongoose |
|---|---|---|
| `createProject` | Crea un proyecto con `req.body` | `new Project(req.body)` + `.save()` |
| `getAllProjects` | Lista todos los proyectos | `Project.find({})` |
| `getProjectById` | Devuelve un proyecto con sus tareas | `Project.findById(id).populate('tasks')` |
| `updateProject` | Actualiza nombre, cliente y descripción | `findById` → modificar campos → `.save()` |
| `deleteProjectById` | Elimina un proyecto | `findById` → `.deleteOne()` |

### `TaskController`

Aquí los controladores son más cortos porque los middlewares ya hicieron el trabajo de buscar: `req.project` y `req.task` **ya están cargados**.

| Método | Qué hace |
|---|---|
| `createTask` | Crea la tarea y la enlaza con el proyecto (ver sección 8) |
| `getProjectTasks` | `Task.find({ project: req.project._id }).populate('project')` |
| `getTaskById` | Devuelve `req.task` directamente |
| `updateTask` | Cambia `name` y `description` de `req.task` y guarda |
| `deleteTask` | Quita la tarea del proyecto y la elimina |
| `updateStatus` | Cambia `req.task.status` por el valor recibido en `body.status` |

### Estructura típica de un controlador

```ts
static updateTask = async (req: Request, res: Response) => {
    try {
        req.task.name = req.body.name
        req.task.description = req.body.description
        await req.task.save()
        res.send('tarea actualizada correctamente')
    } catch (error) {
        console.log('Hubo un error')
    }
}
```

1. `async` porque las operaciones con BD son asíncronas.
2. `try/catch` para capturar fallos.
3. Se usa `req.body` (datos enviados), `req.params` (datos de la URL) y los objetos que dejaron los middlewares (`req.project`, `req.task`).
4. Se responde con `res.send(...)` (texto) o `res.json(...)` (JSON).

---

## 12. Todas las rutas (endpoints)

Prefijo común: **`/api/projects`** (definido en `server.ts`).

### Proyectos

| Método | URL | Qué hace | Validaciones |
|---|---|---|---|
| `POST` | `/api/projects` | Crear proyecto | `projectName`, `clientName`, `description`: texto, no vacío, no solo números |
| `GET` | `/api/projects` | Listar proyectos | — |
| `GET` | `/api/projects/:id` | Obtener un proyecto (con tareas) | `id` es `MongoId` |
| `PUT` | `/api/projects/:id` | Actualizar proyecto | `id` es `MongoId`; los 3 campos no vacíos |
| `DELETE` | `/api/projects/:id` | Eliminar proyecto | `id` es `MongoId` |

### Tareas (siempre dentro de un proyecto)

| Método | URL | Qué hace | Middlewares |
|---|---|---|---|
| `POST` | `/api/projects/:projectId/tasks` | Crear tarea | `validateProjectExists` + validar `name`, `description` |
| `GET` | `/api/projects/:projectId/tasks` | Listar tareas del proyecto | `validateProjectExists` |
| `GET` | `/api/projects/:projectId/tasks/:taskId` | Obtener una tarea | proyecto existe, tarea existe, tarea pertenece al proyecto, `taskId` MongoId |
| `PUT` | `/api/projects/:projectId/tasks/:taskId` | Actualizar tarea | igual + validar `name`, `description` |
| `DELETE` | `/api/projects/:projectId/tasks/:taskId` | Eliminar tarea | igual |
| `POST` | `/api/projects/projectId/tasks/:taskId/status` | Cambiar estado ⚠️ | Ver [errores conocidos](#16-problemas-conocidos-y-mejoras) |

### Ejemplos de uso

**Crear proyecto**
```http
POST http://localhost:4000/api/projects
Content-Type: application/json

{
  "projectName": "Tienda online",
  "clientName": "ACME S.A.",
  "description": "Rediseño completo del e-commerce"
}
```
Respuesta `200`: `Proyecto creado correctamente...`

**Crear tarea**
```http
POST http://localhost:4000/api/projects/65f0c2.../tasks
Content-Type: application/json

{ "name": "Diseñar logo", "description": "Tres propuestas en vectorial" }
```

**Error de validación (`400`)**
```json
{ "errors": [ { "type": "field", "msg": "El nombre del proyecto es obligatorio", "path": "projectName", "location": "body" } ] }
```

**Proyecto inexistente (`404`)**
```json
{ "error": "Proyect no encontrado" }
```

> Nota: por la configuración de CORS, para probar con Postman/Insomnia tendrías que permitir peticiones sin cabecera `Origin` (ver sección 14).

---

## 13. Formato de las respuestas

| Situación | Código | Cuerpo |
|---|---|---|
| Creación / actualización / borrado correctos | `200` | **Texto plano** (`'Proyecto actualizado'`) |
| Listados y consultas | `200` | **JSON** (objeto o arreglo) |
| Error de validación | `400` | `{ "errors": [ {msg, path, ...} ] }` |
| Recurso no encontrado | `404` | `{ "error": "mensaje" }` |
| Acción no válida (tarea de otro proyecto) | `400` | `{ "error": "Acción no válida" }` |

El frontend depende de este formato: en sus `catch` lee `error.response.data.errors[0].msg` o `error.response.data.error`. Si cambias la forma de los errores aquí, hay que cambiarlo allá.

---

## 14. CORS

**Problema:** los navegadores bloquean por seguridad que una página en un origen (`http://localhost:5173`, el frontend) haga peticiones a otro origen (`http://localhost:4000`, esta API). Un *origen* es protocolo + dominio + puerto; basta que cambie el puerto para que sean distintos.

**Solución:** el servidor debe responder con la cabecera `Access-Control-Allow-Origin` indicando qué origen permite. De eso se encarga el paquete `cors`.

```ts
export const corsConfig: CorsOptions = {
    origin: function (origin, callback) {
        const whiteList = [process.env.FRONTEND_URL]
        if (whiteList.includes(origin)) {
            callback(null, true)                       // permitido
        } else {
            callback(new Error('Error de CORS'))       // rechazado
        }
    }
}
```

- `origin` es el origen que manda el navegador en la cabecera `Origin`.
- Se usa una **lista blanca** (`whiteList`) con solo la URL del frontend (del `.env`). Así ningún otro sitio web puede consumir tu API desde un navegador.
- Para métodos como `PUT`/`DELETE` o `POST` con JSON, el navegador primero envía una petición *preflight* (`OPTIONS`) preguntando si está permitido; el middleware `cors` la responde automáticamente.

⚠️ **Consecuencia:** las herramientas como Postman, Insomnia o `curl` **no envían `Origin`**, por lo que `origin` llega `undefined`, no está en la lista y se rechazan. Para probarlas, en desarrollo puedes permitir `undefined`:

```ts
if (!origin || whiteList.includes(origin)) { ... }
```

(En producción conviene decidir esto con cuidado.)

CORS es una protección **del navegador**; no impide que otros programas llamen a tu API. Para eso se necesita autenticación.

---

## 15. Consultas a la base de datos (Mongoose)

Resumen de todas las operaciones que usa el proyecto:

| Operación | Código | Equivalente SQL |
|---|---|---|
| Crear (opción A) | `const p = new Project(body); await p.save()` | `INSERT` |
| Buscar todos | `Project.find({})` | `SELECT * FROM projects` |
| Buscar con filtro | `Task.find({ project: id })` | `SELECT * FROM tasks WHERE project = id` |
| Buscar por id | `Project.findById(id)` | `SELECT ... WHERE _id = id` |
| Traer relación | `.populate('tasks')` | `JOIN` |
| Actualizar | modificar campos del documento + `.save()` | `UPDATE` |
| Eliminar | `documento.deleteOne()` | `DELETE` |

### Patrón "buscar → modificar → guardar"

```ts
const project = await Project.findById(id)    // trae un documento Mongoose
project.clientName = req.body.clientName       // se modifica como un objeto normal
await project.save()                            // Mongoose detecta qué cambió y lo guarda
```

Ventaja: al usar `.save()`, Mongoose **ejecuta las validaciones del schema** (`required`, `enum`, etc.). 

### Importante: `await`

Todas las operaciones con la BD devuelven promesas. Sin `await` obtienes la promesa, no los datos.

---

## 16. Problemas conocidos y mejoras

Revisando el código aparecieron errores reales. Están anotados para que los corrijas y entiendas por qué fallan:

### 🔴 Errores que rompen funcionalidad

1. **Ruta de estado de tarea mal definida** (`routes/projectRoutes.ts`, última ruta):
   ```ts
   router.post('/projectId/tasks/:taskId/status', ...)   // ❌
   ```
   Le falta `:` a `projectId`, por lo que se toma como texto literal y `validateProjectExists` nunca corre (`req.project` queda `undefined` y `taskBelongsToProject` falla). Además, cambiar un campo es mejor con `PATCH`:
   ```ts
   router.patch('/:projectId/tasks/:taskId/status', ...)  // ✅
   ```
   *(Es el mismo tipo de error que causaba el 404 en el frontend con `projectId` en su router.)*

2. **`defualt` en lugar de `default`** (`models/Task.ts`). Mongoose ignora la propiedad mal escrita, así que las tareas nuevas se crean **sin `status`**. Debe ser `default: taskStatus.PENDING`.

3. **Las peticiones se quedan colgadas cuando hay un error.** Casi todos los `catch` solo hacen `console.log(error)` y no envían respuesta, así que el cliente espera para siempre. Ejemplo: enviar un id no válido a `/api/projects/abc/tasks` provoca un `CastError` en `validateProjectExists`. Solución mínima:
   ```ts
   } catch (error) {
       console.log(error)
       res.status(500).json({ error: 'Hubo un error' })
   }
   ```

### 🟡 Mejoras recomendadas

- **Borrar un proyecto no borra sus tareas** → quedan tareas "huérfanas" en la colección `tasks`. Se puede resolver con un *middleware de Mongoose* (`pre('deleteOne')`) o borrando manualmente con `Task.deleteMany({ project: id })`.
- **`router.param` se ejecuta antes que `isMongoId`**, por lo que un id inválido llega a `findById` y lanza error. Valida el formato primero o maneja el `CastError`.
- **Validaciones inconsistentes**: `POST /projects` valida tipo y "solo números", pero `PUT /projects/:id` solo valida `notEmpty`.
- **`Promise.allSettled` oculta errores**: si `task.save()` falla, igual se responde éxito. Usa `Promise.all` si quieres que un fallo propague el error.
- **Respuestas en texto plano**: es más cómodo devolver JSON siempre (`{ message: '...' }`).
- **Nombres con typos**: `habndleInputErrors` → `handleInputErrors`; `'Proyect'` → `'Proyecto'`; `'tarea creade'`.
- **`Task` sin `timestamps`** (a diferencia de `Project`).
- **`task.project` no es `required`**: se podría guardar una tarea sin proyecto.
- **Duplicación**: el bloque que responde "Proyecto no encontrado" está repetido en tres controladores. Como ya existe `validateProjectExists`, se podría reutilizar con `req.project`.
- **`strict: false` en `tsconfig.json`** relaja TypeScript (por eso compila `process.env.DATABASE_URL` que puede ser `undefined`). Activarlo ayuda a detectar errores.

### 🔐 Seguridad

- En `src/index.ts` hay un **comentario con lo que parece un usuario y contraseña** de la base de datos. Elimínalo y, como ya quedó escrito en el archivo, **cambia esa contraseña** en MongoDB Atlas.
- Confirma que `.env` esté en un `.gitignore` antes de subir el proyecto a GitHub (ahora mismo el backend no tiene `.gitignore`).
- La API no tiene autenticación: cualquiera que llegue a ella puede crear, editar o borrar datos.

---

## 17. Glosario

| Término | Significado |
|---|---|
| **API REST** | Servidor que expone URLs y métodos HTTP para manipular recursos |
| **Endpoint** | Una URL + método concretos (ej. `GET /api/projects`) |
| **Middleware** | Función `(req, res, next)` que se ejecuta antes del controlador |
| **Controlador** | Función que contiene la lógica final de un endpoint |
| **Modelo** | Clase de Mongoose para consultar y guardar en una colección |
| **Schema** | Definición de campos, tipos y reglas de un modelo |
| **ObjectId** | Identificador único de 24 caracteres hex que genera MongoDB (`_id`) |
| **Populate** | Reemplazar IDs referenciados por los documentos completos |
| **ODM** | Object Document Mapper (Mongoose para MongoDB, como un ORM para SQL) |
| **CORS** | Mecanismo del navegador que controla qué orígenes pueden llamar a la API |
| **Preflight** | Petición `OPTIONS` previa que hace el navegador para consultar permisos CORS |
| **Sanitizer** | Función que limpia el dato (ej. `trim`) en vez de solo validarlo |
