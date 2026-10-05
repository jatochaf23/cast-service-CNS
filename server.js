require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./db');
const { generateToken, authMiddleware, requireRoles } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ success: false, message: 'Ingrese correo y contraseña.' });
        }

        const [rows] = await pool.query(
            `SELECT u.id_usuario, u.id_rol, u.nombre, u.correo, u.telefono, u.password, u.estado, r.nombre_rol
             FROM usuarios u
             JOIN roles r ON u.id_rol = r.id_rol
             WHERE LOWER(u.correo) = LOWER(?)`,
            [correo.trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado en la base de datos.' });
        }

        const user = rows[0];

        if (user.estado !== 'Activo') {
            return res.status(403).json({ success: false, message: 'El usuario se encuentra inactivo.' });
        }

        // Validar contraseña (soporta texto plano existente en DB o hash bcrypt)
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (user.password === password);
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }

        const token = generateToken(user);

        // Guardar token en cookie httpOnly opcional para facilitar navegación
        res.cookie('cast_token', token, {
            httpOnly: false, // accesible también por JS si es necesario
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            token,
            user: {
                id_usuario: user.id_usuario,
                id_rol: user.id_rol,
                nombre: user.nombre,
                correo: user.correo,
                telefono: user.telefono,
                nombre_rol: user.nombre_rol
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor al autenticar.' });
    }
});

// Obtener usuario actual autenticado
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id_usuario, u.id_rol, u.nombre, u.correo, u.telefono, u.estado, r.nombre_rol
             FROM usuarios u
             JOIN roles r ON u.id_rol = r.id_rol
             WHERE u.id_usuario = ?`,
            [req.user.id_usuario]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('Error en /me:', err);
        res.status(500).json({ success: false, message: 'Error al obtener sesión.' });
    }
});

// Cerrar sesión
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('cast_token');
    res.json({ success: true, message: 'Sesión cerrada correctamente.' });
});

// Cambiar contraseña de la cuenta del usuario autenticado (Técnico, Dispatcher o Administrador)
app.put('/api/auth/cambiar-password', authMiddleware, async (req, res) => {
    try {
        const { password_actual, password_nuevo } = req.body;
        if (!password_actual || !password_nuevo) {
            return res.status(400).json({ success: false, message: 'Debe ingresar la contraseña actual y la nueva contraseña.' });
        }

        if (password_nuevo.trim().length < 4) {
            return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 4 caracteres.' });
        }

        const [rows] = await pool.query('SELECT id_usuario, password FROM usuarios WHERE id_usuario = ?', [req.user.id_usuario]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const user = rows[0];
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password_actual, user.password);
        } else {
            isMatch = (user.password === password_actual);
        }

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'La contraseña actual ingresada es incorrecta.' });
        }

        await pool.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [password_nuevo.trim(), req.user.id_usuario]);

        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('Error al cambiar contraseña:', err);
        res.status(500).json({ success: false, message: 'Error interno al actualizar la contraseña.' });
    }
});

// ==========================================
// GESTIÓN DE TÉCNICOS Y USUARIOS
// ==========================================

// Listar técnicos disponibles para asignación (Administrador y Dispatcher)
app.get('/api/tecnicos', authMiddleware, requireRoles(1, 2), async (req, res) => {
    try {
        const [tecnicos] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, 
                    (SELECT COUNT(*) FROM ticket t WHERE t.id_usuario_asignado = u.id_usuario AND t.estado_ticket IN ('Pendiente', 'En Proceso')) as tickets_activos
             FROM usuarios u
             WHERE u.id_rol = 3 AND u.estado = 'Activo'
             ORDER BY u.nombre ASC`
        );
        res.json({ success: true, tecnicos });
    } catch (err) {
        console.error('Error al listar técnicos:', err);
        res.status(500).json({ success: false, message: 'Error al cargar lista de técnicos.' });
    }
});

// Listar todos los usuarios (solo Administrador)
app.get('/api/usuarios', authMiddleware, requireRoles(1), async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            `SELECT u.id_usuario, u.id_rol, u.nombre, u.correo, u.telefono, u.estado, u.creado_en, r.nombre_rol
             FROM usuarios u
             JOIN roles r ON u.id_rol = r.id_rol
             ORDER BY u.id_rol ASC, u.nombre ASC`
        );
        res.json({ success: true, usuarios });
    } catch (err) {
        console.error('Error al listar usuarios:', err);
        res.status(500).json({ success: false, message: 'Error al obtener usuarios.' });
    }
});

