// cast_integration.js - Integración de Base de Datos y Autorelleno para CAST Multimarca y Lexmark

(function () {
    const API_BASE = (window.location.origin && window.location.origin.startsWith('http')) ? '' : 'http://localhost:3000';
    let currentTicket = null;
    let currentUser = null;

    // Estilos para la barra superior de integración
    const style = document.createElement('style');
    style.innerHTML = `
        .cast-db-bar {
            background: linear-gradient(135deg, #0b1a30, #132a4d);
            color: #ffffff;
            padding: 10px 16px;
            border-radius: 12px;
            border: 1px solid #1b355c;
            margin-bottom: 14px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(11, 26, 48, 0.25);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
        }
        .cast-db-bar a, .cast-db-bar button {
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-db-back {
            background-color: rgba(255, 255, 255, 0.12);
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
        .btn-db-back:hover {
            background-color: rgba(255, 255, 255, 0.22);
        }
        .btn-db-save {
            background-color: #1e3a8a;
            color: #ffffff;
            border: 1px solid #2d52a8;
        }
        .btn-db-save:hover {
            background-color: #172554;
        }
        .btn-db-load {
            background-color: #162e54;
            color: #ffffff;
            border: 1px solid #23487f;
        }
        .btn-db-load:hover {
            background-color: #0f2240;
        }
        .db-badge-info {
            background: #162e54;
            color: #bfdbfe;
            border: 1px solid #23487f;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 700;
            font-family: monospace;
        }
        .db-sync-notice {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            color: #1e3a8a;
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 12px;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .db-search-input {
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid #1b355c;
            background: #060f1c;
            color: #fff;
            font-size: 12px;
            width: 170px;
        }
        .db-search-input:focus {
            outline: 2px solid #1e3a8a;
        }
        @media screen and (max-width: 640px) {
            .cast-db-bar {
                flex-direction: column;
                align-items: stretch;
                padding: 10px 12px;
                gap: 8px;
            }
            .cast-db-bar > div {
                width: 100%;
                justify-content: space-between;
            }
            .db-search-input {
                flex: 1 1 120px;
                min-width: 0;
            }
            .btn-db-load, .btn-db-save, .btn-db-back {
                padding: 8px 10px;
                font-size: 11px;
                justify-content: center;
            }
            .db-sync-notice {
                font-size: 11px;
                padding: 6px 10px;
            }
        }
        @media print {
            .cast-db-bar, .db-sync-notice {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', async () => {
        const token = localStorage.getItem('cast_token');
        if (token) {
            try {
                const resMe = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resMe.ok) {
                    const dataMe = await resMe.json();
                    currentUser = dataMe.user;
                }
            } catch (e) {
                console.warn('Error al verificar sesión:', e);
            }
        }

        renderGlobalHeaderBar();

        // Obtener ticket_id de los parámetros de la URL
        const params = new URLSearchParams(window.location.search);
        const ticketId = params.get('ticket_id') || params.get('ticket');

        if (ticketId) {
            await loadAndAutoFillTicket(ticketId);
        }
    });

    function renderGlobalHeaderBar() {
        const formContainer = document.querySelector('.form-container');
        if (!formContainer) return;

        if (!currentUser) {
            try {
                const storedUser = localStorage.getItem('cast_user');
                if (storedUser) currentUser = JSON.parse(storedUser);
            } catch (e) {}
        }

        const bar = document.createElement('div');
        bar.className = 'cast-db-bar';
        bar.id = 'cast-header-db-bar';

        const returnLabel = currentUser && currentUser.id_rol === 3 ? 'Mis Tickets' : 'Volver al Panel';

        bar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <a href="index.html" class="btn-db-back" title="Volver al panel principal">
                    <svg style="width: 14px; height: 14px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    <span>${returnLabel}</span>
                </a>
                <span id="bar-ticket-status" style="display: none; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span>Ticket: <strong class="db-badge-info" id="bar-ticket-num"></strong></span>
                    <span style="color: #475569;">|</span>
                    <span>Cliente: <strong id="bar-ticket-cliente" style="color: #f1f5f9;"></strong></span>
                    <span style="color: #475569;">|</span>
                    <span>Estado: <span id="bar-ticket-estado" style="font-weight: 700; color: #93c5fd;">En Proceso</span></span>
                </span>
            </div>
            <div id="bar-right-sync" style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #10b981;"></span>
                <span>Base de Datos Sincronizada</span>
            </div>
        `;

        formContainer.parentNode.insertBefore(bar, formContainer);
    }

    async function loadAndAutoFillTicket(ticketIdOrNumber) {
        const token = localStorage.getItem('cast_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        try {
            const res = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(ticketIdOrNumber)}`, {
                headers
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`⚠️ ${err.message || 'No se encontró el ticket en la base de datos cast_db.'}`);
                return;
            }

            const data = await res.json();
            currentTicket = data.ticket;

            if (currentTicket) {
                updateTopBar(currentTicket);
                populateFields(currentTicket);
                showSyncNotice(currentTicket);
            }
        } catch (err) {
            console.error('Error al cargar ticket de la BD:', err);
            alert('Error de conexión al consultar la base de datos.');
        }
    }

    function updateTopBar(ticket) {
        const statusSpan = document.getElementById('bar-ticket-status');
        if (statusSpan) statusSpan.style.display = 'inline-flex';
        const numEl = document.getElementById('bar-ticket-num');
        if (numEl) numEl.textContent = ticket.numero_ticket;
        const clientEl = document.getElementById('bar-ticket-cliente');
        if (clientEl) clientEl.textContent = ticket.cliente;
        const estadoEl = document.getElementById('bar-ticket-estado');
        if (estadoEl) {
            estadoEl.textContent = ticket.estado_ticket || 'En Proceso';
            estadoEl.style.color = ticket.estado_ticket === 'Atendido' ? '#34d399' : '#93c5fd';
        }
    }

    function showSyncNotice(ticket) {
        let existingNotice = document.getElementById('db-sync-notice');
        if (!existingNotice) {
            existingNotice = document.createElement('div');
            existingNotice.id = 'db-sync-notice';
            existingNotice.className = 'db-sync-notice';
            const formContainer = document.querySelector('.form-container');
            formContainer.parentNode.insertBefore(existingNotice, formContainer);
        }
        existingNotice.innerHTML = `
            <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Campos leídos y rellenados automáticamente desde <strong>cast_db</strong> para el ticket <strong>${ticket.numero_ticket}</strong> (${ticket.cliente}).</span>
        `;
    }

    function populateFields(ticket) {
        // 1. Cliente
        setInputValue('cliente', ticket.cliente);

        // 2. ID_ticket / Número de ticket
        setInputValue('ticket-number', ticket.numero_ticket);

        // 3. Usuario (contacto general en cabecera)
        setInputValue('usuario', ticket.usuario);
        // NOTA: El campo 'usuario-nombre' de la firma permanece vacío para ser completado por el técnico en sitio.

        // 4. Dirección
        setInputValue('direccion', ticket.direccion);

        // 5. Teléfono
        setInputValue('telefono', ticket.telefono);
        if (ticket.telefono && document.getElementById('celular')) {
            if (ticket.telefono.trim().startsWith('9')) {
                setInputValue('celular', ticket.telefono);
            }
        }

        // 6. Distrito
        setInputValue('distrito', ticket.distrito);

        // 7. Marca
        setInputValue('marca', ticket.marca);

        // 8. Modelo
        setInputValue('modelo', ticket.modelo);

        // 9. Serie
        setInputValue('serie', ticket.serie);

        // Marcar tipo de equipo si coincide
        if (ticket.marca || ticket.modelo) {
            const lowerMarca = (ticket.marca || '').toLowerCase();
            const lowerModelo = (ticket.modelo || '').toLowerCase();
            if (lowerMarca.includes('lexmark') || lowerModelo.includes('impresora') || lowerModelo.includes('ms') || lowerModelo.includes('mx')) {
                setCheckbox('equipo', 'impresora', true);
            }
        }

        // 10. Requerimiento (marca la casilla)
        if (ticket.requerimiento) {
            setCheckbox('tipo_servicio', 'requerimiento', true);
        }

        // 11. Incidencia (marca la casilla)
        if (ticket.incidencia) {
            setCheckbox('tipo_servicio', 'incidencia', true);
        }

        // NOTA: 'falla-usuario' (Falla reportada) se deja en blanco para ser redactada por el técnico en sitio.

        // Nombre de técnico responsable
        if (ticket.nombre_tecnico) {
            setInputValue('rep-tecnico-nombre', ticket.nombre_tecnico);
        } else if (currentUser && currentUser.id_rol === 3) {
            setInputValue('rep-tecnico-nombre', currentUser.nombre);
        }

        // Si ya tenía datos guardados previamente
        if (ticket.falla_real) {
            setInputValue('falla-real', ticket.falla_real);
        }
        if (ticket.actividad_realizada) {
            setInputValue('actividad-realizada', ticket.actividad_realizada);
        }
        if (ticket.numero_cast) {
            setInputValue('correlativo-input', ticket.numero_cast);
            const disp = document.getElementById('correlativo-display');
            if (disp) {
                disp.textContent = `N°: ${String(ticket.numero_cast).padStart(7, '0')}`;
            }
        }
    }

    function setInputValue(id, val) {
        if (!val) return;
        const el = document.getElementById(id);
        if (el) {
            el.value = val;
        }
    }

    function setCheckbox(name, value, isChecked) {
        const cb = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (cb) {
            cb.checked = isChecked;
        }
    }

    async function saveTicketAttention(silent = false) {
        const ticketTarget = currentTicket ? currentTicket.id_ticket : (document.getElementById('ticket-number')?.value.trim() || document.getElementById('manual-ticket-search')?.value.trim());
        if (!ticketTarget) {
            if (!silent) alert('No se ha especificado ningún número de ticket para guardar.');
            return;
        }

        const token = localStorage.getItem('cast_token');
        const btn = document.getElementById('btn-save-db');

        const correlativoInput = document.getElementById('correlativo-input');
        const correlativoDisplay = document.getElementById('correlativo-display');
        let castNum = correlativoInput ? correlativoInput.value : '';
        if (!castNum && correlativoDisplay) {
            castNum = correlativoDisplay.textContent.replace(/[^0-9]/g, '');
        }

        const fallaReal = document.getElementById('falla-real') ? document.getElementById('falla-real').value : '';
        const actividad = document.getElementById('actividad-realizada') ? document.getElementById('actividad-realizada').value : '';

        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Guardando...';
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(ticketTarget)}/completar`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    numero_cast: castNum,
                    falla_real: fallaReal,
                    actividad_realizada: actividad,
                    estado_ticket: 'Atendido'
                })
            });

            const data = await res.json();
            if (data.success) {
                if (btn) {
                    btn.textContent = '✅ Guardado (Atendido)';
                    btn.style.backgroundColor = '#059669';
                    btn.disabled = false;
                }
                const statusSpan = document.getElementById('bar-ticket-status');
                if (statusSpan) {
                    const ticketNum = data.ticket?.numero_ticket || currentTicket?.numero_ticket || ticketTarget;
                    const ticketCli = data.ticket?.cliente || currentTicket?.cliente || '';
                    statusSpan.innerHTML = `
                        <span>Ticket: <strong class="db-badge-info">${ticketNum}</strong></span>
                        <span style="color: #475569;">|</span>
                        <span>Cliente: <strong style="color: #f1f5f9;">${ticketCli}</strong></span>
                        <span style="color: #475569;">|</span>
                        <span>Estado: <strong style="color: #34d399;">Atendido</strong></span>
                    `;
                }
                if (!silent) {
                    alert('✅ ' + data.message);
                }
                console.log(`✅ Ticket ${ticketTarget} marcado automáticamente como Atendido.`);
            } else {
                if (btn) {
                    btn.textContent = '💾 Guardar en BD';
                    btn.disabled = false;
                }
                if (!silent) alert('❌ ' + (data.message || 'Error al guardar'));
            }
        } catch (err) {
            console.error(err);
            if (btn) {
                btn.textContent = '💾 Guardar en BD';
                btn.disabled = false;
            }
            if (!silent) alert('❌ Error de conexión al guardar atención.');
        }
    }

    // Interceptar generación de PDF e impresión para marcar automáticamente como Atendido en MySQL
    function setupPrintAndPdfInterceptors() {
        // Interceptar formulario (botón Generar y Descargar PDF)
        const form = document.getElementById('tech-service-form');
        if (form) {
            form.addEventListener('submit', () => {
                console.log('⚡ Generando PDF: Marcando ticket como Atendido en base de datos...');
                saveTicketAttention(true);
            });
        }

        // Interceptar botones de impresión
        const printButtons = document.querySelectorAll('.print-button, button[onclick*="print"]');
        printButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('⚡ Imprimiendo constancia: Marcando ticket como Atendido en base de datos...');
                saveTicketAttention(true);
            });
        });

        // Interceptar evento de impresión del navegador (Ctrl + P)
        window.addEventListener('beforeprint', () => {
            console.log('⚡ Evento de impresión detectado: Marcando ticket como Atendido en base de datos...');
            saveTicketAttention(true);
        });
    }

    // Inicializar interceptores al cargar
    setTimeout(setupPrintAndPdfInterceptors, 600);

    window.saveTicketAttention = saveTicketAttention;
    window.loadAndAutoFillTicket = loadAndAutoFillTicket;
})();
