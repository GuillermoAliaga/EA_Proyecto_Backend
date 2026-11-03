import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
    room: string;
    userId: mongoose.Types.ObjectId;
    userName: string;
    text: string;
    createdAt: Date;
}

// Este modelo guarda los mensajes para poder mostrar el historial de cada sala.
const ChatMessageSchema: Schema = new Schema(
    {
        room: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userName: { type: String, required: true },
        text: { type: String, required: true, maxlength: 2000 }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Este índice ayuda a cargar primero los mensajes más recientes de una sala.
ChatMessageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
