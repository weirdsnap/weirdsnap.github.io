function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
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
            showSubs: false
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
                        self.articles = sub.articles || [];
                        self.showArticles = true;
                    }
                    return;
                }

                // Category view
                self.pageTitle = cat.label;
                if (cat.type === 'folder' && cat.subs && cat.subs.length > 0) {
                    self.subs = cat.subs;
                    self.showSubs = true;
                } else {
                    self.articles = cat.articles || [];
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
    methods: {
        home: function() { window.location.href = 'https://weirdsnap.github.io'; },
        github: function() { window.location.href = 'https://github.com/weirdsnap'; }
    }
}).mount('#header');
