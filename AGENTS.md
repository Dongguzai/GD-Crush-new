# AGENTS.md

这份文档是给后续接手 GD Crush 项目的 AI 编码 Agent 看的项目操作手册。

一句话介绍：

> **GD Crush 是一个让用户和“心中的 TA”持续聊天陪伴，并在需要时无缝进入现实互动演练的虚拟 Crush 产品。**

在改代码之前，先读这里。这个项目最重要的不是某个组件或某个接口，而是要守住当前已经确认的产品重心：

> **GD 首先是用户心中的 TA / crush。其他能力都只是围绕这段关系发生的轻结构。**

---

## 1. 产品北极星

GD Crush 是一个以 TA 为中心的虚拟 Crush 产品。

核心闭环是：

```text
创建 / 确认 TA
  ↓
打开 GD，直接回到和 TA 的聊天
  ↓
和“心中的 TA”日常聊天
  ↓
在同一个聊天流里点击「演一遍」
  ↓
进入一段基于现实的“现实 TA 模拟”演练章节
  ↓
生成现实行动
  ↓
记录现实中实际发生了什么
  ↓
用现实事件让后续聊天和演练更连续、更贴近真实
```

### 已锁定的产品决策

- `/app` 是默认聊天主页。
- 一级导航是：`聊天 / 行动 / 情报 / 回忆`。
- `工作台` 不再作为一级入口出现。
- 独立的 `演练` 页不再作为主要产品表面出现。
- 日常聊天里，GD 扮演 **用户心中的 TA**。
- 演练章节里，GD 切换为 **现实中的 TA 模拟**。
- `演一遍` 必须留在当前聊天流里展开，不跳转到独立模块。
- `记一下` 是轻量的 **系统辅助按钮**，不是 TA 说的话。
- `情报` 应该更像 **TA 档案 + 现实观察层**，不要做成冰冷的数据看板。
- `行动` 保留为一级入口，用来承接现实世界的执行与反馈。

---

## 2. 角色边界

不要混淆这些角色。

| 角色 | 负责什么 | 不能做什么 |
|---|---|---|
| **TA** | 日常陪伴、关系连续性、自然想起最近的现实事件或演练 | 变成教练、分析师、审问者、状态栏 |
| **现实 TA 模拟** | 在演练章节里模拟更接近现实的 TA 反应 | 永远甜、永远同意、永远安慰用户 |
| **系统 UI** | 章节边界、`演一遍`、`记一下`、复盘卡、保存行动 | 冒充 TA 说话，或过度人格化 |
| **Coach** | 后台分析能力；只有用户主动点 `提示一下` 等动作时轻量出现 | 自动插入日常聊天、抢走 TA 的主角位置 |

实用判断：

- 如果一句话出现在主聊天气泡里，它就应该像 TA 在说话。
- 如果它是结构化帮助，就应该做成 UI，而不是伪装成 TA 的台词。

---

## 3. 当前核心功能

### 聊天主页

- `/app` 渲染主聊天界面。
- `/app/chat` 和 `/app/practice` 是旧路径，不应重新变成主要入口。
- `components/companion-chat.tsx` 负责主聊天 UI、inline 演练章节、语音输入、TTS 播放、收藏回忆、`演一遍` 和 `记一下`。

### Inline 演练章节

- 演练发生在聊天流内部，不是独立模拟器。
- `practice_chapters` 用来持久化演练章节，并关联 practice session / practice run / action。
- 进行中的演练使用“现实 TA 模拟”，可以犹豫、冷淡、拒绝、不确定。
- 提示默认收起，只在用户主动点 `提示一下` 时出现。
- 演练结束后，要把用户情绪上带回日常 TA 聊天，而不是停留在分析模式。

### 现实层

现实层分三类：

- `reality_events`：用户确认过的现实事实。
- `reality_signals`：从现实事件里抽取出的可观察信号。
- `reality_inferences`：基于证据形成的保守推断。

重要约束：

- 不要把用户说的每一句话都自动当成事实。
- `记一下` 要稀疏、轻量、低打扰。
- 单纯情绪、幻想、猜测、假设，不应默认变成现实事件。
- 推断必须保守、可追溯证据，不能被说成确定真相。
- TA 可以自然记得最近的现实事件，但不能变成审问、复盘或诊断。

### 行动

- `行动` 是现实世界执行和反馈的地方。
- 行动可以来自演练复盘。
- 行动反馈应回流到现实层。
- 行动不是另一个演练页。

### 回忆

- 回忆应该是有情绪价值的片段，例如：
  - 收藏的 TA 对白
  - 重要演练时刻
  - 现实中的重要进展
- 不要把回忆页做成原始事件日志。

---

## 4. 架构地图

### 关键页面路由

- `app/app/page.tsx`：主聊天主页。
- `app/app/actions/page.tsx`：现实行动页。
- `app/app/profile/page.tsx`：TA 档案 / 现实观察层。
- `app/app/memories/page.tsx`：回忆页。
- `app/onboarding/*`：年龄确认、建档、确认档案、视觉设置。

### 关键 API 路由

