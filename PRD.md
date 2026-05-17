# GD Crush MVP 工程化 PRD

## 1. 文档目标

本文档将 `CLAUDE.md` 中的产品 SPEC 拆解为可执行的 MVP 工程方案，覆盖：

- 页面清单与用户流程。
- 数据库表结构。
- API 路由设计。
- AI Prompt 结构。
- MVP 开发任务拆解。

## 2. MVP 产品边界

### 2.1 MVP 核心能力

MVP 只支持单个用户创建和使用单个 Crush 档案，完整跑通以下闭环：

```text
深度建档
  ↓
图片参考生成二次元角色
  ↓
进入 Crush 工作台
  ↓
甜蜜陪伴 / 语音陪伴 / 一句话测试 / 完整演练
  ↓
生成复盘与现实行动
  ↓
用户记录现实反馈
  ↓
更新情报卡与成长指标
  ↓
沉淀回忆册
```

### 2.2 MVP 明确不做

- 多 Crush 档案。
- 社交广场。
- 公开分享。
- 自动抓取社交平台。
- 真实人物声音克隆。
- 实时语音电话。
- PDF 导出。
- 复杂视觉小说分支树。
- 高级订阅计费后台。

## 3. 信息架构

### 3.1 页面清单

| 页面 | 路由 | 作用 | MVP 优先级 |
|---|---|---|---|
| 年龄与用途确认 | `/onboarding/age-gate` | 18+ 确认、用途声明 | P0 |
| 创建 Crush 向导 | `/onboarding/create` | 分步采集关系、性格、物料、图片 | P0 |
| AI 建档确认 | `/onboarding/review` | 展示 AI 档案草稿，用户确认/修改 | P0 |
| 视觉主题与角色生成 | `/onboarding/visual` | 选择主题、确认视觉标签、生成角色 | P0 |
| Crush 工作台 | `/app` | 首页，聚合状态、建议、CTA | P0 |
| 甜蜜陪伴聊天 | `/app/chat` | 日常聊天、语音输入、语音回复 | P0 |
| 实战演练 | `/app/practice` | 一句话测试与完整对话模拟 | P0 |
| 复盘与现实行动 | `/app/actions` | 行动建议、执行状态、现实反馈 | P0 |
| 情报卡 | `/app/profile` | 结构化 Crush 档案与情报更新 | P0 |
| 轻量回忆册 | `/app/memories` | 回忆碎片、收藏聊天、场景记录 | P1 |
| 设置与隐私 | `/app/settings` | 自动播放、数据删除、隐私说明 | P0 |

### 3.2 全局导航

移动端底部导航：

```text
工作台 / 聊天 / 演练 / 情报 / 回忆
```

桌面端建议使用左侧窄边栏：

```text
App Logo
工作台
甜蜜陪伴
实战演练
情报卡
回忆册
设置
```

## 4. 用户流程

### 4.1 首次使用流程

```text
访问产品
  ↓
年龄与用途确认
  ↓
创建 Crush 向导
  ↓
填写关系背景
  ↓
粘贴聊天文本 / 添加事件 / 上传图片参考
  ↓
AI 分析建档
  ↓
用户确认档案草稿
  ↓
选择视觉主题
  ↓
生成角色头像、立绘、表情
  ↓
配置语音风格
  ↓
进入 Crush 工作台
```

### 4.2 一句话测试流程

```text
工作台点击「测试一句话 / 开始演练」
  ↓
默认进入一句话测试
  ↓
选择场景与发送环境
  ↓
输入准备发送的话
  ↓
AI 模拟 Crush 反应
  ↓
Coach 输出风险、可能感受、替代表达、发送建议
  ↓
用户保存为现实行动
  ↓
行动页标记执行结果
  ↓
AI 建议更新情报卡和成长指标
```

### 4.3 甜蜜陪伴流程

```text
工作台点击「甜蜜陪伴」
  ↓
进入聊天页
  ↓
文字或语音输入
  ↓
虚拟 Crush 回复
  ↓
陪伴模式默认播放 Crush 语音
  ↓
用户可收藏对话为回忆
  ↓
更新虚拟亲密度与回忆碎片
```

### 4.4 现实反馈流程

```text
用户进入行动页
  ↓
选择某条待执行行动
  ↓
标记：已发送 / 没发送 / 积极回应 / 普通回应 / 冷淡回应 / 不推进
  ↓
补充现实反馈文本
  ↓
AI 提取事实与建议更新
  ↓
用户确认后写入情报卡
```

## 5. 页面规格

### 5.1 年龄与用途确认页

核心组件：

- 18+ 确认卡片。
- 产品用途声明。
- 隐私与安全摘要。
- 继续按钮。

验收标准：

- 用户未确认前不能进入创建流程。
- 确认结果写入用户设置。

### 5.2 创建 Crush 向导

分步结构：

1. 关系背景。
2. TA 的性格与互动风格。
3. 用户目标与焦虑点。
4. 物料粘贴与事件记录。
5. 图片参考上传。

关键字段：

