const { pool } = require('../db');

async function checkDashboard() {
    try {
        const [all] = await pool.query(`
            SELECT t.id_ticket, t.numero_ticket, t.cliente, t.distrito, 
                   t.fecha_servicio::text as fecha_servicio, t.hora_servicio, 
                   t.salida_directa, t.id_usuario_asignado, t.estado_ticket,
                   u.nombre as nombre_tecnico
            FROM ticket t
            LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
            ORDER BY t.id_ticket ASC
        `);
        console.log('--- TODOS LOS TICKETS EN BD ---');
        console.log(all);

        const [tomorrowRow] = await pool.query("SELECT (CURRENT_DATE + INTERVAL '1 day')::date::text as manana");
        const manana = tomorrowRow[0].manana;
        console.log('\n--- FECHA MAÑANA ---', manana);

        const [dashTickets] = await pool.query(`
            SELECT t.id_ticket, t.numero_ticket, t.cliente, t.distrito, 
                   t.fecha_servicio::text as fecha_servicio, t.hora_servicio, 
                   t.salida_directa, u.nombre as nombre_tecnico
            FROM ticket t
            LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
            WHERE t.fecha_servicio = ?::date AND t.salida_directa = true
            ORDER BY t.hora_servicio ASC, t.id_ticket ASC
        `, [manana]);

        console.log('\n--- TICKETS QUE SALEN EN DASHBOARD PARA MAÑANA ---');
        console.log(dashTickets);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkDashboard();
