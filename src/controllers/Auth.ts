import { NextFunction, Request, Response } from 'express';
import AuthService from '../services/AuthService';

// Opciones de la cookie del refresh token, la ponemos en una constante para no repetirlas en varios sitios.
const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/auth'
};

// Función para registrar un usuario nuevo
// Según el contrato, el registro no devuelve token: el frontend lleva al usuario a la página de login
const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await AuthService.register(req.body);

        // 201 porque se ha creado un recurso nuevo
        res.status(201).json({ user });
    } catch (error) {
        // Si el email ya existe, el ErrorHandler responde 409
        next(error);
    }
};

// Función para iniciar sesión
const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AuthService.login(req.body.email, req.body.password);

        if (result) {
            res.cookie('refreshToken', result.refreshToken, {
                ...refreshCookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.status(200).json({ token: result.token, user: result.user });
        } else {
            // 401: no se ha podido identificar al usuario
            res.status(401).json({ message: 'Email o contraseña incorrectos' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para pedir un access token nuevo con el refresh token
const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Primero comprobamos que llega la cookie y salimos con return,
        // así nunca se envían dos respuestas a la misma petición
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No se ha enviado el refresh token' });
        }

        const result = await AuthService.refresh(refreshToken);
        if (!result) {
            return res.status(401).json({ message: 'El usuario ya no existe' });
        }

        // Devolvemos { token }
        return res.status(200).json(result);
    } catch (error) {
        // Si el refresh token está caducado o no es válido, el ErrorHandler responde 401
        next(error);
    }
};

// EXPLICAR EN EL VÍDEO
// Cierra la sesión: invalida el refresh token en el servidor y borra la cookie
const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            try {
                await AuthService.logout(refreshToken);
            } catch {
                // Si el token ya estaba caducado o no era válido, no hay nada que invalidar:
                // seguimos y borramos la cookie igualmente
            }
        }

        res.clearCookie('refreshToken', refreshCookieOptions);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export default { register, login, refresh, logout };