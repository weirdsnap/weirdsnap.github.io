# 同页两个 Vue 应用怎么通信：window 桥

## 问题从哪来

本站助手页上有两个独立的 Vue 应用：

- 全局页头应用：渲染页头、菜单、页尾，全站每个页面都有；
- 聊天应用：只管助手页的聊天卡片，消息列表、发送、历史会话都在它手里。

移动端改造时要办一件事：把卡片头部里的"历史""新对话"两个按钮挪进全局页头左边（背景见[视口那篇](./blog.html?post=frontend/practices/viewport_01.md)，移动端页头页尾要瘦身）。按钮挪过去了，点击后要调的方法（`toggleHistory`、`newChat`）还在聊天应用里。两个应用没有父子关系，props / emit 够不着。

## 候选方案

- 合并成一个应用：改动面太大，聊天应用的响应式状态要全部搬一遍，还会拖累其他只用页头的页面。
- 自定义 DOM 事件总线：能工作，但发收两端都是字符串约定，比直接暴露方法多一层 `dispatchEvent` / `addEventListener`，没有更清爽。
- window 桥：聊天应用挂载后把自己暴露到 `window` 上，页头按钮直接调。

选了第三种，代码最少。

## 实现

聊天应用 `mounted` 之后挂一行（htmls/hollow_knight.html）：

```js
window.__hkChat = this;  // 暴露给页头应用的桥
```

页头这边，左区注入位的按钮统一走一个判空调用：

```html
<div class="header-left">
    <button @click="chatCall('toggleHistory')">历史</button>
    <button @click="chatCall('newChat')">新对话</button>
</div>
```

```js
chatCall(fn) { if (window.__hkChat) window.__hkChat[fn](); }
```

判空是必须的：两个应用的挂载顺序没有保证，极端情况下聊天应用没挂上（比如它的脚本加载失败），按钮点击静默失败，总比抛错把页头也弄坏强。

## 这个模式的边界

这是框架组件边界上的"逃生舱"：绕开 Vue 的组件树，用全局对象做最小限度的跨应用通信。代价是耦合靠约定：页头知道聊天应用有 `toggleHistory` 和 `newChat` 两个方法，改名要两边一起改，没有类型系统帮忙检查。

能这么用的前提：

- 两个应用同页、同生命周期，唯一的时序问题就是"对方可能还没挂载"，判空挡掉了；
- 交互面很小，就两个按钮。方法一多，约定的维护成本会超过合并应用。

复用价值在 `.header-left` 这个注入位：任何页面想在全局页头放自己的操作按钮，都可以渲染进这个容器、在自己的应用里暴露一个 `window.__xxx` 桥。文章页以后想加"返回列表"按钮，可以照搬这套做法。

## 延伸

- [CSS 变量驱动全站布局尺寸](./blog.html?post=frontend/practices/css_vars_01.md)——`.header-left` 按钮为什么能直接套用页头菜单的样式
- [iOS 的 100vh 陷阱与动态视口单位](./blog.html?post=frontend/practices/viewport_01.md)——这次移动端改造的另一半
