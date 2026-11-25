# 用 perf c2c 定位伪共享

## 问题从哪来

伪共享的原理在[缓存行与伪共享](./blog.html?post=cpp/ch06/12.md)讲过：两个线程各写各的变量，但变量落在同一个缓存行里，MESI 协议让这行在两个核之间来回搬运，性能垮掉。原理好懂，难的是定位——代码评审看不出来，常规 profiling 只能看到"程序慢"，看不到慢在哪一行缓存。

`perf c2c` 就是干这个的：它用 CPU 的 PMU（性能监控单元）采样带地址的内存访问，追踪缓存行在核之间的传递，直接报告哪些地址发生了跨核争用。c2c 是 cache-to-cache 的缩写。

## 工作流

一个典型的伪共享程序（完整代码在 cpp_learning 仓库的 concurrency/false_sharing/）：

```cpp
struct PackedCounters {
    long long a;   // 线程 0 拼命写
    long long b;   // 线程 1 拼命写，和 a 落在同一缓存行
};
```

两个线程分别自增 `a` 和 `b` 各一亿次，逻辑上没有共享任何数据，但比分开跑慢得多。

用 perf c2c 抓：

```bash
perf c2c record ./false_sharing.out
perf c2c report
```

record 阶段以较低开销采样（Intel 上走 PEBS，AMD 上走 IBS），report 把样本按缓存行聚合。

## 报告怎么读

`perf c2c report` 按缓存行地址分组输出，重点看这几处：

- **HITM**（Hit Modified）：本核访问这行时，最新副本在别的核的缓存里且是脏的，要做核间传输。这是伪共享的标志性事件，占比高就有问题。
- **Shared Data Cache Line Table**：按争用程度排序的缓存行列表，排最前面的就是要找的地址。
- 编译时加 `-g`，配合 `perf c2c report --stdio` 可以把地址对应回源码行和 struct 字段。

伪共享程序的报告特征很鲜明：HITM 占掉绝大多数样本，且集中在极少数几个缓存行地址上，正好对应 `PackedCounters` 那一行。

## 修法

把两个变量隔到不同的缓存行。常见两种写法：

```cpp
// 写法一：写死 64，x86 和多数 ARM 上够用
struct PaddedCounters {
    alignas(64) long long a;
    alignas(64) long long b;
};

// 写法二：用标准给的硬件干涉尺寸（C++17，<new>），不写死数字
struct PaddedCounters {
    alignas(std::hardware_destructive_interference_size) long long a;
    alignas(std::hardware_destructive_interference_size) long long b;
};
```

写法二更稳：这个值是平台认为"可能发生伪共享的最小距离"，x86 上通常是 64，Apple Silicon 上通常是 128。实测本机 g++-14 报 256、Apple Clang 17 报 64，两家取舍不同，但都能保证隔开。结构体大小也因此跟着平台变（本机实测 512 / 128 字节），代码里不要对它的 sizeof 写死假设。

另一个方向是按访问者分片：每个线程写自己专属的槽位，最后汇总。两种思路对应缓存行那篇说的"该分的分"。

改完再跑一遍 `perf c2c record`，HITM 应该基本消失。直接跑时间对比也能看到差异：本机 demo 里 packed 和 padded 两个版本差约 2.3 倍，具体倍数取决于核数、负载和微架构，没有普适数字。

## 适用边界

- 只在 Linux 上可用，且需要硬件 PMU。虚拟机里 PMU 经常被宿主管掉；容器里要放权限（`--cap-add SYS_ADMIN` 或调低 `perf_event_paranoid`）。
- macOS 没有 perf。Instruments 有计数器模板但没有现成的 c2c 等价物，可行的降级手段：先在本地跑有无 `alignas` 的时间对比确认现象存在，再上 Linux 机器用 c2c 定位到具体缓存行。
- 采样需要样本量，程序只跑毫秒级采不到东西，压测要跑够秒级。

## 延伸

- [缓存行与伪共享](./blog.html?post=cpp/ch06/12.md)——MESI 协议，以及"该分的分、该聚的聚"
- [std::atomic 内存序](./blog.html?post=cpp/ch06/06.md)——另一个"看不见但影响性能"的并发话题
