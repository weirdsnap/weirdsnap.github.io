// Get post filename from URL query, e.g., ?post=001.md
function getPostParam() {
    var params = new URLSearchParams(window.location.search);
    return params.get('post') || '';
}

function estimateReadTime(text) {
    if (!text) return 1;
    var chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = text.trim().split(/\s+/).length;
    var minutes = Math.max(1, Math.round((chinese + words * 0.5) / 400));
    return minutes;
}

// Configure marked for better rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

var blogApp = Vue.createApp({
    data: function() {
        return {
            renderedContent: '<p>Loading...</p>',
            toc: [],
            meta: null,
            showBackToTop: false,
            mobile: window.innerWidth <= 1100,
            tocOpen: false,
            menuOpen: false
        };
    },
    mounted: function() {
        var self = this;
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

        fetch('../posts/' + post)
            .then(function(res) {
                if (!res.ok) throw new Error('Post not found');
                return res.text();
            })
            .then(function(md) {
                var html = marked.parse(md, { async: false });
                self.renderedContent = html;
                self.meta = {
                    wordCount: md.replace(/\s/g, '').length,
                    readTime: estimateReadTime(md)
                };
                self.$nextTick(function() {
                    self.buildTOC();
                    self.addCopyButtons();
                    self.highlightCode();
                    self.setupScrollSpy();
                });
            })
            .catch(function(err) {
                console.error('ERROR:', err);
                self.renderedContent = '<p>Error loading post: ' + err.message + '</p>';
            });

        window.addEventListener('resize', function() {
            self.mobile = window.innerWidth <= 1100;
        });

        window.addEventListener('scroll', function() {
            self.showBackToTop = window.scrollY > 400;
        });
    },
    methods: {
        buildTOC: function() {
            var headings = document.querySelectorAll('#blog-post h2, #blog-post h3');
            var toc = [];
            headings.forEach(function(h) {
                var id = h.id;
                if (!id) {
                    id = 'heading-' + toc.length;
                    h.id = id;
                }
                toc.push({
                    id: id,
                    text: h.textContent.trim(),
                    level: h.tagName === 'H2' ? 2 : 3
                });
            });
            this.toc = toc;
        },
        scrollTo: function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.tocOpen = false;
            }
        },
        addCopyButtons: function() {
            document.querySelectorAll('#blog-post pre').forEach(function(pre) {
                var code = pre.querySelector('code');
                if (!code) return;
                var btn = document.createElement('button');
                btn.className = 'code-copy-btn';
                btn.textContent = '复制';
                btn.addEventListener('click', function() {
                    var text = code.textContent;
                    navigator.clipboard.writeText(text).then(function() {
                        btn.textContent = '已复制';
                        setTimeout(function() { btn.textContent = '复制'; }, 1500);
                    }).catch(function() {
                        btn.textContent = '失败';
                        setTimeout(function() { btn.textContent = '复制'; }, 1500);
                    });
                });
                pre.appendChild(btn);
            });
        },
        highlightCode: function() {
            document.querySelectorAll('pre code').forEach(function(block) {
                var cls = block.className || '';
                if (!cls.trim()) {
                    var result = hljs.highlightAuto(block.textContent);
                    block.className = 'hljs language-' + result.language;
                }
                hljs.highlightElement(block);
            });
        },
        setupScrollSpy: function() {
            // Simple scroll spy: update active TOC item on scroll
            var headings = document.querySelectorAll('#blog-post h2, #blog-post h3');
            var tocLinks = document.querySelectorAll('.toc-sidebar a, .toc-drawer a');
            if (!headings.length || !tocLinks.length) return;

            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        tocLinks.forEach(function(link) {
                            link.classList.remove('active');
                        });
                        var active = document.querySelector('.toc-sidebar a[href="#' + entry.target.id + '"], .toc-drawer a[href="#' + entry.target.id + '"]');
                        if (active) active.classList.add('active');
                    }
                });
            }, { rootMargin: '-80px 0px -70% 0px' });

            headings.forEach(function(h) { observer.observe(h); });
        },
        backToTop: function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}).mount('#blog-wrapper');

Vue.createApp({
    data() {
        return {
            menuOpen: false,
            backHref: './list.html'
        };
    },
    mounted() {
        var post = getPostParam();
        if (!post) return;
        var self = this;
        fetch('../posts/index.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var categories = data.categories || [];
                for (var i = 0; i < categories.length; i++) {
                    var cat = categories[i];
                    var articles = cat.articles || [];
                    for (var j = 0; j < articles.length; j++) {
                        if (articles[j].path === post) {
                            self.backHref = './list.html?category=' + encodeURIComponent(cat.id);
                            return;
                        }
                    }
                    var subs = cat.subs || [];
                    for (var k = 0; k < subs.length; k++) {
                        var sub = subs[k];
                        var subArticles = sub.articles || [];
                        for (var l = 0; l < subArticles.length; l++) {
                            if (subArticles[l].path === post) {
                                self.backHref = './list.html?category=' + encodeURIComponent(cat.id) + '&sub=' + encodeURIComponent(sub.id);
                                return;
                            }
                        }
                    }
                }
            })
            .catch(function() {
                self.backHref = './list.html';
            });
    },
    methods: {
        home() { window.location.href = 'https://weirdsnap.github.io'; },
        list() { window.location.href = this.backHref; },
        github() { window.location.href = 'https://github.com/weirdsnap'; },
        toggleMenu() { this.menuOpen = !this.menuOpen; }
    }
}).mount('#header');
