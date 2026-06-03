const { createApp } = Vue;

createApp({
    data() {
        return {
            blogs: [
                { title: '刚开始写python遇到了很迷的bug', post: '001.md' },
                { title: '如何攥写一片高质量的数学建模论文', post: '002.md' },
                { title: '数学建模比赛基础了解', post: '003.md' },
                { title: '系统分析与设计(1)', post: '004.md' },
                { title: 'vue学习', post: '005.md' },
                { title: '系统分析与设计(2)', post: '006.md' },
                { title: '系统分析与设计(3)', post: '007.md' },
                { title: '系统分析与设计(4)', post: '008.md' },
                { title: '系统分析与设计(7)', post: '010.md' },
                { title: '前端知识复习', post: '011.md' }
            ]
        }
    },
    methods: {
        jumpBlog(blog) {
            window.location.href = `./blog.html?post=${encodeURIComponent(blog.post)}`
        }
    }
}).mount('#blogs');

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
