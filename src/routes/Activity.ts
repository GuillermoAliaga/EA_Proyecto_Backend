import express from 'express';
import controller from '../controllers/Activity';
import { ValidateId, ValidateJoi, Schemas } from '../middleware/Joi';
import VerifyToken, { OptionalVerifyToken, RequireAdmin } from '../middleware/VerifyToken';
import { RequireAnyRole, RequireRole } from '../middleware/RequireRole';

const router = express.Router();

// ADMIN y STORE_HOST pueden publicar actividades, pero solo ADMIN puede gestionarlas.
/**
 * @openapi
 * components:
 *   schemas:
 *     Activity:
 *       type: object
 *       required: [title, description, category, subcategory, location, schedule, capacity]
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
 *           example: "654321098765432109876599"
 *         creatorId:
 *           type: string
 *           example: "654321098765432109876543"
 *         title:
 *           type: string
 *           example: "Pachanga 3v3 Baloncesto"
 *         description:
 *           type: string
 *           example: "Partidos casuales de baloncesto por la tarde"
 *         category:
 *           type: string
 *           enum: [SPORT, LEISURE]
 *           example: "SPORT"
 *         subcategory:
 *           type: string
 *           enum: [BASKETBALL, RUNNING, ARCADE, TCG_BOARDGAMES]
 *           example: "BASKETBALL"
 *         modality:
 *           type: string
 *           enum: [CASUAL, ORGANIZED]
 *           default: CASUAL
 *         status:
 *           type: string
 *           enum: [OPEN, FULL, COMPLETED, CANCELLED]
 *           default: OPEN
 *         location:
 *           type: object
 *           required: [coordinates, addressName]
 *           properties:
 *             type:
 *               type: string
 *               default: "Point"
 *             coordinates:
 *               type: array
 *               items: { type: number }
 *               example: [2.0003, 41.2755]
 *             addressName:
 *               type: string
 *               example: "Pistas Campus PMT UPC, Castelldefels"
 *             isStoreLocation:
 *               type: boolean
 *               default: false
 *         route:
 *           type: object
 *           properties:
 *             distanceKm:
 *               type: number
 *               example: 5.2
 *             paceTarget:
 *               type: string
 *               example: "5:30 min/km"
 *             path:
 *               type: object
 *               properties:
 *                 type: { type: string, default: "LineString" }
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items: { type: number }
 *                   example: [[2.0003, 41.2755], [2.0050, 41.2800]]
 *         schedule:
 *           type: object
 *           required: [startTime, endTime]
 *           properties:
 *             startTime:
 *               type: string
 *               format: date-time
 *               example: "2026-11-10T17:00:00.000Z"
 *             endTime:
 *               type: string
 *               format: date-time
 *               example: "2026-11-10T19:00:00.000Z"
 *         capacity:
 *           type: object
 *           required: [maxParticipants]
 *           properties:
 *             minParticipants:
 *               type: integer
 *               default: 2
 *             maxParticipants:
 *               type: integer
 *               example: 6
 *         pricing:
 *           type: object
 *           properties:
 *             price:
 *               type: number
 *               default: 0
 *             prizeInfo:
 *               type: string
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
 *     ActivityUpdateInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Pachanga 3v3 Baloncesto (Horario Modificado)"
 *         description:
 *           type: string
 *           example: "Se ajusta la hora de inicio por disponibilidad de pista"
 *         category:
 *           type: string
 *           enum: [SPORT, LEISURE]
 *         subcategory:
 *           type: string
 *           enum: [BASKETBALL, RUNNING, ARCADE, TCG_BOARDGAMES]
 *         modality:
 *           type: string
 *           enum: [CASUAL, ORGANIZED]
 *         status:
 *           type: string
 *           enum: [OPEN, FULL, COMPLETED, CANCELLED]
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               default: "Point"
 *             coordinates:
 *               type: array
 *               items: { type: number }
 *               example: [2.0003, 41.2755]
 *             addressName:
 *               type: string
 *               example: "Pistas Campus PMT UPC, Castelldefels"
 *             isStoreLocation:
 *               type: boolean
 *         route:
 *           type: object
 *           properties:
 *             distanceKm:
 *               type: number
 *             paceTarget:
 *               type: string
 *             path:
 *               type: object
 *               properties:
 *                 type: { type: string, default: "LineString" }
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items: { type: number }
 *         schedule:
 *           type: object
 *           properties:
 *             startTime:
 *               type: string
 *               format: date-time
 *               example: "2026-11-10T17:30:00.000Z"
 *             endTime:
 *               type: string
 *               format: date-time
 *               example: "2026-11-10T19:30:00.000Z"
 *         capacity:
 *           type: object
 *           properties:
 *             minParticipants:
 *               type: integer
 *             maxParticipants:
 *               type: integer
 *         pricing:
 *           type: object
 *           properties:
 *             price:
 *               type: number
 *             prizeInfo:
 *               type: string
 */

