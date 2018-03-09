var name = new Vue({
    el: '#name',
    data: {
        massage : "Snap's Blog"
    },
    methods: {
        jumpList: function () {
            window.location.href='./htmls/list.html'
        }
    }
})
