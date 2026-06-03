const { createApp } = Vue;

// Get post filename from URL query, e.g., ?post=001.md
function getPostParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('post') || '';
}

// Configure marked for better rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

createApp({
    data() {
        return {
            renderedContent: '<p>Loading...</p>'
        };
    },
    mounted() {
        const post = getPostParam();
        if (!post) {
            this.renderedContent = '<p>No post specified.</p>';
            return;
        }

        // Security: only allow .md files with safe path
        if (!post.endsWith('.md') || post.includes('..') || post.startsWith('/') || post.includes('//')) {
            this.renderedContent = '<p>Invalid post parameter.</p>';
            return;
        }

        fetch(`../posts/${post}`)
            .then(res => {
                if (!res.ok) throw new Error('Post not found');
                return res.text();
            })
            .then(md => {
                this.renderedContent = marked.parse(md);
                // Highlight code blocks after DOM update
                this.$nextTick(() => {
                    document.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                });
            })
            .catch(err => {
                this.renderedContent = `<p>Error loading post: ${err.message}</p>`;
            });
    },
    methods: {
        home() {
            window.location.href = 'https://weirdsnap.github.io';
        },
        list() {
            window.location.href = './list.html';
        },
        github() {
            window.location.href = 'https://github.com/weirdsnap';
        }
    }
}).mount('#blog-post');

createApp({
    methods: {
        home() {
            window.location.href = 'https://weirdsnap.github.io';
        },
        list() {
            window.location.href = './list.html';
        },
        github() {
            window.location.href = 'https://github.com/weirdsnap';
        }
    }
}).mount('#header');