- crush_nickname。
- relationship_origin。
- current_stage_guess。
- last_interaction。
- user_goal。
- user_anxiety。
- personality_notes。
- interests_text。
- boundaries_text。
- pasted_chat_text。
- event_notes。
- reference_image_file。

验收标准：

- 每一步可保存草稿。
- 图片上传前必须展示使用权与删除策略提示。
- 粘贴聊天文本前必须提示去除敏感信息。

### 5.3 AI 建档确认页

展示内容：

- 已确认事实。
- 推测性格。
- 兴趣标签。
- 沟通雷区。
- 现实关系阶段建议。
- 互动温度建议。
- AI 置信度。

用户操作：

- 确认准确。
- 单项编辑。
- 重新分析。
- 删除某条材料。

验收标准：

- 未经用户确认的 AI 推测不能写入正式档案。
- 每条 AI 推测需要标记 `confidence`。

### 5.4 视觉主题与角色生成页

步骤：

1. 展示图片提取的视觉标签。
2. 用户确认/修改视觉标签。
3. 选择主题：晴日校园、都市治愈、梦幻乙女。
4. AI 推荐语音风格。
5. 生成角色资产。

生成资产：

- avatar_url。
- portrait_url。
- expression_neutral_url。
- expression_happy_url。
- expression_shy_url。

验收标准：

- 原始参考图生成完成后默认删除。
- 只保留视觉标签与生成资产。

### 5.5 Crush 工作台

核心模块：

- 角色视觉区。
- 虚拟亲密度。
- 现实关系阶段。
- 今日建议。
- 主 CTA：测试一句话 / 开始演练。
- 次级 CTA：甜蜜陪伴。
- 今日任务。
- 最近情报。
- 成长指标摘要。

验收标准：

- 虚拟亲密度与现实关系阶段必须视觉分区。
- 首页不展示「真实好感度」一类指标。

### 5.6 甜蜜陪伴聊天页

核心组件：

- 聊天时间线。
- 文本输入框。
- 语音输入按钮。
- Crush 回复语音播放按钮。
- 自动播放开关。
- 收藏为回忆按钮。

验收标准：

- 陪伴模式默认自动播放 Crush 语音。
- 所有语音必须有文字字幕。
- 教练提示默认不出现在陪伴聊天中。

### 5.7 实战演练页

包含两个 Tab：

- 一句话测试。
- 完整对话模拟。

一句话测试组件：

- 场景选择。
- 发送环境选择。
- 待发送文本框。
- 风险分析结果。
- 替代表达。
- 保存为现实行动按钮。

完整模拟组件：

- 目标选择。
- 背景输入。
- 多轮模拟聊天。
- Coach 可展开提示。
- 结束并生成复盘。

验收标准：

- 实战模式不自动播放语音。
- Coach 分析与 Crush 模拟回复必须明确分区。
- 模拟回复可以拒绝、冷淡、犹豫。

### 5.8 复盘与现实行动页

模块：

- 待执行行动。
- 已执行行动。
- 行动结果标记。
- 现实反馈输入。
- AI 建议更新卡片。

行动状态：

- pending。
- sent。
- not_sent。
- positive_response。
- neutral_response。
- cold_response。
- stopped。

验收标准：

- AI 建议更新情报卡前必须由用户确认。
- 现实行动数只在用户主动标记已执行后增加。

### 5.9 情报卡页

模块：

- 基本信息。
- 现实关系阶段。
- 互动温度。
- 兴趣爱好。
- 安全话题。
- 雷区/禁忌。
- 社交风格。
- 回复节奏。
- 近期动态。
- 重要事件。
- AI 置信度。

验收标准：

- 区分 confirmed facts 与 inferred insights。
- 支持用户手动新增、编辑、删除。

### 5.10 轻量回忆册页

模块：

- 回忆卡片列表。
- 收藏对白。
- 虚拟约会记录。
- 行动庆祝记录。

回忆卡字段：

- title。
- memory_type。
- excerpt。
- image_url。
- reward_summary。
- created_at。

验收标准：

- 回忆册必须显示「虚拟体验」边界说明。
- 不支持公开分享。

### 5.11 设置与隐私页

模块：

- 语音自动播放。
- 语音风格设置。
- 数据导出占位。
- 一键粉碎 Crush 数据。
- 隐私说明。
- 退出登录。

验收标准：

- 一键粉碎必须二次确认。
- 删除后清理 Crush 档案、聊天、回忆、行动、生成资产引用。

## 6. 数据库设计

以下以 PostgreSQL + Drizzle ORM 为目标。

### 6.1 `users`

用户表。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 用户 ID |
| email | text unique nullable | 邮箱 |
| age_confirmed_at | timestamptz nullable | 18+ 确认时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 6.2 `user_settings`

用户设置。

| 字段 | 类型 | 说明 |
|---|---|---|
| user_id | uuid pk fk | 用户 ID |
| auto_play_companion_voice | boolean | 陪伴模式自动播放 |
| voice_speed | text | slow / normal / fast |
| voice_emotion_level | text | restrained / natural / sweet |
| voice_age_style | text | young / mature |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 6.3 `crush_profiles`

