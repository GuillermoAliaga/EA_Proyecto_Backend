import Activity, { IActivity } from '../models/Activity';
import User from '../models/User';

export interface ActivityQueryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    category?: string;
    subcategory?: string;
    status?: string;
    showDeleted?: boolean;
    userRole?: string;
}

export type JoinActivityResult =
    | { status: 'joined'; activity: IActivity }
    | { status: 'not_found' | 'already_joined' | 'unavailable' | 'user_not_allowed' };

// Guardamos la actividad con el identificador de quien la ha publicado.
// Crear una actividad nueva
export const createActivity = (data: IActivity) => {
    const activity = new Activity(data);
    return activity.save();
};

// Obtener actividad por ID (Comprueba borrado según rol)
export const getActivityById = (activityId: string, userRole?: string) => {
    const filter: Record<string, unknown> = { _id: activityId };

    // Los usuarios no administradores solo pueden consultar actividades activas.
    if (userRole !== 'ADMIN') {
        filter.deleted = false;
        filter.deletedAt = null;
    }

    return Activity.findOne(filter).populate('creatorId', 'name email avatarUrl');
};

// Listado paginado con filtros, ordenación y control de Soft Delete por Rol
export const getAllActivitiesPaginated = async (params: ActivityQueryParams) => {
    // Calculamos el tramo que MongoDB debe devolver para la página elegida.
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const skip = (page - 1) * limit;

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    // Este filtro reúne la búsqueda, el estado y la regla de elementos archivados.
    const filter: Record<string, unknown> = {};

    // Control de Soft Delete según el rol JWT
    if (params.userRole !== 'ADMIN' || params.showDeleted !== true) {
        // El filtro deletedAt:null excluye siempre las archivadas para USER y por defecto para ADMIN.
        // Comprobamos deleted también para mantener consistencia con documentos antiguos.
        filter.deleted = false;
        filter.deletedAt = null;
    }

    // Filtros de búsqueda
    if (params.search) {
        filter.$or = [
            { title: { $regex: params.search, $options: 'i' } },
            { description: { $regex: params.search, $options: 'i' } },
            { 'location.addressName': { $regex: params.search, $options: 'i' } }
        ];
    }

    if (params.category) filter.category = params.category;
    if (params.subcategory) filter.subcategory = params.subcategory;
    if (params.status) filter.status = params.status;

    // Pedimos los resultados y el total a la vez para reducir el tiempo de respuesta.
    const [activities, totalCount] = await Promise.all([
        Activity.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate('creatorId', 'name email avatarUrl'),
        Activity.countDocuments(filter)
    ]);

    return {
        data: activities,
        totalDocs: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
    };
};

export const getJoinedActivities = (userId: string) => {
    // Solo devolvemos actividades activas donde la persona ya está inscrita.
    return Activity.find({
        deleted: false,
        deletedAt: null,
        'participants.userId': userId
    }).sort({ 'schedule.startTime': 1 });
};

export const joinActivity = async (activityId: string, userId: string): Promise<JoinActivityResult> => {
    // Solo una cuenta USER activa y sin bloqueo puede apuntarse.
    const user = await User.findOne({
        _id: userId,
        role: 'USER',
        deleted: false,
        isBanned: false
    }).select('name avatarUrl');

    if (!user) {
        return { status: 'user_not_allowed' };
    }

    // La inscripción se hace en una sola operación para evitar superar el aforo.
    const activity = await Activity.findOneAndUpdate(
        {
            _id: activityId,
            deleted: false,
            deletedAt: null,
            status: 'OPEN',
            'participants.userId': { $ne: user._id },
            $expr: {
                $lt: [
                    { $size: { $ifNull: ['$participants', []] } },
                    '$capacity.maxParticipants'
                ]
            }
        },
        {
            $push: {
                participants: {
                    userId: user._id,
                    name: user.name,
                    avatarUrl: user.avatarUrl
                }
            }
        },
        { new: true }
    );

    if (!activity) {
        // Consultamos el motivo del rechazo para devolver un mensaje claro.
        const currentActivity = await Activity.findOne({
            _id: activityId,
            deleted: false,
            deletedAt: null
        });

        if (!currentActivity) return { status: 'not_found' };
        if (currentActivity.participants?.some((participant) => String(participant.userId) === userId)) {
            return { status: 'already_joined' };
        }
        return { status: 'unavailable' };
    }

    if (activity.participants.length >= activity.capacity.maxParticipants) {
        // Cambiamos el estado cuando ya se ha alcanzado el aforo máximo.
        await Activity.updateOne({ _id: activity._id, status: 'OPEN' }, { status: 'FULL' });
        activity.status = 'FULL';
    }

    return { status: 'joined', activity };
};

// Actualiza los campos de una actividad que sigue activa.
export const updateActivity = (activityId: string, data: Partial<IActivity>) => {
    return Activity.findOne({ _id: activityId, deleted: false }).then(async (activity) => {
        if (!activity) return null;
        Object.assign(activity, data);
        return activity.save();
    });
};

// Archiva una actividad sin quitarla de la base de datos.
export const softDeleteActivity = (activityId: string) => {
    return Activity.findByIdAndUpdate(activityId, { deleted: true, deletedAt: new Date() }, { new: true });
};

// Archiva varias actividades en una sola operación.
export const bulkSoftDeleteActivities = (ids: string[]) => {
    return Activity.updateMany({ _id: { $in: ids } }, { $set: { deleted: true, deletedAt: new Date() } });
};

// Elimina una actividad de forma definitiva.
export const hardDeleteActivity = (activityId: string) => {
    return Activity.findByIdAndDelete(activityId);
};

// Elimina varias actividades de forma definitiva.
export const bulkHardDeleteActivities = (ids: string[]) => {
    return Activity.deleteMany({ _id: { $in: ids } });
};

export default {
    createActivity,
    getActivityById,
    getAllActivitiesPaginated,
    getJoinedActivities,
    joinActivity,
    updateActivity,
    softDeleteActivity,
    bulkSoftDeleteActivities,
    hardDeleteActivity,
    bulkHardDeleteActivities
};
