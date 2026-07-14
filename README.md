# weirdsnap.github.io

[![Validate Blog Data](https://github.com/weirdsnap/weirdsnap.github.io/actions/workflows/validate.yml/badge.svg)](https://github.com/weirdsnap/weirdsnap.github.io/actions/workflows/validate.yml)
[![Blog CI](https://github.com/weirdsnap/weirdsnap.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/weirdsnap/weirdsnap.github.io/actions/workflows/ci.yml)

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
├── validate.py             ← 数据完整性检查
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

> ⚠️ `index.json` 中的标题会从第一行 `# ` 提取。如果之后改了标题，记得重新生成索引。

### 2. 可选：YAML Frontmatter

如需手动指定发布/更新日期，可在文件开头加 frontmatter：

```markdown
---
date: 2026-06-24
updated: 2026-06-25
---

# 文章标题

正文...
```

| 字段 | 说明 |
|------|------|
| `date` | 发布日期 |
| `updated` | 最后更新日期 |
| `title` | 标题（可选，不写则从第一行 H1 提取） |

未指定日期时，`build_index.py` 会从 `git log` 自动提取：
- `date`：文件首次提交日期
- `updated`：文件最后修改日期

### 3. 生成索引

```bash
python3 scripts/build_index.py
```

脚本扫描 `posts/` 下所有文件夹和 `.md` 文件：
- 从第一行 `# ` 提取标题
- 按文件名中的数字排序（如 `01.md` → order 1）
- 计算字数和阅读时间
- 提取/生成日期
- 生成 `posts/index.json`

**无需改任何 JS 代码**。

### 4. 推送

```bash
git add . && git commit -m "新增文章" && git push
```

---

## 重新排序 / 改名

文章顺序由**文件名中的数字**决定，子分类顺序由 `_meta.json` 的 `order` 决定。

- 改文件名数字即可重排
- 改文件名不影响导航，因为 `blog.js` 从 `index.json` 动态计算 prev/next
- 改名后如果其他文章里有硬编码链接，CI 死链检查会报错

---

## 文章导航

### 相邻文章导航（自动生成）

文章页底部会自动显示**上一篇 / 下一篇**导航：

- 基于当前文章在**同一子分类/分类**中的顺序
- 由 `blog.js` 从 `index.json` 动态计算，无需手动维护
- 重排、改名、新增文章后会自动更新

**因此，文章正文中不要写死相邻文章的链接。**

✅ 正确写法：

```markdown
上一章我们聊了 LLM 推理时的内存占用。
```

❌ 错误写法：

```markdown
[上一章：LLM 推理的内存都去哪了？](./blog.html?post=ai/inference/ch01.md)
```

### 特定章节引用（手动链接）

引用**不相邻的特定文章**时，**应该写链接**：

```markdown
Transformer 的细节可以参考 [AI 模型系列的 Transformer 详解](./blog.html?post=ai/models/ch02.md)。
```

这种硬链接会被 CI 死链检查保护：如果目标文章改名、删除或移动路径导致 `?post=...` 失效，`validate.py` 会在推送时报错，提示你手动更新。

```bash
Validation failed:
1 dead link(s) found:
  - ai/models/ch01.md -> ?post=ai/models/ch02.md
```

> 当前没有自动重连机制，改名/重排后需要全局搜索旧路径并手动替换。

---

## 阅读时间

文章页显示"预计阅读 X 分钟"，计算规则：

- 中文字符：1 单位
- 英文单词：0.5 单位
- 技术文章阅读速度：**300 单位/分钟**

```text
阅读时间 = max(1, round((中文字符数 + 英文单词数 × 0.5) / 300))
```

字数显示为：`中文字符数 + 英文单词数`。

---

## CI 检查规则

每次 push 到 master/main 时，GitHub Actions 会运行：

### Blog CI

1. 运行 `python3 scripts/build_index.py`
2. 检查 `posts/index.json` 是否已是最新
3. 检查 `posts/index.json` 是否是合法 JSON

### Validate Blog Data

运行 `python3 scripts/validate.py`，检查：

| 检查项 | 说明 |
|--------|------|
| NUL bytes | `.md` 文件中不能包含 NUL 字符 |
| index.json 合法 | 必须是有效 JSON |
| 路径存在 | `index.json` 中每篇文章的 `path` 都对应真实文件 |
| 标题非空 | 每篇文章必须有标题 |
| 标题不重复 | 不同文章不能同名 |
| **标题与 H1 一致** | `index.json` 中的 `title` 必须等于文章第一行 `# ` 标题 |
| **无死链** | 文章中的 `?post=...` 链接必须指向 `index.json` 中存在的文章 |

如果 CI 失败，根据报错修复后重新生成索引再 push。

---

## GitHub Pages 自动部署

Settings → Pages 的 Source 已改为 **GitHub Actions**，由 `.github/workflows/pages.yml` 接管部署：

1. push 到 `master` 时触发 workflow
2. 运行 CI 检查（build index + validate）
3. CI 通过后自动打包并部署到 GitHub Pages
4. 无需手动切换 Source，也无需等待默认 `pages-build-deployment`

> 如果 CI 任何一步失败，部署不会执行，修复后重新 push 即可。

---

## CI 踩坑记录

### 1. `index.json` 忘记提交

**现象**：Blog CI 报 `posts/index.json is out of date`。

**原因**：新增/删除/改名/改标题后，只改了 `.md`，没运行 `build_index.py`，也没把 `posts/index.json` 一起提交。

**修复**：

```bash
python3 scripts/build_index.py
git add posts/index.json
git commit -m "chore(index): regenerate"
```

### 2. GitHub Actions 是 shallow clone，导致日期和本地不一致

**现象**：本地明明已经运行过 `build_index.py` 并提交了 `index.json`，CI 仍然报 `posts/index.json is out of date`。

**原因**：`actions/checkout@v4` 默认 `fetch-depth: 1`，CI 环境里 `git log --follow` 只能看到最近一个 commit。`build_index.py` 用 git 历史推算 `date/updated` 时，算出的日期和本地完整历史不一致，生成的 `index.json` 自然也不一样。

**修复**：`.github/workflows/ci.yml` 里让 checkout 拉取完整历史。

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

> 这次 Flash Attention 文章更新后 CI 失败，就是这个问题，不是 index.json 没更新。

### 3. GitHub Pages 把 `{{` 当成 Jekyll/Liquid 模板

**现象**：页面构建失败，或部署后代码块里的 `{{` 消失/报错。

**原因**：GitHub Pages 默认用 Jekyll 构建，`{{` 和 `}}` 会被解析为 Liquid 变量语法。

**修复**：

- 如果整段代码含大量 `{{`，用 `{% raw %}` 包裹：

```markdown
{% raw %}
```cpp
auto p = std::make_shared<int>(42);
std::cout << {{p}}; // 示例
```
{% endraw %}
```

- 如果只是占位符（如 `{{todo}}`），直接改成纯文本 `TODO`，避免触发 Liquid。

### 4. 标题改了但 `index.json` 没同步

**现象**：Validate Blog Data 报 `title mismatch`。

**原因**：修改了 `.md` 第一行的 `# ` 标题，但没有重新生成 `index.json`，导致 `index.json` 里的 `title` 和文件里的 H1 不一致。

**修复**：改标题后必须重新运行 `python3 scripts/build_index.py`。

### 5. 文章改名/移动后死链

**现象**：Validate Blog Data 报 `dead link`。

**原因**：文章路径变了，但其他文章里硬编码的 `?post=旧路径.md` 没改。

**修复**：全局搜索旧路径并替换，然后重新生成索引。注意相邻文章的 `prev/next` 导航是前端自动计算的，正文中不要写死相邻文章的链接。

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
