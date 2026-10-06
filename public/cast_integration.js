// cast_integration.js - Integración de Base de Datos, Autorelleno y Guardado de Borradores para CAST Multimarca y Lexmark

(function () {
    const API_BASE = (window.location.origin && window.location.origin.startsWith('http')) ? '' : 'http://localhost:3000';
    let currentTicket = null;
    let currentUser = null;
    let autoSaveTimer = null;
    let isRestoringDraft = false;

    // Estilos para la barra superior de integración y el banner de borrador
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
        .btn-db-draft {
            background-color: #d97706;
            color: #ffffff;
            border: 1px solid #f59e0b;
        }
        .btn-db-draft:hover {
            background-color: #b45309;
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
        .db-draft-notice {
            background: linear-gradient(135deg, #fffbeb, #fef3c7);
            border: 1px solid #fcd34d;
            color: #92400e;
            padding: 9px 14px;
            border-radius: 8px;
            margin-bottom: 12px;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            box-shadow: 0 2px 6px rgba(217, 119, 6, 0.1);
        }
        .db-draft-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn-db-discard {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
            padding: 4px 9px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-db-discard:hover {
            background: #fecaca;
        }
        .draft-chip-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            color: #cbd5e1;
            background: rgba(255, 255, 255, 0.08);
            padding: 4px 8px;
            border-radius: 6px;
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
            .btn-db-draft, .btn-db-back {
                padding: 8px 10px;
                font-size: 11px;
                justify-content: center;
            }
            .db-draft-notice, .db-sync-notice {
                font-size: 11px;
                padding: 6px 10px;
            }
        }
        @media print {
            .cast-db-bar, .db-sync-notice, .db-draft-notice {
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

        // Restaurar borrador previo si existe (para este ticket o genérico)
        restoreDraft();

        // Activar autoguardado en background al tipear o cambiar valores
        setupAutoSave();
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
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span id="draft-status-indicator" class="draft-chip-status" title="Guardado automático local activo">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #10b981;"></span>
                    <span id="draft-status-text">Borrador al día</span>
                </span>
                <button type="button" id="btn-save-draft" class="btn-db-draft" title="Guardar borrador para continuar luego sin cerrar la atención">
                    <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    <span>💾 Guardar Borrador</span>
                </button>
            </div>
        `;

        formContainer.parentNode.insertBefore(bar, formContainer);

        // Event listener para el botón de Guardar Borrador
        const draftBtn = bar.querySelector('#btn-save-draft');
        if (draftBtn) {
            draftBtn.addEventListener('click', () => {
                saveDraft(true);
            });
        }
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
            <span>Campos del ticket <strong>${ticket.numero_ticket}</strong> cargados desde <strong>cast_db</strong> (${ticket.cliente}).</span>
        `;
    }

    function populateFields(ticket) {
        // 1. Cliente
        setInputValue('cliente', ticket.cliente);

        // 2. ID_ticket / Número de ticket
        setInputValue('ticket-number', ticket.numero_ticket);

        // 3. Usuario (contacto general en cabecera)
        setInputValue('usuario', ticket.usuario);

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

        // Nombre de técnico responsable
        if (ticket.nombre_tecnico) {
            setInputValue('rep-tecnico-nombre', ticket.nombre_tecnico);
        } else if (currentUser && currentUser.id_rol === 3) {
            setInputValue('rep-tecnico-nombre', currentUser.nombre);
        }

        // Si ya tenía datos guardados previamente en BD
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

    // ==========================================
    // SISTEMA DE GESTIÓN DE BORRADORES TEMPORALES
    // ==========================================

    function getDraftStorageKey() {
        const ticketNum = currentTicket?.numero_ticket || document.getElementById('ticket-number')?.value.trim();
        const pageType = window.location.pathname.includes('lexmark') ? 'lexmark' : 'multimarca';
        if (ticketNum) {
            return `cast_draft_${pageType}_ticket_${ticketNum}`;
        }
        return `cast_draft_${pageType}_generic`;
    }

    function collectFormData() {
        const form = document.getElementById('tech-service-form');
        if (!form) return null;

        const data = {
            timestamp: new Date().toISOString(),
            ticketNum: currentTicket?.numero_ticket || document.getElementById('ticket-number')?.value.trim() || '',
            inputs: {},
            checkboxes: {},
            radios: {},
            signatures: {}
        };

        // Recopilar inputs de texto, email, date, time, textarea, select
        form.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select').forEach(el => {
            if (el.id || el.name) {
                const key = el.id || el.name;
                data.inputs[key] = el.value;
            }
        });

        // Recopilar checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(el => {
            const key = el.id || `${el.name}_${el.value}`;
            data.checkboxes[key] = el.checked;
        });

        // Recopilar radios
        form.querySelectorAll('input[type="radio"]:checked').forEach(el => {
            data.radios[el.name] = el.value;
        });

        // Recopilar firmas en base64 de las imágenes de preview
        const sigRepImg = document.getElementById('sig-repc-img');
        if (sigRepImg && sigRepImg.src && sigRepImg.src.startsWith('data:image')) {
            data.signatures['sig-repc-img'] = sigRepImg.src;
        }

        const sigUserImg = document.getElementById('sig-user-img');
        if (sigUserImg && sigUserImg.src && sigUserImg.src.startsWith('data:image')) {
            data.signatures['sig-user-img'] = sigUserImg.src;
        }

        // Correlativo actual
        const disp = document.getElementById('correlativo-display');
        if (disp) {
            data.correlativoDisplay = disp.textContent;
        }

        return data;
    }

    function saveDraft(manual = false) {
        if (isRestoringDraft) return;

        const data = collectFormData();
        if (!data) return;

        // Validar si hay contenido para no guardar formularios vacíos
        const hasContent = Object.values(data.inputs).some(v => v && v.trim && v.trim().length > 0) ||
                           Object.values(data.checkboxes).some(v => v === true) ||
                           Object.keys(data.signatures).length > 0;

        if (!hasContent) return;

        const key = getDraftStorageKey();
        localStorage.setItem(key, JSON.stringify(data));

        // Actualizar indicador en la barra
        const statusText = document.getElementById('draft-status-text');
        if (statusText) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            statusText.textContent = `Borrador guardado (${timeStr})`;
        }

        // Si es guardado manual: también enviar a BD con estado "En Proceso"
        if (manual) {
            const btn = document.getElementById('btn-save-draft');
            if (btn) {
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = `<span>⏳ Guardando...</span>`;

                saveTicketAttention(true, 'En Proceso').then(savedInDb => {
                    btn.disabled = false;
                    btn.innerHTML = `<span>✅ ¡Borrador Guardado!</span>`;
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                    }, 2500);

                    showDraftSaveToast(savedInDb);
                }).catch(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                });
            }
        }
    }

    function showDraftSaveToast(savedInDb) {
        let toast = document.getElementById('draft-save-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'draft-save-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #1e293b;
                color: #f8fafc;
                border: 1px solid #334155;
                padding: 12px 18px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <span style="font-size: 16px;">💾</span>
            <div>
                <strong>Borrador temporal guardado exitosamente.</strong>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                    ${savedInDb ? 'Datos parciales sincronizados en la base de datos (Estado: En Proceso).' : 'Guardado de forma segura en este navegador.'}
                    Puedes cerrar la ventana y continuar luego.
                </div>
            </div>
        `;
        toast.style.opacity = '1';
        toast.style.display = 'flex';

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 4000);
    }

    function restoreDraft() {
        const key = getDraftStorageKey();
        const raw = localStorage.getItem(key);
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            if (!data || !data.inputs) return;

            isRestoringDraft = true;

            // Restaurar inputs
            Object.entries(data.inputs).forEach(([idOrName, val]) => {
                if (!val) return;
                const el = document.getElementById(idOrName) || document.querySelector(`[name="${idOrName}"]`);
                if (el && !el.value) {
                    el.value = val;
                } else if (el && el.value !== val) {
                    // Si ya tenía dato precargado de BD, solo sobreescribir si el borrador tiene algo redactado por el técnico
                    if (['falla-real', 'actividad-realizada', 'falla-usuario', 'falla_reportada', 'h_l_c', 'h_s_c', 'h_l_t', 'h_s_t', 'rep-tecnico-nombre', 'usuario-nombre', 'contador_total'].includes(idOrName) || idOrName.startsWith('parte_') || idOrName.startsWith('desc_')) {
                        el.value = val;
                    }
                }
            });

            // Restaurar checkboxes
            if (data.checkboxes) {
                Object.entries(data.checkboxes).forEach(([key, isChecked]) => {
                    let cb = document.getElementById(key);
                    if (!cb && key.includes('_')) {
                        const [name, val] = key.split('_');
                        cb = document.querySelector(`input[name="${name}"][value="${val}"]`);
                    }
                    if (cb && isChecked) {
                        cb.checked = true;
                    }
                });
            }

            // Restaurar radios
            if (data.radios) {
                Object.entries(data.radios).forEach(([name, val]) => {
                    const r = document.querySelector(`input[type="radio"][name="${name}"][value="${val}"]`);
                    if (r) r.checked = true;
                });
            }

            // Restaurar firmas
            if (data.signatures) {
                if (data.signatures['sig-repc-img']) {
                    const imgRep = document.getElementById('sig-repc-img');
                    const btnRep = document.getElementById('sig-repc-btn');
                    if (imgRep) {
                        imgRep.src = data.signatures['sig-repc-img'];
                        imgRep.style.display = 'block';
                    }
                    if (btnRep) {
                        btnRep.textContent = '✏️ Modificar Firma';
                        btnRep.classList.add('signed');
                    }
                }
                if (data.signatures['sig-user-img']) {
                    const imgUser = document.getElementById('sig-user-img');
                    const btnUser = document.getElementById('sig-user-btn');
                    if (imgUser) {
                        imgUser.src = data.signatures['sig-user-img'];
                        imgUser.style.display = 'block';
                    }
                    if (btnUser) {
                        btnUser.textContent = '✏️ Modificar Firma';
                        btnUser.classList.add('signed');
                    }
                }
            }

            // Restaurar visualización de correlativo si existía
            if (data.correlativoDisplay) {
                const disp = document.getElementById('correlativo-display');
                if (disp && !disp.textContent.includes('0000000')) {
                    disp.textContent = data.correlativoDisplay;
                }
            }

            // Mostrar notificación de borrador restaurado
            showDraftNotice(data.timestamp);

            setTimeout(() => {
                isRestoringDraft = false;
            }, 300);

        } catch (e) {
            console.error('Error al restaurar borrador:', e);
            isRestoringDraft = false;
        }
    }

    function showDraftNotice(isoTimestamp) {
        let existingNotice = document.getElementById('db-draft-notice');
        if (!existingNotice) {
            existingNotice = document.createElement('div');
            existingNotice.id = 'db-draft-notice';
            existingNotice.className = 'db-draft-notice';
            const formContainer = document.querySelector('.form-container');
            formContainer.parentNode.insertBefore(existingNotice, formContainer);
        }

        const dateStr = isoTimestamp ? new Date(isoTimestamp).toLocaleString() : 'recientemente';

        existingNotice.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 15px;">📝</span>
                <span>Se ha restaurado un <strong>borrador temporal previo</strong> guardado el <em>${dateStr}</em>.</span>
            </div>
            <div class="db-draft-actions">
                <button type="button" class="btn-db-discard" id="btn-discard-draft" title="Eliminar este borrador y dejar los datos limpios">
                    🗑️ Descartar Borrador
                </button>
            </div>
        `;

        const discardBtn = existingNotice.querySelector('#btn-discard-draft');
        if (discardBtn) {
            discardBtn.addEventListener('click', () => {
                if (confirm('¿Desea descartar este borrador temporal? Se limpiarán los cambios que no hayan sido guardados en el PDF.')) {
                    clearDraft();
                    window.location.reload();
                }
            });
        }
    }

    function clearDraft() {
        const key = getDraftStorageKey();
        localStorage.removeItem(key);
        // También intentar limpiar la clave genérica
        const pageType = window.location.pathname.includes('lexmark') ? 'lexmark' : 'multimarca';
        localStorage.removeItem(`cast_draft_${pageType}_generic`);

        const notice = document.getElementById('db-draft-notice');
        if (notice) notice.remove();

        const statusText = document.getElementById('draft-status-text');
        if (statusText) statusText.textContent = 'Borrador cerrado';
    }

    function setupAutoSave() {
        const form = document.getElementById('tech-service-form');
        if (!form) return;

        const triggerAutoSave = () => {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            const statusText = document.getElementById('draft-status-text');
            if (statusText) statusText.textContent = 'Guardando borrador...';

            autoSaveTimer = setTimeout(() => {
                saveDraft(false);
            }, 800);
        };

        form.addEventListener('input', triggerAutoSave);
        form.addEventListener('change', triggerAutoSave);

        // Guardar también periódicamente cada 60 segundos por precaución
        setInterval(() => {
            saveDraft(false);
        }, 60000);
    }

    async function saveTicketAttention(silent = false, targetState = 'Atendido') {
        const ticketTarget = currentTicket ? currentTicket.id_ticket : (document.getElementById('ticket-number')?.value.trim() || document.getElementById('manual-ticket-search')?.value.trim());
        if (!ticketTarget) {
            if (!silent) alert('No se ha especificado ningún número de ticket para guardar.');
            return false;
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

        if (btn && targetState === 'Atendido') {
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
                    estado_ticket: targetState
                })
            });

            const data = await res.json();
            if (data.success) {
                if (btn && targetState === 'Atendido') {
                    btn.textContent = '✅ Guardado (Atendido)';
                    btn.style.backgroundColor = '#059669';
                    btn.disabled = false;
                }
                const statusSpan = document.getElementById('bar-ticket-status');
                if (statusSpan) {
                    const ticketNum = data.ticket?.numero_ticket || currentTicket?.numero_ticket || ticketTarget;
                    const ticketCli = data.ticket?.cliente || currentTicket?.cliente || '';
                    const estadoColor = targetState === 'Atendido' ? '#34d399' : '#93c5fd';
                    statusSpan.innerHTML = `
                        <span>Ticket: <strong class="db-badge-info">${ticketNum}</strong></span>
                        <span style="color: #475569;">|</span>
                        <span>Cliente: <strong style="color: #f1f5f9;">${ticketCli}</strong></span>
                        <span style="color: #475569;">|</span>
                        <span>Estado: <strong style="color: ${estadoColor};">${targetState}</strong></span>
                    `;
                }
                if (!silent) {
                    alert('✅ ' + data.message);
                }
                console.log(`✅ Ticket ${ticketTarget} sincronizado con estado '${targetState}'.`);
                return true;
            } else {
                if (btn && targetState === 'Atendido') {
                    btn.textContent = '💾 Guardar en BD';
                    btn.disabled = false;
                }
                if (!silent) alert('❌ ' + (data.message || 'Error al guardar'));
                return false;
            }
        } catch (err) {
            console.error(err);
            if (btn && targetState === 'Atendido') {
                btn.textContent = '💾 Guardar en BD';
                btn.disabled = false;
            }
            if (!silent) alert('❌ Error de conexión al guardar atención.');
            return false;
        }
    }

    // Interceptar generación de PDF e impresión para marcar automáticamente como Atendido en BD y limpiar borrador
    function setupPrintAndPdfInterceptors() {
        // Interceptar formulario (botón Generar y Descargar PDF)
        const form = document.getElementById('tech-service-form');
        if (form) {
            form.addEventListener('submit', () => {
                console.log('⚡ Generando PDF: Marcando ticket como Atendido en base de datos y limpiando borrador...');
                saveTicketAttention(true, 'Atendido');
                clearDraft();
            });
        }

        // Interceptar botones de impresión si existieran
        const printButtons = document.querySelectorAll('.print-button, button[onclick*="print"]');
        printButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('⚡ Imprimiendo constancia: Marcando ticket como Atendido en base de datos...');
                saveTicketAttention(true, 'Atendido');
                clearDraft();
            });
        });

        // Interceptar evento de impresión del navegador (Ctrl + P)
        window.addEventListener('beforeprint', () => {
            console.log('⚡ Evento de impresión detectado: Marcando ticket como Atendido en base de datos...');
            saveTicketAttention(true, 'Atendido');
            clearDraft();
        });
    }

    // Inicializar interceptores al cargar
    setTimeout(setupPrintAndPdfInterceptors, 600);

    window.saveTicketAttention = saveTicketAttention;
    window.loadAndAutoFillTicket = loadAndAutoFillTicket;
    window.saveDraft = saveDraft;
    window.clearDraft = clearDraft;
    window.restoreDraft = restoreDraft;
})();
