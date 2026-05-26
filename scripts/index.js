const { createApp } = Vue;

createApp({
    data() {
        return {
            massage: "Snap's Blog"
        }
    },
    methods: {
        jumpList() {
            window.location.href = './htmls/list.html'
        }
    }
}).mount('#name');

createApp({
    methods: {
        home() {
            window.location.href = 'https://weirdsnap.github.io'
        },
        github() {
            window.location.href = 'https://github.com/weirdsnap'
        }
    }
}).mount('#header');
