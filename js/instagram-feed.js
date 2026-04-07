(function () {
    'use strict';

    const feedElement = document.getElementById('instagram-feed');
    const INSTAGRAM_API = 'https://graph.instagram.com/YOUR_USER_ID/media?fields=id,media_url,permalink&access_token=YOUR_ACCESS_TOKEN';

    if (!feedElement) {
        return;
    }

    function showFallback() {
        feedElement.innerHTML = `
            <div class="instagram-placeholder">
                <p>Instagram feed is ready to display once your access token is configured.</p>
                <p><a href="#">Connect Instagram</a></p>
            </div>
        `;
    }

    function renderImages(items) {
        if (!items || items.length === 0) {
            showFallback();
            return;
        }
        feedElement.innerHTML = items.slice(0, 6).map(item => `
            <a class="instagram-item" href="${item.permalink}" target="_blank" rel="noopener noreferrer">
                <img src="${item.media_url}" alt="Instagram photo" loading="lazy" />
            </a>
        `).join('');
    }

    fetch(INSTAGRAM_API)
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                renderImages(data.data);
            } else {
                showFallback();
            }
        })
        .catch(() => {
            showFallback();
        });
})();
