import Report, { IReport, ReportReason, ReportStatus, ReportTargetType } from '../models/Report';

export interface ReportQueryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    status?: ReportStatus;
    reason?: ReportReason;
    targetType?: ReportTargetType;
    showDeleted?: boolean;
    userRole?: string;
}

// El controlador asigna el autor antes de guardar el reporte.
// Crear un nuevo reporte (Enviado por un usuario)
export const createReport = (data: IReport) => {
    const report = new Report(data);
    return report.save();
};

// Busca un reporte y oculta los archivados a quien no sea administrador.
export const getReportById = (reportId: string, userRole?: string) => {
    const filter: Record<string, unknown> = { _id: reportId };

    if (userRole !== 'ADMIN') {
        filter.deleted = false;
    }

    return Report.findOne(filter).populate('reporterId', 'name email avatarUrl').populate('targetId');
};

// Devuelve reportes por páginas y aplica los filtros de la tabla.
export const getAllReportsPaginated = async (params: ReportQueryParams) => {
    // Calculamos el tramo que corresponde a la página solicitada.
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const skip = (page - 1) * limit;

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = {};

    // Los reportes archivados solo aparecen cuando el administrador los solicita.
    // Los reportes archivados solo aparecen cuando un administrador los solicita.
    if (params.userRole !== 'ADMIN') {
        filter.deleted = false;
    } else if (params.showDeleted !== true) {
        filter.deleted = false;
    }

    if (params.search) {
        filter.$or = [
            { description: { $regex: params.search, $options: 'i' } },
            { adminNotes: { $regex: params.search, $options: 'i' } }
        ];
    }

    if (params.status) filter.status = params.status;
    if (params.reason) filter.reason = params.reason;
    if (params.targetType) filter.targetType = params.targetType;

    // La tabla recibe la página y el total necesario para dibujar la paginación.
    const [reports, totalCount] = await Promise.all([
        Report.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate('reporterId', 'name email avatarUrl'),
        Report.countDocuments(filter)
    ]);

    return {
        data: reports,
        totalDocs: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
    };
};

// Actualiza los datos de revisión de un reporte.
export const updateReport = (reportId: string, data: Partial<IReport>) => {
    return Report.findOne({ _id: reportId, deleted: false }).then(async (report) => {
        if (!report) return null;
        Object.assign(report, data);
        return report.save();
    });
};

// Archiva un reporte sin quitarlo de la base de datos.
export const softDeleteReport = (reportId: string) => {
    return Report.findByIdAndUpdate(reportId, { deleted: true, deletedAt: new Date() }, { new: true });
};

// Archiva varios reportes en una sola operación.
export const bulkSoftDeleteReports = (ids: string[]) => {
    return Report.updateMany({ _id: { $in: ids } }, { $set: { deleted: true, deletedAt: new Date() } });
};

// Elimina un reporte de forma definitiva.
export const hardDeleteReport = (reportId: string) => {
    return Report.findByIdAndDelete(reportId);
};

// Elimina varios reportes de forma definitiva.
export const bulkHardDeleteReports = (ids: string[]) => {
    return Report.deleteMany({ _id: { $in: ids } });
};

export default {
    createReport,
    getReportById,
    getAllReportsPaginated,
    updateReport,
    softDeleteReport,
    bulkSoftDeleteReports,
    hardDeleteReport,
    bulkHardDeleteReports
};
