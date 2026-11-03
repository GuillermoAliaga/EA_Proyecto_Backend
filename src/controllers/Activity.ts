import { NextFunction, Request, Response } from 'express';
import ActivityService from '../services/ActivityService';

// Crear una actividad
const createActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El creador se toma de la sesión y no del contenido enviado por el navegador.
        req.body.creatorId = req.user!.id;

        const activity = await ActivityService.createActivity(req.body);
        res.status(201).json({ activity });
    } catch (error) {
        next(error);
    }
};

// Leer una actividad por ID
const readActivity = async (req: Request<{ activityId: string }>, res: Response, next: NextFunction) => {
    const activityId = req.params.activityId;
    const userRole = req.user?.role;

    try {
        const activity = await ActivityService.getActivityById(activityId, userRole);
        if (activity) {
            res.status(200).json({ activity });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Leer todas las actividades paginadas
const readAllPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Los filtros y el rol se envían al servicio para aplicar las reglas del listado.
        const result = await ActivityService.getAllActivitiesPaginated({
            page: Number(req.query.page),
            limit: Number(req.query.limit),
            sortBy: req.query.sortBy as string,
            sortOrder: req.query.sortOrder as 'asc' | 'desc',
            search: req.query.search as string,
            category: req.query.category as string,
            subcategory: req.query.subcategory as string,
            status: req.query.status as string,
            showDeleted: req.query.showDeleted === 'true',
            userRole: req.user?.role
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const readJoinedActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El identificador viene del token para consultar solo las actividades propias.
        const activities = await ActivityService.getJoinedActivities(req.user!.id);
        res.status(200).json({ activities });
    } catch (error) {
        next(error);
    }
};

const joinActivity = async (req: Request<{ activityId: string }>, res: Response, next: NextFunction) => {
    try {
        // El servicio revisa el aforo, el estado y si la persona ya está inscrita.
        const result = await ActivityService.joinActivity(req.params.activityId, req.user!.id);

        if (result.status === 'joined') {
            return res.status(200).json({ activity: result.activity });
        }

        if (result.status === 'not_found') {
            return res.status(404).json({ message: 'Actividad no encontrada o archivada' });
        }

        if (result.status === 'user_not_allowed') {
            return res.status(403).json({ message: 'Solo usuarios activos pueden apuntarse a actividades' });
        }

        return res.status(409).json({
            message: result.status === 'already_joined'
                ? 'Ya estás apuntado a esta actividad'
                : 'La actividad no está disponible o ya alcanzó su capacidad'
        });
    } catch (error) {
        next(error);
    }
};

// Actualizar una actividad
const updateActivity = async (req: Request<{ activityId: string }>, res: Response, next: NextFunction) => {
    const activityId = req.params.activityId;

    try {
        const activity = await ActivityService.updateActivity(activityId, req.body);
        if (activity) {
            res.status(200).json({ activity });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Archiva una actividad sin eliminar sus datos.
const softDeleteActivity = async (req: Request<{ activityId: string }>, res: Response, next: NextFunction) => {
    const activityId = req.params.activityId;

    try {
        const activity = await ActivityService.softDeleteActivity(activityId);
        if (activity) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Archiva varias actividades en una sola operación.
const bulkSoftDelete = async (req: Request<{}, {}, { ids: string[] }>, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de IDs' });
        }

        await ActivityService.bulkSoftDeleteActivities(ids);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// Elimina una actividad de forma definitiva.
const hardDeleteActivity = async (req: Request<{ activityId: string }>, res: Response, next: NextFunction) => {
    const activityId = req.params.activityId;

    try {
        const activity = await ActivityService.hardDeleteActivity(activityId);
        if (activity) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Elimina varias actividades de forma definitiva.
const bulkHardDelete = async (req: Request<{}, {}, { ids: string[] }>, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de IDs' });
        }

        await ActivityService.bulkHardDeleteActivities(ids);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export default {
    createActivity,
    readActivity,
    readAllPaginated,
    readJoinedActivities,
    joinActivity,
    updateActivity,
    softDeleteActivity,
    bulkSoftDelete,
    hardDeleteActivity,
    bulkHardDelete
};
