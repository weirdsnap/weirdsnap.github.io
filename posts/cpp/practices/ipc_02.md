# POSIX 共享内存进阶：环形缓冲区（Ring Buffer）设计

## 一、从简单到复杂的演进

### 1.1 阶段一：传递单个字符串

```cpp
// 共享内存布局
char data[4096];
```

- 只传递一句 `Hello, SHM!`
- 适合理解基础 API：`shm_open` → `ftruncate` → `mmap`

### 1.2 阶段二：传递结构体

```cpp
struct Message {
    int id;
    char name[32];
    double value;
};
```

- 可以传递有格式的数据
- 但一次只能传一条
- 写端退出后，读端只能读到最后一条

### 1.3 阶段三：传递消息数组

```cpp
struct Data {
    Message msgs[1000];
};
```

- 可以一次性传递大量消息
- 但空间固定，写端和读端的生命周期必须匹配
- 读端启动太晚，可能读到半成品

### 1.4 阶段四：流式环形缓冲区

```cpp
struct Data {
    std::atomic<int> write_idx;   // 写指针
    std::atomic<int> read_idx;    // 读指针
    Message msgs[100];             // 循环队列
};
```

- 写端持续生产，读端持续消费
- 空间循环利用，理论上可以无限写（只要读端跟得上）
- 引入了**进程同步**问题

---

## 二、为什么需要 Ring Buffer？

### 2.1 场景

- 日志收集：多个进程持续产生日志
- 传感器数据：高频采样数据
- 视频流：帧数据不断产生
- 高频交易：行情数据持续推送

### 2.2 核心问题

如果像阶段三那样用一个固定数组：

```cpp
Message msgs[1000];
```

写满 1000 条后怎么办？
- 停止写入？→ 数据丢失
- 扩大数组？→ 内存无限增长
- 覆盖旧数据？→ 需要读端已经消费过的才能覆盖

**Ring Buffer 的解决方案：** 只保留最近的 N 条，循环利用槽位。

---

## 三、Ring Buffer 的内存布局

```cpp
constexpr int MSG_COUNT = 100;

struct Message {
    int id;
    char name[32];
    double value;
};

struct Data {
    std::atomic<int> write_idx{0};   // 下一个要写入的位置
    std::atomic<int> read_idx{0};    // 下一个要读取的位置
    Message msgs[MSG_COUNT];          // 100 个槽位
};
```

### 3.1 内存示意图

```cpp
共享内存（约 4KB + 4800B）
├─ [0 ~ 15]        std::atomic<int> write_idx
├─ [16 ~ 31]       std::atomic<int> read_idx
├─ [32 ~ 4095]     填充（padding，满足对齐）
└─ [4096 ~ ...]    Message msgs[100]
```
> 注意：因为 `std::atomic<int>` 和 `Message` 的对齐要求不同，中间可能有填充。

---

## 四、idx 的语义和规则

### 4.1 write_idx 和 read_idx 的含义

| 变量 | 含义 |
|------|------|
| `write_idx` | **下一个要写入的索引**，也表示已经写了多少条消息 |
| `read_idx` | **下一个要读取的索引**，也表示已经读了多少条消息 |

**初始状态：** `write_idx = 0`, `read_idx = 0`

### 4.2 槽位计算

```cpp
int write_slot = write_idx % MSG_COUNT;
int read_slot  = read_idx  % MSG_COUNT;
```

`% MSG_COUNT` 把无限增长的索引映射到有限的 100 个槽位上。

### 4.3 三种状态

```
情况 1：队列为空
write_idx = 5, read_idx = 5
差值 = 0 → 没有新数据可读

情况 2：队列有数据
write_idx = 105, read_idx = 5
差值 = 100 → 有 100 条未读消息

情况 3：队列已满
write_idx = 105, read_idx = 5
差值 = 100 = MSG_COUNT → 不能再写，否则覆盖未读数据
```

### 4.4 核心规则

**写端规则：**

```cpp
// 如果写端领先读端 >= MSG_COUNT，阻塞等待
while (write_idx - read_idx >= MSG_COUNT) {
    wait();
}

// 写入数据
msgs[write_idx % MSG_COUNT] = msg;

// 更新写指针，通知读端
write_idx++;
```

**读端规则：**

```cpp
// 如果没有新数据，阻塞等待
while (read_idx >= write_idx) {
    wait();
}

// 读取数据
Message msg = msgs[read_idx % MSG_COUNT];

// 更新读指针，通知写端
read_idx++;
```

