# 项目变更记录

## 项目背景

- **创建时间**：2018/3/9
- **原始架构**：纯静态 HTML + Vue 2 CDN，每篇博客一个独立 HTML 文件
- **当前架构**：Markdown 驱动 + Vue 3 CDN + 自动目录扫描 + Live Reload 开发服务器

---

## 2026-05-26 第一次重构：Vue 3 升级与清理

### 问题
- Vue 2 CDN (`cdn.jsdelivr.net/npm/vue`) 已失效/指向 Vue 3，导致页面空白
- 博客文章中含有大量本地绝对路径 (`file:///C:\Users\...`)

### 修改内容
1. **Vue CDN 升级**：`vue@2` → `vue@3/dist/vue.global.js`
2. **JS 语法升级**：`new Vue({...})` → `Vue.createApp({...}).mount()`
3. **移除本地路径**：删除 10 篇博客中的 `katex.min.css` 本地引用
4. **年份更新**：`2018-2018` → `2018-2026`

### 文件变更
- `index.html`、`htmls/list.html`：Vue CDN
- `scripts/index.js`、`scripts/list.js`：Vue 3 语法重写
- `htmls/blogs/001.html` ~ `011.html`：删除本地路径

---

## 2026-05-26 第二次重构：方案 A（Markdown + 前端渲染）

### 目标
- 博客源文件改用 Markdown，写博客不再需要手写 HTML

### 修改内容
1. **提取 Markdown**：用 Python 脚本从旧 HTML 中提取正文，生成 `posts/001.md` ~ `011.md`
2. **创建通用文章页**：`htmls/blog.html`
   - 引入 `marked.js`（Markdown 渲染）
   - 引入 `highlight.js`（代码高亮）
3. **创建文章样式**：`css/blog.css`（GitHub 风格阅读样式）
4. **修改列表逻辑**：`list.js` 中博客数据增加 `post` 字段，跳转 `blog.html?post=xxx.md`
5. **创建提取脚本**：`scripts/extract_md.py`

### 文件变更
- 新增：`posts/*.md`、`htmls/blog.html`、`scripts/blog.js`、`css/blog.css`、`scripts/extract_md.py`
- 修改：`scripts/list.js`

---

## 2026-06-03 第三次重构：首页分类入口

### 目标
- 首页不再是单一的"Snap's Blog"按钮，而是多个分类入口

### 修改内容
1. **首页改版**：中间区域改成多个并列卡片（横向排列，边缘自动换行）
2. **分类支持**：`list.html` / `list.js` 支持 `?category=xxx` 参数过滤
3. **数据打标签**：现有文章标记为 `category: 'essays'`，新增 CPP 示例文章标记为 `category: 'cpp'`

### 文件变更
- 修改：`index.html`、`scripts/index.js`、`css/style.css`
- 修改：`htmls/list.html`、`scripts/list.js`、`css/list.css`
- 新增：`posts/cpp_001.md` ~ `cpp_003.md`

---

## 2026-06-03 第四次重构：目录重组 + 自动抓取

### 目标
- 文章命名统一为 `ch*.md`
- 支持一级分类文件夹 + 可选二级子分类
- 网站自动扫描目录，无需手动维护 `list.js`

### 目录结构变更

```text
# 重构前
posts/
├── 001.md ~ 011.md          # 杂文
├── cpp_001.md ~ cpp_003.md  # CPP（旧示例）
└── ch01_language_foundation.md ~ ch10_misc.md  # CPP（用户文章）

# 重构后
posts/
├── index.json                  # 自动生成
├── essays/
│   ├── _meta.json              # { "label": "杂文", "order": 1 }
│   ├── ch01.md ~ ch10.md       # 原 001.md ~ 011.md
└── cpp/
    ├── _meta.json              # { "label": "CPP 知识", "order": 2 }
    └── ch01.md ~ ch10.md       # 原 ch01_*.md（重命名）
```

### 修改内容
1. **文件迁移与重命名**：
   - `001.md` ~ `011.md` → `posts/essays/ch01.md` ~ `ch10.md`
   - `ch01_language_foundation.md` ~ `ch10_misc.md` → `posts/cpp/ch01.md` ~ `ch10.md`
   - 删除 `cpp_001.md` ~ `cpp_003.md`（旧示例）