Crush 主档案。MVP 每个用户只允许一个 active profile。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | Crush ID |
| user_id | uuid fk | 用户 ID |
| nickname | text | 昵称 |
| relationship_origin | text nullable | 认识方式 |
| real_relationship_stage | text | 现实关系阶段 |
| interaction_temperature | text | cold / neutral / warm / hot |
| risk_level | text | low / medium / high |
| user_goal | text nullable | 用户目标 |
| user_anxiety | text nullable | 用户焦虑 |
| personality_summary | text nullable | 性格摘要 |
| communication_style | text nullable | 沟通风格 |
| ai_confidence | numeric nullable | 整体置信度 |
| status | text | active / archived / destroyed |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 6.4 `crush_traits`

结构化标签。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 标签 ID |
| crush_id | uuid fk | Crush ID |
| trait_type | text | interest / boundary / safe_topic / style / event / visual |
| label | text | 标签名 |
| description | text nullable | 描述 |
| source | text | user / ai / chat_analysis / image_analysis |
| confidence | numeric nullable | AI 置信度 |
| confirmed | boolean | 是否用户确认 |
| created_at | timestamptz | 创建时间 |

### 6.5 `onboarding_materials`

建档材料。原始敏感材料默认短期保存或分析后删除。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 材料 ID |
| crush_id | uuid fk | Crush ID |
| material_type | text | user_text / pasted_chat / event_note / reference_image |
| sanitized_text | text nullable | 脱敏文本或事件描述 |
| storage_url | text nullable | 临时图片 URL |
| retention_status | text | temporary / deleted / retained_summary |
| created_at | timestamptz | 创建时间 |
| deleted_at | timestamptz nullable | 删除时间 |

### 6.6 `ai_profile_drafts`

AI 建档草稿。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 草稿 ID |
| crush_id | uuid fk | Crush ID |
| facts_json | jsonb | 已确认事实候选 |
| inferred_traits_json | jsonb | 推测性格 |
| boundaries_json | jsonb | 雷区 |
| recommended_stage | text | 建议现实关系阶段 |
| interaction_temperature | text | 建议互动温度 |
| confidence | numeric | 置信度 |
| status | text | pending / confirmed / rejected |
| created_at | timestamptz | 创建时间 |
| confirmed_at | timestamptz nullable | 确认时间 |

### 6.7 `visual_assets`

角色与场景资产。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 资产 ID |
| crush_id | uuid fk | Crush ID |
| asset_type | text | avatar / portrait / expression / scene |
| expression | text nullable | neutral / happy / shy |
| theme | text | sunny_campus / city_healing / dream_otome |
| visual_tags_json | jsonb | 用户确认后的视觉标签 |
| storage_url | text | R2 URL |
| prompt_snapshot | text nullable | 生成提示快照 |
| created_at | timestamptz | 创建时间 |

### 6.8 `voice_profiles`

Crush 语音配置。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 语音配置 ID |
| crush_id | uuid fk | Crush ID |
| voice_style | text | clear / gentle / romantic 等 |
| speed | text | slow / normal / fast |
| emotion_level | text | restrained / natural / sweet |
| age_style | text | young / mature |
| provider_voice_id | text nullable | TTS 提供商 voice id |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 6.9 `chat_sessions`

会话表。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 会话 ID |
| crush_id | uuid fk | Crush ID |
| session_type | text | companion / practice / visual_novel |
| title | text nullable | 标题 |
| scenario_type | text nullable | 场景 |
| status | text | active / completed |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 6.10 `messages`

消息表。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 消息 ID |
| session_id | uuid fk | 会话 ID |
| role | text | user / crush / coach / system |
| content | text | 文本内容 |
| audio_url | text nullable | 语音 URL |
| metadata_json | jsonb nullable | 风险、场景、token 等元数据 |
| created_at | timestamptz | 创建时间 |

### 6.11 `practice_runs`

演练记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 演练 ID |
| crush_id | uuid fk | Crush ID |
| session_id | uuid fk nullable | 完整模拟时关联 session |
| practice_type | text | quick_line / full_simulation |
| scenario_type | text | ice_break / invite / apology 等 |
| send_context | text nullable | wechat / in_person / group_chat / comment |
| user_line | text nullable | 用户待发送话术 |
| risk_level | text | low / medium / high |
| simulated_reply | text nullable | Crush 模拟回应 |
| coach_analysis_json | jsonb | Coach 分析 |
| suggested_line | text nullable | 替代表达 |
| created_at | timestamptz | 创建时间 |

### 6.12 `real_actions`

现实行动表。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 行动 ID |
| crush_id | uuid fk | Crush ID |
| practice_run_id | uuid fk nullable | 来源演练 |
| title | text | 行动标题 |
| suggested_message | text nullable | 建议发送内容 |
| status | text | pending / sent / not_sent / positive_response / neutral_response / cold_response / stopped |
| feedback_text | text nullable | 用户反馈 |
| executed_at | timestamptz nullable | 执行时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 6.13 `profile_update_suggestions`

