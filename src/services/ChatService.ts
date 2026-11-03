import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Server, type Socket } from 'socket.io';

import { config } from '../config/config';
import Logging from '../library/Logging';
import { corsOptions } from '../middleware/Cors';
import Activity from '../models/Activity';
import ChatMessage from '../models/ChatMessage';
import User, { type AccessTokenPayload } from '../models/User';

interface ChatMessagePayload {
    room?: unknown;
    text?: unknown;
}

interface ChatJoinPayload {
    room?: unknown;
}

interface AuthenticatedSocket extends Socket {
    userId: string;
    userName: string;
}

const isAccessTokenPayload = (payload: string | jwt.JwtPayload): payload is jwt.JwtPayload & AccessTokenPayload =>
    typeof payload !== 'string' && typeof payload.sub === 'string';

const isAllowedRoom = (room: string, userId: string): boolean => {
    // Las salas generales y de grupo están disponibles para cualquier usuario conectado.
    if (room === 'general') return true;
    if (/^group:[A-Za-z0-9_-]{1,100}$/.test(room)) return true;

    const directRoom = /^direct:([a-f\d]{24}):([a-f\d]{24})$/i.exec(room);
    if (!directRoom) return false;

    const [firstId, secondId] = [directRoom[1].toLowerCase(), directRoom[2].toLowerCase()].sort();
    return room === `direct:${firstId}:${secondId}` && [firstId, secondId].includes(userId.toLowerCase());
};

const canAccessRoom = async (room: string, userId: string): Promise<boolean> => {
    if (isAllowedRoom(room, userId)) return true;

    const activityRoom = /^activity:([a-f\d]{24})$/i.exec(room);
    if (!activityRoom) return false;

    // Una sala de actividad solo está disponible para sus participantes.
    return Boolean(await Activity.exists({
        _id: activityRoom[1],
        deleted: false,
        deletedAt: null,
        'participants.userId': userId
    }));
};

const toClientMessage = (message: {
    _id: mongoose.Types.ObjectId;
    room: string;
    userId: mongoose.Types.ObjectId;
    userName: string;
    text: string;
    createdAt: Date;
}) => ({
    _id: String(message._id),
    room: message.room,
    user: { _id: String(message.userId), name: message.userName },
    text: message.text,
    timestamp: message.createdAt.toISOString()
});

export const attachChat = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: corsOptions
    });

    const onlineSockets = new Map<string, Set<string>>();

    io.use(async (socket, next) => {
        try {
            // Socket.IO valida el token al conectar porque no usa el interceptor HTTP.
            const token = socket.handshake.auth?.token;
            if (typeof token !== 'string' || !token) throw new Error('Missing token');

            const payload = jwt.verify(token, config.jwt.secret);
            if (!isAccessTokenPayload(payload) || !mongoose.Types.ObjectId.isValid(payload.sub)) {
                throw new Error('Invalid token');
            }

            const user = await User.findOne({
                _id: payload.sub,
                deleted: false,
                isBanned: false
            }).select('_id name');
            if (!user) throw new Error('User is unavailable');

            const authenticatedSocket = socket as AuthenticatedSocket;
            authenticatedSocket.userId = String(user._id);
            authenticatedSocket.userName = user.name;
            next();
        } catch {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (rawSocket) => {
        const socket = rawSocket as AuthenticatedSocket;
        const userSockets = onlineSockets.get(socket.userId) ?? new Set<string>();
        userSockets.add(socket.id);
        onlineSockets.set(socket.userId, userSockets);
        io.emit('users:online', [...onlineSockets.keys()]);

        socket.on('chat:join', async (payload: ChatJoinPayload) => {
            if (typeof payload?.room !== 'string') {
                socket.emit('chat:error', { message: 'Sala de chat no válida.' });
                return;
            }

            try {
                // Comprobamos los permisos antes de entrar y leer mensajes anteriores.
                if (!await canAccessRoom(payload.room, socket.userId)) {
                    socket.emit('chat:error', { message: 'No tienes permiso para entrar en esta sala.' });
                    return;
                }

                await socket.join(payload.room);
                const recentMessages = await ChatMessage.find({ room: payload.room })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean();

                socket.emit('chat:history', recentMessages.reverse().map(toClientMessage));
            } catch (error) {
                Logging.error(error);
                socket.emit('chat:error', { message: 'No se pudo cargar el historial del chat.' });
            }
        });

        socket.on('chat:message', async (payload: ChatMessagePayload) => {
            if (
                typeof payload?.room !== 'string' ||
                !socket.rooms.has(payload.room) ||
                typeof payload.text !== 'string'
            ) {
                socket.emit('chat:error', { message: 'Mensaje o sala no válidos.' });
                return;
            }

            const text = payload.text.trim();
            // Se comprueba el contenido antes de guardarlo para evitar mensajes vacíos o enormes.
            if (!text || text.length > 2000) {
                socket.emit('chat:error', { message: 'El mensaje debe tener entre 1 y 2000 caracteres.' });
                return;
            }

            try {
                // El autor se toma de la conexión autenticada y no de los datos del navegador.
                if (!await canAccessRoom(payload.room, socket.userId)) {
                    socket.emit('chat:error', { message: 'No tienes permiso para enviar mensajes en esta sala.' });
                    return;
                }

                const savedMessage = await ChatMessage.create({
                    room: payload.room,
                    userId: socket.userId,
                    userName: socket.userName,
                    text
                });
                io.to(payload.room).emit('chat:message', toClientMessage(savedMessage));
            } catch (error) {
                Logging.error(error);
                socket.emit('chat:error', { message: 'No se pudo guardar el mensaje.' });
            }
        });

        socket.on('disconnect', () => {
            const connectedSockets = onlineSockets.get(socket.userId);
            connectedSockets?.delete(socket.id);
            if (connectedSockets?.size === 0) onlineSockets.delete(socket.userId);
            io.emit('users:online', [...onlineSockets.keys()]);
        });
    });

    return io;
};
