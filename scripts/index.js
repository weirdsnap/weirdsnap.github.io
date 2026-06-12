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
                    allArticles: [],
                    loading: true,
                    error: '',
                    searchQuery: '',
                    searchResults: [],
                    menuOpen: false
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
                        this.categories = (data.categories || []).sort((a, b) => (a.order || 0) - (b.order || 0));
                        this.buildArticleIndex();
                        this.loading = false;
                    })
                    .catch(err => {
                        log('ERROR: ' + err.message);
                        this.error = '加载失败: ' + err.message;
                        this.loading = false;
                    });
            },
            methods: {
                buildArticleIndex() {
                    const articles = [];
                    for (const cat of this.categories) {
                        for (const art of (cat.articles || [])) {
                            articles.push({ ...art, categoryId: cat.id, categoryLabel: cat.label });
                        }
                        for (const sub of (cat.subs || [])) {
                            for (const art of (sub.articles || [])) {
                                articles.push({
                                    ...art,
                                    categoryId: cat.id,
                                    categoryLabel: cat.label,
                                    subId: sub.id,
                                    subLabel: sub.label
                                });
                            }
                        }
                    }
                    this.allArticles = articles;
                },
                onSearch() {
                    const q = this.searchQuery.trim().toLowerCase();
                    if (!q) {
                        this.searchResults = [];
                        return;
                    }
                    this.searchResults = this.allArticles
                        .filter(a => a.title && a.title.toLowerCase().includes(q))
                        .slice(0, 8);
                },
                goArticle(article) {
                    window.location.href = './htmls/blog.html?post=' + encodeURIComponent(article.path);
                },
                jumpCategory(cat) {
                    window.location.href = './htmls/list.html?category=' + encodeURIComponent(cat.id);
                },
                articleCount(cat) {
                    let subCount = 0;
                    if (cat.subs) {
                        for (let i = 0; i < cat.subs.length; i++) {
                            subCount += (cat.subs[i].articles || []).length;
                        }
                    }
                    return (cat.articles || []).length + subCount;
                },
                toggleMenu() {
                    this.menuOpen = !this.menuOpen;
                }
            }
        }).mount('#home');
        log('home app created');

        Vue.createApp({
            data() {
                return {
                    menuOpen: false
                };
            },
            methods: {
                home() {
                    window.location.href = 'https://weirdsnap.github.io';
                },
                leetcode() {
                    window.location.href = 'https://leetcode.cn/u/snap-1/';
                },
                github() {
                    window.location.href = 'https://github.com/weirdsnap';
                },
                toggleMenu() {
                    this.menuOpen = !this.menuOpen;
                }
            }
        }).mount('#header');
        log('header app created');
    } catch (e) {
        log('Vue ERROR: ' + e.message);
    }
}
