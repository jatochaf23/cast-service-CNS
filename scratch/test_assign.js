const { pool } = require('../db');

async function testAssign() {
    try {
        console.log('Testing assign with string ticketId "11" and string tecnicoId "3"...');
        const [tecnicos] = await pool.query("SELECT id_usuario, nombre, id_rol, estado FROM usuarios WHERE id_rol = 3");
        console.log('Tecnicos in DB:', tecnicos);

        if (tecnicos.length > 0) {
            const tecId = tecnicos[0].id_usuario.toString();
            const [res1] = await pool.query(
                `SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = ? AND id_rol = 3 AND estado = 'Activo'`,
                [tecId]
            );
            console.log('Query tecnico result:', res1);

            const [res2] = await pool.query(
                `UPDATE ticket 
                 SET id_usuario_asignado = ?, 
                     estado_ticket = 'En Proceso'
                 WHERE id_ticket = ?`,
                [parseInt(tecId), "11"]
            );
            console.log('Update ticket assign result:', res2);

            const [res3] = await pool.query(
                `UPDATE ticket 
                 SET id_usuario_asignado = NULL, 
                     estado_ticket = 'Pendiente'
                 WHERE id_ticket = ?`,
                ["11"]
            );
            console.log('Update ticket unassign result:', res3);
        }
    } catch (e) {
        console.error('❌ Error in testAssign:', e);
    } finally {
        await pool.end();
    }
}

testAssign();
