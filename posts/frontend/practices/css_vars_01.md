# CSS 变量驱动全站布局尺寸

## 问题从哪来

本站所有页面共用一套页头页尾。移动端要瘦身：桌面端 60px 的页头在手机上太占地方，要压到 44px。如果页头高度是写死的，改动就要追着每个用到这个值的地方跑：

- 页头、页尾自身的 `height`；
- sticky 定位的 `top`；
- 助手页 `calc()` 里的扣除项；
- 主内容区给页头让位的 padding。

漏一处就是一处错位。

## 做法：尺寸只定义一次

全局样式（css/style.css）在 `:root` 里定义变量：

```css
:root {
  --header-height: 60px;
  --footer-height: 50px;
}
```

所有用到这个尺寸的地方都引用变量：

```css
.site-header { height: var(--header-height); }
.site-footer { height: var(--footer-height); line-height: var(--footer-height); }
```

移动端断点里只改变量值：

```css
@media (max-width: 768px) {
  :root {
    --header-height: 44px;
    --footer-height: 34px;
  }
}
```

CSS 自定义属性参与层叠，媒体查询里的重定义对整个文档生效，所有 `var()` 引用点自动跟着变。页面级的 `calc()` 也一样受益：

```css
height: calc(100dvh - var(--header-height) - var(--footer-height));
```

这一行在桌面和移动端都对，不需要再写断点版本。

## 附带的好处：注入元素天然对齐

页头留了 `.header-left` 注入位，页面可以往里放自己的操作按钮（通信侧的做法见 [window 桥那篇](./blog.html?post=frontend/practices/vue_bridge_01.md)）。按钮想和页头原生菜单项长得一样，直接复用同一组参数：

```css
.header-left button {
  height: var(--header-height);   /* 撑满页头 */
  padding: 0 0.9em;
}
.header-left button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
```

`height` 引用变量而不写死 44px，以后页头尺寸再调，注入的按钮不用跟着改。

## 适用边界

这套做法适合"数量有限、全局共享"的尺寸：页头页尾高度、主题色、圆角、阴影。反过来把组件内部的局部尺寸也提成变量就不合适，变量一多，`:root` 变成全局变量堆，追踪一个值的来源比写死还累。

## 延伸

- [iOS 的 100vh 陷阱与动态视口单位](./blog.html?post=frontend/practices/viewport_01.md)——上面 calc() 里 `100dvh` 的含义
- [同页两个 Vue 应用怎么通信](./blog.html?post=frontend/practices/vue_bridge_01.md)——`.header-left` 注入位的通信侧
