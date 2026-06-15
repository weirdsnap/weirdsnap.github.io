# CRTP（Curiously Recurring Template Pattern，奇异递归模板模式）

CRTP 是 C++ 模板元编程中最经典、最实用的惯用法之一。它的核心思想是：**派生类将自己作为模板参数传递给基类**，从而实现编译期多态（静态多态），避免虚函数的运行时开销。

---

## 一、基本形式

```cpp
template <typename Derived>
class Base {
public:
    void interface() {
        static_cast<Derived*>(this)->implementation();  // 编译期派发
    }
};

class Derived : public Base<Derived> {  // 自己作为模板参数传给基类
public:
    void implementation() {
        // 实际逻辑
    }
};
```

**关键点**：`Derived` 继承 `Base<Derived>`，在基类中通过 `static_cast` 将 `this` 转为 `Derived*` 调用派生类方法。这一切在编译期确定，**零运行时开销**。

---

## 二、为什么叫"奇异递归"？

名字来源于派生类声明中的"自我引用"：

```cpp
class Derived : public Base<Derived>
//              ^^^^^^^^^^^^^^^^^^^
//              自己继承自己（的模板实例化）
```

这在语法上看起来像一个递归定义——`Derived` 的定义依赖于 `Base<Derived>`，而 `Base<Derived>` 又引用了 `Derived`。但由于模板是**惰性实例化**的，编译器能够正确处理这种前向引用。

---

## 三、核心机制拆解

### 1. 编译期多态（静态派发）

| 特性 | CRTP（静态多态） | 虚函数（动态多态） |
|------|------------------|-------------------|
| 派发时机 | 编译期 | 运行时 |
| 开销 | 零（直接内联） | vtable 查找 + 间接跳转 |
| 对象大小 | 不增加 | 增加 vptr（通常 8 字节） |
| 灵活性 | 编译期固定 | 运行时动态绑定 |

### 2. `static_cast` 的安全性

在 CRTP 中，`static_cast<Derived*>(this)` 是**安全且标准保证的**：

```cpp
template <typename Derived>
class Base {
    void foo() {
        // 标准保证：如果 Derived 确实继承自 Base<Derived>，
        // 则 static_cast 是合法的
        Derived& self = static_cast<Derived&>(*this);
    }
};
```

只要 `Derived : public Base<Derived>` 的继承关系成立，这个转换就是良定义的。如果用户错误地写成 `class Wrong : public Base<Other>`，则会在 `static_cast` 处产生编译错误（或至少未定义行为，取决于具体代码）。

---

## 四、典型应用场景

### 1. 代码注入 / Mixin 风格（最常用）

将通用逻辑（如计数、比较运算符）注入到多个类中，避免重复代码：

```cpp
// 为任何类提供 operator== 和 operator!=（基于 operator==）
template <typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived*>(this)->operator==(other);
    }
};

class Point : public Comparable<Point> {
public:
    int x, y;
    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};
```

### 2. 对象计数器

```cpp
template <typename Derived>
class Counter {
    static inline int count = 0;  // C++17 inline static
public:
    Counter() { ++count; }
    ~Counter() { --count; }
    static int getCount() { return count; }
};

class Widget : public Counter<Widget> {};
class Gadget : public Counter<Gadget> {};

// Widget 和 Gadget 各自有独立的计数器
```

### 3. 访问者模式 / 双派发优化

在编译期确定类型，避免 `dynamic_cast`：

```cpp
template <typename Derived>
class Expr {
public:
    double eval() const {
        return static_cast<const Derived*>(this)->evalImpl();
    }
};

class Constant : public Expr<Constant> {
    double value;
public:
    double evalImpl() const { return value; }
};

class Add : public Expr<Add> {
    // ...
};
```

### 4. 策略模式的编译期版本

```cpp
template <typename Derived>
class Logger {
public:
    void log(const std::string& msg) {
        static_cast<Derived*>(this)->write(msg);
    }
};

class FileLogger : public Logger<FileLogger> {
public:
    void write(const std::string& msg) {
        // 写入文件
    }
};

class ConsoleLogger : public Logger<ConsoleLogger> {
public:
    void write(const std::string& msg) {
        std::cout << msg << "\n";
    }
};
```

---

## 五、进阶：CRTP 与友元 / 访问保护

CRTP 常配合**友元声明**使用，让基类能够访问派生类的私有成员：

```cpp
template <typename Derived>
class Base {
public:
    void doSomething() {
        static_cast<Derived*>(this)->privateHelper();  // 需要友元
    }
};

class Derived : public Base<Derived> {
    friend class Base<Derived>;  // 允许基类访问私有成员
private:
    void privateHelper() { /* ... */ }
};
```

---

## 六、现代 C++ 中的演进

### 1. C++20 Concepts 的替代方案

对于简单的静态多态，C++20 的 `concept` 提供了更现代的替代：

```cpp
template <typename T>
concept Drawable = requires(T t) {
    { t.draw() } -> std::same_as<void>;
};

template <Drawable T>
void render(const T& obj) {
    obj.draw();  // 编译期多态，无需继承
}
```

**CRTP vs Concepts**：
- **CRTP**：适合需要**状态共享**（基类提供数据成员或默认实现）的场景
- **Concepts**：适合纯接口约束，更灵活，不要求继承关系

### 2. C++23 Deducing This（显式对象参数）

C++23 的 `Deducing this` 可以进一步简化某些 CRTP 场景：

```cpp
struct Widget {
    auto operator<=>(const Widget&) = default;
};
```

但对于需要**跨类复用代码**的场景，CRTP 仍然不可替代。

---

## 七、常见陷阱

### 1. 误用继承关系

```cpp
class Evil : public Base<SomeOtherClass> {  // 错误！
};
```

这会导致 `static_cast` 产生**未定义行为**。可以通过 `static_assert` 在基类中防御：

```cpp
template <typename Derived>
class Base {
    static_assert(std::is_base_of_v<Base<Derived>, Derived>,
                  "Derived must inherit from Base<Derived>");
};
```

### 2. 菱形继承问题

如果多个 CRTP 基类被同一个类继承，可能引发歧义：

```cpp
class MyClass : public Comparable<MyClass>, public Printable<MyClass> {
    // 如果两个基类都有同名方法，可能产生二义性
};
```

### 3. 模板膨胀

每个不同的 `Derived` 都会实例化一份独立的 `Base<Derived>` 代码，可能导致**代码体积膨胀**。对于高频使用的小类，需要权衡。

---

## 八、一句话总结

> **CRTP 是 C++ 中用模板实现"编译期继承"的核心技巧——它让基类在编译期就知道派生类的类型，从而用 `static_cast` 替代虚函数，实现零开销的静态多态。**

如果你正在设计一个**高性能、无运行时开销、需要代码复用**的类体系（比如数学库中的表达式模板、序列化框架、策略模式），CRTP 几乎是最自然的 C++ 解法。
