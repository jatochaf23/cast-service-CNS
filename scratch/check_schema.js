const { pool } = require('../db');

async function check() {
    try {
        const [tables] = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Tables:', tables.map(t => t.table_name));

        const [counts] = await pool.query("SELECT estado_ticket, count(*) as cant FROM ticket GROUP BY estado_ticket");
        console.log('Ticket counts by estado_ticket:', counts);

        const [fk] = await pool.query(`
            SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
            WHERE tc.constraint_type = 'FOREIGN KEY'
        `);
        console.log('Foreign keys:', fk);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
