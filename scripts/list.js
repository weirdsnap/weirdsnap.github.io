function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
}

function estimateReadTime(title) {
    // Rough estimate: ~400 Chinese chars or ~600 English words per minute
    if (!title) return 0;
    const chineseChars = (title.match(/[\u4e00-\u9fa5]/g) || []).length;
    const totalChars = title.length;
    const nonChinese = totalChars - chineseChars;
    const minutes = Math.max(1, Math.round((chineseChars * 1.5 + nonChinese) / 400));
    return minutes;
}

Vue.createApp({
    data: function() {
        return {
            categoryId: getParam('category'),
            subId: getParam('sub'),
            pageTitle: 'Blog List',
            articles: [],
            subs: [],
            showArticles: false,
            showSubs: false,
            breadcrumb: []
        };
    },
    mounted: function() {
        var self = this;
        fetch('../posts/index.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var cat = (data.categories || []).find(function(c) { return c.id === self.categoryId; });
                if (!cat) {
                    self.pageTitle = '未找到';
                    return;
                }

                // Sub-folder view
                if (self.subId) {
                    var sub = (cat.subs || []).find(function(s) { return s.id === self.subId; });
                    if (sub) {
                        self.pageTitle = sub.label;
                        self.articles = (sub.articles || []).map(function(a) {
                            return { ...a, readTime: estimateReadTime(a.title) };
                        });
                        self.showArticles = true;
                        self.breadcrumb = [
                            { label: '首页', link: '../index.html' },
                            { label: cat.label, link: './list.html?category=' + encodeURIComponent(cat.id) },
                            { label: sub.label }
                        ];
                    }
                    return;
                }

                // Category view
                self.pageTitle = cat.label;
                self.breadcrumb = [
                    { label: '首页', link: '../index.html' },
                    { label: cat.label }
                ];
                if (cat.type === 'folder' && cat.subs && cat.subs.length > 0) {
                    self.subs = cat.subs;
                    self.showSubs = true;
                } else {
                    self.articles = (cat.articles || []).map(function(a) {
                        return { ...a, readTime: estimateReadTime(a.title) };
                    });
                    self.showArticles = true;
                }
            })
            .catch(function(err) {
                console.error(err);
                self.pageTitle = '加载失败';
            });
    },
    methods: {
        goArticle: function(article) {
            window.location.href = './blog.html?post=' + encodeURIComponent(article.path);
        },
        goSub: function(sub) {
            window.location.href = './list.html?category=' + encodeURIComponent(this.categoryId) + '&sub=' + encodeURIComponent(sub.id);
        }
    }
}).mount('#blogs');

Vue.createApp({
    data() {
        return {
            menuOpen: false
        };
    },
    methods: {
        home() { window.location.href = 'https://weirdsnap.github.io'; },
        list() { window.location.href = './list.html'; },
        github() { window.location.href = 'https://github.com/weirdsnap'; },
        toggleMenu() { this.menuOpen = !this.menuOpen; }
    }
}).mount('#header');
