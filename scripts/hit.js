/* 博客访问上报（方案：GameGuide docs/BLOG_ANALYTICS_PLAN.md §5）
 *
 * 只做一件事：页面打开时往后端发一条「哪类页面被读了」。
 * 不存 cookie、不读 localStorage、不做指纹；后端按天换盐算 UV，跨天串不起同一个人。
 * 任何异常都吞掉——上报是附加功能，不能影响页面本身。
 */
(function () {
  try {
    if (window.__hitSent) return;
    if (location.protocol === 'file:') return;   // 本地 file:// 预览不记

    var API = 'https://api.weirdsnap.top:8443/api/hit';
    var pathname = location.pathname;
    var q = new URLSearchParams(location.search);
    var path = null;
    var kind = 'other';

    if (pathname.indexOf('htmls/blog.html') >= 0) {
      var post = q.get('post');
      if (!post) return;                         // 没带 post 就是空壳页，不记
      path = '/post/' + post;
      kind = 'post';
    } else if (pathname.indexOf('htmls/list.html') >= 0) {
      path = '/list';
      kind = 'list';
    } else if (pathname.indexOf('htmls/hollow_knight.html') >= 0) {
      path = '/hk';
      kind = 'hk';
    } else {
      path = '/';
      kind = 'home';
    }
    if (!path || path.length > 200) return;

    // referrer 只留域名，站内跳转不算来源
    var ref = '';
    try {
      if (document.referrer) {
        var host = new URL(document.referrer).host;
        if (host && host !== location.host) ref = host;
      }
    } catch (e) {}

    var body = JSON.stringify({ p: path, k: kind, r: ref, w: window.innerWidth });
    window.__hitSent = true;

    if (navigator.sendBeacon) {
      // text/plain 的 Blob 是 simple request，不触发 CORS 预检
      navigator.sendBeacon(API, new Blob([body], { type: 'text/plain' }));
    } else {
      var x = new XMLHttpRequest();
      x.open('POST', API, true);
      x.setRequestHeader('Content-Type', 'text/plain');
      x.send(body);
    }
  } catch (e) {}
})();
