# iOS 的 100vh 陷阱与动态视口单位

## 问题从哪来

本站的助手页（htmls/hollow_knight.html）是一个"应用式"布局：页头、消息区、输入框三段，消息区内部滚动，页面整体不滚。桌面端一直正常，iOS 上却出现两个症状：

- 顶部内容被 sticky 页头挡住一截；
- 底部多出一块怎么滚都滚不到的空白。

根源在全局样式的一行：

```css
body { min-height: 100vh; }
```

iOS Safari 里 `100vh` 取的是"大视口"高度——地址栏和底部工具条完全收起之后的视口，比当前实际可见区域大约多出 150px。body 因此比屏幕高出一截：整页可以轻微滚动，顶部内容钻进页头底下，底部留下死区。

## 四种视口单位

CSS Values 4 把视口高度单位拆成了四个：

| 单位 | 含义 | 是否随浏览器 UI 变化 |
|---|---|---|
| `vh` | 视口高度，历史定义不一 | iOS 上等于 lvh |
| `lvh` | 大视口（浏览器 UI 收起后） | 固定 |
| `svh` | 小视口（浏览器 UI 展开时） | 固定 |
| `dvh` | 动态视口 | 实时跟随 |

关键差别在最后一种：页面滚动时地址栏收起，`100dvh` 当场变大，依赖它的元素立刻重排。前三种都是加载时就能确定的固定值。

## 怎么选

看布局类型：

- 文档流页面（内容比屏幕高，整页滚动）：`min-height: 100vh` 或 `100lvh`。用户往下滚时地址栏自然收起，多出来的高度正好用上。
- 应用式布局（整页不滚，内部区域各自滚动）：用 `dvh` 硬锁高度。这类布局要的是"永远等于当前可见高度"，地址栏收起时多出来的空间马上交给内容区。

助手页属于后者，修法是在页面级样式里把全局的 `min-height` 覆盖掉，硬锁成动态视口高：

```css
html { overflow: hidden; }
body { overflow: hidden; min-height: 0; height: 100vh; height: 100dvh; }
```

两条 `height` 声明是回退写法：不支持 `dvh` 的老浏览器用前一条，支持的后一条覆盖前一条。2022 年后的 Safari / Chrome / Firefox 都支持 `dvh`，前一条只是兜底。

页面卡片的高度计算用同样的回退：

```css
height: calc(100vh - var(--header-height) - var(--footer-height));
height: calc(100dvh - var(--header-height) - var(--footer-height));
```

## 顺带：刘海屏的 safe-area

和视口单位常一起出现的是 `env(safe-area-inset-*)`，表示刘海、圆角、Home 指示条占掉的边距。全屏应用式布局里内容如果贴边，要用 `padding-bottom: env(safe-area-inset-bottom)` 之类把它让开。本站页头页尾自身有背景色铺满全宽、内容不贴边，没有用到，但做类似布局时会碰上。

## 延伸

- [CSS 变量驱动全站布局尺寸](./blog.html?post=frontend/practices/css_vars_01.md)——上面 calc() 里 `--header-height` 的来历
- [MDN: CSS length 的视口相对单位](https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units_based_on_viewport)
