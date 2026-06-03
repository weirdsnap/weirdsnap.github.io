const { createApp } = Vue;

function getCategoryParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || '';
}

createApp({
    data() {
        return {
            categoryId: getCategoryParam(),
            categoryLabel: '',
            articles: [],
            subs: [],
            loading: true
        };
    },
    computed: {
        pageTitle() {
            return this.categoryLabel || 'Blog List';
        }
    },
    watch: {
        pageTitle(newVal) {
            document.title = newVal;
        }
    },
    mounted() {
        fetch('../posts/index.json')
            .then(res => res.json())
            .then(data => {
                const cat = (data.categories || []).find(c => c.id === this.categoryId);
                if (cat) {
                    this.categoryLabel = cat.label;
                    this.articles = cat.articles || [];
                    this.subs = cat.subs || [];
                } else {
                    this.categoryLabel = '未找到分类';
                }
                this.loading = false;
            })
            .catch(err => {
                console.error('Failed to load index:', err);
                this.loading = false;
            });
    },
    methods: {
        jumpBlog(article) {
            window.location.href = `./blog.html?post=${encodeURIComponent(article.path)}`;
        }
    }
}).mount('#blogs');

createApp({
    data() {
        return {
            categoryId: getCategoryParam(),
            categoryLabel: ''
        };
    },
    computed: {
        pageTitle() {
            return this.categoryLabel || 'Blog List';
        }
    },
    mounted() {
        fetch('../posts/index.json')
            .then(res => res.json())
            .then(data => {
                const cat = (data.categories || []).find(c => c.id === this.categoryId);
                if (cat) this.categoryLabel = cat.label;
            });
    }
}).mount('#category-title');

createApp({
    methods: {
        home() {
            window.location.href = 'https://weirdsnap.github.io';
        },
        github() {
            window.location.href = 'https://github.com/weirdsnap';
        }
    }
}).mount('#header');
