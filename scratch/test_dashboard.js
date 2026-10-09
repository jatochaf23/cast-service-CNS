const { pool } = require('../db.js');

async function test() {
    const [dateRow] = await pool.query("SELECT (CURRENT_DATE + INTERVAL '1 day')::date::text as manana");
    const queryDate = dateRow[0].manana;
    console.log(`Fecha de reporte (Día Siguiente): ${queryDate}`);

    const [tickets] = await pool.query(
        `SELECT t.id_ticket, t.numero_ticket, t.cliente, t.distrito, 
                t.hora_servicio, t.tipo_servicio, u.nombre as nombre_tecnico
         FROM ticket t
         LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
         WHERE t.fecha_servicio = ?::date
         ORDER BY t.hora_servicio ASC`,
        [queryDate]
    );

    console.log(`Técnicos que saldrán al siguiente día: ${tickets.length}`);
    console.log(JSON.stringify(tickets, null, 2));
    process.exit(0);
}

test().catch(e => {
    console.error(e);
    process.exit(1);
});
