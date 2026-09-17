# AGENTS.md

给 AI agent 的工作指南。人的开发规范见 `README.md`（架构、frontmatter、CI 规则都在那里，这里不重复，只写 agent 干活时必须遵守的流程和口径）。

## 项目速览

个人博客，纯静态，GitHub Pages 部署。数据流：`posts/` 目录结构 → `scripts/build_index.py` → `posts/index.json` → Vue 前端渲染。**分类就是目录**，目录名即分类 id，`_meta.json` 管显示名和排序。

环境：macOS；Python 用 `python3`；编译 C++ 用 `/opt/homebrew/bin/g++-14`（C++23 特性如 deducing this 需要它，Apple clang 不行）。

## 铁律

1. **不主动碰 git**。commit / push / 任何 git 变更都要等用户明确说（"推"、"推送"）。推送流程见下文。
2. **改完必验证**：`python3 scripts/build_index.py` + `python3 scripts/validate.py`，全绿才算完。
3. **不做范围外的事**：不改无关文件、不顺手重构、不主动新建文档。

## 写文章

### 通用

- 第一行必须是 `# 标题`（索引从第一行提取标题；改了标题必须重新生成索引）。
- 文章里引用别的文章：`[标题](./blog.html?post=分类/路径/文件名.md)`——**必须带 `.md` 后缀**，写之前确认目标文件存在。相邻文章的 prev/next 导航由前端自动算，正文里不写死。
- 代码块里出现大量 `{{` 时注意 Jekyll/Liquid 冲突（见 README 踩坑 3）。
- 新分类 / 子分类：建目录 + `_meta.json`（`label` + `order`，order 接现有最大值顺延）。

### LeetCode 题解（`posts/leetcode/`）

- **一题一章**，章节号全局递增（最新号看 `_plan.md` 末尾映射表）。先 `grep -nw 题号 posts/leetcode/_plan.md` 查重，注意子串误配（如查 734 会撞 3734）。
- 写完登记 `_plan.md` 映射表。
- 分类要名实相符（题的核心考点归哪个目录）；不确定就问，放错了用户会要求迁移。
- 文章结构惯例：标签行（`> **标签**：...`）→ H1（中文名 + 题号 + 英文名）→ 题意（示例 + 约束）→ 思路 → 解法 → 核心理解 → 复杂度表 → 踩坑点 → 延伸。
- **多解法文章按解法聚合**：每个解法的思路、代码、解读收在同一节里（思路段 → 代码块 → 关键点），不要把所有思路堆在前面、所有解读堆在最后的"核心理解"里；全局章节只留跨解法的内容（复杂度对比、共性数学事实等）。解法专属的踩坑点也写在该解法节内。
- DP 题的每个解法开头先写 `dp 定义：...`，把状态含义明确说出来，再讲转移。
- 并列的几件事（转移分类、情况讨论等）用列表写，不要堆在一个长句里用分号串。
- 避免"最直白最自然""最优最优雅"这类叠最高级的 AI 腔；评价代码留一句具体的就行。
- **用户的 AC 代码原样进代码块，注释一字不改。**
- 延伸区格式：`- [标题（题号）](./blog.html?post=...md)——一句话描述`；没写过的题只留题号纯文字，不挂链接。

### C++ 知识点（`posts/cpp/`）

- cppquiz 等外来题源的内容**按知识点归到 ch01~ch10 对应章节**，不按题源组织，不保留题号标记。
- 置顶文章：文件开头加 frontmatter `---\norder: 0\n---`（现有各分类 `template.md` 即此机制，列表页显示红色"置顶"徽章）。

### 文风（用户亲自改过，严格遵守）

- 正文少用破折号"——"，多用逗号、句号断句（延伸区的"标题——描述"格式除外，那里保留）。
- 不写夸张修辞，不喊口号，不像教科书。
- **不编造踩坑点**：没有真凭实据不写；要么实际跑代码试出来，要么不写。

## 验证代码的规矩

- 用户贴的、已在 LeetCode 官网 AC 的代码：**轻量验证**——官方样例 + 少量定向边界 + 小规模随机对拍，在 `/tmp` 下编译运行，**不在仓库里建测试目录**。
- agent 自己写的变体/对照实现：**必须验证**才能写进文章。
- **验证照做，但文章里完全不写验证情况**：不报告对拍规模、断言数、样例通过情况——"我们自己知道就行"。验证中发现的坑可以写进"踩坑点"，但用事实陈述的口吻，不提验证过程。

## 推送流程（用户说"推"之后执行）

```bash
# 1. 同步远端（用户可能直接在 GitHub 网页上改过）
git stash push -u -m wip && git pull --no-rebase && git stash pop

# 2. 先提交内容（不含索引；索引的日期取自 git 历史，必须先有内容提交）
git add -A -- ':!posts/index.json'
git commit -m "<内容描述>"

# 3. 内容入库后再生成索引，单独提交
python3 scripts/build_index.py
python3 scripts/validate.py        # 必须全绿
git add posts/index.json
git commit -m "index: 更新索引"

# 4. 推送，查 CI
git push
curl -s "https://api.github.com/repos/weirdsnap/weirdsnap.github.io/actions/runs?per_page=3"
```

CI 三个工作流（Blog CI / Validate Blog Data / Deploy to GitHub Pages）要**全部 success** 才算推送完成，有一个红了就查原因修复。

## 备忘

- `posts/leetcode/_plan.md` 是 leetcode 的规划底账：章节映射表、模板文章登记、待写清单都在里面，写完文章记得同步。
- 同一题号的多解法写进同一章，不开新章。
- 分类下的 `template.md`（骨架/速查类）不按题号登记，在 `_plan.md` 备注区写一句说明即可。
