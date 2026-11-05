# AI Agent 技术写作规划

本目录的章节号从 ch02 开始（无 ch01，留作总览位）。本文档是写作底账：现状盘点、欠账、新文章计划。

## 一、现状知识地图（ch02~ch10）

| 主题轴 | 覆盖章节 | 深度 |
|---|---|---|
| 工具调用全链路 | ch02（SFT 训练、OpenAI 协议、后端注册表、SSE 流式、五块安全） | 深 |
| 协议与生态 | ch03（MCP 协议格式、Computer Use、o1 范式） | 浅，停在 2024-2025 |
| 编排框架 | ch04（LangChain 抽象边界）、ch05（LangGraph 状态机/reducer/checkpointer） | 中 |
| RAG 闭环 | ch06 检索两派 → ch07 混合+RRF → ch08 多阶段流水线 → ch09 数据工程 → ch10 评测 | 深，自洽 |
| Agent 循环 / ReAct | ch02 一段 while 伪代码、ch05 一张对比表 | 几乎没有 |
| 上下文与记忆 | ch05 checkpointer 一节 | 最薄 |
| 多 Agent | ch05 一句话 | 空白 |
| Agent 评测 | ch10 标题含 Agent，内容全是 RAG 评测 | 空白 |

## 二、历史欠账（ housekeeping ）

- ch02 延伸区预告过"记忆机制""ReAct 模式"两篇，至今未写（由本计划的记忆系列和 ReAct 专章兑现）。
- ch02/ch03 的延伸区还是纯文字旧格式，应返修为带 `.md` 链接的现行格式。
- ch04/ch05 正文写有"示例用 GenericFakeChatModel 验证"，与"文章不写验证情况"的文风规矩相悖，待清理。

## 三、新文章计划

### 主线：上下文与记忆系列（欠账最久 × 新素材最密）

接在 RAG 闭环后面：ch06~ch10 是"预检索"世界观，这条线是"运行时策展"世界观。

- ch11：Context engineering 总论——从预检索到运行时策展。Anthropic《Effective context engineering for AI agents》（2025-09）三件套：compaction + 结构化笔记 + 子代理隔离；LangChain write/select/compress/isolate 四分法。
- ch12：记忆系统分层与产品格局。常驻小核心 + 向量检索层 + 显式遗忘策略；Mem0 / Zep / Letta 三家路线对比。
- ch13：compaction 的实现细节。各 harness（Claude Code / Codex 等）压缩流水线对比，结合自己使用 Claude Code 的体感。
- ch14：ACE 论文精读（arXiv:2510.04618）——不训权重、上下文即 playbook 的自我改进。

### 第二梯队

- 多 Agent 之争：Cognition《Don't Build Multi-Agents》（2025-06）对 Anthropic 多 agent 生产复盘（2025-06），MAST 论文（arXiv:2503.13657，NeurIPS 2025）的 14 种失败模式作裁决。
- 安全续章：Meta Agents Rule of Two（2025-10）把 prompt injection 变成架构约束；OpenAI 承认注入不可根治 + RL 自动化红队（2025-12）；Claude for Chrome 实测 23.6% → 11.2%。接 ch02 安全章节。
- 协议终局：MCP 捐 Linux 基金会（AAIF）、ACP 并入 A2A、A2A v1.0、Agent Skills 开放标准（2025-12，agentskills.io；本博客自身在用 AGENTS.md/SKILL.md，有现身说法角度）。接 ch03。

### 第三梯队

- ReAct 专章：观察-思考-行动循环的本来面目与当代形态（骨架未变，但三块分别被推理模型、MCP/Function Calling、context engineering 重新工程化），兑现 ch02 的预告。
- Agentic RL 线：Search-R1（检索 token 掩码）、RAGEN（Echo Trap 翻车与 StarPO-S）、SWE-RL、Agent Lightning（训练任意 agent 不改代码）。挂在 ReAct 专章之后。
- 基准批判线：《Saving SWE-Bench》（arXiv:2510.08996）、《An Illusion of Progress?》（arXiv:2504.01382）、Terminal-Bench（ICLR 2026）。可与 ch10 的评测方法论呼应。

## 四、引用注意事项

- 厂商自报数字（OpenAI Deep Research、Kimi-Researcher、GDPval、各 ARR/估值）引用时必须标注"厂商口径"。
- 溯源不清的二手数字不要用：Galileo 的 41%–86.7% 失败率、MindStudio 的 40% 状态同步故障、Snyk 的 36% skill 安全缺陷（用前需找 Snyk 原文复核）。
- LangChain 生产调查（57.3% 上生产、89% 观测 vs 52% 评估）是问卷自报数据，有幸存者偏差，引用时注明。
