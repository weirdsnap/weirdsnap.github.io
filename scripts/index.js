function log(msg) {
    console.log(msg);
    const el = document.getElementById('debug');
    if (el) el.innerHTML += msg + '<br>';
}

log('JS loaded, Vue=' + typeof Vue);

if (typeof Vue === 'undefined') {
    log('ERROR: Vue not loaded!');
} else {
    log('Vue version check...');
    try {
        Vue.createApp({
            data() {
                return {
                    categories: [],
                    loading: true,
                    error: ''
                };
            },
            mounted() {
                log('Vue mounted, fetching...');
                fetch('./posts/index.json')
                    .then(res => {
                        log('fetch status: ' + res.status);
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return res.json();
                    })
                    .then(data => {
                        log('data loaded, categories: ' + (data.categories || []).length);
                        this.categories = data.categories || [];
                        this.loading = false;
                    })
                    .catch(err => {
                        log('ERROR: ' + err.message);
                        this.error = '加载失败: ' + err.message;
                        this.loading = false;
                    });
            },
            methods: {
                jumpCategory(cat) {
                    window.location.href = './htmls/list.html?category=' + encodeURIComponent(cat.id);
                },
                articleCount(cat) {
                    var subCount = 0;
                    if (cat.subs) {
                        for (var i = 0; i < cat.subs.length; i++) {
                            subCount += (cat.subs[i].articles || []).length;
                        }
                    }
                    return (cat.articles || []).length + subCount;
                }
            }
        }).mount('#categories');
        log('categories app created');

        Vue.createApp({
            methods: {
                home() {
                    window.location.href = 'https://weirdsnap.github.io';
                },
                github() {
                    window.location.href = 'https://github.com/weirdsnap';
                }
            }
        }).mount('#header');
        log('header app created');
    } catch (e) {
        log('Vue ERROR: ' + e.message);
    }
}
