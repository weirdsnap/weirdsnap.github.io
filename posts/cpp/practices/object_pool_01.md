# 对象池（Object Pool）：高频小对象的内存管理

游戏里每帧生成销毁上千个粒子、编译器语法树反复增删节点、ECS 框架批量创建实体——这些场景的共同点是：**同类型小对象，创建销毁极其频繁**。直接用 `new`/`delete` 会成为瓶颈，对象池就是这个场景的经典解法。

---

## 一、要解决什么问题

`new`/`delete` 单个对象的开销远比想象大：

1. **分配器记账**：每次 `new` 都要进 malloc，找空闲块、更新元数据，可能还加锁；
2. **内存碎片**：对象散落在堆各处，长期运行后可用内存被切成碎条；
3. **缓存不友好**：相邻创建的对象地址相距甚远，遍历时 cache miss 频发。

对象池的思路：**一次性向分配器要一大块内存，自己管理切分和回收**。`create`/`destroy` 变成纯用户态的指针操作，O(1) 且无锁（单线程版）。

---

## 二、三个核心设计决策

| 决策 | 做法 | 解决什么 |
|------|------|----------|
| **块式分配** | 一次分配 N 个槽位的 chunk，用完再要下一块 | 摊薄 malloc 调用，对象地址紧凑 |
| **侵入式空闲链表** | 空闲槽位的内存直接当链表节点用 | 空闲管理零额外内存 |
| **生命周期与内存分离** | `placement new` 构造，显式析构，内存不归还 | 回收不触发分配器，O(1) |

最妙的是第二条：**空闲槽位里没有活对象，那块内存就是白捡的存储空间**——在里面存一个 `next` 指针，把所有空闲槽位串成链表，分配 = 摘头，回收 = 插头。

---

## 三、完整实现

```cpp
template <typename T, std::size_t ChunkSize = 64>
class ObjectPool {
    // 槽位复用：空闲时当链表节点，占用时当对象。
    // union 的大小和对齐自动取 max(sizeof(T), sizeof(Slot*))
    union Slot {
        T obj;
        Slot* next;
        Slot() {}   // 不构造任何成员，内存保持原始状态
        ~Slot() {}  // 析构由池手动管理
    };

    // 块只进不出：已分配的对象地址永远稳定（不搬移）
    std::vector<std::unique_ptr<Slot[]>> chunks_;
    Slot* free_list_ = nullptr;

    void grow() {
        chunks_.push_back(std::make_unique<Slot[]>(ChunkSize));
        Slot* chunk = chunks_.back().get();
        // 新块整体串进 freelist，再接上旧链表
        for (std::size_t i = 0; i < ChunkSize - 1; ++i)
            chunk[i].next = &chunk[i + 1];
        chunk[ChunkSize - 1].next = free_list_;
        free_list_ = chunk;
    }

public:
    ObjectPool() = default;
    ObjectPool(const ObjectPool&) = delete;             // 池不可拷贝
    ObjectPool& operator=(const ObjectPool&) = delete;

    template <typename... Args>
    T* create(Args&&... args) {
        if (!free_list_) grow();
        Slot* s = free_list_;
        free_list_ = free_list_->next;
        return new (&s->obj) T(std::forward<Args>(args)...);  // placement new
    }

    void destroy(T* p) {
        p->~T();                                   // 显式析构，不释放内存
        Slot* s = reinterpret_cast<Slot*>(p);
        s->next = free_list_;                      // 就地复用对象内存当链表节点
        free_list_ = s;
    }
};
```

---

## 四、关键机制拆解

### 1. `union Slot`：一块内存两种身份

```cpp
union Slot { T obj; Slot* next; };
```

union 的成员共享同一段内存：槽位空闲时写 `next`，占用时 placement new 出 `obj`。**union 的大小自动是 `max(sizeof(T), sizeof(void*))`，对齐也自动满足两者要求**——所以哪怕 `T` 比指针还小（比如 `char`）也不需要任何特判。

