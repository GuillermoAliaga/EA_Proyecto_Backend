import mongoose from 'mongoose';
import { config } from './config/config';
import Logging from './library/Logging';
import User from './models/User';
import Activity from './models/Activity';
import Report from './models/Report';
import { DEFAULT_ADMIN, SEED_USERS, getSeedActivities, getSeedReports } from './seed-data';

// Carga los datos iniciales definidos en el archivo de datos.
// La opción de reinicio borra las colecciones antes de volver a cargarlas.

const reset = process.argv.includes('--reset');

const seed = async () => {
    await mongoose.connect(config.mongo.url);
    Logging.info(`Conectado a ${config.mongo.url}`);

    if (reset) {
        // El reinicio elimina los datos anteriores para cargar una base limpia.
        const usersDeleted = await User.deleteMany({});
        const activitiesDeleted = await Activity.deleteMany({});
        const reportsDeleted = await Report.deleteMany({});

        Logging.warning(`Borrados ${usersDeleted.deletedCount} usuarios, ${activitiesDeleted.deletedCount} actividades y ${reportsDeleted.deletedCount} reportes`);
    }

    const usersInDb = await User.countDocuments();
    const activitiesInDb = await Activity.countDocuments();
    const reportsInDb = await Report.countDocuments();

    // Conservamos los datos actuales y dejamos disponible la cuenta de administrador.
    if (usersInDb > 0 || activitiesInDb > 0 || reportsInDb > 0) {
        const existingAdmin = await User.findOne({
            email: DEFAULT_ADMIN.email,
            deleted: false
        });
        if (existingAdmin) {
            existingAdmin.name = DEFAULT_ADMIN.name!;
            existingAdmin.password = DEFAULT_ADMIN.password!;
            existingAdmin.role = 'ADMIN';
            existingAdmin.bio = DEFAULT_ADMIN.bio;
            existingAdmin.isBanned = false;
            existingAdmin.refreshTokenHash = null;
            await existingAdmin.save();
        } else {
            await User.create(DEFAULT_ADMIN);
        }
        Logging.info(`Administrador disponible: ${DEFAULT_ADMIN.email}`);
        Logging.warning('La base de datos ya contiene datos. Para reinicializarla ejecuta: npm run seed -- --reset');
        return;
    }

    // Creamos las cuentas una a una para que se cifren sus contraseñas.
    const createdUsers = [];
    for (const userData of SEED_USERS) {
        const user = await User.create(userData);
        createdUsers.push(user);
    }
    Logging.info(`Usuarios creados: ${createdUsers.length}`);

    // Buscamos las cuentas que usaremos como creadoras y participantes.
    const adminUser = createdUsers.find((u) => u.role === 'ADMIN');
    const storeUser = createdUsers.find((u) => u.role === 'STORE_HOST');
    const standardUser = createdUsers.find((u) => u.role === 'USER');

    if (!adminUser || !storeUser || !standardUser) {
        Logging.error('Faltan usuarios con roles requeridos (ADMIN, STORE_HOST, USER) en SEED_USERS para generar actividades y reportes.');
        return;
    }

    const activitiesData = getSeedActivities(adminUser._id.toString(), storeUser._id.toString(), standardUser._id.toString());

    const createdActivities = await Activity.insertMany(activitiesData);
    Logging.info(`Actividades creadas: ${createdActivities.length}`);

    // Relacionamos los reportes de ejemplo con datos que ya existen.
    if (createdActivities.length > 0) {
        // Enlaza el reporte al usuario estándar como denunciante y a la primera actividad como objetivo
        const reportsData = getSeedReports(standardUser._id.toString(), createdActivities[0]._id.toString());

        const createdReports = await Report.insertMany(reportsData);
        Logging.info(`Reportes creados: ${createdReports.length}`);
    } else {
        Logging.warning('No se han creado reportes al no existir actividades disponibles para vincular.');
    }
};

seed()
    .catch((error) => {
        Logging.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
