# Seminari 5: API REST con Node.js, Express, TypeScript y MongoDB

API REST de ejemplo con dos recursos, **autores** y **libros**, organizada en capas
(rutas, middleware, controllers, services y models). Es la base sobre la que el equipo
trabaja los objetivos del Seminario 5 de EA:

- Estructura del proyecto
- Middleware: CORS, entrada (validación o logger) y salida (gestor de errores)
- Documentación con Swagger
- Linter

Qué está hecho y qué queda por hacer: [CONTRIBUTING.md](CONTRIBUTING.md).

## Tecnologías

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| [Node.js](https://nodejs.org/) | 24 LTS (mínimo 22.12) | Ejecuta JavaScript fuera del navegador: es el servidor |
| [TypeScript](https://www.typescriptlang.org/) | 6.0 | JavaScript con tipos. Se compila a JavaScript en `build/` |
| [Express](https://expressjs.com/) | 5.2 | Recibe las peticiones HTTP y las reparte por rutas y middleware |
| [MongoDB](https://www.mongodb.com/) | local o Atlas | Base de datos que guarda documentos |
| [Mongoose](https://mongoosejs.com/) | 9.10 | Define la forma de los datos (esquemas) y habla con MongoDB |
| [Joi](https://joi.dev/) | 18.2 | Comprueba que el body de una petición es correcto |
| [dotenv](https://github.com/motdotla/dotenv) | 17.4 | Carga las variables del archivo `.env` en `process.env` |
| [chalk](https://github.com/chalk/chalk) | 4.1 | Pone colores a los mensajes de la consola |
| [cors](https://github.com/expressjs/cors) | 2.8 | Controla desde qué origen puede llamar un navegador a la API |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | 5.0 | Muestra la documentación de la API en `/api-docs` |
| [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) | 6.3 | Construye esa documentación leyendo los comentarios `@openapi` de las rutas |
| [joi-to-swagger](https://github.com/Twipped/joi-to-swagger) | 6.2 | Convierte los esquemas de Joi en los esquemas de la documentación |
| [tsx](https://tsx.is/) | 4.23 | Ejecuta TypeScript sin compilar y reinicia la API al guardar (`npm run dev`) |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) | 1.85 | Analiza el código de `src/` y detecta errores comunes |
| [Prettier](https://prettier.io/) | extensión de VS Code | Da formato al código al guardar (reglas en `.prettierrc`) |

## Requisitos previos

- [Node.js](https://nodejs.org/) 24 LTS (mínimo 22.12). Incluye [npm](https://www.npmjs.com/).
  Si usas [nvm](https://github.com/nvm-sh/nvm), `nvm use` elige la versión indicada en `.nvmrc`.
- [MongoDB](https://www.mongodb.com/): una instancia local o un cluster en MongoDB Atlas.
- [VS Code](https://code.visualstudio.com/) con la extensión Prettier (recomendado).

TypeScript no hace falta instalarlo aparte: viene con las dependencias del proyecto.

## Clonar el proyecto

```
git clone https://github.com/Martatm18/EA-Seminari5-APIambExpress
cd EA-Seminari5-APIambExpress
```

## Instalar las dependencias

```
npm install
```

## Configurar las variables de entorno

Cada miembro del equipo tiene su propio `.env`, que **no se sube a git**. Se crea copiando la plantilla:

```
cp .env.example .env
```

| Variable | Qué es | Valor por defecto |
|---|---|---|
| `MONGO_URL` | Dirección de tu MongoDB | `mongodb://127.0.0.1:27017/seminari5` |
| `SERVER_PORT` | Puerto en el que escucha la API | `1337` |
| `CORS_ORIGIN` | Desde qué dirección se puede llamar a la API desde un navegador | `*` (cualquiera) |

## Llenar la base de datos (la primera vez)

Si arrancas con la base de datos vacía, la API funciona pero no devuelve nada. Para tener datos con
los que probar, hay 5 autores y 12 libros de ejemplo en `src/seed-data.ts`:

```
npm run seed
```

Este comando solo inserta los datos si la base de datos está vacía. Si ya tienes datos de pruebas
anteriores, o vienen de una versión antigua de los modelos, hay que borrarlos y volver a crearlos:

```
npm run seed -- --reset
```

Siempre trabaja sobre la base de datos de tu `.env`.

Todos los autores de ejemplo tienen la contraseña `seminari5`, y está escrita a la vista en
`src/seed-data.ts`. Es un proyecto de clase: las contraseñas son públicas a propósito, para que
cualquiera que clone el repositorio pueda entrar con cualquier usuario. En la base de datos sí se
guardan cifradas, porque el modelo las cifra antes de guardarlas.

## Ejecutar

Mientras programas, arranca la API en modo desarrollo. Se reinicia sola cada vez que guardas un archivo:
```
npm run dev
```

Para comprobar que responde, abre http://localhost:1337/ping en el navegador. Debe devolver `{"hello":"world"}`.
La documentación de la API (Swagger) está en http://localhost:1337/api-docs.

Para ejecutar la versión compilada, como se haría en un servidor:
```
npm run build
npm start
```

`npm run build` compila de TypeScript a JavaScript en `build/`. Si cambias el código, vuelve a ejecutarlo antes de `npm start`.

Para analizar el código con Oxlint:
```
npm run lint
```

El linter analiza únicamente `src/`; la carpeta `build/` contiene archivos generados por TypeScript.
Para aplicar las correcciones automáticas disponibles:
```
npm run lint:fix
```

## Controllers y operaciones asíncronas

Las consultas a MongoDB son operaciones asíncronas: tardan un tiempo y devuelven una
`Promise`. En los controllers usamos `async/await` para esperar su resultado de forma clara.

La estructura recomendada es:

```ts
const handler = async (req: Request, res: Response) => {
  try {
    const result = await Service.method(req.body);
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error });
  }
};
```

- `async` permite utilizar `await` dentro de la función.
- `await` espera a que termine la operación y guarda su resultado.
- `try` contiene la operación que puede fallar.
- `catch` devuelve un error `500` si la operación falla.

En este proyecto no devolvemos la respuesta con `return`. El controller la envía directamente
con `res.status(...).json(...)` o `res.status(...).send()`.

La forma anterior usaba cadenas de Promises:

```ts
return Service.method(req.body)
  .then((result) => res.status(200).json({ result }))
  .catch((error) => res.status(500).json({ error }));
```

Ambas formas esperan la misma operación, pero `async/await` facilita la lectura y el manejo de
errores. `return` sigue siendo útil cuando una función necesita devolver un valor o detener su
ejecución; simplemente no es necesario para enviar una respuesta de Express.

## Estructura del proyecto

```
src/
  server.ts        Punto de entrada: conecta con MongoDB, registra el middleware y las rutas, y arranca el servidor
  seed.ts          Script que llena la base de datos con los datos de ejemplo
  migrate-indexes.ts  Script de una sola vez: adapta los índices únicos al borrado lógico
  seed-data.ts     Los datos de ejemplo: autores y libros
  config/          Lee las variables de entorno y las reúne en un objeto config
  library/         Utilidades compartidas
    Logging.ts       Mensajes de consola con fecha y color (info, warning, error)
  routes/          El mapa de URLs: qué petición va a qué controller
    Author.ts, Book.ts
  middleware/      Lo que se ejecuta entre la ruta y el controller
    Joi.ts           Guardas: validan el body (422) y el id de la URL (400)
    Cors.ts          Cabeceras de CORS, configuradas con CORS_ORIGIN
    Logger.ts        Escribe en consola cada petición y su código de respuesta
    ErrorHandler.ts  Convierte cualquier error en su código: 400, 404, 409, 422 o 500
  controllers/     Leen la petición (req), llaman al service y eligen la respuesta (res)
    Author.ts, Book.ts
  services/        Leen y escriben en la base de datos a través de los models. No saben que existe HTTP
    AuthorService.ts, BookService.ts
  models/          Esquemas de Mongoose: qué campos tiene cada documento y de qué tipo
    Author.ts, Book.ts
```

Una petición recorre las capas siempre en el mismo orden:

```
cliente -> server.ts (logger, JSON, CORS) -> routes/ -> middleware/ (validación) -> controllers/ -> services/ -> models/ -> MongoDB
```

Cada capa hace una sola cosa. Por eso los `services/` y los `models/` no importan Express:
si un día se cambiara Express por otro framework, esas dos carpetas no habría que tocarlas.

## Endpoints

| Método | URL | Qué hace | Body |
|---|---|---|---|
| GET | `/ping` | Comprueba que la API está viva | |
| POST | `/authors` | Crea un autor | `{ "name": "...", "email": "...", "password": "..." }` |
| GET | `/authors` | Lista todos los autores | |
| GET | `/authors/:authorId` | Devuelve un autor | |
| PUT | `/authors/:authorId` | Reemplaza los datos de un autor | `{ "name": "...", "email": "...", "password": "..." }` |
| DELETE | `/authors/:authorId` | Borra un autor (borrado lógico) | |
| POST | `/books` | Crea un libro | `{ "title": "...", "authors": ["<id de un autor>"], "isbn": "..." }` |
| GET | `/books` | Lista todos los libros, con los datos de sus autores | |
| GET | `/books/:bookId` | Devuelve un libro, con los datos de sus autores | |
| PUT | `/books/:bookId` | Reemplaza los datos de un libro | `{ "title": "...", "authors": ["<id de un autor>"], "isbn": "..." }` |
| DELETE | `/books/:bookId` | Borra un libro (borrado lógico) | |

Un autor tiene además estos campos opcionales: `birthDate`, `nationality`, `biography`, `website`,
`photoUrl`, `active` y `role`. La contraseña nunca se devuelve en las respuestas.

Un libro tiene además: `edition`, `publisher`, `publishedYear`, `pages`, `language` (`es`, `ca` o `en`),
`tags` (`ciencia-ficcion`, `fantasia`, `novela`, `ensayo`, `poesia`, `historia`) y `price`.
Un libro puede tener más de un autor, y necesita al menos uno.

Ejemplo con curl (también sirve Postman o Thunder Client):

```
curl -X POST http://localhost:1337/authors -H "Content-Type: application/json" -d '{"name":"Ana"}'
```

Códigos de respuesta: 201 al crear, 200 al leer o modificar, 204 al borrar, 400 si el id de la URL
no tiene forma de id de MongoDB, 404 si el id no existe, 409 si el email o el ISBN ya existen,
422 si el body no es válido y 500 si falla algo en el servidor.

## Soft delete

Borrar un autor o un libro con `DELETE` **no lo elimina de MongoDB**: lo marca como borrado
(`deleted: true`) y guarda la fecha en `deletedAt`. A partir de ese momento:

- `GET` del listado y `GET` por id ya no lo devuelven (404 en la búsqueda por id).
- `PUT` sobre un documento borrado devuelve 404: no se puede modificar.
- El email del autor y el ISBN del libro quedan libres, así que se pueden reutilizar en un documento
  nuevo.

Esto funciona porque los índices únicos de `Author.email` y `Book.isbn` son **parciales**:
`partialFilterExpression: { deleted: false }`. La unicidad solo se aplica a los documentos no borrados.

Mongoose **no** elimina el índice único antiguo de una base de datos que ya existía (solo crea
índices nuevos). Por eso, si trabajas sobre una base de datos creada antes de esta versión, ejecuta
una vez:

```
npm run migrate-indexes
```

El script borra los índices `email_1` e `isbn_1` antiguos y crea los parciales. Es idempotente: si ya
están bien, no hace nada. Puedes comprobarlo con `db.authors.getIndexes()` y `db.books.getIndexes()`
en `mongosh`.

## Documentación de la API

La documentación de cada endpoint se escribe en un comentario `/** @openapi */` justo encima de su
ruta, en `src/routes/`. Al arrancar, `swagger-jsdoc` lee esos comentarios y monta el documento que
se ve en http://localhost:1337/api-docs.

Los esquemas del body no se escriben a mano: `joi-to-swagger` los genera a partir de los mismos
esquemas de Joi que validan las peticiones, así que la documentación no puede quedarse desfasada
cuando se añade o se quita un campo.

Las piezas comunes (datos generales, esquemas y respuestas de error) están en `src/config/swagger.ts`.

## Cómo contribuir

Ramas, commits y estado del proyecto en [CONTRIBUTING.md](CONTRIBUTING.md).
