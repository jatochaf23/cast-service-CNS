# Sistema de Constancias de Atención Servicio Técnico (CAST)

Repositorio independiente y autónomo para la emisión, firma y generación de Constancias de Atención de Servicio Técnico (**CAST Multimarca** y **CAST Lexmark**).

---

## 📋 Contenido del Repositorio

- **`index.html`**: Portal principal de bienvenida para seleccionar entre el formato Multimarca y Lexmark.
- **`cast_multimarca.html`**: Formato técnico de constancia para computadoras, laptops, servidores y equipos en general.
- **`cast_lexmark.html`**: Formato técnico oficial de constancia especializado en impresoras y multifuncionales Lexmark.
- **`logo.jpg` / `cns_logo.svg` / `logo.png`**: Logotipos y membretes institucionales.
- **`cast_lexmark_logo.jpg`**: Membrete / cabecera oficial de Lexmark.

---

## 🚀 Características Principales

1. **100% Autónomo (Client-Side)**: No requiere base de datos ni servidor backend. Funciona directamente en cualquier navegador abriendo los archivos HTML o a través de **GitHub Pages**.
2. **Firmas Digitales en Pantalla**: Permite que tanto el técnico responsable como el usuario/cliente firmen con el mouse o en pantallas táctiles (teléfonos móviles, tablets).
3. **Descarga en PDF (A4)**: Conversión y renderizado directo a documento PDF de alta fidelidad con tamaño estándar A4 usando `html2canvas` y `jsPDF`.
4. **Control de Correlativo Inteligente**: El número correlativo se almacena en el `localStorage` del navegador y permite edición con un solo clic.
5. **Listo para Impresión**: Estilos CSS `@media print` optimizados para imprimir directamente si se requiere soporte físico.

---

## 🛠️ Cómo Subir este Proyecto a GitHub

Abre una terminal (PowerShell o Git Bash) dentro de esta carpeta y ejecuta los siguientes comandos:

```bash
# 1. Inicializar el repositorio Git
git init

# 2. Agregar todos los archivos
git add .

# 3. Crear el primer commit
git commit -m "Initial commit - Sistema CAST (Multimarca y Lexmark)"

# 4. Establecer la rama principal como 'main'
git branch -M main

# 5. Vincular a tu repositorio remoto de GitHub (reemplaza con tu URL de GitHub)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 6. Subir los archivos a GitHub
git push -u origin main
```

---

## 🌐 Publicar en GitHub Pages (Gratis)

Una vez subido a GitHub:
1. Ve a tu repositorio en GitHub y haz clic en la pestaña **Settings** (Configuración).
2. En el menú lateral izquierdo, ve a **Pages**.
3. En **Branch**, selecciona `main` y la carpeta `/(root)`.
4. Haz clic en **Save**.
5. ¡Listo! En unos segundos tendrás una URL pública (ejemplo: `https://tu-usuario.github.io/tu-repositorio/`) para acceder al sistema desde cualquier computadora, tablet o smartphone.
