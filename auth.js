const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cast_secret_key_cns_2026_@!';

function generateToken(user) {
    return jwt.sign(
        {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            correo: user.correo,
            id_rol: user.id_rol,
            nombre_rol: user.nombre_rol
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.cast_token) {
        token = req.cookies.cast_token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'No autenticado. Por favor inicie sesión.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ success: false, message: 'Sesión expirada o token inválido.' });
    }

    req.user = decoded;
    next();
}

function requireRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'No autenticado.' });
        }
        // allowedRoles can be role IDs (1, 2) or names ('Administrador', 'Dispatcher')
        const userRoleId = req.user.id_rol;
        const userRoleName = req.user.nombre_rol;

        const hasRole = allowedRoles.some(role => role === userRoleId || role === userRoleName);
        if (!hasRole) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado: No tiene permisos suficientes para realizar esta acción.'
            });
        }
        next();
    };
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    requireRoles,
    JWT_SECRET
};