---

## 五、为什么必须用原子变量？

### 5.1 没有原子变量会怎样？

写端和读端同时读写 `write_idx` / `read_idx`：

```cpp
// 写端
msgs[write_idx % 100] = msg;
write_idx++;  // ❌ 普通 int，非原子

// 读端
if (read_idx < write_idx) {  // ❌ 同时被写端修改
    msg = msgs[read_idx % 100];
    read_idx++;  // ❌ 同时被写端读取
}
```

可能出现的问题：
1. **数据竞争（Data Race）**：两个进程同时读写同一个 `int`，结果是未定义的
2. **读到半成品**：写端还没写完 `msgs[idx]`，读端已经开始读了
3. **丢失更新**：写端和读端同时 `++write_idx`，导致指针跳变

### 5.2 std::atomic 提供了什么？

```cpp
std::atomic<int> write_idx;
std::atomic<int> read_idx;
```

`std::atomic` 保证：
1. **原子性**：对 `int` 的读写不可分割
2. **可见性**：一个进程的修改，另一个进程能看到
3. **内存顺序**：可以控制读写的先后关系（默认 `seq_cst` 最强）

### 5.3 操作方式

```cpp
// 读取当前值
int w = write_idx.load();

// 写入新值
write_idx.store(0);

// 原子自增（返回旧值）
int old = write_idx.fetch_add(1);
```

---

## 六、写端和读端的协作流程

### 6.1 写端流程

```cpp
Data* data = static_cast<Data*>(addr);
data->write_idx.store(0);
data->read_idx.store(0);

for (int i = 0; i < 1000; ++i) {
    // 1. 等待队列不满
    while (data->write_idx.load() - data->read_idx.load() >= MSG_COUNT) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    // 2. 计算槽位并写入
    int idx = data->write_idx.load() % MSG_COUNT;
    data->msgs[idx].id = i;
    strcpy(data->msgs[idx].name, "temperature");
    data->msgs[idx].value = 36.5 + i * 0.0001;

    // 3. 更新写指针
    data->write_idx.fetch_add(1);
}
```

### 6.2 读端流程

```cpp
Data* data = static_cast<Data*>(addr);
int consumed = 0;

while (consumed < 1000) {
    // 1. 等待队列不空
    int write_idx = data->write_idx.load();
    int read_idx = data->read_idx.load();

    if (read_idx >= write_idx) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        continue;
    }

    // 2. 计算槽位并读取
    int idx = read_idx % MSG_COUNT;
    Message msg = data->msgs[idx];

    // 3. 处理数据
    std::cout << "id=" << msg.id << ", value=" << msg.value << std::endl;

    // 4. 更新读指针
    data->read_idx.fetch_add(1);
    consumed++;
}
```

---

## 七、踩过的坑

### 7.1 读端 mmap 权限不足

```cpp
// ❌ 错误：fd 是 O_RDONLY 打开的，mmap 却要求 PROT_WRITE
int fd = shm_open(NAME, O_RDONLY, 0666);
void* addr = mmap(NULL, SHM_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
// 结果：mmap: Permission denied
```

```cpp
// ✅ 正确：读端也需要 O_RDWR
int fd = shm_open(NAME, O_RDWR, 0666);
void* addr = mmap(NULL, SHM_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
```

**原因：** 读端虽然不写 `msgs` 数据，但必须写 `read_idx` 指针，所以 fd 必须可读写。

### 7.2 写满 100 条后阻塞

如果只启动写端，不启动读端，写端写到第 100 条后会一直阻塞：

```cpp
while (write_idx - read_idx >= MSG_COUNT) {
    wait();  // read_idx 永远是 0，永远等不到
}
```

**这不是 bug，是设计预期。** 环形缓冲区必须有消费者。

### 7.3 std::atomic 在共享内存中

```cpp
struct Data {
    std::atomic<int> write_idx{0};
    std::atomic<int> read_idx{0};
    Message msgs[100];
};
```

在 Linux/x86_64 上，`std::atomic<int>` 通常是 **lock-free** 的，可以直接放在共享内存中跨进程使用。但需要注意：
1. 两个进程要用**同一个编译器/ABI**
2. `mmap` 出来的内存不会调用构造函数，写端要手动 `store(0)` 初始化

### 7.4 内存顺序（进阶）

