import { NextFunction, Request, Response } from 'express';
import AuthService from '../services/AuthService';

// Aquí guardamos las opciones de la cookie para usarlas al iniciar y cerrar sesión
const refreshCookieOptions = {
    // Impide que el código del navegador pueda leer esta cookie
    httpOnly: true,
    // En producción la cookie solo se envía por una conexión segura
    secure: process.env.NODE_ENV === 'production',
    // Limita el envío de la cookie a peticiones del mismo sitio
    sameSite: 'strict' as const,
    // La cookie solo se usa en las rutas de autenticación
    path: '/auth'
};

// Esta función recibe los datos para crear una cuenta nueva
const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El servicio guarda la cuenta y devuelve sus datos
        const user = await AuthService.register(req.body);

        // El código 201 indica que la cuenta se ha creado correctamente
        // El registro no inicia la sesión, por eso no devolvemos un token
        res.status(201).json({ user });
    } catch (error) {
        // Enviamos el error al middleware general para que prepare la respuesta
        next(error);
    }
};

// Esta función comprueba el correo y la contraseña para iniciar sesión
const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El servicio busca la cuenta y compara la contraseña
        const result = await AuthService.login(req.body.email, req.body.password);

        if (result) {
            // Guardamos el token de renovación en una cookie protegida
            res.cookie('refreshToken', result.refreshToken, {
                ...refreshCookieOptions,
                // La cookie dura siete días
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            // El token de acceso se devuelve para usarlo en las siguientes peticiones
            // También devolvemos los datos públicos de la cuenta
            res.status(200).json({ token: result.token, user: result.user });
        } else {
            // El código 401 indica que el correo o la contraseña no son válidos
            res.status(401).json({ message: 'Email o contraseña incorrectos' });
        }
    } catch (error) {
        // Si ocurre un error inesperado, lo gestiona el middleware general
        next(error);
    }
};

// Esta función permite recuperar la sesión usando la cookie de renovación
const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Leemos la cookie que se guardó al iniciar sesión
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            // Sin cookie no podemos comprobar ni renovar la sesión
            return res.status(401).json({ message: 'No se ha enviado el refresh token' });
        }

        // El servicio verifica el token y busca la cuenta correspondiente
        const result = await AuthService.refresh(refreshToken);
        if (!result) {
            // Si la cuenta ya no existe, la sesión no se puede recuperar
            return res.status(401).json({ message: 'El usuario ya no existe' });
        }

        // Devolvemos un token de acceso nuevo
        return res.status(200).json(result);
    } catch (error) {
        // El middleware general convierte los errores de token en una respuesta adecuada
        next(error);
    }
};

// Esta función cierra la sesión y elimina la cookie del navegador
const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            try {
                // Si hay cookie, pedimos al servicio que invalide ese token
                await AuthService.logout(refreshToken);
            } catch {
                // Aunque el token no sea válido, igualmente borramos la cookie
            }
        }

        // Quitamos la cookie y respondemos que el cierre terminó correctamente
        res.clearCookie('refreshToken', refreshCookieOptions);
        res.status(204).send();
    } catch (error) {
        // Los errores inesperados se envían al middleware general
        next(error);
    }
};

export default { register, login, refresh, logout };