/**
 * @openapi
 * /activities:
 *   post:
 *     tags: [Activities]
 *     summary: Crea una nueva actividad (ADMIN o STORE_HOST)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Activity'
 *     responses:
 *       201:
 *         description: Actividad creada exitosamente
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       422:
 *         description: Error de validación de Joi
 */
router.post('/', VerifyToken, RequireAnyRole('ADMIN', 'STORE_HOST'), ValidateJoi(Schemas.activity.create), controller.createActivity);

/**
 * @openapi
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: Lista actividades paginadas con filtros
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [SPORT, LEISURE] }
 *       - in: query
 *         name: subcategory
 *         schema: { type: string, enum: [BASKETBALL, RUNNING, ARCADE, TCG_BOARDGAMES] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, FULL, COMPLETED, CANCELLED] }
 *       - in: query
 *         name: showDeleted
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Listado devuelto con éxito
 */
router.get('/', OptionalVerifyToken, controller.readAllPaginated);

/**
 * @openapi
 * /activities/joined:
 *   get:
 *     tags: [Activities]
 *     summary: Lista las actividades a las que está inscrito el usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actividades activas del usuario autenticado
 *       401:
 *         description: No autorizado
 */
router.get('/joined', VerifyToken, RequireRole('USER'), controller.readJoinedActivities);

/**
 * @openapi
 * /activities/{activityId}/participants:
 *   post:
 *     tags: [Activities]
 *     summary: Inscribe al usuario autenticado en una actividad disponible
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inscripción realizada
 *       403:
 *         description: Se requiere un usuario activo con rol USER
 *       404:
 *         description: Actividad no encontrada o archivada
 *       409:
 *         description: Ya está inscrito o la actividad no está disponible
 */
router.post('/:activityId/participants', VerifyToken, RequireRole('USER'), ValidateId('activityId'), controller.joinActivity);

/**
 * @openapi
 * /activities/{activityId}:
 *   get:
 *     tags: [Activities]
 *     summary: Obtiene el detalle de una actividad por ID
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle de la actividad
 *       400:
 *         description: Formato de ID inválido
 *       404:
 *         description: Actividad no encontrada
 */
router.get('/:activityId', OptionalVerifyToken, ValidateId('activityId'), controller.readActivity);

/**
 * @openapi
 * /activities/{activityId}:
 *   put:
 *     tags: [Activities]
 *     summary: Actualiza los campos de una actividad
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityUpdateInput'
 *     responses:
 *       200:
 *         description: Actividad actualizada correctamente
 *       400:
 *         description: Formato de ID inválido
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Actividad no encontrada
 *       422:
 *         description: Parámetros del body no permitidos o inválidos
 */
router.put('/:activityId', VerifyToken, RequireAdmin, ValidateId('activityId'), ValidateJoi(Schemas.activity.update), controller.updateActivity);

/**
 * @openapi
 * /activities/bulk-soft-delete:
 *   patch:
 *     tags: [Activities]
 *     summary: Borrado lógico masivo de actividades
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
 *         description: Actividades archivadas lógicamente
 *       400:
 *         description: Lista de IDs requerida
 */
router.patch('/bulk-soft-delete', VerifyToken, RequireAdmin, controller.bulkSoftDelete);

/**
 * @openapi
 * /activities/bulk:
 *   delete:
 *     tags: [Activities]
 *     summary: Borrado físico masivo de actividades
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
 *         description: Actividades eliminadas de la BD
 */
router.delete('/bulk', VerifyToken, RequireAdmin, controller.bulkHardDelete);

/**
 * @openapi
 * /activities/{activityId}/soft-delete:
 *   patch:
 *     tags: [Activities]
 *     summary: Borrado lógico de una actividad
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Actividad marcada como eliminada
 *       404:
 *         description: Actividad no encontrada
 */
router.patch('/:activityId/soft-delete', VerifyToken, RequireAdmin, ValidateId('activityId'), controller.softDeleteActivity);

/**
 * @openapi
 * /activities/{activityId}:
 *   delete:
 *     tags: [Activities]
 *     summary: Borrado físico de una actividad
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Actividad eliminada físicamente
 *       404:
 *         description: Actividad no encontrada
 */
router.delete('/:activityId', VerifyToken, RequireAdmin, ValidateId('activityId'), controller.hardDeleteActivity);

export default router;
