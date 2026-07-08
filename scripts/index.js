function log(msg) {
    console.log(msg);
    const el = document.getElementById('debug');
    if (el) el.innerHTML += msg + '<br>';
}

if (typeof Vue === 'undefined') {
    log('ERROR: Vue not loaded!');
} else {
    try {
        // Custom directive: close when clicking outside the element
        const clickOutside = {
            mounted(el, binding) {
                el._clickOutside = function(event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        binding.value();
                    }
                };
                document.addEventListener('click', el._clickOutside);
            },
            unmounted(el) {
                document.removeEventListener('click', el._clickOutside);
            }
        };

        Vue.createApp({
            directives: { 'click-outside': clickOutside },
            data() {
                return {
                    categories: [],
                    allArticles: [],
                    loading: true,
                    error: '',
                    searchQuery: '',
                    searchResults: [],
                    showSearchPanel: false,
                    menuOpen: false
                };
            },
            mounted() {
                fetch('./posts/index.json')
                    .then(res => {
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return res.json();
                    })
                    .then(data => {
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
                doSearch() {
                    const q = this.searchQuery.trim().toLowerCase();
                    if (!q) {
                        this.searchResults = [];
                        return;
                    }
                    this.searchResults = this.allArticles
                        .filter(a => a.title && a.title.toLowerCase().includes(q))
                        .slice(0, 8);
                },
                onSearch() {
                    this.showSearchPanel = true;
                    this.doSearch();
                },
                onSearchFocus() {
                    this.showSearchPanel = true;
                    if (this.searchQuery.trim()) {
                        this.doSearch();
                    }
                },
                closeSearch() {
                    this.showSearchPanel = false;
                },
                goArticle(article) {
                    this.closeSearch();
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

        Vue.createApp({
            data() {
                return {
                    menuOpen: false
                };
            },
            mounted() {
                var self = this;
                document.addEventListener('click', function(e) {
                    var header = document.getElementById('header');
                    if (header && !header.contains(e.target)) {
                        self.menuOpen = false;
                    }
                });
            },
            methods: {
                home() {
                    window.location.href = './index.html';
                },
                leetcode() {
                    window.location.href = 'https://leetcode.cn/u/snap-1/';
                },
                hollowKnight() {
                    window.location.href = 'htmls/hollow_knight.html';
                },
                github() {
                    window.location.href = 'https://github.com/weirdsnap';
                },
                toggleMenu() {
                    this.menuOpen = !this.menuOpen;
                }
            }
        }).mount('#header');
    } catch (e) {
        log('Vue ERROR: ' + e.message);
    }
}
