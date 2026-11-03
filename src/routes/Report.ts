import express from 'express';
import controller from '../controllers/Report';
import { ValidateId, ValidateJoi, Schemas } from '../middleware/Joi';
import VerifyToken, { RequireAdmin } from '../middleware/VerifyToken';

const router = express.Router();

// Cualquier cuenta autenticada puede crear reportes y ADMIN puede revisarlos.
/**
 * @openapi
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       required: [targetType, targetId, reason, description]
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
 *           example: "654321098765432109876588"
 *         reporterId:
 *           type: string
 *           example: "654321098765432109876543"
 *         targetType:
 *           type: string
 *           enum: [ACTIVITY, USER]
 *           example: "ACTIVITY"
 *         targetId:
 *           type: string
 *           example: "654321098765432109876599"
 *         reason:
 *           type: string
 *           enum: [SPAM, INAPPROPRIATE, NO_SHOW, FAKE_LOCATION, OTHER]
 *           example: "SPAM"
 *         description:
 *           type: string
 *           example: "El evento publicado es engañoso o spam"
 *         status:
 *           type: string
 *           enum: [PENDING, REVIEWED, RESOLVED, DISMISSED]
 *           default: PENDING
 *         adminNotes:
 *           type: string
 *           example: "Revisado por el equipo de moderación"
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
 *     ReportUpdateInput:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [PENDING, REVIEWED, RESOLVED, DISMISSED]
 *           example: "RESOLVED"
 *         adminNotes:
 *           type: string
 *           example: "Se ha avisado al creador de la actividad."
 */

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Reports]
 *     summary: Crea un reporte de denuncia (cualquier usuario autenticado)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Report'
 *     responses:
 *       201:
 *         description: Reporte registrado exitosamente
 *       400:
 *         description: Datos requeridos faltantes o mal formados
 *       401:
 *         description: No autorizado
 */
router.post('/', VerifyToken, ValidateJoi(Schemas.report.create), controller.createReport);

/**
 * @openapi
 * /reports:
 *   get:
 *     tags: [Reports]
 *     summary: Lista reportes paginados para moderación en el Backoffice (Admin)
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema: { type: string, enum: [PENDING, REVIEWED, RESOLVED, DISMISSED] }
 *       - in: query
 *         name: reason
 *         schema: { type: string, enum: [SPAM, INAPPROPRIATE, NO_SHOW, FAKE_LOCATION, OTHER] }
 *       - in: query
 *         name: targetType
 *         schema: { type: string, enum: [ACTIVITY, USER] }
 *       - in: query
 *         name: showDeleted
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Listado paginado devuelto con éxito
 *       401:
 *         description: No autorizado
 */
router.get('/', VerifyToken, RequireAdmin, controller.readAllPaginated);

/**
 * @openapi
 * /reports/{reportId}:
 *   get:
 *     tags: [Reports]
 *     summary: Obtiene el detalle de un reporte por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle del reporte devuelto con éxito
 *       404:
 *         description: Reporte no encontrado
 */
router.get('/:reportId', VerifyToken, RequireAdmin, ValidateId('reportId'), controller.readReport);

/**
 * @openapi
 * /reports/{reportId}:
 *   put:
 *     tags: [Reports]
 *     summary: Actualiza el estado o notas de un reporte (Moderación Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportUpdateInput'
 *     responses:
 *       200:
 *         description: Reporte actualizado correctamente
 *       404:
 *         description: Reporte no encontrado
 */
router.put('/:reportId', VerifyToken, RequireAdmin, ValidateId('reportId'), ValidateJoi(Schemas.report.update), controller.updateReport);

/**
 * @openapi
 * /reports/bulk-soft-delete:
 *   patch:
 *     tags: [Reports]
 *     summary: Borrado lógico masivo de reportes
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
 *         description: Reportes archivados lógicamente
 */
router.patch('/bulk-soft-delete', VerifyToken, RequireAdmin, controller.bulkSoftDelete);

/**
 * @openapi
 * /reports/bulk:
 *   delete:
 *     tags: [Reports]
 *     summary: Borrado físico masivo de reportes (Admin)
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
 *         description: Reportes eliminados físicamente de la BD
 */
router.delete('/bulk', VerifyToken, RequireAdmin, controller.bulkHardDelete);

/**
 * @openapi
 * /reports/{reportId}/soft-delete:
 *   patch:
 *     tags: [Reports]
 *     summary: Borrado lógico de un reporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Reporte archivado lógicamente
 *       404:
 *         description: Reporte no encontrado
 */
router.patch('/:reportId/soft-delete', VerifyToken, RequireAdmin, ValidateId('reportId'), controller.softDeleteReport);

/**
 * @openapi
 * /reports/{reportId}:
 *   delete:
 *     tags: [Reports]
 *     summary: Borrado físico definitivo de un reporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Reporte eliminado físicamente de la BD
 *       404:
 *         description: Reporte no encontrado
 */
router.delete('/:reportId', VerifyToken, RequireAdmin, ValidateId('reportId'), controller.hardDeleteReport);

export default router;
