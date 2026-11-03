import User, { IUser, UserRole } from '../models/User';

export interface IUserSummary {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    deleted: boolean;
    deletedAt?: Date | null;
}

export interface IUserProfile {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    bio?: string;
    isBanned: boolean;
    deleted: boolean;
    deletedAt?: Date | null;
}

export interface IChatUser {
    _id: string;
    name: string;
    avatarUrl?: string;
}

export interface UserQueryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    role?: UserRole;
    isBanned?: boolean;
    showDeleted?: boolean;
    userRole?: string;
}

// El registro público y la gestión administrativa comparten el mismo modelo.
// Crear un usuario nuevo
export const createUser = (data: IUser) => {
    const user = new User(data);
    return user.save();
};

// Busca una cuenta y oculta las archivadas a quien no sea administrador.
export const getUserById = async (userId: string, userRole?: string): Promise<IUserProfile | null> => {
    const filter: Record<string, unknown> = { _id: userId };

    // Si NO es Admin, solo consulta usuarios activos
    if (userRole !== 'ADMIN') {
        filter.deleted = false;
    }

    const user = await User.findOne(filter);
    if (!user) return null;

    return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isBanned: user.isBanned,
        deleted: user.deleted,
        deletedAt: user.deletedAt
    };
};

// Devuelve usuarios por páginas y aplica los filtros de la tabla.
export const getAllUsersPaginated = async (params: UserQueryParams) => {
    // La página y el límite determinan cuántos usuarios se leen de la base de datos.
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const skip = (page - 1) * limit;

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = {};

    // Las cuentas archivadas solo aparecen cuando un administrador las solicita.
    if (params.userRole !== 'ADMIN') {
        filter.deleted = false;
    } else if (params.showDeleted !== true) {
        filter.deleted = false;
    }

    // Búsqueda por texto (nombre o email)
    if (params.search) {
        filter.$or = [{ name: { $regex: params.search, $options: 'i' } }, { email: { $regex: params.search, $options: 'i' } }];
    }

    if (params.role) filter.role = params.role;
    if (params.isBanned !== undefined) filter.isBanned = params.isBanned;

    const [users, totalCount] = await Promise.all([
        User.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit),
        User.countDocuments(filter)
    ]);

    // Enviamos solo los datos que necesita la tabla y nunca la contraseña.
    const summaries: IUserSummary[] = users.map((user) => ({
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        deleted: user.deleted,
        deletedAt: user.deletedAt
    }));

    return {
        data: summaries,
        totalDocs: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
    };
};

export const getChatUsers = async (currentUserId: string): Promise<IChatUser[]> => {
    // El chat solo necesita mostrar perfiles activos distintos de la cuenta actual.
    const users = await User.find({
        _id: { $ne: currentUserId },
        deleted: false,
        isBanned: false
    })
        .select('_id name avatarUrl')
        .sort({ name: 1 })
        .lean();

    return users.map((user) => ({
        _id: String(user._id),
        name: user.name,
        avatarUrl: user.avatarUrl ?? undefined
    }));
};

// Actualizar un usuario
export const updateUser = (userId: string, data: Partial<IUser>) => {
    return User.findOne({ _id: userId, deleted: false }).then(async (user) => {
        if (!user) return null;
        Object.assign(user, data);
        return user.save();
    });
};

// Recupera una cuenta archivada usando su identificador.
export const restoreUser = (userId: string) => {
    return User.findByIdAndUpdate(userId, { deleted: false, deletedAt: null }, { new: true });
};

// Archiva una cuenta sin quitarla de la base de datos.
export const softDeleteUser = (userId: string) => {
    return User.findByIdAndUpdate(userId, { deleted: true, deletedAt: new Date() }, { new: true });
};

// Archiva varias cuentas en una sola operación.
export const bulkSoftDeleteUsers = (ids: string[]) => {
    return User.updateMany({ _id: { $in: ids } }, { $set: { deleted: true, deletedAt: new Date() } });
};

// Elimina una cuenta de forma definitiva.
export const hardDeleteUser = (userId: string) => {
    return User.findByIdAndDelete(userId);
};

// Elimina varias cuentas de forma definitiva.
export const bulkHardDeleteUsers = (ids: string[]) => {
    return User.deleteMany({ _id: { $in: ids } });
};

export default {
    createUser,
    getUserById,
    getAllUsersPaginated,
    getChatUsers,
    updateUser,
    restoreUser,
    softDeleteUser,
    bulkSoftDeleteUsers,
    hardDeleteUser,
    bulkHardDeleteUsers
};