AI 更新情报卡建议。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 建议 ID |
| crush_id | uuid fk | Crush ID |
| source_type | text | action_feedback / chat / onboarding / practice |
| source_id | uuid nullable | 来源 ID |
| suggestion_json | jsonb | 建议更新内容 |
| confidence | numeric | 置信度 |
| status | text | pending / accepted / rejected |
| created_at | timestamptz | 创建时间 |
| resolved_at | timestamptz nullable | 处理时间 |

### 6.14 `growth_metrics`

成长指标，可按当前值存一行，也可以追加历史快照。MVP 建议当前值一行。

| 字段 | 类型 | 说明 |
|---|---|---|
| crush_id | uuid pk fk | Crush ID |
| virtual_intimacy | integer | 虚拟亲密度经验 |
| communication_confidence | integer | 沟通信心 0-100 |
| relationship_understanding | integer | 关系理解度 0-100 |
| emotional_stability | integer | 情绪稳定度 0-100 |
| real_action_count | integer | 现实行动数 |
| memory_fragments | integer | 回忆碎片数 |
| updated_at | timestamptz | 更新时间 |

### 6.15 `memories`

回忆册。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 回忆 ID |
| crush_id | uuid fk | Crush ID |
| source_type | text | chat_favorite / virtual_date / birthday / action_celebration |
| source_id | uuid nullable | 来源 ID |
| title | text | 标题 |
| excerpt | text nullable | 摘录 |
| image_url | text nullable | 插图 |
| reward_json | jsonb nullable | 奖励 |
| created_at | timestamptz | 创建时间 |

### 6.16 `audit_events`

重要隐私与安全事件。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | 事件 ID |
| user_id | uuid fk | 用户 ID |
| event_type | text | age_confirmed / image_deleted / crush_destroyed 等 |
| metadata_json | jsonb nullable | 元数据 |
| created_at | timestamptz | 创建时间 |

## 7. API 路由设计

以下以 Next.js App Router 为目标。

### 7.1 Onboarding

#### `POST /api/onboarding/age-confirm`

写入用户 18+ 确认。

Request:

```json
{
  "confirmed": true
}
```

Response:

```json
{
  "ok": true,
  "ageConfirmedAt": "2026-05-12T00:00:00.000Z"
}
```

#### `POST /api/crush`

创建 Crush 草稿。

Request:

```json
{
  "nickname": "林夏",
  "relationshipOrigin": "朋友介绍认识",
  "currentStageGuess": "普通朋友",
  "lastInteraction": "昨天聊了电影",
  "userGoal": "想自然约她看电影",
  "userAnxiety": "担心太主动"
}
```

Response:

```json
{
  "crushId": "uuid"
}
```

#### `POST /api/onboarding/materials`

保存建档材料。

Request:

```json
{
  "crushId": "uuid",
  "materialType": "pasted_chat",
  "sanitizedText": "用户粘贴的脱敏聊天文本"
}
```

Response:

```json
{
  "materialId": "uuid"
}
```

#### `POST /api/onboarding/analyze`

调用档案分析器生成 AI 建档草稿。

Request:

```json
{
  "crushId": "uuid"
}
```

Response:

```json
{
  "draftId": "uuid",
  "facts": [],
  "inferredTraits": [],
  "boundaries": [],
  "recommendedStage": "普通朋友",
  "interactionTemperature": "neutral_warm",
  "confidence": 0.68
}
```

#### `POST /api/onboarding/confirm-draft`

用户确认 AI 建档草稿。

Request:

```json
{
  "draftId": "uuid",
  "acceptedFacts": [],
  "acceptedTraits": [],
  "realRelationshipStage": "普通朋友",
  "interactionTemperature": "neutral_warm"
}
```

Response:

```json
{
  "ok": true
}
```

### 7.2 图片与视觉资产

#### `POST /api/uploads/reference-image/presign`

生成参考图上传 URL。

Request:

```json
{
  "crushId": "uuid",
  "contentType": "image/jpeg"
}
```

Response:

```json
{
  "uploadUrl": "https://...",
  "temporaryObjectKey": "tmp/reference/..."
}
```

#### `POST /api/visual/extract-tags`

从参考图提取非身份化视觉标签。

Request:

```json
{
  "crushId": "uuid",
  "temporaryObjectKey": "tmp/reference/..."
}
```

Response:

```json
{
  "visualTags": {
    "hairStyle": "短发",
    "clothingMood": "清爽",
    "overallVibe": "温柔校园感"
  }
}
```

#### `POST /api/visual/generate-character`

生成角色资产，并删除原始参考图。

Request:

```json
{
  "crushId": "uuid",
  "theme": "sunny_campus",
  "visualTags": {
    "hairStyle": "短发",
    "overallVibe": "温柔校园感"
  }
}
```

Response:

```json
{
  "assets": {
    "avatarUrl": "https://...",
    "portraitUrl": "https://...",
    "neutralUrl": "https://...",
    "happyUrl": "https://...",
    "shyUrl": "https://..."
  },
  "referenceImageDeleted": true
}
```

