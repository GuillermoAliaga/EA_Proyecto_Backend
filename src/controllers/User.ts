import { NextFunction, Request, Response } from 'express';
import UserService from '../services/UserService';

// Devuelve los datos básicos de los usuarios para que el frontend
// pueda mostrarlos y usarlos al iniciar un chat directo.
const listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // El service solo devuelve el id y el nombre, para no exponer otros datos personales.
        const users = await UserService.getAllUsers();

        // Devolvemos la lista dentro de la propiedad "users".
        res.status(200).json({ users });
    } catch (error) {
        // El middleware de errores de Express se encarga de responder ante fallos.
        next(error);
    }
};

// Devuelve el usuario con sesion. Su id lo saca VerifyToken del token y lo deja en req.user:
// por eso esta ruta no necesita ningun parametro en la URL.
const readMe = async (req: Request, res: Response, next: NextFunction) => {
    // VerifyToken va antes en la ruta, asi que req.user siempre existe aqui.
    // Lo comprobamos igualmente para que TypeScript sepa que no es undefined.
    if (!req.user) {
        res.status(401).json({ message: 'Falta el token' });
        return;
    }

    try {
        const user = await UserService.getUserById(req.user.id);

        if (user) {
            res.status(200).json({ user });
        } else {
            // El token es valido pero el usuario se ha borrado despues de hacer login
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

export default { listUsers, readMe };