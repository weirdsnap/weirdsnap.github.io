# 渲染不可信 Markdown 的 XSS 风险与 DOMPurify 消毒

## 问题从哪来

本站的游戏助手页是一个 RAG 问答：前端拿到远端服务返回的回答，用 marked 渲染成 HTML，再通过 v-html 插入页面。链路是：

```
远端 LLM 回答 → marked.parse() → v-html 注入 DOM
```

这段链路里有三层不可信：

1. 回答来自远端服务，不是仓库里的静态内容。
2. RAG 的语料来自互联网，攻击者可以污染语料做间接提示词注入，诱使模型输出恶意 HTML。
3. marked 只负责把 Markdown 转成 HTML，官方明确声明不做消毒。

这个页面有口令鉴权，口令存在浏览器存储里，一旦 XSS 成功，口令直接被读走，后端 API 的访问权也就丢了。

## marked 到底漏了什么

CommonMark 允许在 Markdown 里直接写原始 HTML，marked 默认原样透传：

```markdown
<img src=x onerror=alert(1)>
```

渲染结果是带 onerror 的真实 img 元素，图片加载失败就执行脚本。

另一个通道是链接，Markdown 链接的 URL 不经过协议检查：

```markdown
[点我](javascript:alert(1))
```

生成的 `<a href="javascript:...">` 点击即执行。

v-html 底层是 innerHTML，`<script>` 标签通过 innerHTML 插入确实不会执行，但事件属性（onerror、onload）、iframe、javascript: 链接全都有效。"script 不执行"不等于安全。

## 方案对比

- **转义 `<>` 再 parse**：挡不住 javascript: 链接，还破坏合法排版。
- **CSP**：GitHub Pages 不能自定义响应头，只能用 meta 标签版 CSP，指令覆盖不全，配置也脆。可以当纵深防御，不能当主防线。
- **DOMPurify**：Cure53 维护的消毒库，marked 官方文档推荐的搭配。白名单思路，把输入解析成 DOM 后只保留已知安全的标签和属性，其余剥掉。

## 接入

项目没有构建步骤，第三方库都 vendor 在 scripts/vendor/，照惯例加一个文件：

```bash
curl -o scripts/vendor/purify.min.js \
  https://cdn.jsdelivr.net/npm/dompurify@3.4.12/dist/purify.min.js
```

```html
<script src="../scripts/vendor/marked.min.js"></script>
<script src="../scripts/vendor/purify.min.js"></script>
```

渲染处只改一行：

```js
const html = DOMPurify.sanitize(marked.parse(text, { breaks: true }));
```

默认配置对这个场景就是对的：markdown 的产物（p、pre、code、table、a、img）都在白名单里，不需要调。

## 消毒效果

几条典型 payload 经过 marked + DOMPurify 后的实际输出：

| 输入 | 输出 |
|---|---|
| `<img src=x onerror=alert(1)>` | `<img src="x">` |
| `<svg onload=alert(1)>` | `<svg></svg>` |
| `<script>alert(1)</script>` | 空 |
| `<iframe src="...">` | 空（iframe 不在默认白名单） |
| `[点我](javascript:alert(1))` | `<a>点我</a>`（href 被剥掉） |
| `<IMG SRC=x OnErRoR=...>`（大小写混淆） | `<img src="x">` |

正常的 markdown（加粗、代码、表格、https 链接）输出不变。代码块里的 HTML 由 marked 转义成文本，消毒前后都是纯文本，不会执行。

## 注意点

- 顺序必须是先 parse 后 sanitize，消毒对象是 HTML。如果反过来对 markdown 源文本消毒，markdown 语法本身就能绕过，比如链接的 `javascript:` 是 parse 之后才变成 href 的。
- DOMPurify 历史上出过 mXSS 绕过：消毒后的 HTML 换个上下文重新 innerHTML 时发生变异（如 CVE-2026-0540）。vendor 时锁定新版本，以后升级 marked 时顺手升级它。
- 默认白名单允许 img 的 data: URL，不允许 a 的 data:text/html，这个默认刚好合适。

## 性能

purify.min.js 体积 29KB（gzip 约 11KB），本地加载，对比同页面 vue.global.js 的 586KB 可以忽略。消毒基于 DOM 解析，几 KB 的聊天消息耗时在亚毫秒级。流式输出时每个 SSE chunk 都会跑一遍 parse + sanitize，但 marked.parse 本来就在每个 chunk 上跑，消毒增加的耗时是同量级的一小部分，不需要节流。
