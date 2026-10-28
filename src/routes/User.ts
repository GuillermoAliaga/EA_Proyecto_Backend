import express from 'express';
import controller from '../controllers/User';
import { VerifyToken } from '../middleware/VerifyToken';

// Agrupa las rutas relacionadas con los usuarios.
// Las dos piden sesion (VerifyToken) pero no un rol concreto: sirven a cualquier usuario.
const router = express.Router();

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lista los usuarios (para el chat directo)
 *     description: Cualquier usuario con sesión puede verla. Solo devuelve el id y el nombre, ordenados por nombre.
 *     responses:
 *       200:
 *         description: Los usuarios
 *         content:
 *           application/json:
 *             example: { users: [{ _id: 6ab3f2fe9c500204a7d5f8a1, name: Admin }, { _id: 6ab3f2fe9c500204a7d5f8a2, name: Usuario }] }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */

// Devuelve el listado de usuarios disponibles.
router.get('/', VerifyToken, controller.listUsers);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Devuelve el usuario con sesión
 *     description: El usuario se saca del token (req.user, que rellena VerifyToken), no de la URL.
 *     responses:
 *       200:
 *         description: El usuario con sesión
 *         content:
 *           application/json:
 *             example: { user: { _id: 6ab3f2fe9c500204a7d5f8a1, name: Admin, email: admin@example.com, role: admin } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Devuelve el usuario con sesion a partir de req.user
router.get('/me', VerifyToken, controller.readMe);

export = router;