// Crear usuario (solo Administrador)
app.post('/api/usuarios', authMiddleware, requireRoles(1), async (req, res) => {
    try {
        const { id_rol, nombre, correo, telefono, password } = req.body;
        if (!id_rol || !nombre || !correo || !password) {
            return res.status(400).json({ success: false, message: 'Todos los campos obligatorios deben ser llenados.' });
        }

        const [exists] = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo.trim()]);
        if (exists.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
        }

        await pool.query(
            `INSERT INTO usuarios (id_rol, nombre, correo, telefono, password, estado)
             VALUES (?, ?, ?, ?, ?, 'Activo')`,
            [id_rol, nombre.trim(), correo.trim(), telefono || null, password]
        );

        res.json({ success: true, message: 'Usuario creado exitosamente.' });
    } catch (err) {
        console.error('Error al crear usuario:', err);
        res.status(500).json({ success: false, message: 'Error al registrar usuario.' });
    }
});

// ==========================================
// GESTIÓN DE TICKETS
// ==========================================

// Listar tickets según el rol del usuario:
// - Administrador (1) y Dispatcher (2): Ven todos los tickets
// Logger para monitorear peticiones en vivo
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// - Técnico (3): Únicamente ve los tickets que él tiene asignados
app.get('/api/tickets', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        let query = `
            SELECT t.id_ticket, t.numero_ticket, t.id_usuario_asignado, t.cliente, t.usuario,
                   t.direccion, t.telefono, t.distrito, t.marca, t.modelo, t.serie,
                   t.requerimiento, t.incidencia, t.estado_ticket, t.tipo_formato,
                   t.falla_real, t.actividad_realizada, t.numero_cast, t.fecha_atencion,
                   t.creado_en, t.actualizado_en,
                   u.nombre as nombre_tecnico, u.correo as correo_tecnico
            FROM ticket t
            LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
        `;
        const params = [];

        // Filtro por rol: Técnico solo ve lo asignado a él
        if (user.id_rol === 3) {
            query += ` WHERE t.id_usuario_asignado = ? `;
            params.push(user.id_usuario);
        }

        query += ` ORDER BY t.id_ticket DESC`;

        const [tickets] = await pool.query(query, params);
        res.json({ success: true, tickets });
    } catch (err) {
        console.error('Error al listar tickets:', err);
        res.status(500).json({ success: false, message: 'Error al obtener tickets.' });
    }
});

// Obtener detalle de un ticket específico (por ID o por NÚMERO DE TICKET, ej: TCK-2026-019)
app.get('/api/tickets/:id', authMiddleware, async (req, res) => {
    try {
        const ticketIdOrNumber = req.params.id;

        const [rows] = await pool.query(
            `SELECT t.*, u.nombre as nombre_tecnico, u.correo as correo_tecnico
             FROM ticket t
             LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
             WHERE CAST(t.id_ticket AS TEXT) = ? OR LOWER(TRIM(t.numero_ticket)) = LOWER(TRIM(?))`,
            [ticketIdOrNumber, ticketIdOrNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `Ticket '${ticketIdOrNumber}' no encontrado en la base de datos.` 
            });
        }

        const ticket = rows[0];

        // Un técnico solo puede abrir los tickets que tiene asignados
        if (req.user.id_rol === 3 && ticket.id_usuario_asignado !== req.user.id_usuario) {
            return res.status(403).json({ success: false, message: 'Este ticket no está asignado a su cuenta.' });
        }

        res.json({ success: true, ticket });
    } catch (err) {
        console.error('Error al obtener ticket:', err);
        res.status(500).json({ success: false, message: 'Error al consultar ticket.' });
    }
});

