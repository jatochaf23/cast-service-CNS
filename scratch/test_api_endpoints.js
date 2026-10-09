const { pool } = require('../db');

async function testAll() {
    try {
        console.log('Testing updates directly on ticket 11...');
        
        // 1. Asignar técnico Hermes Jayo (id_usuario = 17)
        const [res1] = await pool.query(
            `UPDATE ticket 
             SET id_usuario_asignado = ?, 
                 tipo_formato = ?,
                 estado_ticket = 'En Proceso',
                 actualizado_en = CURRENT_TIMESTAMP
             WHERE id_ticket = ?`,
            [17, 'Multimarca', 11]
        );
        console.log('✅ Assign ticket 11 to tech 17 succeeded!');

        // 2. Editar tipo de servicio a 'incidencia'
        const [res2] = await pool.query(
            `UPDATE ticket 
             SET tipo_servicio = ?, 
                 actualizado_en = CURRENT_TIMESTAMP
             WHERE id_ticket = ?`,
            ['incidencia', 11]
        );
        console.log('✅ Edit tipo_servicio succeeded!');

        // 3. Retirar de la bandeja (Sin Asignar -> Pendiente)
        const [res3] = await pool.query(
            `UPDATE ticket 
             SET id_usuario_asignado = NULL, 
                 estado_ticket = 'Pendiente',
                 actualizado_en = CURRENT_TIMESTAMP
             WHERE id_ticket = ?`,
            [11]
        );
        console.log('✅ Unassign ticket 11 succeeded!');

        const [finalTicket] = await pool.query('SELECT id_ticket, numero_ticket, id_usuario_asignado, tipo_servicio, estado_ticket FROM ticket WHERE id_ticket = 11');
        console.log('Final Ticket 11 state:', finalTicket[0]);
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await pool.end();
    }
}

testAll();
