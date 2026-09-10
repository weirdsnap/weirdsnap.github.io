---
order: 0
---
> **标签**：工具函数、速查
# 常用辅助代码片段速查

LeetCode 题解里反复出现、又和具体题目解耦的小片段，统一收在这里。只收本站题解里实际用过的，以后新用到随时补。每条附出处，想看完整上下文点过去。

---

## 幂运算

### 朴素幂

指数很小（个位数）时直接循环乘，最不容易写错。出处：[阿姆斯特朗数（1134）](./blog.html?post=leetcode/math/ch98.md)

```cpp
int power(int base, int exp) {
    int res = 1;
    while (exp--) res *= base;
    return res;
}
```

### 快速幂（防溢出）

指数大或底数大时用。中间量全部 `long long`，否则 `b *= b` 那步先溢出。出处同上，原文注释里的备用版：

```cpp
int power(int base, int exp) {
    long long res = 1;
    long long b = base;
    while (exp) {
        if (exp & 1) res *= b;
        b *= b;
        exp >>= 1;
    }
    return (int)res;
}
```

### 取模快速幂

答案要求对 `1e9+7` 之类的模数取模时，每一步都模。出处：[边权赋值方案数（3558 / 3559）](./blog.html?post=leetcode/graph/ch02.md)

```cpp
const long long MOD = 1e9 + 7;
long long ans = 1, base = 2, exp = max_depth - 1;
while (exp > 0) {
    if (exp & 1) ans = (ans * base) % MOD;
    base = (base * base) % MOD;
    exp >>= 1;
}
```

## Trie 字典树

ASCII 直接定址版本，省去哈希表开销。适用于"一堆模式串在一个文本里反复匹配"的场景。出处：[给字符串加粗标签（616）](./blog.html?post=leetcode/string/ch86.md)

```cpp
struct TrieNode {
    TrieNode* children[128];   // ASCII 直接定址
    bool isEnd;
    TrieNode() {
        memset(children, 0, sizeof(children));
        isEnd = false;
    }
};

class Trie {
public:
    TrieNode* root = new TrieNode();
    void insert(const string& word) {
        TrieNode* node = root;
        for (char c : word) {
            if (!node->children[c]) node->children[c] = new TrieNode();
            node = node->children[c];
        }
        node->isEnd = true;
    }
};
```

## 方向数组

网格 BFS/DFS 的四邻居遍历。出处：[打扫教室的最少移动次数（3568）](./blog.html?post=leetcode/graph/ch79.md)

```cpp
const int dx[4] = {0, 1, 0, -1};
const int dy[4] = {1, 0, -1, 0};
for (int k = 0; k < 4; ++k) {
    int nx = x + dx[k];
    int ny = y + dy[k];
    if (nx < 0 || nx >= m || ny < 0 || ny >= n) continue;  // 越界检查
    // ...
}
```

## 字符计数数组

字符集固定为小写字母时，`int cnt[26]` 比 `map`/`unordered_map` 都快且省内存。索引就是 `c - 'a'`。出处：[最小回文重排 I（3517）](./blog.html?post=leetcode/string/ch33.md)、[长度为 K 的无重复字符子串（1100）](./blog.html?post=leetcode/sliding-window/ch73.md)

```cpp
int cnt[26] = {0};
for (char c : s) cnt[c - 'a']++;
```

## 段计数公式

一段长度为 `k` 的连续相同字符，贡献 `k*(k+1)/2` 个合法子串。等差数列求和，不必枚举。数据范围大了记得换 `long long`。出处：[只含一种字母的子串计数（1180）](./blog.html?post=leetcode/string/ch99.md)

```cpp
result += cnt * (cnt + 1) / 2;  // 连续 k 个相同字母贡献 k*(k+1)/2 个子串
```

## `lower_bound` 找第一个大于等于

在有序数组里找"第一个 `>= x` 的位置"，找到就替换、找不到就追加。LIS 的 `tails` 数组维护就靠它。出处：[最长递增子序列（300）](./blog.html?post=leetcode/dp/linear/ch20.md)

```cpp
auto it = lower_bound(tails.begin(), tails.end(), num);
if (it == tails.end()) {
    tails.push_back(num);
} else {
    *it = num;
}
```