默认 `std::atomic` 使用最强的 `memory_order_seq_cst`，对初学者最安全。如果追求极致性能，可以改用：

```cpp
data->write_idx.fetch_add(1, std::memory_order_release);  // 写端
int w = data->write_idx.load(std::memory_order_acquire);  // 读端
```

确保**先写数据，再 release 索引；先 acquire 索引，再读数据**。

---

## 八、完整代码

### 8.1 include/shm_data.h

```cpp
#ifndef SHM_DATA_H
#define SHM_DATA_H

#include <atomic>
#include <cstddef>

constexpr const char* NAME = "/my_shm";
constexpr int MSG_COUNT = 100;

struct Message {
    int id;
    char name[32];
    double value;
};

struct Data {
    std::atomic<int> write_idx{0};
    std::atomic<int> read_idx{0};
    Message msgs[MSG_COUNT];
};

constexpr size_t SHM_SIZE = sizeof(Data);

#endif
```

### 8.2 src/writer.cpp

```cpp
#include "shm_data.h"

#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <thread>
#include <chrono>

int main() {
    int fd = shm_open(NAME, O_CREAT | O_RDWR, 0666);
    if (fd == -1) { perror("shm_open"); return 1; }

    if (ftruncate(fd, SHM_SIZE) == -1) {
        perror("ftruncate");
        close(fd);
        return 1;
    }

    void* addr = mmap(NULL, SHM_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (addr == MAP_FAILED) {
        perror("mmap");
        close(fd);
        return 1;
    }
    close(fd);

    Data* data = static_cast<Data*>(addr);
    data->write_idx.store(0);
    data->read_idx.store(0);

    for (int i = 0; i < 1000; ++i) {
        while (data->write_idx.load() - data->read_idx.load() >= MSG_COUNT) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }

        int idx = data->write_idx.load() % MSG_COUNT;
        data->msgs[idx].id = i;
        std::strcpy(data->msgs[idx].name, "temperature");
        data->msgs[idx].value = 36.5 + i * 0.0001;

        data->write_idx.fetch_add(1);
    }

    std::cout << "[Writer] 完成，按回车键退出..." << std::endl;
    std::cin.get();

    munmap(addr, SHM_SIZE);
    shm_unlink(NAME);
    return 0;
}
```

### 8.3 src/reader.cpp

```cpp
#include "shm_data.h"

#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cstdio>
#include <iostream>
#include <thread>
#include <chrono>

int main() {
    int fd = shm_open(NAME, O_RDWR, 0666);  // 注意：不是 O_RDONLY
    if (fd == -1) { perror("shm_open"); return 1; }

    void* addr = mmap(NULL, SHM_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (addr == MAP_FAILED) {
        perror("mmap");
        close(fd);
        return 1;
    }
    close(fd);

    Data* data = static_cast<Data*>(addr);

    int consumed = 0;
    while (consumed < 1000) {
        int write_idx = data->write_idx.load();
        int read_idx = data->read_idx.load();

        if (read_idx >= write_idx) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
            continue;
        }

        int idx = read_idx % MSG_COUNT;
        const Message& msg = data->msgs[idx];
        std::cout << "[Reader] id=" << msg.id << ", value=" << msg.value << std::endl;

        data->read_idx.fetch_add(1);
        consumed++;
    }

    munmap(addr, SHM_SIZE);
    return 0;
}
```

---

## 九、进一步的优化方向

### 9.1 无锁化（Lock-Free）

当前实现用了 `while + sleep`，属于**阻塞式轮询**。可以改成：
- 纯自旋锁（忙等）：延迟最低，但 CPU 占用高
- 条件变量：但 POSIX 条件变量不能跨进程直接使用
- POSIX 信号量：`sem_t` 配合共享内存，读端阻塞等待，更省 CPU

### 9.2 多生产者 / 多消费者

当前是**单生产者 + 单消费者**。如果要多个进程同时写或同时读，需要：
- 用原子 CAS 操作竞争 `write_idx`
- 或者引入锁（mutex）保护临界区

### 9.3 批量读写

每次只读写一条消息，系统调用和原子操作开销较大。可以一次读写一批：
- 写端攒够 10 条再统一更新 `write_idx`
- 读端一次取 10 条再统一更新 `read_idx`

---

## 十、一句话总结

> **Ring Buffer 的本质：用两个原子指针（write_idx / read_idx）和一块循环数组，在多个进程之间实现安全、高效、无界感的流式数据传递。**
