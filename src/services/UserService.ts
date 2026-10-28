import User, { UserRole } from '../models/User';

// Lo que se puede enseñar de un usuario a los demas (por ejemplo, en la lista del chat):
// solo el id y el nombre, sin email ni rol.
export interface IUserSummary {
    _id: string;
    name: string;
}

// Los datos del usuario con sesion, para GET /users/me. Nunca lleva la contraseña.
export interface IUserProfile {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
}

// Funcion que busca todos los usuarios, ordenados por nombre, con sus datos publicos
export const getAllUsers = async (): Promise<IUserSummary[]> => {
    const users = await User.find().sort({ name: 1 });

    // Pasamos cada documento a la interfaz IUserSummary: asi queda claro que datos salen
    const summaries: IUserSummary[] = users.map((user) => ({
        _id: String(user._id),
        name: user.name
    }));

    return summaries;
};

// Funcion que busca un usuario por su id. Devuelve null si no existe.
export const getUserById = async (userId: string): Promise<IUserProfile | null> => {
    const user = await User.findById(userId);

    if (!user) {
        return null;
    }

    const profile: IUserProfile = {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role
    };

    return profile;
};

export default { getAllUsers, getUserById };