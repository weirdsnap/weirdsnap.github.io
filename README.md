# weirdsnap.github.io

个人博客站点，纯静态部署在 GitHub Pages。

> 2018/3/9 创建，2026 年重构为 Markdown + Vue 3 驱动。

---

## 架构

**核心思路**：用文件夹组织文章，Python 脚本生成目录索引，Vue 3 前端动态渲染。

```text
数据流：
posts/ 文件夹结构  →  build_index.py  →  posts/index.json  →  Vue 前端渲染
```

**三种页面**：

| 页面 | 功能 | 数据来源 |
|------|------|----------|
| 首页 | 显示分类卡片 | `fetch('./posts/index.json')` |
| 列表页 | 显示文章列表 / 子分类 | `fetch('../posts/index.json')` + URL `?category=` |
| 文章页 | Markdown 渲染 | `fetch('../posts/xxx.md')` + `marked.js` |

**显示模式**：`_meta.json` 中的 `type` 字段控制列表页布局

| type | 效果 | 适用场景 |
|------|------|----------|
| `list` | 直接显示文章列表 | 杂文（essays） |
| `folder` | 先显示子分类卡片，点进去再显示文章 | CPP 知识（cpp/ch01 ~ ch10） |

---

## 目录结构

```text
posts/                      ← 博客源文件
├── index.json              ← 自动生成：目录索引
├── essays/                 ← 一级分类
│   ├── _meta.json          ← { "label": "杂文", "order": 1, "type": "list" }
│   └── ch01.md ~ ch10.md   ← 文章（第一行必须是 # 标题）
└── cpp/                    ← 一级分类
    ├── _meta.json          ← { "label": "CPP 知识", "order": 2, "type": "folder" }
    ├── ch01/               ← 二级子分类（章节）
    │   ├── _meta.json      ← { "label": "一、语言基础", "order": 1 }
    │   └── 01.md ~ 22.md   ← 知识点短文章
    └── ch02/ ~ ch10/

scripts/
├── build_index.py          ← 扫描 posts/ 生成 index.json
├── split_cpp.py            ← 把长章节拆分为知识点卡片
└── index.js / list.js / blog.js

serve.py                    ← 本地开发服务器（保存文件自动刷新浏览器）
```

---

## 本地开发

```bash
python3 serve.py
# http://localhost:8080
# 保存任意文件 → 浏览器自动刷新
```

---

## 写博客

### 1. 写 Markdown

在对应分类下新建 `.md`，**第一行必须是标题**：

```markdown
# 文章标题

正文...
```

### 2. 生成索引

```bash
python3 scripts/build_index.py
```

脚本扫描 `posts/` 下所有文件夹和 `.md` 文件，从第一行 `# ` 提取标题，生成 `posts/index.json`。**无需改任何 JS 代码**。

### 3. 推送

```bash
git add . && git commit -m "新增文章" && git push
```

---

## 新增分类 / 子分类

```bash
# 1. 创建文件夹
mkdir posts/algo

# 2. 写配置
cat > posts/algo/_meta.json << 'EOF'
{
  "label": "算法",
  "order": 3,
  "type": "list"
}
EOF

# 3. 放文章
echo "# 动态规划" > posts/algo/01.md

# 4. 生成索引
python3 scripts/build_index.py
```

子分类同理：在 `posts/cpp/` 下再建一层文件夹即可。

---

## 技术栈

- Vue 3（CDN）+ marked（Markdown 渲染）+ highlight.js（代码高亮）
- Python 3（构建脚本 + Live Reload 服务器）
- GitHub Pages（部署）
