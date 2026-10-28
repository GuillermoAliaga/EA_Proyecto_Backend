import mongoose, { Document, Schema } from 'mongoose';

import { randomBytes, scrypt } from 'node:crypto';

import { promisify } from 'node:util';

import Logging from '../library/Logging';

// Convertimos scrypt en una funcion que podemos utilizar con await
const deriveKey = promisify(scrypt);

// Definimos los datos que puede tener un autor
export interface IAuthor {

    name: string;

    email: string;

    password: string;

    birthDate?: Date;

    nationality?: string;

    biography?: string;

    website?: string;

    photoUrl?: string;

    active?: boolean;

    role?: 'author' | 'admin';

    // Marca si el autor esta borrado. Los autores borrados no se eliminan fisicamente de la base de datos
    deleted: boolean;

    deletedAt?: Date;

}

// Esta interfaz junta los datos del autor con las propiedades de un documento de MongoDB
export interface IAuthorModel extends IAuthor, Document {}

// Definimos el esquema que van a seguir los autores en la base de datos
const AuthorSchema: Schema = new Schema(

    {
        // El nombre es obligatorio y quitamos los espacios del principio y del final
        name: { type: String, required: true, trim: true },

        // El email identifica al autor y por eso no puede repetirse
        // Tambien lo guardamos siempre en minusculas para evitar duplicados por mayusculas
        // La unicidad se define mas abajo como indice parcial (solo para autores no borrados)
        email: { type: String, required: true, lowercase: true, trim: true },

        // La contraseña es obligatoria pero no se muestra cuando hacemos consultas
        // Mas adelante se guarda cifrada antes de guardar el autor
        password: { type: String, required: true, select: false },

        // La fecha de nacimiento es opcional
        birthDate: { type: Date },

        // La nacionalidad es opcional y eliminamos los espacios sobrantes
        nationality: { type: String, trim: true },

        // La biografia puede tener como maximo 1000 caracteres
        biography: { type: String, maxlength: 1000 },

        // La pagina web y la foto son opcionales
        website: { type: String, trim: true },
        photoUrl: { type: String, trim: true },

        // Por defecto un autor esta activo
        active: { type: Boolean, default: true },

        // El rol solo puede ser author o admin
        // Si no se indica ninguno se asigna author por defecto
        role: { type: String, enum: ['author', 'admin'], default: 'author' },

        deleted: { type: Boolean, default: false },

        deletedAt: { type: Date }
    },

    {
        // Mongoose crea automaticamente las fechas de creacion y actualizacion
        timestamps: true,

        // Quitamos el campo que usa Mongoose para controlar las versiones
        versionKey: false,

        // Esta funcion se ejecuta cuando convertimos el autor a JSON
        // Sirve para asegurarnos de que la contraseña no aparezca en las respuestas
        toJSON: {
            transform: (document, result: Record<string, unknown>) => {

                // Eliminamos la contraseña antes de devolver los datos
                delete result.password;

                return result;
            }
        }

    }

);

// Indice unico parcial del email: solo tiene que ser unico entre los autores no borrados.
// Asi un autor borrado logicamente libera su email para que otro autor nuevo lo pueda usar.
// Es importante definirlo con schema.index(): Mongoose ignora partialFilterExpression
// cuando se pone como opcion del campo.
AuthorSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deleted: false } });

// Este hook se ejecuta antes de guardar un autor en la base de datos
AuthorSchema.pre('save', async function () {

    // Si la contraseña no ha cambiado no necesitamos volver a cifrarla
    // Esto evita cifrar de nuevo una contraseña que ya estaba cifrada
    if (!this.isModified('password')) {
        return;
    }

    // Generamos un valor aleatorio que se utiliza como salt
    // Sirve para hacer mas segura la contraseña almacenada
    const salt = randomBytes(16).toString('hex');

    // Generamos una clave a partir de la contraseña y el salt
    // Usamos scrypt para que la contraseña no se guarde directamente
    const derivedKey = (await deriveKey(String(this.password), salt, 64)) as Buffer;

    // Guardamos el salt y la clave generada en lugar de la contraseña original
    this.password = `scrypt:${salt}:${derivedKey.toString('hex')}`;
});

// Este hook se ejecuta despues de guardar correctamente el autor
AuthorSchema.post('save', function (author) {

    // Simulamos el envio de un email de bienvenida
    // En este caso simplemente lo mostramos en los logs
    Logging.info(`Email simulation: welcome email sent to ${author.email}`);
});

// Creamos y exportamos el modelo Author a partir del esquema
export default mongoose.model<IAuthorModel>('Author', AuthorSchema);

