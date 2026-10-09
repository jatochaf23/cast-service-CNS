const { pool } = require('../db');

async function testImport() {
    try {
        console.log('Testing import query...');
        const testTicket = {
            numero_ticket: 'TEST-EXCEL-001',
            cliente: 'CLIENTE PRUEBA EXCEL SAC',
            usuario: 'Carlos Test',
            distrito: 'MIRAFLORES',
            direccion: 'Av. Larco 123',
            marca: 'Lexmark',
            modelo: 'MX622',
            serie: 'SN-TEST-999',
            tipo_servicio: 'mantenimiento',
            fecha_servicio: '2026-10-15',
            hora_servicio: '10:00',
            salida_directa: true,
            tipo_formato: 'Lexmark'
        };

        // Insertar prueba
        const [insertRes] = await pool.query(
            `INSERT INTO ticket (
                numero_ticket, cliente, usuario, direccion, distrito, marca, modelo,
                serie, estado_ticket, tipo_formato, fecha_servicio, hora_servicio,
                tipo_servicio, salida_directa
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?::date, ?, ?, ?) RETURNING id_ticket`,
            [
                testTicket.numero_ticket,
                testTicket.cliente,
                testTicket.usuario,
                testTicket.direccion,
                testTicket.distrito,
                testTicket.marca,
                testTicket.modelo,
                testTicket.serie,
                testTicket.tipo_formato,
                testTicket.fecha_servicio,
                testTicket.hora_servicio,
                testTicket.tipo_servicio,
                testTicket.salida_directa
            ]
        );
        console.log('✅ Ticket inserted with id:', insertRes[0].id_ticket);

        // Limpiar ticket de prueba
        await pool.query('DELETE FROM ticket WHERE numero_ticket = ?', [testTicket.numero_ticket]);
        console.log('✅ Test ticket cleaned up successfully.');
    } catch (e) {
        console.error('❌ Error during test:', e);
    } finally {
        await pool.end();
    }
}

testImport();
