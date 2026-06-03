const { createApp } = Vue;

createApp({
    data() {
        return {
            categories: [],
            loading: true
        };
    },
    mounted() {
        fetch('./posts/index.json')
            .then(res => res.json())
            .then(data => {
                this.categories = data.categories || [];
                this.loading = false;
            })
            .catch(err => {
                console.error('Failed to load index:', err);
                this.loading = false;
            });
    },
    methods: {
        jumpCategory(cat) {
            window.location.href = `./htmls/list.html?category=${encodeURIComponent(cat.id)}`;
        }
    }
}).mount('#categories');

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