// Asignar ticket directamente por NÚMERO DE TICKET y TÉCNICO (Administrador y Dispatcher)
app.post('/api/tickets/asignar-por-numero', authMiddleware, requireRoles(1, 2), async (req, res) => {
    try {
        const { numero_ticket, id_usuario_asignado, tipo_formato } = req.body;
        if (!numero_ticket || !id_usuario_asignado) {
            return res.status(400).json({ success: false, message: 'Ingrese el número de ticket y seleccione un técnico.' });
        }

        // Buscar técnico
        const [tecnicos] = await pool.query(
            `SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = ? AND id_rol = 3 AND estado = 'Activo'`,
            [id_usuario_asignado]
        );
        if (tecnicos.length === 0) {
            return res.status(400).json({ success: false, message: 'El técnico seleccionado no existe o no está activo.' });
        }
        const tecnico = tecnicos[0];

        // Buscar si el ticket ya existe en la tabla ticket de cast_db
        const [rows] = await pool.query(
            'SELECT * FROM ticket WHERE LOWER(TRIM(numero_ticket)) = LOWER(TRIM(?))',
            [numero_ticket.trim()]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                not_found: true,
                message: `El ticket '${numero_ticket}' no fue encontrado en la tabla 'ticket' de cast_db.`
            });
        }

        const ticket = rows[0];
        const formatoFinal = tipo_formato || ticket.tipo_formato || 'Multimarca';

        // Asignar ticket en MySQL y cambiar automáticamente su estado a 'En Proceso'
        await pool.query(
            `UPDATE ticket 
             SET id_usuario_asignado = ?, 
                 tipo_formato = ?,
                 estado_ticket = 'En Proceso'
             WHERE id_ticket = ?`,
            [id_usuario_asignado, formatoFinal, ticket.id_ticket]
        );

        // Devolver ticket con todas sus columnas leídas de la BD
        const [updatedRows] = await pool.query(
            `SELECT t.*, u.nombre as nombre_tecnico, u.correo as correo_tecnico
             FROM ticket t
             JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
             WHERE t.id_ticket = ?`,
            [ticket.id_ticket]
        );

        console.log(`✅ Ticket ${ticket.numero_ticket} asignado a ${tecnico.nombre} [${formatoFinal} - En Proceso]`);

        res.json({
            success: true,
            message: `Ticket '${ticket.numero_ticket}' asignado a ${tecnico.nombre} en formato ${formatoFinal} (Estado: En Proceso).`,
            ticket: updatedRows[0]
        });
    } catch (err) {
        console.error('Error al asignar por número:', err);
        res.status(500).json({ success: false, message: 'Error interno al asignar ticket.' });
    }
});

// Crear nuevo ticket (Administrador y Dispatcher)
app.post('/api/tickets', authMiddleware, requireRoles(1, 2), async (req, res) => {
    try {
        const {
            numero_ticket,
            id_usuario_asignado,
            cliente,
            usuario,
            direccion,
            telefono,
            distrito,
            marca,
            modelo,
            serie,
            requerimiento,
            incidencia,
            tipo_formato
        } = req.body;

        if (!numero_ticket || !cliente || !usuario) {
            return res.status(400).json({ success: false, message: 'Número de ticket, cliente y usuario son obligatorios.' });
        }

        // Verificar si el número de ticket ya existe
        const [exists] = await pool.query('SELECT id_ticket FROM ticket WHERE numero_ticket = ?', [numero_ticket.trim()]);
        if (exists.length > 0) {
            return res.status(400).json({ success: false, message: `El ticket '${numero_ticket}' ya existe en la base de datos.` });
        }

        // Determinar formato por marca si no se especificó
        let formato = tipo_formato || 'Multimarca';
        if (marca && marca.toLowerCase().includes('lexmark')) {
            formato = 'Lexmark';
        }

        const [result] = await pool.query(
            `INSERT INTO ticket (
                numero_ticket, id_usuario_asignado, cliente, usuario, direccion,
                telefono, distrito, marca, modelo, serie, requerimiento,
                incidencia, estado_ticket, tipo_formato
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)`,
            [
                numero_ticket.trim(),
                id_usuario_asignado ? parseInt(id_usuario_asignado) : null,
                cliente.trim(),
                usuario.trim(),
                direccion || null,
                telefono || null,
                distrito || null,
                marca || null,
                modelo || null,
                serie || null,
                requerimiento || null,
                incidencia || null,
                formato
            ]
        );

        res.json({
            success: true,
            message: 'Ticket creado exitosamente.',
            id_ticket: result.insertId
        });
    } catch (err) {
        console.error('Error al crear ticket:', err);
        res.status(500).json({ success: false, message: 'Error al registrar ticket en la base de datos.' });
    }
});