### 7.3 工作台

#### `GET /api/dashboard`

获取工作台摘要。

Response:

```json
{
  "crush": {
    "id": "uuid",
    "nickname": "林夏",
    "portraitUrl": "https://..."
  },
  "virtualStatus": {
    "level": 3,
    "text": "今天的她愿意陪你聊一会儿"
  },
  "realStatus": {
    "stage": "普通朋友",
    "temperature": "中性偏暖",
    "riskLevel": "low",
    "todayAdvice": "适合轻松开场，不建议直接邀约。"
  },
  "tasks": [],
  "recentTraits": [],
  "metrics": {}
}
```

### 7.4 聊天与语音

#### `POST /api/chat/companion`

陪伴聊天，流式返回文本。

Request:

```json
{
  "crushId": "uuid",
  "sessionId": "uuid",
  "message": "今天有点想你",
  "inputMode": "text"
}
```

Response:

```text
text/event-stream
```

#### `POST /api/voice/stt`

语音转文字。

Request:

```json
{
  "audioObjectKey": "tmp/audio/..."
}
```

Response:

```json
{
  "text": "今天有点想你"
}
```

#### `POST /api/voice/tts`

Crush 回复转语音。

Request:

```json
{
  "crushId": "uuid",
  "messageId": "uuid",
  "text": "那我陪你聊一会儿。"
}
```

Response:

```json
{
  "audioUrl": "https://..."
}
```

### 7.5 实战演练

#### `POST /api/practice/quick-line`

一句话快速测试。

Request:

```json
{
  "crushId": "uuid",
  "scenarioType": "invite",
  "sendContext": "wechat",
  "userLine": "你周末有空吗？我想约你单独出来。"
}
```

Response:

```json
{
  "practiceRunId": "uuid",
  "riskLevel": "medium",
  "simulatedReply": "啊这周末可能有点忙，我看看吧。",
  "coachAnalysis": {
    "possibleFeeling": "对方可能感到推进略快",
    "mainRisk": "铺垫不足",
    "advice": "先降低邀约压力"
  },
  "suggestedLine": "你之前说想看那部电影，我刚好也挺感兴趣。要是哪天你也想看，我们可以一起。"
}
```

#### `POST /api/practice/full-simulation/start`

开启完整模拟。

Request:

```json
{
  "crushId": "uuid",
  "scenarioType": "apology",
  "goal": "解释误会",
  "background": "昨天我回复太急了，她好像有点不开心"
}
```

Response:

```json
{
  "sessionId": "uuid"
}
```

#### `POST /api/practice/full-simulation/message`

完整模拟单轮消息。

Request:

```json
{
  "sessionId": "uuid",
  "message": "昨天我说话有点急，抱歉。"
}
```

Response:

```json
{
  "crushReply": "没事啦，只是当时有点突然。",
  "coachTip": {
    "riskLevel": "low",
    "advice": "道歉清楚且不过度解释，可以继续给对方空间。"
  }
}
```

#### `POST /api/practice/full-simulation/finish`

生成完整模拟复盘。

Request:

```json
{
  "sessionId": "uuid"
}
```

Response:

```json
{
  "summary": {},
  "suggestedAction": {}
}
```

### 7.6 现实行动

#### `POST /api/actions`

保存现实行动。

Request:

```json
{
  "crushId": "uuid",
  "practiceRunId": "uuid",
  "title": "轻量邀约电影",
  "suggestedMessage": "你之前说想看那部电影..."
}
```

Response:

```json
{
  "actionId": "uuid"
}
```

#### `PATCH /api/actions/:id`

更新行动状态。

Request:

```json
{
  "status": "positive_response",
  "feedbackText": "她说可以看看下周时间"
}
```

Response:

```json
{
  "ok": true,
  "profileUpdateSuggestionId": "uuid"
}
```

#### `POST /api/profile-update-suggestions/:id/resolve`

确认或拒绝 AI 情报更新建议。

Request:

```json
{
  "decision": "accepted"
}
```

Response:

```json
{
  "ok": true
}
```

### 7.7 情报卡

#### `GET /api/profile`

获取 Crush 情报卡。

#### `PATCH /api/profile`

手动更新 Crush 档案。

#### `POST /api/profile/traits`

新增标签。

#### `PATCH /api/profile/traits/:id`

编辑标签。

#### `DELETE /api/profile/traits/:id`

删除标签。

### 7.8 回忆册

#### `GET /api/memories`

获取回忆列表。

#### `POST /api/memories`

收藏聊天或创建回忆。

Request:

```json
{
  "crushId": "uuid",
  "sourceType": "chat_favorite",
  "sourceId": "uuid",
  "title": "睡前晚安",
  "excerpt": "那我陪你到困为止。"
}
```

### 7.9 设置与删除

#### `PATCH /api/settings`

更新用户设置。

#### `POST /api/crush/destroy`

一键粉碎 Crush 数据。

Request:

