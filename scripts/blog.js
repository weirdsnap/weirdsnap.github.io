function getPostParam() {
    var params = new URLSearchParams(window.location.search);
    return params.get('post') || '';
}

marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

Vue.createApp({
    data: function() {
        return {
            renderedContent: '<p>Loading...</p>'
        };
    },
    mounted: function() {
        var self = this;
        var post = getPostParam();
        if (!post) {
            self.renderedContent = '<p>No post specified.</p>';
            return;
        }

        if (!post.endsWith('.md') || post.indexOf('..') !== -1 || post.charAt(0) === '/' || post.indexOf('//') !== -1) {
            self.renderedContent = '<p>Invalid post parameter.</p>';
            return;
        }

        fetch('../posts/' + post)
            .then(function(res) {
                if (!res.ok) throw new Error('Post not found');
                return res.text();
            })
            .then(function(md) {
                self.renderedContent = marked.parse(md);
                self.$nextTick(function() {
                    document.querySelectorAll('pre code').forEach(function(block) {
                        hljs.highlightElement(block);
                    });
                });
            })
            .catch(function(err) {
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
