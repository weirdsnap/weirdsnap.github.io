# weirdsnap.github.io

个人博客站点，基于纯静态 HTML + Vue 3 + Markdown 前端渲染。

> 2018/3/9 开始创建，2026 年重构为 Markdown 驱动。

---

## 本地预览

在项目根目录启动一个本地 HTTP 服务器（必须用 HTTP 协议，`file://` 协议下 `fetch` 会失败）：

```bash
cd /Users/herta/learning/weirdsnap.github.io
python3 -m http.server 8080
```

浏览器打开 [http://localhost:8080](http://localhost:8080)

---

## 目录结构

```
posts/                      ← 博客文章源文件（Markdown）
├── index.json              ← 自动生成，供前端读取目录
├── essays/
│   ├── _meta.json          ← 分类配置：显示名、排序
│   ├── ch01.md
│   ├── ch02.md
│   └── ...
└── cpp/
    ├── _meta.json
    ├── ch01.md
    ├── ch02.md
    └── ...

htmls/
├── blog.html               ← 文章阅读页（Markdown 渲染）
├── list.html               ← 文章列表页
└── blogs/                  ← 旧版 HTML 文章（保留）

scripts/
├── index.js                ← 首页逻辑
├── list.js                 ← 列表页逻辑
├── blog.js                 ← 文章页逻辑
└── build_index.py          ← 扫描目录生成 index.json

css/
├── style.css
├── list.css
└── blog.css
```

---

## 新增文章

### 1. 写 Markdown 文件

在对应分类下新建 `chXX.md`，文件**第一行必须是标题**：

```markdown
# 文章标题

正文内容...
```

> 构建脚本会从第一行 `# ` 提取标题，写入 `index.json`。

### 2. 运行构建脚本

```bash
python3 scripts/build_index.py
```

脚本会扫描 `posts/` 下的所有分类和文章，自动生成 `posts/index.json`。前端页面读取这个 JSON 来渲染目录，**无需手动修改任何 JS 代码**。

### 3. 推送部署

```bash
git add .
git commit -m "新增文章"
git push
```

GitHub Pages 会自动更新。

---

## 新增分类

以新增"算法"分类为例：

### 1. 创建分类文件夹

```bash
mkdir posts/algo
```

### 2. 写分类配置

创建 `posts/algo/_meta.json`：

```json
{
  "label": "算法",
  "order": 3
}
```

| 字段 | 说明 |
|------|------|
| `label` | 页面上显示的分类名称 |
| `order` | 排序序号，越小越靠前 |

### 3. 放文章

```bash
# 第一行写标题
echo "# 动态规划入门" > posts/algo/ch01.md
```

### 4. 运行构建脚本

```bash
python3 scripts/build_index.py
```

首页会自动多出一个"算法"入口卡片，列表页也能正常显示。

---

## 新增二级子分类

以在 `cpp` 下新增"进阶"子分类为例：

### 1. 创建子文件夹

```bash
mkdir posts/cpp/advanced
```

### 2. 写子分类配置

创建 `posts/cpp/advanced/_meta.json`：

```json
{
  "label": "进阶篇",
  "order": 1
}
```

### 3. 放文章

```bash
echo "# C++ 模板元编程" > posts/cpp/advanced/ch04.md
```

### 4. 运行构建脚本

```bash
python3 scripts/build_index.py
```

列表页会自动显示"进阶篇"子标题和下面的文章列表。

---

## 注意事项

- 文章文件名必须是 `ch*.md` 格式（如 `ch01.md`、`ch02.md`），按数字顺序排列
- 构建脚本会忽略以 `.` 开头的隐藏文件夹
- 每个分类/子分类下必须放至少一篇 `ch*.md`，否则该分类不会出现在页面上
- 如果 `_meta.json` 不存在，默认使用文件夹名（首字母大写）作为显示名
- 运行构建脚本前确保在**项目根目录**执行

---

## 技术栈

- [Vue 3](https://vuejs.org/)（CDN）
- [Marked](https://marked.js.org/)（Markdown 渲染）
- [highlight.js](https://highlightjs.org/)（代码高亮）
- Python 3（构建脚本）
- GitHub Pages（部署托管）
