# 死链接问题记录与预防

## 问题背景

博客文章之间通过 `blog.html?post=path/to/article.md` 相互引用。当文章被移动（如 LeetCode 重组文件夹）时，链接可能指向旧路径，导致 404。

## 已发生的问题

### 2026-07-25：ch10 链接指向旧路径

**问题**：`posts/leetcode/dp/ch10.md` 中的链接指向 `?post=leetcode/ch09.md`，但 ch09 已移到 `leetcode/dp/ch09.md`。

**修复**：`leetcode/ch09.md` → `leetcode/dp/ch09.md`

**根因**：LeetCode 文件夹重组（ch09 从根目录移到 dp/）时，引用它的文章没同步更新。

## 预防措施

### 1. 运行 validate.py

每次推送前运行：

```bash
python3 scripts/validate.py
```

该脚本会检查所有 `blog.html?post=` 链接是否指向存在的文件。

### 2. 移动文章时的检查清单

- [ ] 移动文件
- [ ] 运行 `python3 scripts/build_index.py`
- [ ] 运行 `python3 scripts/validate.py`
- [ ] 搜索引用旧路径的文章：`grep -rn "old/path" posts/`
- [ ] 更新所有引用
- [ ] 重新验证

### 3. 常见风险场景

| 场景 | 风险 |
|------|------|
| 重组文件夹（如 LeetCode 按算法分类） | 大量链接失效 |
| 文章编号变更 | 相邻导航自动更新，但手动链接可能失效 |
| 跨系列引用（如 AI inference 引用 AI models） | 路径变化影响其他系列 |

### 4. 链接格式规范

**前端跳转链接**（给用户点击的）：
```markdown
[文章标题](./blog.html?post=category/sub/article.md)
```

**系列内部参考**（同系列文章之间）：
```markdown
详见 [ch01/30](../30.md)
```

**跨系列绝对路径**（不同大分类之间）：
```markdown
详见 [/posts/cpp/ch08/07.md](/posts/cpp/ch08/07.md)
```

## 当前有效的 blog.html?post= 链接

| 来源文章 | 链接目标 | 状态 |
|---------|---------|------|
| leetcode/dp/ch10.md | leetcode/dp/ch09.md | ✅ |
| ai/inference/ch05.md | ai/inference/ch01.md | ✅ |
| ai/inference/ch02.md | ai/models/ch01.md | ✅ |
| ai/inference/ch02.md | ai/models/ch01.md | ✅ |

## 检查命令

```bash
# 查找所有 blog.html?post= 链接
grep -rn "blog.html?post=" posts/ | grep -v "index.json"

# 验证所有链接目标是否存在
python3 scripts/validate.py
```