### 2. `create`：摘头 + placement new

freelist 是单向链表，摘头 O(1)。`new (&s->obj) T(args...)` 在既有内存上构造对象——**内存分配在 grow 时已完成，这里只触发构造函数**。完美转发 `Args&&...` 让任意构造函数都能用。

### 3. `destroy`：显式析构 + 插头

`p->~T()` 手动结束对象生命周期（RAII 资源正确释放），但内存留在池里。随后把这个槽位插回 freelist 头部——**LIFO 顺序**：最后释放的最先复用，刚用过的内存还在缓存里，这是白得的局部性收益。

### 4. 块只进不出，地址永远稳定

`chunks_` 持有所有历史块，对象一旦创建**地址就不再变化**（不像 `vector` 扩容会搬移）。外部可以放心持有 `T*`。

---

## 五、实测对比

基准：32 字节对象，每轮创建 10 万个再全部销毁，重复 20 轮取平均（`-O2`，Apple Silicon）：

| 方案 | 每轮耗时 | 加速比 |
|------|----------|--------|
| `new` / `delete` | 4.89 ms | 1x |
| 对象池 | 0.48 ms | **10.1x** |

一个数量级的差距来自：每次 `create` 只是"摘链表头 + 构造函数"，每次 `destroy` 只是"析构 + 插链表头"，完全不碰分配器。

> 注意这个基准是池的**主场**（同类型、同大小、高频创建销毁）。换成"每种对象只创建一次"的场景，池不会有优势，反而白占内存。

---

## 六、边界与坑

- **池不会替你析构活对象**。池销毁时直接释放所有块，还活在外面的对象析构函数不会被调用（RAII 资源泄漏）。约定：`destroy` 完所有对象再销毁池——`std::pmr` 的池也是同样语义。
- **没有线程安全**。freelist 摘头/插头不是原子的，多线程要么加锁（吃掉一部分收益），要么每线程一个池（thread-local pool，通常是更好的选择）。
- **double-destroy 无防护**。重复 `destroy` 同一个指针会把槽位插进链表两次，之后同一个槽位会被 `create` 发给两个调用者——释放版完全没有检测。调试版可以维护一个 `used` 标记集合作 sanity check。
- **对象销毁后指针立即悬垂**。`destroy(p)` 之后再用 `p` 是 UB，而且那块内存可能很快被下一个 `create` 覆盖成别的对象，bug 表现极具迷惑性。

---

## 七、什么时候用，什么时候不用

**用**：同类型小对象高频创建销毁（粒子、临时事件、AST/IR 节点、ECS 实体）、对分配延迟敏感（实时系统、游戏帧循环）。

**不用**：对象种类杂、大小差异大（池按类型实例化，类型一多管理成本反超）；创建销毁不频繁（`new` 够用）；需要线程安全又不想引入锁的复杂度。

**标准库替代**：C++17 的 `std::pmr` 提供了现成的池化分配——`std::pmr::unsynchronized_pool_resource`（单线程池）和 `std::pmr::monotonic_buffer_resource`（只增不回收的单调分配器，配合一次性释放，比对象池更激进）。手写对象池的价值在于理解原理、以及需要标准库之外的定制（比如对象复用时重置状态、统计、调试钩子）。

---

## 八、一句话总结

> **对象池 = 块式分配摊薄 malloc + 空闲内存兼职当链表 + placement new 分离生命周期，把 O(1) 分配从分配器手里抢回用户态。**

## 相关阅读

- [ch03/01 new/delete vs malloc/free](../ch03/01.md)：池取代的正是这一对操作的逐对象开销
- [ch01/00 C++ 语言基础与类型系统](../ch01/00.md)：union 的内存共享与对齐规则
- 验证代码与基准：`cpp_learning/memory_mgmt/object_pool/`
