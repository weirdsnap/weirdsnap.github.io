var app4 = new Vue({
    el: '#blogs',
    data: {
      blogs: [
        { iframe: '<iframe src="../htmls/blogs/001.html" frameborder="0" scrolling="no" class="opacity90" @click="jumpBlog"></iframe>' ,name: '../htmls/blogs/001.html'},
        { iframe: '<iframe src="../htmls/blogs/002.html" frameborder="0" scrolling="no" class="opacity90" @click="jumpBlog"></iframe>' ,name: '../htmls/blogs/002.html'}
      ]
    },
    methods: {
        jumpBlog : function() {
            window.location.href= this.name
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