# `std::function` 与 Lambda：两种"可调用对象"的类型鸿沟

Lambda 和 `std::function` 都能"存一个函数"，日常混用毫无障碍——`std::function<int(int)> f = [](int x) { return x; };` 一行就转过去了。但它们的**类型机制完全不同**，这个差异在模板代码里会突然咬人（比如推导失败）。这篇把两者的类型关系、转换规则、代价差异整理清楚。

---

## 一、Lambda：每个表达式一个独一无二的类型

每个 lambda 表达式都生成一个**匿名闭包类型**（closure type），该类型由编译器合成，没有名字，且**全程序唯一**：

```cpp
auto l1 = [](int x) { return x + 1; };
auto l2 = [](int x) { return x + 1; };  // 签名、函数体完全相同

static_assert(!std::is_same_v<decltype(l1), decltype(l2)>);  // ✅ 类型不同！
```

两个一模一样的 lambda 也是两个类型。推论：

- lambda 只能配合 `auto` / 模板使用，**写不出它的类型名**。
- `decltype(l1)` 可以指代它，但那是另一个语境的事。
- 函数参数想接 lambda，要么是模板（推导），要么是 `auto` 参数（C++20 缩写模板），要么……就得擦除类型（`std::function`）。

闭包类型的**大小 = 捕获成员的大小之和**（空捕获是空类，占 1 字节）：

```cpp
auto empty = [] { return 1; };
int buf[16] = {};
auto big = [buf] { return buf[0]; };   // 按值捕获 64 字节

sizeof(empty);  // 1（空类优化前的最小单位）
sizeof(big);    // 64
```

## 二、`std::function`：签名决定类型，内容被擦除

`std::function<R(Args...)>` 的类型**只由签名决定**。只要签名相同，装函数指针、lambda、仿函数、`std::bind` 结果，类型完全一样：

```cpp
std::function<int(int)> f1 = l1;
std::function<int(int)> f2 = l2;
static_assert(std::is_same_v<decltype(f1), decltype(f2)>);  // ✅ 类型相同
```

实现上是**类型擦除**：具体可调用对象的类型在构造时被"擦掉"，内部持有一个多态封装体（vtable：调用/拷贝/销毁）+ 一块小对象缓冲（SBO）。所以：

- `sizeof(std::function<int(int)>)` 是**固定值**（libstdc++ 实测 32 字节），与装入什么无关；
- 装入的可调用对象小于 SBO 缓冲（libstdc++ 为 16 字节）就原地存放，超出则**堆分配**；
- 调用走一次间接跳转，**无法内联**。

## 三、转换是单向的，而且是"用户定义转换"

```cpp
static_assert(std::is_convertible_v<decltype(l1), std::function<int(int)>>);   // ✅
static_assert(!std::is_convertible_v<std::function<int(int)>, decltype(l1)>);  // ✅ 不可逆
```

lambda → `std::function` 走的是 `std::function` 的**模板构造函数**——这是一次用户定义转换（user-defined conversion），不是隐式的"天然匹配"。擦除一旦完成，原始类型信息就丢了，没有任何办法从 `std::function` 取回 lambda（`target<T>()` 只能尝试取回**已知类型**的指针，是查询不是还原）。

**"用户定义转换"这个身份是理解一切坑的钥匙**：它意味着转换存在于重载决议阶段，而不存在于模板参数推导阶段。

## 四、坑：模板推导不过这道坎

```cpp
template <typename T>
void call_with(std::function<void(T)> f, T val) { f(val); }

call_with([](int x) { std::cout << x; }, 42);  // ❌ 推导失败
```

推导要求实参类型与 `std::function<void(T)>` **结构匹配**。lambda 的闭包类型不是 `std::function` 的特化，也不继承自它——结构匹配失败。转换明明存在，但推导阶段不看转换。

GCC 的报错原文把这个说得很直白：

```
'main()::<lambda(int)>' is not derived from 'std::function<void(T)>'
```

修复方法（详见 [type_identity 专题](./blog.html?post=cpp/practices/type_identity_01.md)）：

```cpp
// 方案 1：非推导语境，T 只从 val 推导
template <typename T>
void call_with(std::type_identity_t<std::function<void(T)>> f, T val);

// 方案 2：调用处显式指定
call_with<int>(print, 42);

// 方案 3（更好的设计）：根本不写死 std::function，让参数保持模板
template <typename F, typename T>
void call_with(F&& f, T val) { f(val); }  // lambda 原样传入，零开销
```

方案 3 值得多说一句：**如果接口不要求类型擦除，就不要用 `std::function` 做参数类型**。模板参数既能接 lambda 又能接一切可调用对象，还能内联。`std::function` 参数真正的价值在"必须抹掉类型"的场合（见下节）。

## 五、代价对比：什么时候该用哪个

| | lambda（配 auto/模板） | `std::function` |
|--|------------------------|-----------------|
| 类型 | 唯一匿名闭包类型 | 只由签名决定，固定 |
| 调用开销 | 可直接内联，零开销 | 间接跳转，无法内联 |
| 存储开销 | 捕获多少就多大 | 固定 32 字节（libstdc++），超出 SBO 堆分配 |
| 拷贝 | 逐成员拷贝，通常便宜 | 大闭包拷贝触发堆分配 |
| 异质存储 | ❌ 一个容器只能放一种类型 | ✅ `vector<function<...>>` 混放 |
| 递归引用自身 | 需要技巧 | 天然支持（类型在声明处完整） |

**该用 `std::function` 的场合**：

- **异质容器**：`std::vector<std::function<void()>>` 放回调列表、事件总线、任务队列。
- **跨 ABI / 接口边界**：给 C API 或插件系统传回调，类型必须稳定。
- **需要拷贝语义的存储**：类成员存一个回调，且类本身要可拷贝。
- **递归 lambda**（见 [Lambda 递归](./blog.html?post=cpp/practices/lambda_01.md)，不过 C++23 后首选 deducing this）。

**不该用的场合**：热路径上的回调、模板库的内部实现、只需要"当场调用"的场景——统统用模板参数/`auto`，让编译器内联。

## 六、一句话总结

Lambda 是"每个都不同的具体类型"，`std::function` 是"抹平差异的通用容器"；从前者到后者是一次**单向的用户定义转换**，它跨不过模板参数推导，这是两者关系里最容易踩的坑。

---

## 验证代码

`cpp_learning/templates/type_identity/`：

- 闭包类型唯一性、转换单向性、`std::function` 大小固定——编译期 `static_assert` 验证；
- 空捕获 lambda 1 字节、64 字节捕获的 lambda 64 字节、`std::function` 固定 32 字节——`type_identity.cpp` 实测输出；
- 推导失败修复版（`type_identity_t`）正常运行输出 42。

---

## 相关阅读

- `std::type_identity`：修复推导失败的工具（[practices/type_identity_01](./blog.html?post=cpp/practices/type_identity_01.md)）
- Lambda 递归三种写法（[practices/lambda_01](./blog.html?post=cpp/practices/lambda_01.md)）：`std::function` 的类型擦除在递归场景的应用
- `std::move_only_function` / `function_ref`（[ch09/02](./blog.html?post=cpp/ch09/02.md)）：更轻量的替代方案
