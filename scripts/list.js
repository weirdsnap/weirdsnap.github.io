function getCategoryParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || '';
}

Vue.createApp({
    data: function() {
        console.log('data() called');
        return {
            categoryId: getCategoryParam(),
            categoryLabel: '',
            articles: [],
            subs: [],
            loading: true
        };
    },
    computed: {
        pageTitle: function() {
            return this.categoryLabel || 'Blog List';
        }
    },
    watch: {
        pageTitle: function(newVal) {
            document.title = newVal;
        }
    },
    mounted: function() {
        console.log('mounted, categoryId=' + this.categoryId);
        var self = this;
        fetch('../posts/index.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var cat = (data.categories || []).find(function(c) { return c.id === self.categoryId; });
                if (cat) {
                    self.categoryLabel = cat.label;
                    self.articles = cat.articles || [];
                    self.subs = cat.subs || [];
                    console.log('loaded ' + self.articles.length + ' articles');
                } else {
                    self.categoryLabel = '未找到分类';
                }
                self.loading = false;
            })
            .catch(function(err) {
                console.error('Failed to load index:', err);
                self.loading = false;
            });
    },
    methods: {
        jumpBlog: function(article) {
            window.location.href = './blog.html?post=' + encodeURIComponent(article.path);
        }
    }
}).mount('#blogs');

Vue.createApp({
    data: function() {
        return {
            categoryId: getCategoryParam(),
            categoryLabel: ''
        };
    },
    computed: {
        pageTitle: function() {
            return this.categoryLabel || 'Blog List';
        }
    },
    mounted: function() {
        var self = this;
        fetch('../posts/index.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var cat = (data.categories || []).find(function(c) { return c.id === self.categoryId; });
                if (cat) self.categoryLabel = cat.label;
            });
    }
}).mount('#category-title');

Vue.createApp({
    methods: {
        home: function() {
            window.location.href = 'https://weirdsnap.github.io';
        },
        github: function() {
            window.location.href = 'https://github.com/weirdsnap';
        }
    }
}).mount('#header');