```json
{
  "crushId": "uuid",
  "confirmText": "DELETE"
}
```

Response:

```json
{
  "ok": true,
  "destroyedAt": "2026-05-12T00:00:00.000Z"
}
```

## 8. AI Prompt 结构

### 8.1 Prompt 总原则

所有 AI 输出都必须遵守：

- 区分事实与推测。
- 不断言现实对象真实喜欢或不喜欢用户。
- 不鼓励骚扰、跟踪、越界、操控。
- 不把虚拟亲密度解释为现实关系进展。
- 实战建议要保守、尊重边界、可执行。
- 陪伴模式可以温柔，但不能声称自己是现实对象本人。

### 8.2 共享上下文结构

所有角色可读取的结构化上下文：

```json
{
  "crushProfile": {
    "nickname": "林夏",
    "realRelationshipStage": "普通朋友",
    "interactionTemperature": "中性偏暖",
    "personalitySummary": "慢热、含蓄、喜欢轻松话题",
    "communicationStyle": "回复不快，但会延续感兴趣的话题"
  },
  "confirmedFacts": [],
  "inferredTraits": [],
  "boundaries": [],
  "recentEvents": [],
  "growthMetrics": {},
  "visualTheme": "sunny_campus"
}
```

### 8.3 档案分析器 Prompt

System Prompt:

```text
你是 GD Crush 的档案分析器。你的任务是从用户主动提供的材料中提取结构化 Crush 档案草稿。

规则：
1. 你只能基于用户提供的材料分析。
2. 必须区分「已确认事实」和「推测」。
3. 每条推测都必须给出 confidence，范围 0 到 1。
4. 不得断言 TA 喜欢或不喜欢用户。
5. 不得鼓励越界、骚扰、跟踪或操控。
6. 输出必须是 JSON。
7. 所有结果都只是待用户确认的草稿。

输出 JSON 字段：
- confirmedFacts
- inferredTraits
- interests
- boundaries
- communicationStyle
- recommendedRelationshipStage
- interactionTemperature
- userRiskNotes
- confidence
```

User Prompt 模板：

```text
以下是用户主动提供的建档材料，请生成可编辑的 Crush 档案草稿。

关系背景：
{{relationship_background}}

用户目标：
{{user_goal}}

用户焦虑：
{{user_anxiety}}

脱敏聊天文本：
{{sanitized_chat_text}}

事件记录：
{{event_notes}}
```

### 8.4 图片标签提取 Prompt

System Prompt:

```text
你是 GD Crush 的视觉标签提取器。你的任务是从参考图中提取非身份化视觉灵感，用于生成明显虚构的二次元/乙女风格角色。

规则：
1. 不识别真实身份。
2. 不生成可复原真实人物的人脸特征描述。
3. 只提取非身份化标签，如发型、发色、穿搭气质、整体氛围、表情倾向。
4. 输出必须是 JSON。

输出字段：
- hairStyle
- hairColor
- outfitMood
- overallVibe
- expressionMood
- ageImpressionRange
- unsafeOrSensitiveElements
```

### 8.5 角色生成 Prompt 模板

```text
生成一个明显虚构的二次元/乙女游戏风格虚拟角色。

主题：{{visual_theme}}
视觉标签：{{visual_tags}}
性格摘要：{{personality_summary}}

要求：
- 明显是二次元插画，不是写真人像。
- 不复刻真实人物身份。
- 清爽、精致、适合移动端 App 展示。
- 输出头像、半身立绘、平静/开心/害羞表情差分。
```

### 8.6 虚拟 Crush 陪伴 Prompt

System Prompt:

```text
你是 GD Crush 中的虚拟 Crush 角色。你是基于用户设定生成的虚拟角色，不是现实对象本人。

当前模式：甜蜜陪伴。

行为规则：
1. 以温柔、自然、贴近角色性格的方式陪用户聊天。
2. 可以提供情绪安抚和陪伴感。
3. 不要声称自己是现实对象本人。
4. 不要暗示虚拟互动会改变现实关系。
5. 当用户明显上头、焦虑或想做越界行为时，温和引导其冷静。
6. 回复要像自然聊天，不要像咨询报告。
7. 不显示恋爱教练式分析。
```

User Context:

```text
Crush 档案：
{{crush_profile}}

最近回忆：
{{recent_memories}}

用户消息：
{{user_message}}
```

### 8.7 一句话测试 Coach Prompt

System Prompt:

```text
你是 GD Crush 的恋爱教练。你的任务是帮助用户冷静评估一句准备发给现实对象的话。

当前模式：实战演练。

规则：
1. 必须保守、尊重边界。
2. 不得断言 TA 喜欢或不喜欢用户。
3. 基于 Crush 档案、现实关系阶段、近期情报进行分析。
4. 必须区分模拟回应和教练建议。
5. 如果话术有越界、施压、操控、追问风险，要明确指出。
6. 输出 JSON。

输出字段：
- riskLevel: low | medium | high
- simulatedReply
- possibleFeeling
- mainRisk
- suggestedLine
- sendTimingAdvice
- shouldSend
- coachNotes
```

