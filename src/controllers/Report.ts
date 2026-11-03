import { NextFunction, Request, Response } from 'express';
import ReportService from '../services/ReportService';
import { ReportReason, ReportStatus, ReportTargetType } from '../models/Report';

// Crear un reporte
const createReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El autor y el estado inicial los decide el servidor.
        req.body.reporterId = req.user!.id;
        req.body.status = 'PENDING';
        delete req.body.adminNotes;

        const report = await ReportService.createReport(req.body);
        res.status(201).json({ report });
    } catch (error) {
        next(error);
    }
};

// Leer reporte por ID
const readReport = async (req: Request<{ reportId: string }>, res: Response, next: NextFunction) => {
    const reportId = req.params.reportId;
    const userRole = req.user?.role;

    try {
        const report = await ReportService.getReportById(reportId, userRole);
        if (report) {
            res.status(200).json({ report });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Leer todos los reportes paginados (Backoffice)
const readAllPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El servicio usa estos datos para filtrar y paginar la lista administrativa.
        const result = await ReportService.getAllReportsPaginated({
            page: Number(req.query.page),
            limit: Number(req.query.limit),
            sortBy: req.query.sortBy as string,
            sortOrder: req.query.sortOrder as 'asc' | 'desc',
            search: req.query.search as string,
            status: req.query.status as ReportStatus,
            reason: req.query.reason as ReportReason,
            targetType: req.query.targetType as ReportTargetType,
            showDeleted: req.query.showDeleted === 'true',
            userRole: req.user?.role
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Actualiza el estado y las notas del equipo administrador.
const updateReport = async (req: Request<{ reportId: string }>, res: Response, next: NextFunction) => {
    const reportId = req.params.reportId;

    try {
        const report = await ReportService.updateReport(reportId, req.body);
        if (report) {
            res.status(200).json({ report });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Archiva un reporte sin eliminar sus datos.
const softDeleteReport = async (req: Request<{ reportId: string }>, res: Response, next: NextFunction) => {
    const reportId = req.params.reportId;

    try {
        const report = await ReportService.softDeleteReport(reportId);
        if (report) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Archiva varios reportes en una sola operación.
const bulkSoftDelete = async (req: Request<{}, {}, { ids: string[] }>, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de IDs' });
        }

        await ReportService.bulkSoftDeleteReports(ids);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// Elimina un reporte de forma definitiva.
const hardDeleteReport = async (req: Request<{ reportId: string }>, res: Response, next: NextFunction) => {
    const reportId = req.params.reportId;

    try {
        const report = await ReportService.hardDeleteReport(reportId);
        if (report) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Elimina varios reportes de forma definitiva.
const bulkHardDelete = async (req: Request<{}, {}, { ids: string[] }>, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de IDs' });
        }

        await ReportService.bulkHardDeleteReports(ids);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export default {
    createReport,
    readReport,
    readAllPaginated,
    updateReport,
    softDeleteReport,
    bulkSoftDelete,
    hardDeleteReport,
    bulkHardDelete
};