- `app/api/chat/companion/route.ts`：日常 TA 聊天。
- `app/api/practice/full-simulation/*`：inline 演练章节生命周期。
- `app/api/practice/quick-line/route.ts`：快速试一句 / 风险建议。
- `app/api/reality-events/route.ts`：用户确认的现实事件记录。
- `app/api/actions/*`：现实行动创建与反馈。
- `app/api/profile/route.ts`：TA 档案与现实层。
- `app/api/memories/route.ts`：回忆创建与列表。
- `app/api/voice/*`：语音转文字 / 文字转语音。
- `app/api/uploads/*`：临时素材、公开资源上传与访问。

### 关键代码文件

- `lib/repositories.ts`：主要业务逻辑。多数功能改动都要同时维护数据库路径和 dev-store 路径。
- `lib/dev-store.ts`：本地开发 fallback 存储。行为要尽量和生产数据库路径保持一致。
- `db/schema.ts`：Drizzle 数据库 schema。改 schema 后要生成 migration。
- `lib/ai-service.ts`：AI prompt 合同与模型调用。
- `lib/ai-output-schemas.ts`：AI JSON 输出校验 schema。
- `lib/errors.ts`：API 错误响应工具。
- `lib/api-client.ts`：前端 API 响应与错误处理。
- `lib/auth.ts`：当前用户身份 / 匿名或登录逻辑。
- `lib/asset-lifecycle.ts`：上传和生成资源的清理生命周期。
- `lib/analytics.ts`：轻量行为与 AI 指标记录。

---

## 5. 数据与持久化规则

- 当前项目同时支持：
  - 数据库生产路径
  - 本地 `dev-store` fallback 路径
- 如果新增或修改持久化概念，通常需要同步修改：
  - `db/schema.ts`
  - Drizzle migration 文件
  - `lib/dev-store.ts`
  - `lib/repositories.ts`
  - 集成测试
- 所有基于 ID 的接口都必须保留 ownership 校验。
- 不允许读取、修改、删除其他用户的 Crush、消息、行动、演练、回忆或现实层记录。
- 销毁 / 归档流程必须继续清理对应 TA 数据和相关资源。
- 不要提交无意产生的 `tsconfig.tsbuildinfo` 改动。

---

## 6. AI 行为规则

### 日常聊天

日常聊天应该让用户感觉自己在和 TA 说话。

它可以使用：

- Crush 档案
- 当前关系阶段
- 互动温度
- 最近演练摘要
- 最近现实事件、现实信号、现实推断

但必须做到：

- 简短、自然、有关系感。
- 不暴露系统提示。
- 不自动变成教练或分析师。
- 不断言现实中的感情结论。
- 只有在语境自然时，才轻轻提起现实事件。
- 不要每次聊天都强行回顾现实事件。

### 演练聊天

演练可以比日常聊天更现实、更不讨好用户。

它应该：

- 保守模拟当前现实中的 TA。
- 允许犹豫、冷淡、拒绝、不确定、误解。
- 使用现实上下文，但不要被单个事件过度改写。
- 不让 Coach 自动插入主对话；提示只在用户主动请求时出现。

### 结构化 AI 输出

任何用于持久化或影响业务分支的 AI JSON 输出，都必须通过 `lib/ai-output-schemas.ts` 校验。

不要持久化未校验的模型 JSON。

---

## 7. UI 与交互规则

- 优先做聊天内的 inline 交互，不要轻易新增独立模块。
- 结构化功能要轻：
  - `演一遍`
  - `记一下`
  - 复盘卡
  - 保存行动
- 顶部 header 不要出现像 TA 台词一样的文案。
- 如果是 TA 说的话，就放进聊天流。
- 如果是状态或功能，就做成 UI。
- 移动端可读性很重要，不要堆密集面板。
- 避免通用 AI SaaS Dashboard 气质。这个产品应该更亲密、更柔和、更关系中心。

---

## 8. 常用开发命令

在项目根目录运行：

```bash
npm run dev
npm run typecheck
npm run lint
npm run test:ai-schemas
npm run test:integration
npm run db:generate
npm run db:migrate
```

注意：

- `npm run test:integration` 会启动本地服务。在沙箱环境里可能因为监听 `127.0.0.1` 报 `listen EPERM`，这种情况要用合适的提权方式重跑，不要直接判断为产品失败。
- 跑完 typecheck 后，检查 `tsconfig.tsbuildinfo` 是否出现无意改动。

---

## 9. 交付前验证

改代码时，先跑和改动相关的最小测试；碰到核心流程时，建议完整跑：

```bash
npm run typecheck
npm run lint
npm run test:ai-schemas
npm run test:integration
```

如果完成或显著改变了某个 milestone，要同步更新 `TODO.md`。

---

## 10. Agent 协作规则

- 开始前先运行 `git status --short`。
- 不要擅自 reset、revert 或覆盖已有改动，除非用户明确要求。
- 如果任务很宽泛，先阅读和理解，再提出最小可执行批次。
- 即使字面任务可以通过新增“工具页”解决，也要优先维护 TA-centered 产品方向。
- 新增功能时，优先加深核心闭环，不要扩大导航结构。
- 最终交付时说清楚：
  - 改了什么
  - 为什么重要
  - 验证了什么
  - 还剩什么

如果犹豫，就问自己：

> 这个改动会让用户更想回来见 TA，还是让用户感觉自己打开了一个后台管理系统？

选择前者。
