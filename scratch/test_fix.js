const { pool } = require('../db');

async function testFix() {
    try {
        console.log('Testing dynamic update on ticket 11...');
        const ticketId = 11;
        const body = {
            tipo_servicio: 'requerimiento',
            tipo_formato: 'Lexmark',
            fecha_servicio: '2026-10-12',
            hora_servicio: '11:00',
            salida_directa: true,
            id_usuario_asignado: null,
            distrito: 'PUNTA NEGRA',
            estado_ticket: 'Pendiente'
        };

        const updates = [];
        const params = [];

        if (body.tipo_formato !== undefined) {
            updates.push(`tipo_formato = ?`);
            params.push(body.tipo_formato ? body.tipo_formato.trim() : 'Multimarca');
        }
        if (body.tipo_servicio !== undefined) {
            updates.push(`tipo_servicio = ?`);
            params.push(body.tipo_servicio ? body.tipo_servicio.trim() : 'incidencia');
        }
        if (body.fecha_servicio !== undefined) {
            updates.push(`fecha_servicio = ?::date`);
            params.push(body.fecha_servicio ? body.fecha_servicio.trim() : null);
        }
        if (body.hora_servicio !== undefined) {
            updates.push(`hora_servicio = ?`);
            params.push(body.hora_servicio ? body.hora_servicio.trim().slice(0, 5) : '09:00');
        }
        if (body.salida_directa !== undefined) {
            const isDirecta = body.salida_directa === true || body.salida_directa === 'true' || body.salida_directa === 'SI' || body.salida_directa === 1;
            updates.push(`salida_directa = ?`);
            params.push(isDirecta);
        }
        if (body.id_usuario_asignado !== undefined) {
            const tecId = body.id_usuario_asignado ? parseInt(body.id_usuario_asignado) : null;
            updates.push(`id_usuario_asignado = ?`);
            params.push(tecId);
        }
        if (body.distrito !== undefined) {
            updates.push(`distrito = ?`);
            params.push(body.distrito ? body.distrito.trim() : null);
        }
        if (body.estado_ticket !== undefined) {
            updates.push(`estado_ticket = ?`);
            params.push(body.estado_ticket ? body.estado_ticket.trim() : 'Pendiente');
        }

        updates.push(`actualizado_en = CURRENT_TIMESTAMP`);
        params.push(ticketId);

        const sql = `UPDATE ticket SET ${updates.join(', ')} WHERE id_ticket = ?`;
        console.log('Executing SQL:', sql, 'Params:', params);
        await pool.query(sql, params);
        console.log('✅ Dynamic UPDATE executed successfully!');

        // Check updated ticket
        const [rows] = await pool.query('SELECT id_ticket, tipo_servicio, id_usuario_asignado, estado_ticket, fecha_servicio FROM ticket WHERE id_ticket = ?', [ticketId]);
        console.log('Updated ticket in DB:', rows[0]);

    } catch (e) {
        console.error('❌ Error caught:', e);
    } finally {
        await pool.end();
    }
}

testFix();
