require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '591318',
    database: process.env.DB_NAME || 'cast_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado exitosamente a la base de datos MySQL (cast_db)');
        
        // Verificar roles
        const [roles] = await connection.query('SELECT * FROM roles');
        console.log(`📋 Roles encontrados: ${roles.length}`);

        // Verificar o agregar columna tipo_formato en ticket
        const [cols] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'cast_db' 
              AND TABLE_NAME = 'ticket' 
              AND COLUMN_NAME = 'tipo_formato'
        `);
        if (cols.length === 0) {
            await connection.query("ALTER TABLE ticket ADD COLUMN tipo_formato VARCHAR(30) DEFAULT 'Multimarca'");
            console.log(' Column tipo_formato agregada a tabla ticket');
            await connection.query("UPDATE ticket SET tipo_formato = 'Lexmark' WHERE LOWER(marca) LIKE '%lexmark%'");
        }

        // Verificar o crear usuarios por defecto si no existen admin y dispatcher
        const [admins] = await connection.query('SELECT * FROM usuarios WHERE id_rol = 1');
        if (admins.length === 0) {
            await connection.query(
                `INSERT INTO usuarios (id_rol, nombre, correo, telefono, password, estado) 
                 VALUES (1, 'Administrador del Sistema', 'admin@cns.com.pe', '999888777', 'admin123', 'Activo')`
            );
            console.log(' Usuario admin@cns.com.pe creado (clave: admin123)');
        }

        const [dispatchers] = await connection.query('SELECT * FROM usuarios WHERE id_rol = 2');
        if (dispatchers.length === 0) {
            await connection.query(
                `INSERT INTO usuarios (id_rol, nombre, correo, telefono, password, estado) 
                 VALUES (2, 'Coordinador Dispatcher', 'dispatcher@cns.com.pe', '999111222', 'dispa123', 'Activo')`
            );
            console.log(' Usuario dispatcher@cns.com.pe creado (clave: dispa123)');
        }

        connection.release();
    } catch (error) {
        console.error('❌ Error al inicializar base de datos:', error.message);
    }
}

module.exports = { pool, initDB };