2. **构建脚本**：`scripts/build_index.py`
   - 递归扫描 `posts/` 目录
   - 读取 `_meta.json` 获取分类名和排序
   - 从每篇 `ch*.md` 的第一行 `# 标题` 提取标题
   - 生成 `posts/index.json`
3. **前端自动加载**：
   - `index.js`：从 `index.json` 动态渲染分类卡片
   - `list.js`：从 `index.json` 加载文章列表，支持一级文章 + 二级子分类
   - `blog.js`：支持子路径加载（如 `posts/cpp/ch01.md`）

### 文件变更
- 新增：`scripts/build_index.py`、`posts/essays/_meta.json`、`posts/cpp/_meta.json`
- 修改：`scripts/index.js`、`scripts/list.js`、`scripts/blog.js`、`htmls/list.html`、`css/list.css`
- 删除：`posts/001.md` ~ `011.md`、`posts/cpp_001.md` ~ `cpp_003.md`、`posts/ch01_*.md` ~ `ch10_*.md`

---

## 2026-06-03 第六次重构：CPP 知识卡片拆分

### 目标
- 每章长文章拆分为多个独立知识点短文章（知识卡片级别）
- 每章 = 子文件夹，每个知识点 = 单独 `.md` 文件

### 修改内容
1. **创建拆分脚本**：`scripts/split_cpp.py`
   - 读取 `posts/cpp/ch*.md`
   - 正则匹配 `### 数字. 标题` 分隔知识点
   - 生成 `posts/cpp/ch{序号}/{知识点序号}.md`
   - 为每章子文件夹生成 `_meta.json`
2. **执行拆分**：10 章 → 103 篇知识点卡片
3. **修改 `build_index.py`**：`scan_articles()` 从只扫 `ch*.md` 改为扫描**所有 `.md` 文件**
4. **修改 `list.html`**：恢复子分类（`subs`）显示，兼容 essays 的一级文章 + cpp 的二级子分类

### 文件变更
- 新增：`scripts/split_cpp.py`
- 删除：`posts/cpp/ch01.md` ~ `ch10.md`
- 新增：`posts/cpp/ch01/` ~ `ch10/` 共 103 篇知识点文章
- 修改：`scripts/build_index.py`、`htmls/list.html`

---

## 2026-06-03 第五次重构：Live Reload 开发服务器

### 目标
- 修改文件后浏览器自动刷新，无需手动重启服务器

### 修改内容
1. **创建 `serve.py`**：纯 Python 实现，无需额外依赖
   - 继承 `http.server.SimpleHTTPRequestHandler`
   - 返回 HTML 时自动注入 Live Reload 脚本
   - 轮询文件修改时间，变化时通知浏览器刷新
   - 强制禁用缓存（`Cache-Control: no-store`）

### 使用方法
```bash
python3 serve.py
# 浏览器打开 http://localhost:8080
# 保存任意文件 → 浏览器自动刷新
```

---

## 技术栈

| 组件 | 版本/来源 |
|------|----------|
| Vue | 3 (CDN: jsdelivr) |
| Markdown 渲染 | marked v15 (blog.html 中用 `{ async: false }` 强制同步) |
| 代码高亮 | highlight.js 11.9.0 |
| 构建脚本 | Python 3 + BeautifulSoup4 + markdownify |
| 开发服务器 | `serve.py` (Python 标准库) |
| 部署 | GitHub Pages |

---

## 后续操作流程

### 新增文章
1. 在 `posts/{分类}/` 下新建 `chXX.md`（第一行写 `# 标题`）
2. 运行 `python3 scripts/build_index.py`
3. `git push` 部署

### 新增分类
1. 新建文件夹 `posts/新分类/`
2. 创建 `_meta.json`：`{ "label": "显示名", "order": 排序号 }`
3. 放入 `ch*.md` 文章
4. 运行 `python3 scripts/build_index.py`

### 本地开发
```bash
python3 serve.py
# http://localhost:8080
```
