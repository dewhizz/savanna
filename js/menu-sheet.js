(function () {
    'use strict';

    const MENU_API_URL = '/api/menu';
    const CURRENCY_SYMBOL = '$';
    const menuContainer = document.getElementById('menu-items');

    const fallbackItems = [
        {
            category: 'Starters',
            name: 'Tomato Bruschetta with Olive',
            price: '4.00',
            description: 'Fresh tomato, basil and olive oil on crisp bread.',
            image: 'images/menu/double-tomato-bruschetta.jpg'
        },
        {
            category: 'Starters',
            name: 'Marinated Grilled Shrimp',
            price: '7.00',
            description: 'Savory shrimp with lemon butter and herbs.',
            image: 'images/menu/marinated-grilled-shrimp.jpg'
        },
        {
            category: 'Mains',
            name: 'Prime Rib with Garlic Sauce',
            price: '20.00',
            description: 'Slow-roasted prime rib with classic garlic jus.',
            image: 'images/menu/prime-rib-primer.jpg'
        },
        {
            category: 'Mains',
            name: 'Coconut Fried Chicken',
            price: '19.00',
            description: 'Crispy chicken with coconut curry glaze.',
            image: 'images/menu/coconut-curry-fried-chicken.jpg'
        }
    ];

    function formatPrice(value) {
        const number = Number(value || 0);
        return `${CURRENCY_SYMBOL}${isNaN(number) ? '0.00' : number.toFixed(2)}`;
    }

    function createMenuItemHtml(item) {
        return `
            <div class="menu-post-v3">
                <div class="menu-post-border-v3">
                    <div class="menu-post-img-v3">
                        <img src="${item.image || 'images/menu/default.jpg'}" alt="${item.name}" loading="lazy" width="400" height="400">
                    </div>
                    <div class="menu-content-v3">
                        <div class="menu-content-v3-left">
                            <ul class="menu-categ-v3"><li>${item.category}</li></ul>
                            <h4 class="menu-title-v3">${item.name}</h4>
                            <p class="menu-description-v3">${item.description}</p>
                        </div>
                        <div class="menu-price-v3">${formatPrice(item.price)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderMenu(items) {
        if (!menuContainer) {
            return;
        }
        menuContainer.innerHTML = items.map(createMenuItemHtml).join('\n');
    }

    function getMenuItems(data) {
        if (!Array.isArray(data)) {
            return fallbackItems;
        }

        return data.map(item => ({
            category: item.category || item.Category || 'Main Courses',
            name: item.name || item['Dish Name'] || 'Savannah Dish',
            price: Number(item.price || item.Price || 0).toFixed(2),
            description: item.description || item.Description || '',
            image: item.image || item.Image || 'images/menu/default.jpg'
        }));
    }

    function fetchMenu() {
        if (!menuContainer) {
            return;
        }

        menuContainer.innerHTML = '<p>Loading menu...</p>';

        fetch(MENU_API_URL)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                const menuItems = getMenuItems(data.menu || data);
                renderMenu(menuItems.length ? menuItems : fallbackItems);
            })
            .catch(() => {
                renderMenu(fallbackItems);
            });
    }

    document.addEventListener('DOMContentLoaded', fetchMenu);
})();