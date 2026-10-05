require('dotenv').config();
const { Pool, types } = require('pg');

// Convertir bigint/COUNT(*) a número entero en JavaScript
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST || 'aws-0-us-west-2.pooler.supabase.com'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'postgres'}`;

const pgPool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

const pool = {
    async query(sql, params = []) {
        // 1. Convertir placeholders '?' a '$1', '$2', ...
        let index = 1;
        let pgSql = sql.replace(/\?/g, () => `$${index++}`);

        // 2. Si es INSERT sin RETURNING, agregarlo para obtener insertId
        const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
        if (isInsert && !/RETURNING/i.test(pgSql)) {
            pgSql += ' RETURNING *';
        }

        // 3. Ejecutar consulta en PostgreSQL (Supabase)
        const result = await pgPool.query(pgSql, params);

        // 4. Adaptar resultado con insertId si es un INSERT
        if (isInsert && result.rows.length > 0) {
            const firstRow = result.rows[0];
            const insertId = firstRow.id_ticket || firstRow.id_usuario || firstRow.id_rol;
            result.insertId = insertId;
            result.rows.insertId = insertId;
        }

        // Retornar en el mismo formato estructurado: [rows, result]
        return [result.rows, result];
    },

    async end() {
        return pgPool.end();
    }
};

async function initDB() {
    try {
        const client = await pgPool.connect();
        console.log('✅ Conectado exitosamente a la base de datos Supabase PostgreSQL (postgres)');
        
        // Verificar roles
        const [roles] = await pool.query('SELECT * FROM roles');
        console.log(`📋 Roles encontrados en Supabase: ${roles.length}`);

        // Verificar usuarios
        const [usuarios] = await pool.query('SELECT count(*) as total FROM usuarios');
        console.log(`👥 Total usuarios en Supabase: ${usuarios[0].total}`);

        client.release();
    } catch (error) {
        console.error('❌ Error al inicializar conexión con Supabase:', error.message);
    }
}

module.exports = { pool, initDB };
