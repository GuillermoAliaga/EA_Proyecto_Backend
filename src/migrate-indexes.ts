import mongoose from 'mongoose';
import { config } from './config/config';
import Logging from './library/Logging';

// Este script adapta los indices unicos al soft delete.
//
// Antes, Author.email y Book.isbn tenian un indice unico normal. Ese indice impide
// repetir el valor aunque el documento ya este borrado, y con el soft delete eso
// es un problema: queremos poder reutilizar el email o el ISBN de un documento borrado.
//
// Ahora los indices son parciales (partialFilterExpression: { deleted: false }), asi
// que la unicidad solo se aplica a los documentos que no estan borrados.
//
// Mongoose no elimina el indice antiguo por su cuenta (autoIndex solo crea indices),
// por eso hay que ejecutar este script una vez sobre las bases de datos ya existentes:
//
//     npm run migrate-indexes
//
// si el indice ya esta bien, no hace nada.

// Nombre que MongoDB pone por defecto a un indice de un solo campo
const AUTHOR_EMAIL_INDEX = 'email_1';
const BOOK_ISBN_INDEX = 'isbn_1';

// Forma minima de un indice que nos interesa comparar
interface IndexInfo {
    name?: string;
    key: Record<string, unknown>;
    unique?: boolean;
    partialFilterExpression?: Record<string, unknown>;
}

// Tipo de una coleccion de MongoDB obtenida desde la conexion de Mongoose
type MongoCollection = ReturnType<mongoose.Connection['collection']>;

// Comprueba si entre los indices de una coleccion ya esta el indice parcial correcto
const isPartialUnique = (indexes: IndexInfo[], name: string) =>
    indexes.some((index) => index.name === name && index.unique === true && index.partialFilterExpression?.deleted === false);

// Elimina un indice antiguo si existe. Si no existe no pasa nada.
const dropIndexIfExists = async (collection: MongoCollection, name: string) => {
    try {
        await collection.dropIndex(name);
        Logging.warning(`Indice antiguo ${name} eliminado`);
    } catch {
        // El indice no existia: es el caso normal en una base de datos nueva
        Logging.info(`El indice ${name} no existia, no hay nada que borrar`);
    }
};

const migrateIndexes = async () => {
    await mongoose.connect(config.mongo.url, { retryWrites: true, w: 'majority' });
    Logging.info(`Conectado a ${config.mongo.url}`);

    // Colecciones reales de MongoDB
    const authors = mongoose.connection.collection('authors');
    const books = mongoose.connection.collection('books');

    // --- Email del autor ---
    // El campo sigue con lowercase y trim en el esquema, asi que aqui solo hay que
    // recrear el indice como parcial.
    const authorIndexes = (await authors.indexes()) as unknown as IndexInfo[];

    if (isPartialUnique(authorIndexes, AUTHOR_EMAIL_INDEX)) {
        Logging.info('El indice de email ya es unico y parcial');
    } else {
        await dropIndexIfExists(authors, AUTHOR_EMAIL_INDEX);
        await authors.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { deleted: false } });
        Logging.info(`Indice parcial ${AUTHOR_EMAIL_INDEX} creado`);
    }

    // --- ISBN del libro ---
    const bookIndexes = (await books.indexes()) as unknown as IndexInfo[];

    if (isPartialUnique(bookIndexes, BOOK_ISBN_INDEX)) {
        Logging.info('El indice de ISBN ya es unico y parcial');
    } else {
        await dropIndexIfExists(books, BOOK_ISBN_INDEX);
        await books.createIndex({ isbn: 1 }, { unique: true, partialFilterExpression: { deleted: false } });
        Logging.info(`Indice parcial ${BOOK_ISBN_INDEX} creado`);
    }

    // Mostramos los indices finales para poder comprobarlos.
    // Equivale a ejecutar db.authors.getIndexes() y db.books.getIndexes() en mongosh.
    Logging.info(`Indices de authors: ${JSON.stringify(await authors.indexes())}`);
    Logging.info(`Indices de books: ${JSON.stringify(await books.indexes())}`);
};

migrateIndexes()
    .catch((error) => {
        Logging.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
