(function () {
    'use strict';

    const API_BASE = '/api';
    const MANAGER_VALIDATE_URL = `${API_BASE}/manager/validate`;
    const MANAGER_MENU_URL = `${API_BASE}/manager/menu`;
    const RESERVATIONS_URL = `${API_BASE}/reservations`;
    const SETTINGS_URL = `${API_BASE}/settings`;

    const loginSection = document.getElementById('vault-lock-screen');
    const dashboard = document.getElementById('vault-dashboard');
    const unlockButton = document.getElementById('vault-unlock-btn');
    const lockButton = document.getElementById('vault-lock-btn');
    const refreshButton = document.getElementById('vault-refresh-btn');
    const saveMenuButton = document.getElementById('vault-save-menu-btn');
    const exportMenuButton = document.getElementById('vault-export-menu-btn');
    const saveSettingsButton = document.getElementById('vault-save-settings-btn');
    const availableTablesEl = document.getElementById('vault-available-tables');
    const totalTablesEl = document.getElementById('vault-total-tables');
    const lastRefreshEl = document.getElementById('vault-last-refresh');
    const lockTimerEl = document.getElementById('vault-lock-timer');
    const reservationsBody = document.getElementById('vault-reservations-body');
    const menuListEl = document.getElementById('vault-menu-list');
    const settingTotalTables = document.getElementById('vault-setting-total-tables');
    const vaultStatus = document.getElementById('vault-dashboard-status');
    const lockStatus = document.getElementById('vault-lock-status');

    let managerKey = '';
    let currentMenu = [];
    let currentReservations = [];
    let currentSettings = [];
    let totalTables = 20;
    let inactivityTimeout;
    let refreshInterval;

    function showMessage(target, text, type = 'info') {
        if (!target) return;
        target.textContent = text;
        target.className = `vault-status text-${type}`;
    }

    function setVaultVisible(visible) {
        if (loginSection) {
            loginSection.style.display = visible ? 'none' : 'block';
        }
        if (dashboard) {
            dashboard.style.display = visible ? 'block' : 'none';
        }
    }

    function resetInactivityTimer() {
        if (inactivityTimeout) {
            clearTimeout(inactivityTimeout);
        }
        let remaining = 300;
        updateLockTimerDisplay(remaining);
        inactivityTimeout = setInterval(() => {
            remaining -= 1;
            updateLockTimerDisplay(remaining);
            if (remaining <= 0) {
                clearInterval(inactivityTimeout);
                lockVault('Session locked due to inactivity.');
            }
        }, 1000);
    }

    function updateLockTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        if (lockTimerEl) {
            lockTimerEl.textContent = `${minutes}:${secs}`;
        }
    }

    function refreshTimestamp() {
        if (lastRefreshEl) {
            lastRefreshEl.textContent = new Date().toLocaleString();
        }
    }

    function lockVault(message = 'Vault locked.') {
        managerKey = '';
        setVaultVisible(false);
        showMessage(lockStatus, message, 'secondary');
        if (inactivityTimeout) {
            clearInterval(inactivityTimeout);
        }
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || response.statusText || 'Request failed');
        }
        return response.json();
    }

    async function validateManagerKey() {
        const keyInput = document.getElementById('vault-manager-key');
        if (!keyInput) return;
        const key = keyInput.value.trim();
        if (!key) {
            showMessage(lockStatus, 'Please enter the manager key first.', 'warning');
            return;
        }

        try {
            await fetchJson(MANAGER_VALIDATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerKey: key })
            });
            managerKey = key;
            setVaultVisible(true);
            showMessage(lockStatus, 'Vault unlocked. Welcome back.', 'success');
            showMessage(vaultStatus, 'Loading dashboard data...', 'info');
            resetInactivityTimer();
            await loadDashboardData();
            refreshTimestamp();
            refreshInterval = setInterval(loadDashboardData, 120000);
        } catch (error) {
            showMessage(lockStatus, 'Invalid manager key. Please try again.', 'danger');
        }
    }

    async function loadDashboardData() {
        try {
            await Promise.all([loadSettings(), loadReservations(), loadMenu()]);
            updateInventoryCounts();
            refreshTimestamp();
            showMessage(vaultStatus, 'Dashboard is up to date.', 'success');
        } catch (error) {
            showMessage(vaultStatus, `Dashboard error: ${error.message}`, 'danger');
        }
    }

    async function loadSettings() {
        const data = await fetchJson(SETTINGS_URL);
        currentSettings = Array.isArray(data.settings) ? data.settings : [];
        const total = currentSettings.find(item => item.key === 'total_tables');
        totalTables = total ? Number(total.value) || 20 : 20;
        if (settingTotalTables) {
            settingTotalTables.value = totalTables;
        }
        if (totalTablesEl) {
            totalTablesEl.textContent = totalTables;
        }
    }

    async function saveSettings() {
        const newTotal = Number(settingTotalTables.value || 20);
        totalTables = newTotal > 0 ? newTotal : 20;
        const payload = { key: 'total_tables', value: String(totalTables) };
        try {
            await fetchJson(SETTINGS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            totalTablesEl.textContent = totalTables;
            showMessage(vaultStatus, 'Total tables saved.', 'success');
            updateInventoryCounts();
        } catch (error) {
            showMessage(vaultStatus, `Save settings failed: ${error.message}`, 'danger');
        }
    }

    async function loadReservations() {
        const data = await fetchJson(RESERVATIONS_URL);
        currentReservations = Array.isArray(data.reservations) ? data.reservations : [];
        renderReservations();
    }

    function renderReservations() {
        if (!reservationsBody) return;
        reservationsBody.innerHTML = '';
        if (!currentReservations.length) {
            reservationsBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No reservations found.</td></tr>';
            return;
        }

        currentReservations.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
        currentReservations.forEach(reservation => {
            const status = reservation.status ? reservation.status.toLowerCase() : 'pending';
            const actionButtons = [];
            if (status === 'pending') {
                actionButtons.push(`<button class="btn btn-success btn-sm btn-confirm" data-id="${reservation.id}">Confirm</button>`);
                actionButtons.push(`<a class="btn btn-outline-secondary btn-sm" href="${getWhatsAppUrl(reservation)}" target="_blank">WhatsApp</a>`);
            } else {
                actionButtons.push(`<span class="badge bg-${status === 'confirmed' ? 'success' : 'secondary'}">${status.toUpperCase()}</span>`);
            }

            reservationsBody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>#${reservation.id}</td>
                    <td><strong>${reservation.name}</strong><br><small>${reservation.email || reservation.phone || ''}</small></td>
                    <td>${reservation.date} ${reservation.time}</td>
                    <td>${reservation.guests}</td>
                    <td>${status}</td>
                    <td>${actionButtons.join(' ')}</td>
                </tr>
            `);
        });
    }

    function getWhatsAppUrl(reservation) {
        if (!reservation.phone) {
            return 'https://web.whatsapp.com/';
        }
        const phone = reservation.phone.replace(/[^0-9]/g, '');
        const message = `Hello ${reservation.name}, your reservation for ${reservation.guests} guest(s) on ${reservation.date} at ${reservation.time} is being processed. - Savannah Spice`; 
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }

    async function confirmReservation(id) {
        try {
            await fetchJson(`${RESERVATIONS_URL}/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'confirmed' })
            });
            await loadReservations();
            showMessage(vaultStatus, `Reservation #${id} confirmed.`, 'success');
            updateInventoryCounts();
        } catch (error) {
            showMessage(vaultStatus, `Confirm failed: ${error.message}`, 'danger');
        }
    }

    async function loadMenu() {
        const data = await fetchJson(`${API_BASE}/menu`);
        currentMenu = Array.isArray(data.menu) ? data.menu : [];
        renderMenuEditor();
    }

    function renderMenuEditor() {
        if (!menuListEl) return;
        menuListEl.innerHTML = '';
        if (!currentMenu.length) {
            menuListEl.innerHTML = '<div class="text-muted">No menu items available.</div>';
            return;
        }

        currentMenu.forEach((item, index) => {
            menuListEl.insertAdjacentHTML('beforeend', `
                <div class="border rounded p-3 mb-3">
                    <div class="row gy-3">
                        <div class="col-md-3">
                            <label class="form-label">Category</label>
                            <input class="form-control vault-menu-input" data-index="${index}" data-field="category" value="${escapeHtml(item.category || '')}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Dish</label>
                            <input class="form-control vault-menu-input" data-index="${index}" data-field="name" value="${escapeHtml(item.name || '')}">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Price</label>
                            <input class="form-control vault-menu-input" data-index="${index}" data-field="price" type="number" step="0.01" value="${Number(item.price || 0).toFixed(2)}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Image URL</label>
                            <input class="form-control vault-menu-input" data-index="${index}" data-field="image" value="${escapeHtml(item.image || item.image_url || '')}">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Description</label>
                            <textarea class="form-control vault-menu-input" data-index="${index}" data-field="description">${escapeHtml(item.description || '')}</textarea>
                        </div>
                    </div>
                </div>
            `);
        });

        const inputs = menuListEl.querySelectorAll('.vault-menu-input');
        inputs.forEach(input => {
            input.addEventListener('change', handleMenuFieldChange);
        });
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char];
        });
    }

    function handleMenuFieldChange(event) {
        const target = event.target;
        const index = Number(target.dataset.index);
        const field = target.dataset.field;
        if (!Number.isInteger(index) || !field) return;

        currentMenu[index] = {
            ...currentMenu[index],
            [field]: target.value
        };
    }

    async function saveMenu() {
        if (!managerKey) {
            showMessage(vaultStatus, 'Unlock the vault before saving menu changes.', 'warning');
            return;
        }

        try {
            await fetchJson(MANAGER_MENU_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerKey, menu: currentMenu })
            });
            showMessage(vaultStatus, 'Menu updates published successfully.', 'success');
        } catch (error) {
            showMessage(vaultStatus, `Failed to publish menu: ${error.message}`, 'danger');
        }
    }

    function exportMenu() {
        const payload = JSON.stringify(currentMenu, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(payload).then(() => {
                showMessage(vaultStatus, 'Menu JSON copied to clipboard.', 'success');
            }).catch(() => {
                prompt('Copy this menu JSON:', payload);
            });
        } else {
            prompt('Copy this menu JSON:', payload);
        }
    }

    function updateInventoryCounts() {
        if (!Array.isArray(currentReservations)) return;
        const now = new Date();
        const confirmed = currentReservations.filter(reservation => {
            if (!reservation.status) return false;
            const status = reservation.status.toLowerCase();
            if (status !== 'confirmed') return false;
            const start = new Date(`${reservation.date}T${reservation.time}`);
            if (isNaN(start.getTime())) return false;
            const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
            return start <= now && now < end;
        }).length;
        const available = Math.max(totalTables - confirmed, 0);
        if (availableTablesEl) {
            availableTablesEl.textContent = available;
        }
        if (totalTablesEl) {
            totalTablesEl.textContent = totalTables;
        }
    }

    function userActivityListener() {
        document.addEventListener('mousemove', resetInactivityTimer);
        document.addEventListener('keydown', resetInactivityTimer);
        document.addEventListener('click', resetInactivityTimer);
    }

    function attachEventHandlers() {
        if (unlockButton) {
            unlockButton.addEventListener('click', validateManagerKey);
        }
        if (lockButton) {
            lockButton.addEventListener('click', () => lockVault('Vault manually locked.'));
        }
        if (refreshButton) {
            refreshButton.addEventListener('click', loadDashboardData);
        }
        if (saveMenuButton) {
            saveMenuButton.addEventListener('click', saveMenu);
        }
        if (exportMenuButton) {
            exportMenuButton.addEventListener('click', exportMenu);
        }
        if (saveSettingsButton) {
            saveSettingsButton.addEventListener('click', saveSettings);
        }

        document.addEventListener('click', event => {
            const confirmButton = event.target.closest('.btn-confirm');
            if (confirmButton) {
                const id = confirmButton.dataset.id;
                if (id) {
                    confirmReservation(id);
                }
            }
        });
    }

    function initialize() {
        setVaultVisible(false);
        attachEventHandlers();
        userActivityListener();
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
