// Get post filename from URL query, e.g., ?post=001.md
function getPostParam() {
    var params = new URLSearchParams(window.location.search);
    return params.get('post') || '';
}

// Configure marked for better rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

Vue.createApp({
    template: '<article v-html="renderedContent"></article>',
    data: function() {
        return {
            renderedContent: '<p>Loading...</p>'
        };
    },
    mounted: function() {
        var post = getPostParam();
        if (!post) {
            this.renderedContent = '<p>No post specified.</p>';
            return;
        }

        // Security: only allow .md files with safe path
        if (!post.endsWith('.md') || post.indexOf('..') >= 0 || post.charAt(0) === '/' || post.indexOf('//') >= 0) {
            this.renderedContent = '<p>Invalid post parameter.</p>';
            return;
        }

        var self = this;
        fetch('../posts/' + post)
            .then(function(res) {
                if (!res.ok) throw new Error('Post not found');
                return res.text();
            })
            .then(function(md) {
                console.log('md loaded, length=' + md.length);
                var html = marked.parse(md, { async: false });
                console.log('html type=' + typeof html + ', length=' + (html ? html.length : 0));
                self.renderedContent = html;
                // Highlight code blocks after DOM update
                self.$nextTick(function() {
                    document.querySelectorAll('pre code').forEach(function(block) {
                        hljs.highlightElement(block);
                    });
                });
            })
            .catch(function(err) {
                console.error('ERROR:', err);
                self.renderedContent = '<p>Error loading post: ' + err.message + '</p>';
            });
    },
    methods: {
        home: function() {
            window.location.href = 'https://weirdsnap.github.io';
        },
        list: function() {
            window.location.href = './list.html';
        },
        github: function() {
            window.location.href = 'https://github.com/weirdsnap';
        }
    }
}).mount('#blog-post');

Vue.createApp({
    methods: {
        home: function() {
            window.location.href = 'https://weirdsnap.github.io';
        },
        list: function() {
            window.location.href = './list.html';
        },
        github: function() {
            window.location.href = 'https://github.com/weirdsnap';
        }
    }
}).mount('#header');
