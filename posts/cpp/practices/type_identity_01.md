# `std::type_identity`：给模板推导踩刹车的工具

`std::type_identity`（C++20）是标准库里最简单却又最微妙的工具之一——它的全部实现只有两行：

```cpp
template <typename T>
struct type_identity { using type = T; };

template <typename T>
using type_identity_t = typename type_identity<T>::type;
```

`type_identity_t<T>` 恒等于 `T`，看起来是个"什么都没做"的恒等变换。它的价值不在结果，而在**过程**：`typename type_identity<T>::type` 这个写法让 `T` 出现在 `::` 的左边（嵌套名限定符，nested-name-specifier），而标准明确规定这是**非推导语境**——模板参数推导会跳过它。

---

## 一、先理解：什么是非推导语境

模板参数推导对每个参数独立做 P/A 配对，要求**结构匹配**。但有些位置按规则不参与匹配，这些位置叫非推导语境（non-deduced contexts），§[temp.deduct.type]¶5 列出了完整清单，最常见的就是：

> **嵌套名限定符**：`A<T>::B` 中，`A<T>` 部分的 `T` 不参与推导。

为什么？因为 `A<T>::B` 要等 `T` 确定后才能查表（`B` 是 `A<T>` 的成员），编译器无法反过来从 `B` 的类型猜出 `T`——`A` 可能是特化过的，`A<int>::B` 和 `A<double>::B` 可以是完全不同的类型，反查没有唯一解。

`type_identity` 正是利用这条规则：`type_identity<T>::type` 就是 `T`，但因为 `T` 躲在 `::` 左边，推导器对它视而不见。

---

## 二、用途一：修复"推导不考虑隐式转换"的失败

经典场景（cppquiz 原题）：

```cpp
template <typename T>
void call_with(std::function<void(T)> f, T val) { f(val); }

auto print = [](int x) { std::cout << x; };
call_with(print, 42);  // ❌ 推导失败
```

失败原因：参数 1 要求实参类型结构匹配 `std::function<void(T)>`，但 lambda 的闭包类型跟 `std::function` 没有继承关系——lambda → `std::function` 是**用户定义转换**，而模板推导不做隐式转换。两个参数一个推不出、一个推出 `T = int`，合并失败。

用 `type_identity_t` 把参数 1 移出推导：

```cpp
template <typename T>
void call_with(std::type_identity_t<std::function<void(T)>> f, T val) { f(val); }

call_with(print, 42);  // ✅ 输出 42
```

现在的流程变成：

1. 参数 1 是非推导语境，跳过；参数 2 推出 `T = int`。
2. 参数 1 的类型随之确定为 `std::function<void(int)>`。
3. 进入重载决议，lambda → `std::function<void(int)>` 的隐式转换**此时可用**。

一句话：`type_identity` 不是让转换变合法（本来就合法），而是**把冲突的类型检查从推导阶段推迟到重载决议阶段**，那里允许隐式转换。

## 三、用途二：强制多个参数同类型

没有 `type_identity` 时，每个 `T` 位置都独立推导，可能推出不同类型：

```cpp
template <typename T, typename U>
T clamp(T v, U lo, U hi);  // clamp(5, 1L, 3L)：T=int, U=long，各推各的
```

想让所有参数必须同类型（推导自第一个参数，其余只做转换检查）：

```cpp
template <typename T>
T clamp_same(T v, std::type_identity_t<T> lo, std::type_identity_t<T> hi) {
    return v < lo ? lo : (hi < v ? hi : v);
}

clamp_same(5, 1, 3);     // ✅ T=int
// clamp_same(5, 1L, 3L);  // ❌ T 已由 5 定为 int，long 不参与推导，只能转换
```

这和标准库的设计一致：`std::min(a, b)` 要求两个参数同类型，内部就是单模板参数 `const T&`。`type_identity` 让你在多参数场景实现同样的约束。

## 四、用途三：阻止类型退化

`ch01/07`（类型退化）里见过这个用法：数组/函数在模板按值推导时退化为指针，用 `type_identity_t` 包住可以阻止：

```cpp
int arr[3] = {};
auto a = arr;                                // int*（退化）
std::type_identity_t<decltype(arr)> x = {};  // int[3]（不退化）
```

原理相同：`decltype(arr)` 的结果通过 `::type` 取出，不是推导语境，`auto` 推导的退化规则不适用。实际代码里更常见的等价写法是直接声明 `decltype(arr) x = {}`，但 `type_identity_t` 在模板元编程的组合中更通用。

## 五、用途四：把类型当值传递（tag dispatching）

`type_identity<T>` 本身是个空类，可以**构造实例**，把类型信息打包成一个值：

```cpp
template <typename T>
constexpr size_t size_of_tag(std::type_identity<T>) {
    return sizeof(T);
}

size_of_tag(std::type_identity<double>{});  // 8，T 从实参类型推导
```

这比传统的 `tag<T>{}` 手写标签结构省事，也比 `sizeof(T)` 的模板函数写法灵活——类型可以顺着函数调用链以值的形式流动，配合 `auto` 形参（C++20 缩写模板）尤其顺手：

```cpp
void process(auto tag) {
    using T = typename decltype(tag)::type;  // 从值取回类型
    // ...
}
process(std::type_identity<MyStruct>{});
```

---

## 六、和近似工具的区别

| 工具 | 作用 | 推导行为 |
|------|------|----------|
| `std::type_identity_t<T>` | 恒等，但阻止推导 | 非推导语境 |
| `std::decay_t<T>` | 执行退化（去引用/cv、数组函数转指针） | 正常参与推导 |
| `std::remove_reference_t<T>` | 去引用 | 正常参与推导 |
| `typename T::type`（依赖成员） | 取成员类型 | 整个表达式非推导 |

注意区分：**`type_identity` 不改变类型，只改变"是否参与推导"**；`decay_t` 等是真的改变类型。

---

## 七、常见误区

- ❌ **以为 `type_identity_t<T>` 会改变类型**。它就是 `T`，一个字都不变；变的只是推导器看不看见它。
- ❌ **在所有参数上都用 `type_identity_t`**。全包了就没有任何参数参与推导，编译器直接报"无法推导 T"。至少留一个推导语境。
- ❌ **C++17 及以前手写 `type_identity`**。可以写（实现就两行），但注意 C++20 之前 `std` 里没有，自己定义时别放进 `std` 命名空间。

---

## 验证代码

`cpp_learning/templates/type_identity/`：`type_identity.cpp` 演示四种用途（含推导失败修复的完整对照），`type_identity_test.cpp` 8 条断言全过（含"lambda 闭包类型唯一""转换单向""`std::function` 大小固定"的编译期验证）。

---

## 相关阅读

- 类型退化（[ch01/07](./blog.html?post=cpp/ch01/07.md)）：`type_identity` 阻止退化的场景
- `std::function` 与 Lambda：类型擦除的另一面（[practices/std_function_01](./blog.html?post=cpp/practices/std_function_01.md)）：推导失败案例的完整分析
- 模板参数推导 int vs const int（[ch04/01](./blog.html?post=cpp/ch04/01.md)）：推导的基础规则
