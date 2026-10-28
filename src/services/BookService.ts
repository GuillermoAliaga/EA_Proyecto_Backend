import Book, { IBook } from '../models/Book';

// Funcion que se encarga de crear un libro en la base de datos
export const createBook = (data: IBook) => {
    // Creamos un nuevo libro usando los datos que hemos recibido
    const book = new Book(data);

    // Guardamos el libro en la base de datos y devolvemos el resultado
    return book.save();
};

// Funcion que busca un libro por su ID en la base de datos
export const getBookById = (bookId: string) => {
    // Buscamos el libro por su ID y obtenemos tambien los datos de sus autores.
    // Filtramos deleted: false para no devolver libros borrados logicamente.
    return Book.findOne({ _id: bookId, deleted: false }).populate('authors');
};

// Funcion que busca todos los libros de la base de datos
export const getAllBooks = () => {
    // Buscamos todos los libros y obtenemos tambien los datos de sus autores.
    // Filtramos deleted: false para dejar fuera los libros borrados logicamente.
    return Book.find({ deleted: false }).populate('authors');
};

// Funcion que se encarga de actualizar un libro
export const updateBook = (bookId: string, data: IBook) => {
    // Buscamos el libro por su ID y actualizamos sus datos.
    // Filtramos deleted: false para que un libro borrado logicamente no se pueda actualizar
    // (devolvera null y el controlador respondera 404).
    // Con new: true devolvemos el documento actualizado y también poblamos autores.
    return Book.findOneAndUpdate({ _id: bookId, deleted: false }, data, { new: true }).populate('authors');
};

// Funcion que se encarga de eliminar un libro de la base de datos.
export const deleteBook = (bookId: string) => {
    // Marcamos el libro como borrado en lugar de quitarlo de la base de datos.
    // El controlador sigue recibiendo el documento (204) o null (404) igual que antes.
    return Book.findByIdAndUpdate(bookId, { deleted: true, deletedAt: new Date() }, { new: true });
};

// Exportamos todas las funciones para poder utilizarlas desde el controlador
export default {
    createBook,

    getBookById,

    getAllBooks,

    updateBook,

    deleteBook
};
