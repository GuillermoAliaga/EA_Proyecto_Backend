import express from 'express';
import controller from '../controllers/User';
import { ValidateId, ValidateJoi, Schemas } from '../middleware/Joi';
import { RequireAdmin, VerifyToken } from '../middleware/VerifyToken';

const router = express.Router();

// El chat usa una ruta protegida con perfiles mínimos y el resto de rutas es solo para ADMIN.
/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
 *           example: "654321098765432109876543"
 *         name:
 *           type: string
 *           example: "Marc R."
 *         email:
 *           type: string
 *           format: email
 *           example: "marc@usuario.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "sprint1"
 *         role:
 *           type: string
 *           enum: [USER, STORE_HOST, ADMIN]
 *           default: USER
 *           example: "USER"
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/avatar.jpg"
 *         bio:
 *           type: string
 *           example: "Aficionado al baloncesto y running"
 *         isBanned:
 *           type: boolean
 *           default: false
 *         deleted:
 *           type: boolean
 *           readOnly: true
 *           default: false
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           readOnly: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *     UserInputUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Marc R. Editado"
 *         email:
 *           type: string
 *           format: email
 *           example: "marc_nuevo@usuario.com"
 *         role:
 *           type: string
 *           enum: [USER, STORE_HOST, ADMIN]
 *         avatarUrl:
 *           type: string
 *         bio:
 *           type: string
 *         isBanned:
 *           type: boolean
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Devuelve el usuario con sesión activa
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token ausente, caducado o no válido
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/me', VerifyToken, controller.readMe);

/**
 * @openapi
 * /users/chat-users:
 *   get:
 *     tags: [Users]
 *     summary: Lista los perfiles mínimos de usuarios activos para el chat
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios sin el usuario autenticado
 *       401:
 *         description: No autorizado
 */
router.get('/chat-users', VerifyToken, controller.readChatUsers);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Registra o crea un usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos de entrada no válidos o faltantes
 *       422:
 *         description: Error de validación de Joi
 */
router.post('/', VerifyToken, RequireAdmin, ValidateJoi(Schemas.user.create), controller.createUser);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lista usuarios paginados con filtros para el Backoffice
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Búsqueda por nombre o email
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, STORE_HOST, ADMIN] }
 *       - in: query
 *         name: showDeleted
 *         schema: { type: boolean, default: false }
 *         description: Mostrar borrados lógicos (Solo Admin)
 *     responses:
 *       200:
 *         description: Listado devuelto con éxito
 *       401:
 *         description: No autorizado
 */
router.get('/', VerifyToken, RequireAdmin, controller.readAllPaginated);

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Obtiene los detalles de un usuario por su ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       400:
 *         description: Formato de ID de MongoDB inválido
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:userId', VerifyToken, RequireAdmin, ValidateId('userId'), controller.readUser);

/**
 * @openapi
 * /users/{userId}:
 *   put:
 *     tags: [Users]
 *     summary: Modifica los datos de un usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInputUpdate'
 *     responses:
 *       200:
 *         description: Usuario actualizado con éxito
 *       400:
 *         description: Formato de ID o datos inválidos
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:userId', VerifyToken, RequireAdmin, ValidateId('userId'), ValidateJoi(Schemas.user.update), controller.updateUser);

/**
 * @openapi
 * /users/bulk-soft-delete:
 *   patch:
 *     tags: [Users]
 *     summary: Borrado lógico masivo de usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["654321098765432109876543", "654321098765432109876544"]
 *     responses:
 *       204:
 *         description: Usuarios marcados como eliminados
 *       400:
 *         description: Array de IDs ausente o mal formado
 */
router.patch('/bulk-soft-delete', VerifyToken, RequireAdmin, controller.bulkSoftDelete);

/**
 * @openapi
 * /users/bulk:
 *   delete:
 *     tags: [Users]
 *     summary: Borrado físico masivo de usuarios (Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       204:
 *         description: Usuarios eliminados físicamente de la BD
 */
router.delete('/bulk', VerifyToken, RequireAdmin, controller.bulkHardDelete);

/**
 * @openapi
 * /users/{userId}/soft-delete:
 *   patch:
 *     tags: [Users]
 *     summary: Borrado lógico de un usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Usuario marcado como borrado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:userId/soft-delete', VerifyToken, RequireAdmin, ValidateId('userId'), controller.softDeleteUser);

/**
 * @openapi
 * /users/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Borrado físico definitivo de un usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Usuario borrado permanentemente
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:userId', VerifyToken, RequireAdmin, ValidateId('userId'), controller.hardDeleteUser);

/**
 * @openapi
 * /users/{userId}/restore:
 *   patch:
 *     tags: [Users]
 *     summary: Restaura un usuario borrado lógicamente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario restaurado con éxito
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:userId/restore', VerifyToken, RequireAdmin, ValidateId('userId'), controller.restoreUser);

export default router;