User Prompt:

```text
Crush 档案：
{{crush_profile}}

现实关系阶段：
{{real_relationship_stage}}

近期情报：
{{recent_traits}}

场景：
{{scenario_type}}

发送环境：
{{send_context}}

用户准备发送的话：
{{user_line}}
```

### 8.8 完整对话模拟 Prompt

System Prompt:

```text
你在 GD Crush 的实战演练模式中同时模拟两个输出：
1. Crush 根据现实关系阶段和性格档案作出可能反应。
2. Coach 给出简短、可展开的风险提示。

规则：
1. Crush 的反应必须保守真实，可以冷淡、拒绝、犹豫。
2. Coach 不要过度鼓励推进。
3. 不得制造对方真实喜欢用户的确定性。
4. 每轮输出 JSON。

输出字段：
- crushReply
- coachTip: { riskLevel, advice, nextMove }
```

### 8.9 复盘 Prompt

System Prompt:

```text
你是 GD Crush 的复盘教练。请根据本轮演练或现实反馈生成冷静、尊重边界、可执行的复盘。

输出 JSON：
- summary
- userStrength
- riskPoints
- recommendedNextAction
- suggestedMessage
- shouldSlowDown
- profileUpdateSuggestions
- growthMetricDelta
```

### 8.10 记忆与情报提取 Prompt

System Prompt:

```text
你是 GD Crush 的情报提取器。你只能从用户主动提供的文本中提取可确认或待确认的信息。

规则：
1. 不保留原文中敏感身份信息。
2. 提取为摘要标签。
3. 区分 fact 与 inference。
4. 所有 inference 必须带 confidence。
5. 输出 JSON。

输出字段：
- facts
- inferredTraits
- interests
- boundaries
- recentEvents
- suggestedRelationshipStageChange
- confidence
```

## 9. 前端组件清单

### 9.1 通用组件

- `AppShell`
- `BottomNav`
- `SidebarNav`
- `ModeBadge`
- `RiskBadge`
- `StageBadge`
- `MetricBar`
- `VoiceButton`
- `AudioPlayer`
- `ConfirmDialog`
- `PrivacyNotice`
- `LoadingStreamText`

### 9.2 Onboarding 组件

- `AgeGateCard`
- `CreateCrushWizard`
- `RelationshipStep`
- `MaterialStep`
- `ReferenceImageStep`
- `ProfileDraftReview`
- `VisualThemePicker`
- `VoiceStylePicker`
- `CharacterGenerationProgress`

### 9.3 工作台组件

- `CrushHero`
- `RealStatusCard`
- `TodayAdviceCard`
- `PrimaryPracticeCTA`
- `CompanionCTA`
- `TodayTasks`
- `RecentIntelList`
- `GrowthSummary`

### 9.4 聊天组件

- `ChatTimeline`
- `ChatBubble`
- `ChatComposer`
- `VoiceInputButton`
- `AutoPlayToggle`
- `FavoriteMemoryButton`

### 9.5 演练组件

- `PracticeTabs`
- `QuickLineForm`
- `ScenarioSelect`
- `SendContextSelect`
- `PracticeResultCard`
- `CoachAnalysisCard`
- `SuggestedLineCard`
- `FullSimulationChat`
- `EndSimulationButton`

### 9.6 行动与情报组件

- `ActionList`
- `ActionStatusMenu`
- `FeedbackForm`
- `ProfileUpdateSuggestionCard`
- `IntelSection`
- `TraitEditor`
- `ConfidenceLabel`

### 9.7 回忆册组件

- `MemoryGrid`
- `MemoryCard`
- `MemoryDetailSheet`
- `VirtualBoundaryNote`

## 10. MVP 开发任务拆解

### Phase 0: 项目基础

- 初始化 Next.js、Tailwind、Drizzle、数据库连接。
- 配置环境变量读取与服务端校验。
- 搭建 App Router 路由结构。
- 搭建基础 UI 主题与 AppShell。
- 接入认证占位或匿名用户机制。

验收：

- 本地可启动。
- 数据库迁移可运行。
- `/onboarding/age-gate` 和 `/app` 基础页面可访问。

### Phase 1: 数据模型与基础 CRUD

- 建立数据库迁移。
- 实现 `users`、`crush_profiles`、`crush_traits`、`growth_metrics`。
- 实现 Crush 创建、读取、更新。
- 实现年龄确认。
- 实现设置页基础字段。

验收：

- 可以创建一个 Crush 草稿。
- 可以读取工作台基础数据。
- 年龄确认状态可持久化。

### Phase 2: 深度建档

- 创建分步建档向导。
- 支持文字材料、粘贴聊天文本、事件记录。
- 实现材料保存 API。
- 实现档案分析器 Prompt 与 API。
- 实现 AI 建档确认页。
- 用户确认后写入正式情报卡。

验收：

- 用户完成问答后能生成档案草稿。
- 草稿确认后更新 `crush_profiles` 和 `crush_traits`。

### Phase 3: 图片参考与角色生成

