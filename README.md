# Sistema CAST (Constancia de Atención Servicio Técnico) - CNS

Plataforma web para la gestión, asignación y emisión de Constancias de Atención de Servicio Técnico (**CAST Multimarca** y **CAST Lexmark**) con backend en **Node.js + Express** y base de datos relacional **MySQL / TiDB**.

---

## 🚀 Características

- **Autenticación con Roles (JWT)**:
  - **Administrador**: Gestión de tickets y control de usuarios/personal.
  - **Dispatcher**: Creación y asignación directa de tickets a técnicos.
  - **Técnicos**: Visualización de tickets asignados y emisión de constancias con firma digital.
- **Formatos Técnicos Oficiales**:
  - **CAST Multimarca**: Laptops, desktops, servidores y periféricos.
  - **CAST Lexmark**: Impresoras y multifuncionales especializadas.
- **Firma Digital & PDF**: Captura táctil/mouse de firmas y generación de PDF A4 en alta fidelidad.
- **Preparado para la nube**: Compatible con **TiDB Serverless**, **Vercel**, **Railway** y servidores locales.

---

## 🛠️ Tecnologías

- **Backend**: Node.js, Express, MySQL2, JWT (jsonwebtoken), bcryptjs, CORS, cookie-parser.
- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+), Signature Pad, jsPDF, html2canvas.
- **Base de Datos**: MySQL / TiDB.

---

## ⚙️ Instalación y Uso Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/malsteen23-netizen/cast-service.git
   cd cast-service
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env` y configura tus credenciales de base de datos:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=cast_db
   JWT_SECRET=tu_clave_secreta_jwt
   ```

4. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   Accede en el navegador a: `http://localhost:3000`

---

## 📋 Estructura del Proyecto

```text
cast-service/
├── auth.js               # Middleware de autenticación y verificación de roles JWT
├── db.js                 # Pool de conexiones MySQL / TiDB e inicialización
├── server.js             # API REST (rutas de autenticación, usuarios y tickets)
├── public/               # Frontend estático (vistas, scripts y assets)
│   ├── index.html        # Portal principal y paneles según rol
│   ├── login.html        # Inicio de sesión con accesos rápidos
│   ├── cast_multimarca.html # Formato CAST Multimarca
│   ├── cast_lexmark.html    # Formato CAST Lexmark
│   └── cast_integration.js  # Lógica de carga y guardado de atenciones CAST
├── package.json
└── README.md
```
