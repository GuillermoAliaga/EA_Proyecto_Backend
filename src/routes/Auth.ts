import express from 'express';

import controller from '../controllers/Auth';

import { Schemas, ValidateJoi } from '../middleware/Joi';

// Estas rutas permiten crear una cuenta, iniciar sesión, recuperar el acceso y salir.
const router = express.Router();
router.post('/register', ValidateJoi(Schemas.auth.register), controller.register);
router.post('/login', ValidateJoi(Schemas.auth.login), controller.login);
// La renovación usa la cookie protegida y no necesita datos en el cuerpo.
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
export = router;

// La documentación describe las rutas de autenticación disponibles.

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un usuario nuevo
 *     description: El usuario se crea siempre con el rol user. No devuelve token, hay que hacer login despues.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterInput' }
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesion
 *     description: Devuelve el access token (para la cabecera Authorization), el refresh token y el usuario.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginInput' }
 *     responses:
 *       200: { $ref: '#/components/responses/LoginOk' }
 *       401: { $ref: '#/components/responses/BadCredentials' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Pide un access token nuevo
 *     description: Se usa cuando el access token ha caducado o al recargar la pagina. No lleva body, el navegador envia la cookie refreshToken automaticamente.
 *     security: []
 *     responses:
 *       200:
 *         description: Access token nuevo
 *         content:
 *           application/json:
 *             example: { token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 * 
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cierra la sesion
 *     description: Borra la cookie refreshToken e invalida ese refresh token en el servidor. No lleva body ni access token.
 *     security: []
 *     responses:
 *       204:
 *         description: Sesion cerrada
 */