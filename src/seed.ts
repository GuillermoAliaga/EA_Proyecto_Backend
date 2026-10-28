import mongoose from 'mongoose';
import { config } from './config/config';
import Logging from './library/Logging';
import Author from './models/Author';
import Book from './models/Book';
import { authorsSeed, booksSeed } from './seed-data';

// Llena la base de datos con los datos de ejemplo de seed-data.ts.
//
//   npm run seed             inserta los datos solo si la base de datos está vacía
//   npm run seed -- --reset  borra los autores y los libros y vuelve a insertarlos
//
// Siempre trabaja sobre la base de datos del .env (MONGO_URL).

const reset = process.argv.includes('--reset');

const seed = async () => {
    await mongoose.connect(config.mongo.url);
    Logging.info(`Conectado a ${config.mongo.url}`);

    if (reset) {
        // Ojo: deleteMany({}) es un borrado fisico real y a proposito.
        // El reset del seed es el unico punto que hace borrado duro: asi tambien
        // se limpian los documentos que se habian borrado logicamente (soft delete).
        const authors = await Author.deleteMany({});
        const books = await Book.deleteMany({});
        Logging.warning(`Borrados ${authors.deletedCount} autores y ${books.deletedCount} libros`);
    }

    const authorsInDb = await Author.countDocuments();
    const booksInDb = await Book.countDocuments();

    if (authorsInDb > 0 || booksInDb > 0) {
        Logging.warning('La base de datos ya tiene datos. Para rehacerla: npm run seed -- --reset');
        return;
    }

    // create() dispara los hooks del modelo: la contrasena se guarda cifrada
    const createdAuthors = await Author.create(authorsSeed);
    Logging.info(`Autores creados: ${createdAuthors.length}`);

    // Cada libro trae los emails de sus autores; aquí se cambian por los ids que les ha dado MongoDB
    const booksWithAuthors = booksSeed.map(({ authorEmails, ...book }) => {
        const authors = authorEmails.map((email) => {
            const author = createdAuthors.find((created) => created.email === email);

            if (!author) {
                throw new Error(`En seed-data.ts hay un libro de un autor que no existe: ${email}`);
            }

            return author._id;
        });

        return { ...book, authors };
    });

    const createdBooks = await Book.insertMany(booksWithAuthors);
    Logging.info(`Libros creados: ${createdBooks.length}`);
};

seed()
    .catch((error) => {
        Logging.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
