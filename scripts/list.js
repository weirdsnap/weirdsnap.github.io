function getCategoryParam() {
    var params = new URLSearchParams(window.location.search);
    return params.get('category') || '';
}

function getSubParam() {
    var params = new URLSearchParams(window.location.search);
    return params.get('sub') || '';
}

Vue.createApp({
    data: function() {
        return {
            categoryId: getCategoryParam(),
            subId: getSubParam(),
            categoryLabel: '',
            categoryType: 'list',
            articles: [],
            subs: [],
            currentSub: null,
            loading: true
        };
    },
    computed: {
        pageTitle: function() {
            if (this.currentSub) {
                return this.currentSub.label;
            }
            return this.categoryLabel || 'Blog List';
        },
        isFolderView: function() {
            return this.categoryType === 'folder' && !this.subId;
        }
    },
    watch: {
        pageTitle: function(newVal) {
            document.title = newVal;
        }
    },
    mounted: function() {
        var self = this;
        fetch('../posts/index.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var cat = (data.categories || []).find(function(c) { return c.id === self.categoryId; });
                if (cat) {
                    self.categoryLabel = cat.label;
                    self.categoryType = cat.type || 'list';
                    self.articles = cat.articles || [];
                    self.subs = cat.subs || [];

                    // If subId is specified, find the sub and show its articles
                    if (self.subId) {
                        var sub = self.subs.find(function(s) { return s.id === self.subId; });
                        if (sub) {
                            self.currentSub = sub;
                            self.articles = sub.articles || [];
                        }
                    }
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
        },
        jumpSub: function(sub) {
            window.location.href = './list.html?category=' + encodeURIComponent(this.categoryId) + '&sub=' + encodeURIComponent(sub.id);
        },
        goBack: function() {
            window.location.href = './list.html?category=' + encodeURIComponent(this.categoryId);
        }
    }
}).mount('#blogs');

Vue.createApp({
    data: function() {
        return {
            categoryId: getCategoryParam(),
            subId: getSubParam(),
            categoryLabel: '',
            currentSubLabel: ''
        };
    },
    computed: {
        pageTitle: function() {
            if (this.currentSubLabel) {
                return this.currentSubLabel;
            }
            return this.categoryLabel || 'Blog List';
        }
    },
    mounted: function() {
        var self = this;
        fetch('../posts/index.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var cat = (data.categories || []).find(function(c) { return c.id === self.categoryId; });
                if (cat) {
                    self.categoryLabel = cat.label;
                    if (self.subId) {
                        var sub = (cat.subs || []).find(function(s) { return s.id === self.subId; });
                        if (sub) self.currentSubLabel = sub.label;
                    }
                }
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