- 实现参考图上传 presigned URL。
- 实现图片隐私提示。
- 实现视觉标签提取。
- 实现视觉主题选择。
- 实现角色生成 API。
- 生成完成后删除原始参考图并记录 audit event。
- 展示头像、立绘、表情资产。

验收：

- 上传参考图后能生成二次元角色资产。
- 原图默认删除。
- 工作台展示角色图。

### Phase 4: Crush 工作台

- 实现 Dashboard API。
- 实现 CrushHero、RealStatusCard、TodayAdviceCard。
- 实现成长指标摘要。
- 实现最近情报。
- 实现 CTA 跳转。

验收：

- `/app` 能完整展示虚拟与现实两套状态。
- 主 CTA 跳转到 `/app/practice`。
- 次级 CTA 跳转到 `/app/chat`。

### Phase 5: 甜蜜陪伴聊天

- 实现 chat session 与 messages 表写入。
- 接入 Vercel AI SDK 流式回复。
- 实现虚拟 Crush 陪伴 Prompt。
- 实现聊天时间线。
- 实现收藏为回忆。
- 更新虚拟亲密度。

验收：

- 用户能与虚拟 Crush 连续聊天。
- 回复符合陪伴模式，不出现 Coach 分析。
- 可收藏消息为回忆。

### Phase 6: 语音 MVP

- 实现语音上传。
- 实现 STT API。
- 实现 TTS API。
- 实现聊天页语音输入。
- 实现 Crush 回复语音生成与播放。
- 陪伴模式默认自动播放。
- 实战模式禁用自动播放。

验收：

- 用户可以说话输入。
- Crush 回复有文字和音频。
- 自动播放规则符合 SPEC。

### Phase 7: 一句话快速测试

- 实现场景选择与发送环境选择。
- 实现 quick-line API。
- 实现 Coach Prompt。
- 保存 practice_runs。
- 展示风险、模拟回复、替代表达。
- 支持保存为现实行动。

验收：

- 用户输入一句话后得到结构化分析。
- 能保存为待执行行动。
- 实战页不自动播放语音。

### Phase 8: 完整对话模拟

- 实现 full simulation session。
- 实现多轮模拟 API。
- 实现 Crush 回复 + Coach 提示卡。
- 实现结束复盘。
- 保存 practice_runs 与 messages。

验收：

- 用户能完成多轮演练。
- 每轮显示模拟回复和 Coach 提示。
- 结束后生成复盘。

### Phase 9: 现实行动与反馈

- 实现 real_actions 列表。
- 实现行动状态更新。
- 实现现实反馈输入。
- 实现情报提取与更新建议。
- 用户确认后更新情报卡和成长指标。

验收：

- 用户能标记行动结果。
- AI 生成更新建议。
- 用户确认后写入情报卡。

### Phase 10: 情报卡

- 实现 Profile API。
- 实现情报卡页面。
- 支持新增、编辑、删除标签。
- 区分事实与推测。
- 展示置信度。

验收：

- 用户能手动管理情报。
- AI 推测不与事实混在一起。

### Phase 11: 轻量回忆册

- 实现 memories 表 CRUD。
- 实现回忆册列表。
- 支持聊天收藏。
- 支持行动庆祝回忆。
- 显示虚拟体验边界说明。

验收：

- 用户能查看回忆卡。
- 回忆不支持公开分享。

### Phase 12: 隐私与删除

- 实现一键粉碎。
- 删除 Crush 相关数据。
- 删除或失效 R2 资产引用。
- 写入 audit event。
- 完成隐私说明页。

验收：

- 二次确认后可删除 Crush 数据。
- 删除后无法访问原聊天、情报、行动、回忆。

## 11. MVP 验收清单

### 产品验收

- 用户能完成从建档到工作台的完整流程。
- 用户能进入甜蜜陪伴并获得文字 + 语音回复。
- 用户能进行一句话测试并保存现实行动。
- 用户能完成完整对话模拟并查看复盘。
- 用户能记录现实反馈并更新情报卡。
- 用户能查看轻量回忆册。

### 安全验收

- 18+ 确认存在且不可跳过。
- 图片参考生成后默认删除原图。
- 不支持真实人物声音克隆。
- 粘贴聊天文本前有隐私提示。
- AI 不断言 TA 喜欢或不喜欢用户。
- 虚拟亲密度与现实关系阶段分开展示。
- 一键粉碎可用。

### 技术验收

- API Key 不出现在客户端 bundle。
- `.env.local` 不提交。
- AI 接口有错误处理。
- 数据库迁移可重复运行。
- 关键 API 有基础鉴权。
- R2 上传使用 presigned URL。
- 流式聊天在移动端可用。

## 12. 后续 v1.0 候选任务

- 多 Crush 管理。
- pgvector 长期语义记忆。
- 更多视觉小说场景。
- 场景图生成。
- 语音情绪控制。
- Happy Ending 归档与导出。
- 更完整的订阅计费。
- 90 天静默过期自动删除任务。
- 实时语音对话 Beta。
