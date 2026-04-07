(function () {
    'use strict';

    const MENU_API_URL = '/api/menu';
    const MANAGER_VALIDATE_URL = '/api/manager/validate';
    const MANAGER_SAVE_URL = '/api/manager/menu';

    const loginPanel = document.getElementById('manager-login-panel');
    const editorPanel = document.getElementById('manager-editor-panel');
    const loginMessage = document.getElementById('manager-login-message');
    const editorMessage = document.getElementById('manager-editor-message');
    const menuList = document.getElementById('manager-menu-list');
    const menuForm = document.getElementById('manager-dish-form');
    const managerKeyInput = document.getElementById('manager-key');
    const loginButton = document.getElementById('manager-login-btn');
    const refreshButton = document.getElementById('manager-refresh-btn');
    const lockButton = document.getElementById('manager-lock-btn');
    const clearButton = document.getElementById('manager-clear-btn');
    const saveAllButton = document.getElementById('manager-save-all-btn');
    const exportButton = document.getElementById('manager-export-btn');

    let managerKey = '';
    let currentMenu = [];
    let editIndex = null;

    function showMessage(target, text, type = 'info') {
        if (!target) return;
        target.textContent = text;
        target.className = `manager-status text-${type}`;
    }

    function normalizeMenuItem(item) {
        return {
            category: (item.category || item.Category || 'Main Courses').trim(),
            name: (item.name || item['Dish Name'] || 'Savannah Dish').trim(),
            price: Number(item.price || item.Price || 0).toFixed(2),
            description: (item.description || item.Description || '').trim(),
            image: (item.image || item.Image || 'images/menu/default.jpg').trim()
        };
    }

    function renderMenuList(items) {
        if (!menuList) return;
        if (!Array.isArray(items) || items.length === 0) {
            menuList.innerHTML = '<p>No menu items available.</p>';
            return;
        }

        menuList.innerHTML = items.map((item, index) => `
            <div class="menu-item-row" data-index="${index}">
                <div>
                    <div class="menu-item-title">${item.name}</div>
                    <div class="text-muted">${item.category} • ${item.price}</div>
                </div>
                <div class="menu-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-item" data-index="${index}">Edit</button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-item" data-index="${index}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function fillForm(item) {
        if (!menuForm) return;
        menuForm['category'].value = item.category;
        menuForm['name'].value = item.name;
        menuForm['price'].value = item.price;
        menuForm['description'].value = item.description;
        menuForm['image'].value = item.image;
    }

    function resetForm() {
        if (!menuForm) return;
        menuForm.reset();
        editIndex = null;
    }

    function setEditorEnabled(enabled) {
        if (!editorPanel || !loginPanel) return;
        editorPanel.classList.toggle('d-none', !enabled);
        loginPanel.classList.toggle('d-none', enabled);
    }

    function handleEditClick(index) {
        const item = currentMenu[index];
        if (!item) return;
        editIndex = index;
        fillForm(item);
        showMessage(editorMessage, 'Editing dish: ' + item.name, 'info');
    }

    function handleDeleteClick(index) {
        if (!Number.isInteger(index)) return;
        currentMenu.splice(index, 1);
        renderMenuList(currentMenu);
    }

    function attachMenuActions() {
        if (!menuList) return;
        menuList.addEventListener('click', event => {
            const target = event.target;
            if (target.matches('.edit-item')) {
                handleEditClick(Number(target.dataset.index));
            }
            if (target.matches('.delete-item')) {
                handleDeleteClick(Number(target.dataset.index));
            }
        });
    }

    async function fetchMenu() {
        try {
            const response = await fetch(MENU_API_URL);
            const data = await response.json();
            if (Array.isArray(data.menu)) {
                currentMenu = data.menu.map(normalizeMenuItem);
            } else {
                currentMenu = (Array.isArray(data) ? data : []).map(normalizeMenuItem);
            }
            renderMenuList(currentMenu);
        } catch (error) {
            showMessage(loginMessage, 'Failed to load menu. Please refresh.', 'danger');
        }
    }

    async function validateManagerKey() {
        const key = managerKeyInput ? managerKeyInput.value.trim() : '';
        if (!key) {
            showMessage(loginMessage, 'Please enter the Manager Key.', 'warning');
            return;
        }

        try {
            const response = await fetch(MANAGER_VALIDATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerKey: key })
            });

            if (!response.ok) {
                throw new Error('Unauthorized');
            }

            managerKey = key;
            setEditorEnabled(true);
            showMessage(editorMessage, 'Editor unlocked. You can now edit menu items.', 'success');
            showMessage(loginMessage, 'Manager portal unlocked.', 'success');
            fetchMenu();
        } catch (error) {
            showMessage(loginMessage, 'Invalid Manager Key. Please try again.', 'danger');
        }
    }

    async function saveMenuData() {
        if (!managerKey) {
            showMessage(editorMessage, 'You must unlock with the Manager Key before saving.', 'danger');
            return;
        }

        try {
            const response = await fetch(MANAGER_SAVE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerKey, menu: currentMenu })
            });

            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || 'Save failed');
            }

            showMessage(editorMessage, 'Menu updated successfully.', 'success');
            renderMenuList(currentMenu);
        } catch (error) {
            showMessage(editorMessage, `Error saving menu: ${error.message}`, 'danger');
        }
    }

    function exportMenu() {
        const json = JSON.stringify(currentMenu, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(() => {
                showMessage(editorMessage, 'Menu JSON copied to clipboard.', 'success');
            }).catch(() => {
                showMessage(editorMessage, 'Could not copy to clipboard, use the prompt instead.', 'warning');
                prompt('Copy this menu JSON:', json);
            });
        } else {
            prompt('Copy this menu JSON:', json);
        }
    }

    function logoutManager() {
        managerKey = '';
        resetForm();
        setEditorEnabled(false);
        showMessage(loginMessage, 'Manager portal locked.', 'info');
        showMessage(editorMessage, '', 'info');
    }

    function attachFormHandlers() {
        if (!menuForm) return;

        menuForm.addEventListener('submit', event => {
            event.preventDefault();
            const item = normalizeMenuItem({
                category: menuForm['category'].value,
                name: menuForm['name'].value,
                price: menuForm['price'].value,
                description: menuForm['description'].value,
                image: menuForm['image'].value
            });

            if (editIndex !== null && Number.isInteger(editIndex)) {
                currentMenu[editIndex] = item;
                editIndex = null;
            } else {
                currentMenu.push(item);
            }
            renderMenuList(currentMenu);
            resetForm();
            saveMenuData();
        });

        if (loginButton) {
            loginButton.addEventListener('click', validateManagerKey);
        }
        if (refreshButton) {
            refreshButton.addEventListener('click', fetchMenu);
        }
        if (lockButton) {
            lockButton.addEventListener('click', logoutManager);
        }
        if (clearButton) {
            clearButton.addEventListener('click', resetForm);
        }
        if (saveAllButton) {
            saveAllButton.addEventListener('click', saveMenuData);
        }
        if (exportButton) {
            exportButton.addEventListener('click', exportMenu);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        attachMenuActions();
        attachFormHandlers();
        fetchMenu();
    });
})();