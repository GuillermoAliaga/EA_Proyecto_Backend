import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../models/User';

export const RequireRole = (role: UserRole) => (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
        return res.status(403).json({ message: 'No tienes permiso para hacer esto' });
    }
    next();
};