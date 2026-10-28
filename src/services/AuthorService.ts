import Author, { IAuthor } from '../models/Author';

// Funcion que se encarga de crear un autor en la base de datos
export const createAuthor = (data: IAuthor) => {

    // Creamos un nuevo autor usando los datos que hemos recibido
    const author = new Author(data);

    // Guardamos el autor en la base de datos y devolvemos el resultado
    return author.save();

};

// Funcion que busca un autor por su ID en la base de datos
export const getAuthorById = (authorId: string) => {

    // Buscamos el autor usando el ID que hemos recibido.
    // Filtramos deleted: false para no devolver autores borrados logicamente.
    return Author.findOne({ _id: authorId, deleted: false });

};

// Funcion que busca todos los autores de la base de datos
export const getAllAuthors = () => {

    // Devolvemos todos los autores que hay guardados.
    // Filtramos deleted: false para dejar fuera los autores borrados logicamente.
    return Author.find({ deleted: false });

};

// Funcion que se encarga de actualizar un autor
export const updateAuthor = (authorId: string, data: IAuthor) => {

    // Buscamos primero el autor que queremos actualizar.
    // Filtramos deleted: false para que un autor borrado logicamente no se pueda actualizar
    // (devolvera null y el controlador respondera 404).
    return Author.findOne({ _id: authorId, deleted: false }).then(async (author) => {

        // Si no existe ningun autor con ese ID devolvemos null
        if (!author) {

            return null;

        }

        // Actualizamos los datos del autor con los nuevos datos recibidos
        Object.assign(author, data);

        // Guardamos los cambios en la base de datos
        return author.save();

    });

};

// Funcion que se encarga de eliminar un autor de la base de datos.
// En realidad no lo borramos: hacemos un borrado logico (soft delete), marcando
// el autor como deleted y guardando la fecha en deletedAt.
export const deleteAuthor = (authorId: string) => {

    // Marcamos el autor como borrado en lugar de quitarlo de la base de datos.
    // El controlador sigue recibiendo el documento (204) o null (404) igual que antes.
    return Author.findByIdAndUpdate(authorId, { deleted: true, deletedAt: new Date() }, { new: true });

};

// Exportamos todas las funciones para poder utilizarlas desde el controlador
export default {

    createAuthor,

    getAuthorById,

    getAllAuthors,

    updateAuthor,

    deleteAuthor

};

