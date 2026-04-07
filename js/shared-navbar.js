(function ($) {
    'use strict';

    const menuItems = [
        { title: 'Home', href: 'index.html' },
        { title: 'Menu', href: 'menu-grid-v3.html' },
        { title: 'About Us', href: 'about-us.html' },
        { title: 'Reservation', href: 'reservation.html' },
        { title: 'Gallery', href: 'gallery-4-cols.html' },
        { title: 'Blog', href: 'blog.html' },
        { title: 'Contact', href: 'contact.html' },
        { title: '404 Page', href: '404-error.html' }
    ];

    function normalizePath(path) {
        return path.replace(/[#?].*$/, '').replace(/^.*[\\/]/, '').toLowerCase() || 'index.html';
    }

    const currentPage = normalizePath(window.location.pathname);

    function isActiveItem(href) {
        const itemPage = normalizePath(href);
        return itemPage === currentPage || (currentPage === '' && itemPage === 'index.html');
    }

    function buildMenu(id, isMobile) {
        const $ul = $('<ul/>', {
            id,
            className: isMobile ? 'menu-nav menu-nav-2' : 'menu-nav menu-nav-1'
        });

        menuItems.forEach(item => {
            const liClass = isActiveItem(item.href) ? 'menu-item current-menu-item' : 'menu-item';
            const $li = $('<li/>', { className: liClass });
            const $link = $('<a/>', {
                href: item.href,
                text: item.title
            });
            $li.append($link);
            $ul.append($li);
        });

        return $ul;
    }

    $(function () {
        const $mobileNavHolder = $('.nav-holder.nav-holder-2');
        const $desktopNavHolder = $('.nav-holder.nav-holder-1.nav-holder-desktop');

        if ($mobileNavHolder.length) {
            $mobileNavHolder.empty().append(buildMenu('menu-menu-2', true));
        }

        if ($desktopNavHolder.length) {
            $desktopNavHolder.empty().append(buildMenu('menu-menu-1', false));
        }
    });
})(jQuery);
