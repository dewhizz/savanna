jQuery(document).ready(function ($) {
    console.log("Loading menu items...");

    $.ajax({
        url: 'http://localhost:3000/api/menu',
        method: 'GET',
        success: function (response) {
            console.log("Menu items loaded:", response.menu);
            renderMenu(response.menu);
        },
        error: function (xhr, status, error) {
            console.error("Error loading menu:", error);
        }
    });

    function renderMenu(items) {
        // Clear existing items (if any, though we assume HTML containers are empty)
        $('#menu-starters').empty();
        $('#menu-mains').empty();
        $('#menu-soups').empty();
        $('#menu-desserts').empty();
        $('#menu-drinks').empty();

        items.forEach(item => {
            const html = createMenuItemHtml(item);

            // Map categories to IDs
            // Admin categories: Starters, Mains, Desserts, Drinks
            // We can also support "Soups" if added later
            let containerId = '';

            if (item.category === 'Starters') containerId = '#menu-starters';
            else if (item.category === 'Mains') containerId = '#menu-mains';
            else if (item.category === 'Soups') containerId = '#menu-soups';
            else if (item.category === 'Desserts') containerId = '#menu-desserts';
            else if (item.category === 'Drinks') containerId = '#menu-drinks';

            if (containerId && $(containerId).length) {
                $(containerId).append(html);
            }
        });
    }

    function createMenuItemHtml(item) {
        const image = item.image_url || 'images/menu/default.jpg';
        return `
            <div class="menu-post clearfix">
                <div class="menu-post-img">
                    <a href="${image}" class="lightbox" title="${item.name}">
                        <img width="400" height="400" src="${image}" alt="${item.name}" />
                    </a>
                </div>
                <div class="menu-post-desc">
                    <h4>
                        <span class="menu-title">${item.name}</span>
                        <span class="menu-dots"></span>
                        <span class="menu-price">$${item.price.toFixed(2)}</span>
                    </h4>
                    <div class="menu-text">${item.description}</div>
                </div>
            </div>
        `;
    }
});
