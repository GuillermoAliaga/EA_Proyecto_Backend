import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../models/User';

// Deja continuar solo a las cuentas que tienen el rol indicado.
export const RequireRole = (role: UserRole) => (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
        return res.status(403).json({ message: 'No tienes permiso para hacer esto' });
    }
    next();
};

// Deja continuar si la cuenta tiene cualquiera de los roles permitidos.
export const RequireAnyRole = (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'No tienes permiso para hacer esto' });
    }
    next();
};