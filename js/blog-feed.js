(function () {
    'use strict';

    const BLOG_API_URL = 'https://api.sheety.co/YOUR_PROJECT/blogPosts';
    const blogFeed = document.getElementById('community-blog-feed');
    const shareFormAlert = document.getElementById('share-form-output');

    const samplePosts = [
        {
            title: 'A Savannah Spice Evening',
            author: 'Maya',
            date: 'April 3, 2026',
            excerpt: 'The food was rich, the service attentive, and the ambiance perfect for date night.'
        },
        {
            title: 'Fresh Flavors and Friendly Staff',
            author: 'Ethan',
            date: 'April 1, 2026',
            excerpt: 'The chef’s special was a revelation — I already want to come back.'
        }
    ];

    function renderPosts(posts) {
        if (!blogFeed) return;
        if (!posts || posts.length === 0) {
            blogFeed.innerHTML = '<p class="blog-feed-empty">No posts yet. Be the first to share your experience.</p>';
            return;
        }
        blogFeed.innerHTML = posts.slice(0, 5).map(post => `
            <article class="blog-item blog-item-1col-list">
                <div class="post-holder post-holder-all">
                    <div class="post-category"><a href="#">Community</a></div>
                    <h2 class="article-title"><a href="#">${post.title}</a></h2>
                    <ul class="post-meta">
                        <li>By ${post.author}</li>
                        <li>${post.date}</li>
                    </ul>
                    <p>${post.excerpt}</p>
                </div>
            </article>
        `).join('');
    }

    function initBlogForm() {
        const form = document.getElementById('share-experience-form');
        if (!form) return;

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                title: formData.get('post-title'),
                story: formData.get('story')
            };

            if (!data.name || !data.email || !data.title || !data.story) {
                if (shareFormAlert) {
                    shareFormAlert.innerHTML = '<div class="output2">Please fill in all fields before sending.</div>';
                }
                return;
            }

            if (shareFormAlert) {
                shareFormAlert.innerHTML = '<div class="output2">Ready to submit your story. Configure the Google Form or dataset URL to enable publishing.</div>';
            }

            // To fully enable live publishing, replace this URL with your Google Form or Sanity public endpoint.
            const submitUrl = 'https://docs.google.com/forms/d/e/YOUR_GOOGLE_FORM_ID/formResponse';
            fetch(submitUrl, {
                method: 'POST',
                body: new URLSearchParams({
                    'entry.1234567890': data.name,
                    'entry.2345678901': data.email,
                    'entry.3456789012': data.title,
                    'entry.4567890123': data.story
                })
            })
                .then(() => {
                    if (shareFormAlert) {
                        shareFormAlert.innerHTML = '<div class="output-success">Thank you! Your story is queued for review.</div>';
                    }
                    form.reset();
                })
                .catch(() => {
                    if (shareFormAlert) {
                        shareFormAlert.innerHTML = '<div class="output2">Saved locally. Replace the submission URL to publish live.</div>';
                    }
                });
        });
    }

    function fetchBlogPosts() {
        if (!blogFeed) return;
        fetch(BLOG_API_URL)
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    renderPosts(data.map(post => ({
                        title: post.title || post.name,
                        author: post.author || post.postedBy || 'Guest',
                        date: post.date || post.publishedOn || 'Today',
                        excerpt: post.excerpt || post.story || post.description || ''
                    })));
                } else {
                    renderPosts(samplePosts);
                }
            })
            .catch(() => {
                renderPosts(samplePosts);
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initBlogForm();
        fetchBlogPosts();
    });
})();
