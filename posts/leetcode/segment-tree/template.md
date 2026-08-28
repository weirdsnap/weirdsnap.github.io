> **标签**：线段树、模板、分治
# 线段树：识别信号、代码骨架与节点设计三段论

这不是题解，是这个分类下所有题解的公共骨架。线段树的难点从来不在骨架（骨架半小时就能背熟），而在**节点设计**——本文的重点也在那。

---

## 什么时候想到线段树

两个信号同时出现：

1. **区间查询**（和、最值、最长连续段……）反复进行
2. 数组**可修改**（单点更新最常见），静态数组用前缀和就够了别上线段树

查询和更新都要 O(log n) 时才值得。单次查询、离线能排序处理的场景，多半有更简单的路。

## 代码骨架

```cpp
vector<Node> tree(4 * n);   // 以 1 为根，pos*2 / pos*2+1 为左右子

auto merge = [](const Node& L, const Node& R) -> Node { /* 见下文 */ };

auto build = [&](this auto&& self, int pos, int l, int r) -> void {
    if (l == r) { tree[pos] = /* 叶子 */; return; }
    int mid = (l + r) / 2;
    self(pos * 2, l, mid);
    self(pos * 2 + 1, mid + 1, r);
    tree[pos] = merge(tree[pos * 2], tree[pos * 2 + 1]);
};

auto update = [&](this auto&& self, int pos, int l, int r, int idx) -> void {
    if (l == r) { tree[pos] = /* 新叶子 */; return; }
    int mid = (l + r) / 2;
    if (idx <= mid) self(pos * 2, l, mid, idx);      // idx == mid 归左侧
    else            self(pos * 2 + 1, mid + 1, r, idx);
    tree[pos] = merge(tree[pos * 2], tree[pos * 2 + 1]);
};

auto query = [&](this auto&& self, int pos, int l, int r, int ql, int qr) -> Node {
    if (ql > r || qr < l) return /* 幺元 */;          // 不交集：返回中性元素
    if (ql <= l && qr >= r) return tree[pos];         // 全覆盖：整段返回
    int mid = (l + r) / 2;
    return merge(self(pos * 2, l, mid, ql, qr),
                 self(pos * 2 + 1, mid + 1, r, ql, qr));
};
```

## 节点设计三段论（真正的分水岭)

每道题只改三个地方，按这个顺序想：

1. **问什么**：题目要的答案是什么？（区间和 / 最长连续段 / ……）
2. **节点存什么**：为了让 `merge` 能算出父节点的答案，子节点还需要提供哪些**辅助信息**？（答案本身往往不够，见下）
3. **merge 怎么写**：左右两个子节点的信息怎么拼出父节点？

"辅助信息"是新手最容易卡的地方：比如问"最长连续段"，只存左右各自的 `best` 不够——跨中点的段可能更长，于是要补 `pre / suf`；而维护 `pre / suf` 又需要知道"是否整段相同"，于是再补 `len`。字段是一层层被 `merge` 的需求逼出来的。

## 题目地图

| 文章 | 题 | 节点字段 | 查询形态 |
|------|----|----------|----------|
| [ch50](./blog.html?post=leetcode/segment-tree/ch50.md) | 307 区域和检索 | 只存 `sum` | 子区间查询（骨架本尊） |
| [ch19](./blog.html?post=leetcode/dp/linear/ch19.md)（变体章节） | 53 最大子数组和 | `pre / suf / sum / best` 四元组 | 只查根（整体信息） |
| [ch52](./blog.html?post=leetcode/segment-tree/ch52.md) | 2213 单字符最长重复 | `pre / suf / best / len` + 首尾字符 | 只查根（整体信息） |

注：53 的主线解法是 Kadane（DP），文章在 [dp/linear/ch19](./blog.html?post=leetcode/dp/linear/ch19.md)，线段树解法作为变体章节寄生在那篇里——跨分类的解法不复制，只在这里登记入口。

## 两种查询形态

- **子区间查询**（307）：`query` 需要处理"不交集返回幺元、部分交集向下递归"，幺元设计容易出错（求和的幺元是 0，求 max 的幺元是 -∞）。
- **只查根**（53、2213）：答案就是 `tree[1].best`，**不需要写 query**——这是"整体信息型"线段树，比教科书版省一半代码。判断方法：题目问的恰好是整个数组的某种全局性质，且 merge 能维护它。

## 踩坑速查

- ❌ 以 1 为根却在调用时传 0——`pos*2` 永远到不了正确子树（[ch50](./blog.html?post=leetcode/segment-tree/ch50.md)）
- ❌ `idx <= mid` 归左、`idx > mid` 归右写反——和 `[l, mid] / [mid+1, r]` 的分界必须一致
- ❌ 数组开 `2 * n`——最坏情况要 `4 * n`
- ❌ merge 忘记考虑"跨中点"的情形（53/2213 的核心，[ch52](./blog.html?post=leetcode/segment-tree/ch52.md) 有完整的字段推导过程）

---

## 延伸

- 待写候选：315（树状数组入门，BIT 是线段树的轻量平替——只支持"前缀型"查询但代码量减半）、2407（线段树优化 DP）、673（LIS 计数）。
- 递归 lambda 的 `this auto&& self` 写法：[ch41](./blog.html?post=leetcode/dp/interval/ch41.md) 里有专门说明。
