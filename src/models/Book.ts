import mongoose, { Document, Schema } from 'mongoose';

// Etiquetas que puede tener un libro. Se escriben sin acentos ni espacios
// porque también se usan dentro de una URL.
export const BOOK_TAGS = ['ciencia-ficcion', 'fantasia', 'novela', 'ensayo', 'poesia', 'historia'];
export const BOOK_LANGUAGES = ['es', 'ca', 'en'];

export interface IBook {
    title: string;
    authors: mongoose.Types.ObjectId[] | string[];
    isbn: string;
    edition?: number;
    publisher?: string;
    publishedYear?: number;
    pages?: number;
    language?: 'es' | 'ca' | 'en';
    tags?: string[];
    price?: number;
    description?: string;

    // Indica si el libro esta borrado, los libros borrados no se eliminan fisicamente de la base de datos
    deleted: boolean;

    deletedAt?: Date;
}

export interface IBookModel extends IBook, Document {}

const BookSchema: Schema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        authors: {
            type: [Schema.Types.ObjectId],
            ref: 'Author',
            required: true,
            validate: {
                validator: (authors: string[]) => authors.length > 0,
                message: 'Un libro necesita al menos un autor'
            }
        },
        isbn: { type: String, required: true, trim: true },
        edition: { type: Number, default: 1, min: 1 },
        publisher: { type: String, trim: true },
        publishedYear: { type: Number, min: 1450, max: 2100 },
        pages: { type: Number, min: 1 },
        language: { type: String, enum: BOOK_LANGUAGES, default: 'es' },
        tags: { type: [String], enum: BOOK_TAGS, default: [] },
        price: { type: Number, min: 0 },
        description: { type: String, trim: true },

        deleted: { type: Boolean, default: false },

        deletedAt: { type: Date }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Indice unico parcial del ISBN
BookSchema.index({ isbn: 1 }, { unique: true, partialFilterExpression: { deleted: false } });

export default mongoose.model<IBookModel>('Book', BookSchema);
