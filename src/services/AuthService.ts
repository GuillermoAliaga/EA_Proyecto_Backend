import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import User, { AccessTokenPayload, IUser, IUserModel, RefreshTokenPayload } from '../models/User';
import { verifyPassword } from '../utils/password';
import crypto from 'crypto';

// Creamos un resumen del token para guardarlo sin conservar el token original.
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// Este token acompaña las peticiones protegidas y dura poco tiempo.
export const signAccessToken = (user: IUserModel) => {
    const payload: AccessTokenPayload = { sub: String(user._id), role: user.role };

    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

// Este token sirve para pedir otro token de acceso y se guarda en una cookie protegida.
export const signRefreshToken = (user: IUserModel) => {
    const payload: RefreshTokenPayload = { sub: String(user._id) };

    return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
};

// El registro público siempre usa el rol USER definido por defecto en el modelo.
export const register = (data: Pick<IUser, 'name' | 'email' | 'password'>) => {
    const user = new User({ name: data.name, email: data.email, password: data.password });

    return user.save();
};

// Comprueba los datos de acceso y devuelve la sesión si son correctos.
export const login = async (email: string, password: string) => {
    // La contraseña tiene select: false en el modelo, asi que hay que pedirla a proposito
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Si el email no existe o la contraseña no coincide, devolvemos lo mismo (null).
    // Asi el que llama no puede saber que emails estan registrados.
    if (!user || !(await verifyPassword(password, user.password))) {
        return null;
    }
    const refreshToken = signRefreshToken(user);
    // Guardamos solo el resumen para poder invalidar la sesión al salir.
    await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });

    return {
        token: signAccessToken(user),
        refreshToken,
        // toJSON() quita la contraseña del usuario antes de devolverlo
        user: user.toJSON()
    };
};

// Comprueba que el token de renovación sigue guardado para esa cuenta.
export const refresh = async (refreshToken: string) => {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as RefreshTokenPayload;

    // Volvemos a leer el usuario de la base de datos: asi el token nuevo lleva su rol actual
    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
        return null;
    }

    return { token: signAccessToken(user) };
};

// Al cerrar sesión quitamos el resumen para que no se pueda renovar el acceso.
export const logout = async (refreshToken: string) => {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as RefreshTokenPayload;

    await User.updateOne({ _id: payload.sub }, { refreshTokenHash: null });
};

export default { register, login, refresh, logout };