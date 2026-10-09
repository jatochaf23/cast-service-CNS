const { pool } = require('../db');

async function testEdit() {
    try {
        console.log('Testing PUT /api/tickets/11 with edit payload...');
        const ticketId = 11;
        const body = {
            tipo_servicio: 'mantenimiento',
            tipo_formato: 'Multimarca',
            fecha_servicio: '2026-10-10',
            hora_servicio: '09:00',
            salida_directa: true,
            id_usuario_asignado: null,
            distrito: 'PUNTA NEGRA',
            estado_ticket: 'Pendiente'
        };

        const {
            cliente,
            usuario,
            direccion,
            telefono,
            distrito,
            marca,
            modelo,
            serie,
            tipo_formato,
            id_usuario_asignado,
            fecha_servicio,
            hora_servicio,
            tipo_servicio,
            salida_directa,
            estado_ticket
        } = body;

        await pool.query(
            `UPDATE ticket 
             SET cliente = COALESCE(?, cliente),
                 usuario = COALESCE(?, usuario),
                 direccion = COALESCE(?, direccion),
                 telefono = COALESCE(?, telefono),
                 distrito = COALESCE(?, distrito),
                 marca = COALESCE(?, marca),
                 modelo = COALESCE(?, modelo),
                 serie = COALESCE(?, serie),
                 tipo_formato = COALESCE(?, tipo_formato),
                 id_usuario_asignado = CASE WHEN ? IS NOT NULL THEN ? ELSE id_usuario_asignado END,
                 fecha_servicio = CASE WHEN ? IS NOT NULL THEN ?::date ELSE fecha_servicio END,
                 hora_servicio = COALESCE(?, hora_servicio),
                 tipo_servicio = COALESCE(?, tipo_servicio),
                 salida_directa = CASE WHEN ? IS NOT NULL THEN ? ELSE salida_directa END,
                 estado_ticket = COALESCE(?, estado_ticket),
                 actualizado_en = CURRENT_TIMESTAMP
             WHERE id_ticket = ?`,
            [
                cliente || null,
                usuario || null,
                direccion || null,
                telefono || null,
                distrito || null,
                marca || null,
                modelo || null,
                serie || null,
                tipo_formato || null,
                id_usuario_asignado !== undefined ? (id_usuario_asignado ? parseInt(id_usuario_asignado) : null) : null,
                id_usuario_asignado !== undefined ? (id_usuario_asignado ? parseInt(id_usuario_asignado) : null) : null,
                fecha_servicio || null,
                fecha_servicio || null,
                hora_servicio || null,
                tipo_servicio || null,
                salida_directa !== undefined ? salida_directa : null,
                salida_directa !== undefined ? salida_directa : null,
                estado_ticket || null,
                ticketId
            ]
        );
        console.log('✅ Edit query succeeded!');

        console.log('Testing assign query...');
        await pool.query(
            `UPDATE ticket 
             SET id_usuario_asignado = NULL, 
                 estado_ticket = 'Pendiente'
             WHERE id_ticket = ?`,
            [ticketId]
        );
        console.log('✅ Unassign query succeeded!');
    } catch (e) {
        console.error('❌ Error caught:', e);
    } finally {
        await pool.end();
    }
}

testEdit();