// Asignar o reasignar ticket a un técnico (Administrador y Dispatcher)
app.put('/api/tickets/:id/asignar', authMiddleware, requireRoles(1, 2), async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { id_usuario_asignado, tipo_formato } = req.body;

        if (!id_usuario_asignado) {
            return res.status(400).json({ success: false, message: 'Seleccione un técnico válido.' });
        }

        // Verificar que el usuario asignado sea técnico activo
        const [tecnico] = await pool.query(
            `SELECT id_usuario, nombre FROM usuarios WHERE id_usuario = ? AND id_rol = 3 AND estado = 'Activo'`,
            [id_usuario_asignado]
        );
        if (tecnico.length === 0) {
            return res.status(400).json({ success: false, message: 'El técnico seleccionado no existe o no está activo.' });
        }

        // Asignar y cambiar automáticamente a 'En Proceso'
        await pool.query(
            `UPDATE ticket 
             SET id_usuario_asignado = ?, 
                 tipo_formato = COALESCE(?, tipo_formato),
                 estado_ticket = 'En Proceso'
             WHERE id_ticket = ?`,
            [id_usuario_asignado, tipo_formato || null, ticketId]
        );

        res.json({
            success: true,
            message: `Ticket asignado a ${tecnico[0].nombre} (Estado: En Proceso).`
        });
    } catch (err) {
        console.error('Error al asignar ticket:', err);
        res.status(500).json({ success: false, message: 'Error al asignar el ticket.' });
    }
});

// Cambiar tipo de formato de un ticket (Multimarca / Lexmark)
app.put('/api/tickets/:id/formato', authMiddleware, requireRoles(1, 2), async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { tipo_formato } = req.body;
        if (!tipo_formato) {
            return res.status(400).json({ success: false, message: 'Seleccione un formato válido.' });
        }
        await pool.query('UPDATE ticket SET tipo_formato = ? WHERE id_ticket = ?', [tipo_formato, ticketId]);
        res.json({ success: true, message: `Formato de ticket actualizado a ${tipo_formato}.` });
    } catch (err) {
        console.error('Error al cambiar formato:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar formato del ticket.' });
    }
});

// Completar o actualizar atención del CAST: se marca en 'Atendido' automáticamente al guardar o imprimir
app.put('/api/tickets/:id/completar', async (req, res) => {
    try {
        const ticketIdOrNumber = req.params.id;
        const {
            numero_cast,
            falla_real,
            actividad_realizada,
            estado_ticket
        } = req.body;

        const [rows] = await pool.query(
            'SELECT * FROM ticket WHERE CAST(id_ticket AS TEXT) = ? OR LOWER(TRIM(numero_ticket)) = LOWER(TRIM(?))',
            [ticketIdOrNumber, ticketIdOrNumber]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        }

        const ticket = rows[0];
        const nuevoEstado = estado_ticket || 'Atendido';

        await pool.query(
            `UPDATE ticket 
             SET numero_cast = COALESCE(?, numero_cast),
                 falla_real = COALESCE(?, falla_real),
                 actividad_realizada = COALESCE(?, actividad_realizada),
                 estado_ticket = ?,
                 fecha_atencion = NOW()
             WHERE id_ticket = ?`,
            [numero_cast || null, falla_real || null, actividad_realizada || null, nuevoEstado, ticket.id_ticket]
        );

        console.log(`✅ Ticket ${ticket.numero_ticket} actualizado a estado '${nuevoEstado}' (CAST: ${numero_cast || 'Emitido'})`);

        res.json({
            success: true,
            message: `Ticket '${ticket.numero_ticket}' guardado exitosamente (Estado: ${nuevoEstado}).`,
            estado_ticket: nuevoEstado
        });
    } catch (err) {
        console.error('Error al completar ticket:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar el ticket.' });
    }
});

// Inicializar base de datos y arrancar servidor localmente
if (!process.env.VERCEL) {
    initDB().then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor CAST Service corriendo en:`);
            console.log(`   👉 Local:   http://localhost:${PORT}`);
            console.log(`   👉 Red LAN: http://172.20.10.2:${PORT}`);
        });
    }).catch(err => {
        console.error('Error crítico al iniciar:', err);
    });
} else {
    initDB();
}

module.exports = app;
