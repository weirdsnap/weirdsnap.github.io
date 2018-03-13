var app4 = new Vue({
    el: '#blogs',
    data: {
      blogs: [
        { title: '刚开始写python遇到了很迷的bug' ,name: '../htmls/blogs/001.html'},
        { title: '如何攥写一片高质量的数学建模论文' ,name: '../htmls/blogs/002.html'},
        { title: '数学建模比赛基础了解' ,name: '../htmls/blogs/003.html'},
        { title: '系统分析与设计(1)' ,name: '../htmls/blogs/004.html'},
        { title: 'temp' ,name: '../htmls/blogs/004.html'}
      ]
    },
    methods: {
        jumpBlog : function(blog) {
            // alert(this)
            window.location.href= blog.name
        }
    }
})

var header = new Vue({
    el: '#header',
    methods: {
        home : function() {
            window.location.href='https://weirdsnap.github.io'
        },
        github : function() {
            window.location.href='https://github.com/weirdsnap'
        }
    }
})