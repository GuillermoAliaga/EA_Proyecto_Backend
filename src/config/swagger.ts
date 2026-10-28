import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import j2s from 'joi-to-swagger';
import { Schemas } from '../middleware/Joi';
import { config } from './config';

// La documentación de cada endpoint está escrita en un comentario /** @openapi */
// encima de su ruta, en src/routes/. Aquí solo se montan las piezas comunes.

// Los esquemas del body salen de los mismos esquemas de Joi que validan las
// peticiones, así que no se pueden quedar desfasados.
const { swagger: authorInput } = j2s(Schemas.author.create);
const { swagger: bookInput } = j2s(Schemas.book.create);
const { swagger: registerInput } = j2s(Schemas.auth.register);
const { swagger: loginInput } = j2s(Schemas.auth.login);
const { swagger: userInput } = j2s(Schemas.user.create);
const { swagger: userUpdateInput } = j2s(Schemas.user.update);

// Lo que devuelve la API no es igual a lo que se envía: lleva el _id y las fechas que
// pone MongoDB, ni el autor ni el usuario devuelven la contraseña, y el libro trae sus autores enteros.
const storedFields = {
    _id: { type: 'string', example: '6ab3f2fe9c500204a7d5f80b' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
};

const { password: _password, ...authorFields } = authorInput.properties;

const authorSchema = { type: 'object', properties: { ...storedFields, ...authorFields } };

const bookSchema = {
    type: 'object',
    properties: {
        ...storedFields,
        ...bookInput.properties,
        authors: { type: 'array', items: authorSchema }
    }
};

// El usuario nunca devuelve la contraseña ni el refreshTokenHash
const { password: _userPassword, ...userFields } = userInput.properties;

const userSchema = { type: 'object', properties: { ...storedFields, ...userFields } };

// Ejemplos que se ven en la página de Swagger, sacados de los datos de npm run seed
const authorExample = {
    _id: '6ab3f2fe9c500204a7d5f801',
    name: 'Ursula K. Le Guin',
    email: 'leguin@example.com',
    birthDate: '1929-10-21T00:00:00.000Z',
    nationality: 'Estados Unidos',
    biography: 'Escritora de ciencia ficción y fantasía conocida por Terramar.',
    website: 'https://example.com/leguin',
    photoUrl: 'https://example.com/fotos/leguin.jpg',
    active: true,
    role: 'author',
    createdAt: '2026-09-23T10:00:00.000Z',
    updatedAt: '2026-09-23T10:00:00.000Z'
};

const bookExample = {
    _id: '6ab3f2fe9c500204a7d5f80b',
    title: 'A Wizard of Earthsea',
    authors: [authorExample],
    isbn: '9788400000008',
    edition: 1,
    publisher: 'Editorial Ejemplo',
    publishedYear: 1968,
    pages: 183,
    language: 'en',
    tags: ['fantasia'],
    price: 16,
    createdAt: '2026-09-23T10:00:00.000Z',
    updatedAt: '2026-09-23T10:00:00.000Z'
};

const userExample = {
    _id: '6ab3f2fe9c500204a7d5f8aa',
    name: 'Ana López',
    email: 'ana@example.com',
    role: 'user',
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z'
};

// Una respuesta correcta: el esquema de lo que se devuelve y un ejemplo con datos de verdad
const okResponse = (description: string, schema: object, example: object) => ({
    description,
    content: { 'application/json': { schema, example } }
});

// Una respuesta de error: siempre un message, con un ejemplo del mensaje real
const errorResponse = (description: string, message: string) => ({
    description,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: { message: { type: 'string' } }
            },
            example: { message }
        }
    }
});

const swaggerPath = (filePath: string) => filePath.replace(/\\/g, '/');

const swaggerDocument = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Library API',
            version: '1.0.0',
            description: 'API de autores, libros y usuarios (Node.js, Express, TypeScript y MongoDB), con autenticación JWT.'
        },
        servers: [{ url: `http://localhost:${config.server.port}` }],
        tags: [
            { name: 'Health', description: 'Comprobar que la API responde' },
            { name: 'Auth', description: 'Registro, inicio y cierre de sesión' },
            { name: 'Users', description: 'Gestión de usuarios (solo admin)' },
            { name: 'Authors', description: 'Autores' },
            { name: 'Books', description: 'Libros' }
        ],
        // Pone el candado en todas las rutas. Las de /auth y /ping lo quitan con security: []
        security: [{ bearerAuth: [] }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            },
            schemas: {
                AuthorInput: authorInput,
                BookInput: bookInput,
                RegisterInput: registerInput,
                LoginInput: loginInput,
                UserInput: userInput,
                UserUpdateInput: userUpdateInput,
                Author: authorSchema,
                Book: bookSchema,
                User: userSchema
            },
            responses: {
                AuthorOne: okResponse('Un autor', { type: 'object', properties: { author: authorSchema } }, { author: authorExample }),
                AuthorList: okResponse('La lista de autores', { type: 'object', properties: { authors: { type: 'array', items: authorSchema } } }, { authors: [authorExample] }),
                BookOne: okResponse('Un libro, con los datos de sus autores', { type: 'object', properties: { book: bookSchema } }, { book: bookExample }),
                BookList: okResponse('La lista de libros, con los datos de sus autores', { type: 'object', properties: { books: { type: 'array', items: bookSchema } } }, { books: [bookExample] }),
                UserOne: okResponse('Un usuario', { type: 'object', properties: { user: userSchema } }, { user: userExample }),
                UserList: okResponse('La lista de usuarios', { type: 'object', properties: { users: { type: 'array', items: userSchema } } }, { users: [userExample] }),
                LoginOk: okResponse(
                    'Sesión iniciada. El refresh token llega en una cookie HttpOnly',
                    { type: 'object', properties: { token: { type: 'string' }, user: userSchema } },
                    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user: userExample }
                ),
                BadRequest: errorResponse('El id de la URL no tiene forma de id de MongoDB', 'authorId no es un id válido'),
                BadCredentials: errorResponse('Email o contraseña incorrectos', 'Email o contraseña incorrectos'),
                Unauthorized: errorResponse('Falta el token, está caducado o no es válido', 'Falta el token'),
                Forbidden: errorResponse('El usuario no tiene el rol necesario (hace falta admin)', 'No tienes permiso para hacer esto'),
                NotFound: errorResponse('No existe ningún recurso con ese id', 'not found'),
                Conflict: errorResponse('Ya existe otro recurso con ese email o ese ISBN', 'email ya existe'),
                Unprocessable: errorResponse('El body no cumple el esquema', '"email" is required'),
                ServerError: errorResponse('Error inesperado del servidor', 'Internal server error')
            }
        }
    },
    
    apis: [
        swaggerPath(path.join(__dirname, '../routes/*.ts')),
        swaggerPath(path.join(__dirname, '../routes/*.js')),
        swaggerPath(path.join(__dirname, '../server.ts')),
        swaggerPath(path.join(__dirname, '../server.js'))
    ]
});

export default swaggerDocument;