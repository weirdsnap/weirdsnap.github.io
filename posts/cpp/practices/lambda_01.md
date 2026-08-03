# Lambda 递归：三种写法与类型擦除

Lambda 是匿名闭包，没有名字，函数体内无法直接引用自己。需要递归时（比如 LeetCode 里写记忆化 DFS），有三种经典做法。这一篇把三种写法、背后的类型擦除原理、以及共同的编译陷阱整理在一起。

---

## 一、问题的本质

普通函数递归靠的是"名字"——函数体里写自己的名字就能调到自己。Lambda 没有名字：

```cpp
auto factorial = [](int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);  // ❌ factorial 未定义
};
```

编译器在处理 lambda 体时，`factorial` 这个变量的声明还没完成，无法使用。三种解法分别对应三种"把 lambda 自己递进去"的思路。

---

## 二、方案一：`std::function`（类型擦除）

```cpp
#include <functional>

std::function<int(int)> factorial = [&](int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
};

factorial(5);  // 120
```

用引用捕获 `factorial` 自己。能编译是因为 `std::function<int(int)>` 的**类型在声明处已经完整**，lambda 体里用它时不再依赖 lambda 自身的类型。

### 类型擦除是怎么回事

`std::function<R(Args...)>` 只有一个类型，却能装下任何签名匹配的可调用对象——函数指针、lambda、仿函数。具体类型在构造时被"擦掉"，内部大致是：

```
std::function<int(int)>
  └─ 指向一个多态封装体的指针（vtable：调用 / 拷贝 / 销毁）
       └─ 真正持有你的闭包对象
```

调用时走一层虚分派（或等价的函数指针间接跳转）。带来的代价：

- **间接调用，无法内联**——递归每一层都是间接跳转
- **可能堆分配**——闭包较大时（超出 SBO 缓冲）要在堆上存副本
- 拷贝整个 `std::function` 也比拷贝原始闭包贵

所以它是最**省心**的写法，也是**最慢**的写法。返回类型已经在 `std::function<int(int)>` 声明里写死，因此它是三种方案里唯一不要求 lambda 显式写返回类型的。

---

## 三、方案二：Y-combinator 自传递（C++14，零开销）

C++14 泛型 lambda 的 `auto` 参数允许把 lambda **自己作为参数传给自己**：

```cpp
auto factorial = [](int n) {
    auto f = [](auto&& self, int n) -> int {
        return n <= 1 ? 1 : n * self(self, n - 1);
    };
    return f(f, n);  // 调用时把自己传进去
};

factorial(5);  // 120
```

**原理**：泛型 lambda 的 `operator()` 是模板，`self` 被推导为闭包自身的类型，调用 `self(self, n - 1)` 就是一次普通的模板函数调用，编译器可以内联展开，**零运行时开销**。

代价是写法绕：递归要 `self(self, ...)` 层层自传递，外层还要包一层 `f(f, n)` 隐藏自传递。

---

## 四、方案三：C++23 deducing this（推荐）

C++23 引入显式对象参数（deducing this），lambda 可以用 `this auto&& self` 直接拿到自己：

```cpp
auto factorial = [](this auto&& self, int n) -> int {
    return n <= 1 ? 1 : n * self(n - 1);
};

factorial(5);  // 120
```

**原理**：`this auto&& self` 把闭包对象显式声明为第一个参数，调用 `factorial(5)` 时闭包自动绑定到 `self`。递归时写 `self(n - 1)` 即可——不像 Y-combinator 那样要 `self(self, n - 1)` 层层自传递，也不需要在无捕获的外层包一层 `f(f, n)`。同样是模板调用，**零开销**。

**注意**：`self` 指闭包对象本身，捕获列表照常使用，互不干扰：

```cpp
int base = 100;
auto acc = [base](this auto&& self, int n) -> int {
    return n <= 0 ? base : n + self(n - 1);
};
```

---

## 五、共同陷阱：递归 lambda 必须显式写返回类型

上面的示例都写了 `-> int`，这不是风格问题——**省略会编译失败**：

```cpp
auto func = [&](this auto&& self, int i, int j) {  // ❌ 报错
    // error: function 'operator()' with deduced return type
    // cannot be used before it is defined
    return self(i - 1, j);
};
```

**原因**：不写返回类型时编译器要分析函数体里的 `return` 语句来推导；但函数体里的递归调用 `self(...)` 又必须先知道 `operator()` 的返回类型——循环依赖。标准直接禁止：返回类型待推导的函数不能在自身定义完成前被使用。加上 `-> int` 就打破了循环。

同样的坑存在于 Y-combinator 的 `self(self, ...)` 写法；只有 `std::function` 例外，因为返回类型在它的声明里已经给出。

---

## 六、对比与选择

| | `std::function` | Y-combinator | deducing this |
|--|-----------------|--------------|---------------|
| 原理 | 类型擦除 + 虚分派 | 显式自传递，模板内联 | 显式对象参数，模板内联 |
| 开销 | 间接调用，可能堆分配 | **零开销** | **零开销** |
| 递归写法 | 直接调 `factorial(n-1)` | `self(self, n-1)` + 外层 `f(f, n)` | `self(n-1)`，无需转发 |
| 可读性 | 好 | 稍差 | **好** |
| 必须显式返回类型 | 否 | **是** | **是** |
| C++ 版本 | C++11 | C++14 | C++23 |

> 能用 C++23 就用 deducing this，零开销且写法最自然；性能敏感但标准受限时用 Y-combinator；追求可读性且不在乎开销用 `std::function`。

---

## 相关阅读

- Lambda 捕获的各种方式与陷阱：[ch01/17 Lambda 捕获](../ch01/17.md)
