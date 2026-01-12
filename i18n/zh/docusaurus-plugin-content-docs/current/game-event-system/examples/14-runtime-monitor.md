---
sidebar_label: '14 运行时监视器'
sidebar_position: 15
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 14 运行时监视器：生产环境可观察性

<VideoGif src="/video/game-event-system/example/14-runtime-monitor.mp4" />

## 📋 概述

在生产环境中，事件每秒触发数千次。`Debug.Log()` 会产生垃圾，淹没控制台，并且无法提供对系统健康状况的结构化洞察。您需要**企业级可观察性**——实时性能分析、监听器跟踪、频率分析和完整性警告。

**游戏事件监视器**是一个专门的调试窗口，用于回答关键问题：
- *"哪个事件导致了那次帧率下降？"*
- *"这个事件是否触发得太频繁？"*
- *"现在谁在实际监听这个事件？"*
- *"为什么我的链式序列中断了？"*

此示例模拟了一个**高负载压力测试设施**，包含四个专门的测试单元，每个单元旨在用诊断数据填充特定的监视器选项卡。

:::tip 💡 您将学到
- 如何打开和导航运行时监视器窗口
- 读取性能指标（平均/最小/最大执行时间）
- 分析事件频率并检测垃圾信息
- 检查监听器数量（检查器与API绑定）
- 可视化编程流程图
- 检测完整性问题（幽灵事件、断裂链）
- 解释警告和健康指标

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/14_RuntimeMonitor/14_RuntimeMonitor.unity
```

### 场景构成

**视觉元素：**
- 🎯 **Test Console** - 描述4个测试单元的信息面板
- 🧊 **Simple Geometry** - 平面和立方体（最小场景）

**UI层（Canvas）：**
- 🎮 **四个控制按钮** - 屏幕底部
  - "Toggle Spammer (Unit A)" → 启动/停止高频垃圾信息
  - "Trigger Heavy Load (Unit B)" → 触发昂贵操作
  - "Fire Chain Reaction (Unit C)" → 执行编程链
  - "Fire Ghost Event (Unit D)" → 触发无监听器的事件

**游戏逻辑层：**
- 📤 **RuntimeMonitorRaiser** - 测试协调器
- 📥 **RuntimeMonitorReceiver** - 带检测监听器的测试响应器

---

## 🧪 4个测试单元

每个单元旨在对特定监视器子系统进行压力测试：

### 单元A：垃圾信息生成器（频率测试）

**目的：** 生成高频事件垃圾信息以测试统计选项卡

**配置：**
- **事件：** `OnSpammer`（void）、`OnSpammerPersistent`（void）
- **行为：** 激活时在 `Update()` 中每秒触发**>60次**
- **监视器目标：** 检测高频警告

**预期结果：**
- 📈 **统计选项卡：** 显示 >60 次/秒（红色警告）
- ⚠️ **警告选项卡：** 标记 `[高频]` 问题

---

### 单元B：重负载（性能测试）

**目的：** 模拟昂贵的计算以测试性能选项卡

**配置：**
- **事件：** `OnHeavyLoad`、`OnHeavyLoadCondition`（GameObject、DamageInfo）
- **行为：** 监听器调用 `Thread.Sleep(6)` 模拟6毫秒以上延迟
- **监视器目标：** 触发性能警告

**预期结果：**
- ⚡ **性能选项卡：** 执行时间显示6-12毫秒（黄色/红色）
- 📊 **仪表板：** 性能条变为黄色/红色

**代码机制：**
```csharp
public void OnHeavyExecution(GameObject sender, DamageInfo info)
{
    // 模拟繁重计算（在生产中不好，但非常适合测试！）
    Thread.Sleep(6);  // ← 强制6毫秒执行时间
}
```

---

### 单元C：链式反应器（自动化测试）

**目的：** 演示编程流程图可视化

**配置：**
- **事件：** `OnChainStart` → `OnChainProcess` → `OnChainFinish` → `OnTriggerComplete`
- **行为：** 代码构建的带延迟和条件的顺序管道
- **监视器目标：** 在自动化选项卡中可视化动态自动化

**图表结构：**
```
🚀 [ 开始 ] OnChainStart (DamageInfo)
│   ➔ 载荷：{ amount: 75.0, type: Physical, ... }
│
├─ ⏱️ [ 步骤1 ] ➔ 延迟：0.5秒
│  └─► ⚙️ OnChainProcess (DamageInfo)      ✅ 数据中继
│
├─ ⚖️ [ 步骤2 ] ➔ 延迟：0.2秒 | 守卫：`amount > 50`
│  └─► 🎯 OnChainFinish (DamageInfo)       ✅ 逻辑通过（75 > 50）
│
└─ 🧹 [ 步骤3 ] ➔ 触发器模式 | 阻止参数
   └─► 🏁 OnTriggerComplete (void)        ✅ 信号净化
│
📊 结果：管道完成 | 🛡️ 数据安全：在退出时阻止参数
```

**预期结果：**
- 🔗 **自动化选项卡：** 显示带时序/条件徽章的层次树
- 📝 **最近事件选项卡：** 可见的顺序触发模式

---

### 单元D：幽灵（完整性测试）

**目的：** 检测在没有监听器的情况下触发的事件

**配置：**
- **事件：** `OnGhost`（void）
- **行为：** 触发绑定了**零监听器**的事件
- **监视器目标：** 触发完整性警告

**预期结果：**
- ⚠️ **警告选项卡：** 显示 `[无监听器]` 警告
- 📊 **仪表板：** 警告计数增加

---

## 🎮 如何测试（分步指南）

### 阶段1：准备

**步骤1：打开监视器窗口**
- **菜单**

  该工具位于**[游戏事件系统](../visual-workflow/game-event-system)**中，您可以通过以下方法访问：

  **从系统仪表板：**
```tex
  游戏事件系统窗口 → 点击"游戏事件监视器"
```

- **窗口出现**

  可像任何Unity编辑器窗口一样停靠

**步骤2：进入播放模式**
- 点击Unity的播放按钮
- 监视器在播放期间保持可见

---

### 阶段2：生成测试数据

**步骤3：激活单元A（垃圾信息生成器）**
- 点击**"Toggle Spammer (Unit A)"**按钮
- **观察：** 按钮保持激活（切换为开）
- **效果：** `OnSpammer` 每秒触发 >60次

**步骤4：激活单元B（重负载）**
- 点击**"Trigger Heavy Load (Unit B)"**按钮**3-5次**
- **效果：** 每次点击触发一次昂贵操作（6毫秒延迟）

**步骤5：激活单元C（链式反应）**
- 点击**"Fire Chain Reaction (Unit C)"**按钮**一次**
- **效果：** 启动4步顺序管道

**步骤6：激活单元D（幽灵事件）**
- 点击**"Fire Ghost Event (Unit D)"**按钮**一次**
- **效果：** 触发无监听器的事件（完整性违规）

:::tip ⏱️ 等待时间

触发所有单元后，在分析监视器选项卡之前等待**5-10秒**以积累数据。

:::

---

## 📊 监视器窗口分析

### 选项卡1：🏠 仪表板（系统健康概览）

登陆页面——将所有子系统的指标聚合到单个健康报告中。

![监视器仪表板](/img/game-event-system/examples/14-runtime-monitor/demo-14-dashboard.png)

**指标卡（顶行）：**

| 卡片         | 含义                   | 预期值         |
| ------------ | ---------------------- | -------------- |
| **总事件数** | 已加载的事件数量       | 9              |
| **总日志数** | 自播放开始的累积触发数 | 500+（攀升中） |
| **监控中**   | 具有活动性能跟踪的事件 | 4-6            |
| **警告**     | 当前活动问题           | 2+（垃圾+幽灵）|

**激活数据库部分：**
- 列出所有已加载的数据库资产
- **PRIMARY** 徽章显示主数据库
- 点击数据库名称过滤视图

**性能概览（交通灯条）：**
- 🟢 **绿色：** 所有事件 &lt;1毫秒（健康）
- 🟡 **黄色：** 一些事件1-5毫秒（注意）
- 🔴 **红色：** 检测到事件 >5毫秒（关键）
- 显示百分比分布

**最近活动（迷你日志）：**
- 最后15次事件触发
- 格式：`[帧] 事件名称（参数）`
- 点击跳转到详细信息选项卡

**快速警告（前3个）：**
- 浮现最关键的警报
- 严重性图标：🔵 信息、🟡 警告、🔴 关键
- 点击跳转到警告选项卡

:::note 🎯 仪表板目的

单一浏览系统健康检查——就像汽车的仪表盘。如果显示红色/黄色，深入特定选项卡进行诊断。

:::

---

### 选项卡2：⚡ 性能（执行分析）

**重点：** 通过执行时间检测性能瓶颈

![监视器性能](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

**列：**

| 列           | 含义                 | 健康范围          |
| ------------ | -------------------- | ----------------- |
| **事件名称** | 事件标识符           | -                 |
| **平均时间** | 平均执行毫秒         | &lt;1毫秒 🟢         |
| **最小时间** | 最快执行             | -                 |
| **最大时间** | 最慢执行             | &lt;5毫秒 🟡，>5毫秒 🔴 |
| **监听器**   | 每次触发的平均监听器数 | -                 |
| **GC分配**   | 每次触发生成的垃圾   | 0 KB理想          |

**颜色编码：**
- 🟢 **绿色：** 0-1毫秒（优秀）
- 🟡 **黄色：** 1-5毫秒（监控）
- 🔴 **红色：** >5毫秒（调查）

**测试结果（单元B）：**
1. 在表中找到 `OnHeavyLoad` 事件
2. **平均时间：** 显示 ~6.00毫秒（🟡 黄色）
3. **最大时间：** 如果多次点击可能显示 ~12.00毫秒（🔴 红色）
4. **原因：** 监听器代码中的 `Thread.Sleep(6)`

**用法：**
- 按"平均时间"排序以找到最严重的问题
- 点击事件名称查看详细信息选项卡
- 比较监听器数量——更多监听器 = 更高风险

:::warning ⚠️ 性能预算

一般规则：保持平均执行时间 &lt;1毫秒。在所有系统中分配总帧时间（60fps下16毫秒）。

:::

---

### 选项卡3：📝 最近事件（实时事件日志）

**重点：** 所有事件触发的按时间顺序流

![监视器最近](/img/game-event-system/examples/14-runtime-monitor/demo-14-recent.png)

**列：**

| 列         | 含义                     | 示例                                   |
| ---------- | ------------------------ | -------------------------------------- |
| **帧**     | Unity帧号                | `F:1450`                               |
| **时间**   | 自播放开始的时间戳       | `12.45s`                               |
| **事件**   | 事件名称                 | `OnHeavyLoad`                          |
| **参数**   | 载荷预览                 | `<DamageInfo: 100>`                    |
| **调用者** | 调用 `.Raise()` 的方法   | `RuntimeMonitorRaiser.TriggerHeavyLoad`|

**功能：**
- 🔍 **搜索：** 按事件名称过滤
- 📋 **堆栈跟踪：** 切换以查看完整调用堆栈
- 🔗 **详细信息链接：** 点击事件查看深入分析

**测试结果（所有单元）：**
- **单元A：** 快速连续的 `OnSpammer` 条目（60+/秒）
- **单元C：** 顺序模式：`OnChainStart` → （延迟）→ `OnChainProcess` → `OnChainFinish` → `OnTriggerComplete`
- **单元D：** 单个 `OnGhost` 条目

**用法：**
- 验证事件触发顺序（顺序与并行）
- 调试意外事件触发
- 调查调用者方法（谁在触发这个？）

:::tip 🎯 专业提示

与Unity控制台不同，此日志**专门用于事件**——没有来自其他Debug.Log调用的噪音、结构化数据预览、直接调用者信息。

:::

---

### 选项卡4：📈 统计（频率分析）

**重点：** 长期使用模式和频率跟踪

![监视器统计](/img/game-event-system/examples/14-runtime-monitor/demo-14-statistics.png)

**列：**

| 列           | 含义                 | 健康范围             |
| ------------ | -------------------- | -------------------- |
| **事件名称** | 事件标识符           | -                    |
| **触发次数** | 自播放开始的总触发数 | -                    |
| **频率/秒**  | 每秒触发次数         | &lt;10 🟢，10-30 🟡，>30 🔴 |
| **平均间隔** | 触发之间的时间（毫秒）| >100毫秒理想         |
| **上次触发** | 自上次触发以来的时间 | -                    |

**测试结果（单元A）：**
1. 找到 `OnSpammer` 事件
2. **触发次数：** 快速攀升（10秒后1000+）
3. **频率/秒：** 显示**>60/秒**（🔴 红色警告）
4. **平均间隔：** 显示**~16毫秒**（60fps时每帧）

**警告触发器：**
- 🟡 **黄色：** 10-30次触发/秒
- 🔴 **红色：** >30次触发/秒（潜在性能问题）

**用法：**
- 识别事件垃圾信息（过于频繁）
- 检测空闲事件（从未触发）
- 随时间分析触发模式

:::warning 🚨 频率红色标志
- **>60/秒：** 可能每帧都在触发——考虑批处理
- **不规则峰值：** 可能表示逻辑错误
- **零频率：** 死代码或配置错误的事件

:::

---

### 选项卡5：⚠️ 警告（完整性和健康警报）

**重点：** 过滤噪音，浮现关键问题

![监视器警告](/img/game-event-system/examples/14-runtime-monitor/demo-14-warnings.png)

**严重级别：**

| 图标 | 级别     | 含义                     |
| ---- | -------- | ------------------------ |
| 🔵    | **信息** | 建议通知（仅供参考）     |
| 🟡    | **警告** | 非关键问题（监控）       |
| 🔴    | **关键** | 严重问题（立即修复）     |

**警告类型：**

| 警告           | 触发器                 | 严重性 |
| -------------- | ---------------------- | ------ |
| `[无监听器]`   | 事件被触发但未绑定监听器 | 🔵 信息 |
| `[高频]`       | 每秒触发 >30次         | 🟡 警告 |
| `[性能]`       | 执行时间 >5毫秒        | 🔴 关键 |
| `[GC压力]`     | 每次触发垃圾分配 >1KB  | 🟡 警告 |

**测试结果：**
- **单元A：** `OnSpammer - [高频] 以62/秒触发`
- **单元D：** `OnGhost - [无监听器] 事件在零订阅者下触发`

**用法：**
- 在主要功能添加后检查
- 在压力测试期间监控
- 忽略预期警告（例如调试事件）

:::note 🎓 幽灵事件

`[无监听器]` 警告通常是错误——要么：

1. 监听器注册失败（检查 `OnEnable`）
2. 事件资产引用错误
3. 死代码（删除 `.Raise()` 调用）

:::

---

### 选项卡6：👂 监听器（订阅检查器）

**重点：** 谁在监听的细粒度分解

![监视器监听器](/img/game-event-system/examples/14-runtime-monitor/demo-14-listeners.png)

**选择一个事件**（例如 `OnHeavyLoad`）查看详细分解：

**监听器类别：**

| 类别         | 含义                                 | 图标 |
| ------------ | ------------------------------------ | ---- |
| **基本**     | 标准 `AddListener`                   | 📌    |
| **优先级**   | 带优先级值的 `AddPriorityListener`   | 🔢    |
| **条件**     | 带谓词的 `AddConditionalListener`    | ✅    |
| **持久化**   | `AddPersistentListener`（在场景中存活）| 🧬    |

**分解网格：**
```
📊 总活动监听器：5
│
├─ 🔗 基本监听器（1）
│  ├─ 📦 检查器绑定：0
│  └─ 💻 API绑定：1
│     └─ ⚙️ RuntimeMonitorReceiver.OnHeavyExecution
│
├─ ⚖️ 优先级队列（3）
│  ├─ 🥇 高优先级（100）：1
│  │  └─ ⚙️ RuntimeMonitorReceiver.OnHeavyPreCheck
│  ├─ 🥈 普通优先级（0）：1
│  │  └─ ⚙️ RuntimeMonitorReceiver.OnHeavyExecution
│  └─ 🥉 低优先级（-100）：1
│     └─ ⚙️ RuntimeMonitorReceiver.OnHeavyPostCheck
│
├─ 🛡️ 条件守卫（1）
│  └─ 💎 [优先级：50] RuntimeMonitorReceiver.OnHeavyCriticalWarning
│     └─ 🔍 谓词：(sender, info) => info.isCritical
│
└─ 💎 持久化注册表（0）
   └─ (无跨场景监听器激活)
```

**测试结果（单元B）：**
- **总计：** 4-5个监听器
- **优先级分布：** 高（1）、普通（1）、低（1）
- **条件：** 1（带谓词预览）

**用法：**
- 验证基于代码的注册是否有效
- 检查监听器执行顺序（优先级值）
- 调试缺失的监听器（预期与实际计数）
- 审核持久化监听器（防止内存泄漏）

:::tip 🔍 检查器与API
- **检查器绑定：** 在行为窗口中配置
- **API绑定：** 通过代码中的 `AddListener` 注册
- 两者都显示在这里——验证您的混合方法

:::

---

### 选项卡7：🔗 自动化（编程流程可视化）

**重点：** 可视化代码构建的触发器/链式图表

![监视器自动化](/img/game-event-system/examples/14-runtime-monitor/demo-14-automation.png)

**树视图结构：**
```
▼ OnChainStart（根，<DamageInfo>）
  │
  ├─ 🔗 链 → OnChainProcess
  │   ├─ ⏱️ 延迟：0.5秒
  │   ├─ ✅ 传递参数
  │   └─ 类型：<DamageInfo>
  │
  └─ （OnChainProcess已展开）
      │
      ├─ 🔗 链 → OnChainFinish
      │   ├─ ⏱️ 延迟：0.2秒
      │   ├─ 🧩 条件：info.amount > 50
      │   ├─ ✅ 传递参数
      │   └─ 类型：<DamageInfo>
      │
      └─ （OnChainFinish已展开）
          │
          └─ 🕹️ 触发器 → OnTriggerComplete
              ├─ ❌ 阻止参数
              └─ 类型：(void)
```

**徽章图例：**

| 徽章    | 含义             |
| -------- | ---------------- |
| ⏱️ `0.5s` | 已配置延迟       |
| 🧩        | 已启用条件       |
| ✅        | 已启用参数传递   |
| ❌        | 参数被阻止       |
| 🔗        | 链节点（顺序）   |
| 🕹️        | 触发器节点（并行）|

**测试结果（单元C）：**
- **根：** `OnChainStart`
- **深度：** 3层（Start → Process → Finish → Complete）
- **混合类型：** 链（顺序）+ 触发器（并行）组合

**用法：**
- 验证编程图表构建正确
- 调试断裂链（缺失节点）
- 无需打开流程图窗口即可可视化复杂自动化
- 比较代码构建与可视化构建的图表

:::note 🎨 代码与可视化图表
- **此选项卡：** 显示**代码构建**的图表（`AddChainEvent`、`AddTriggerEvent`）
- **流程图窗口：** 显示**可视化构建**的图表（通过UI创建）
- 两者都有效，两者都可调试

:::

---

### 选项卡8：🔍 事件详细信息（深入分析）

**重点：** 单事件分析和历史

![监视器详细信息](/img/game-event-system/examples/14-runtime-monitor/demo-14-details.png)

从任何其他选项卡点击"详细信息"或"查看"以深入分析。

**部分：**

**1. 元数据：**
- **GUID：** 唯一标识符（不可变）
- **类型：** 完整泛型签名
- **类别：** 组织标签
- **数据库：** 源资产文件

**2. 性能摘要：**
- **平均/最小/最大时间：** 与性能选项卡相同
- **GC分配：** 内存配置
- **监听器数量：** 当前订阅者

**3. 频率摘要：**
- **总触发数：** 自播放开始
- **触发/秒：** 当前速率
- **平均间隔：** 触发之间
- **上次触发：** 之前的时间

**4. 最近活动（已过滤）：**
- 事件特定的日志流
- 仅显示此事件的历史
- 可用完整堆栈跟踪

**5. 自动化（如果适用）：**
- 显示此事件在流程图中的位置
- 上游/下游连接

**用法：**
- 全面的单事件分析
- 比较优化前后
- 导出数据供团队审查

---

## 🏗️ 场景架构

### 事件组织

游戏事件编辑器中按测试单元组织的事件：

![游戏事件编辑器](/img/game-event-system/examples/14-runtime-monitor/demo-14-editor.png)

| 类别       | 事件名称               | 类型                                | 目的           |
| ---------- | ---------------------- | ----------------------------------- | -------------- |
| **单元A**  | `OnSpammer`            | `GameEvent`                         | 高频垃圾信息   |
| **单元A**  | `OnSpammerPersistent`  | `GameEvent`                         | 持久化垃圾信息 |
| **单元B**  | `OnHeavyLoad`          | `GameObjectDamageInfoGameEvent` | 性能测试       |
| **单元B**  | `OnHeavyLoadCondition` | `GameObjectDamageInfoGameEvent` | 条件测试       |
| **单元C**  | `OnChainStart`         | `DamageInfoGameEvent`             | 根（金色）     |
| **单元C**  | `OnChainProcess`       | `DamageInfoGameEvent`             | 链步骤1        |
| **单元C**  | `OnChainFinish`        | `DamageInfoGameEvent`             | 链步骤2        |
| **单元C**  | `OnTriggerComplete`    | `GameEvent`                         | 链步骤3（触发器）|
| **单元D**  | `OnGhost`              | `GameEvent`                         | 完整性测试     |

---

### 流程图配置

代码中构建的编程链：

![流程图](/img/game-event-system/examples/14-runtime-monitor/demo-14-graph.png)

**图表结构：**
- 🔴 **OnChainStart（根，红色）** - 入口点
- 🟢 **OnChainProcess（链，绿色）** - 步骤1（延迟：0.5秒）
- 🟢 **OnChainFinish（链，绿色）** - 步骤2（延迟：0.2秒，条件：amount > 50）
- 🟡 **OnTriggerComplete（触发器，黄色）** - 步骤3（参数被阻止）

**连接类型：**
- 🟢 **绿色"CHAIN"线** - 顺序执行
- 🟡 **黄色"TRIGGER"线** - 并行执行

---

### 触发器设置（RuntimeMonitorRaiser）

![RuntimeMonitorRaiser检查器](/img/game-event-system/examples/14-runtime-monitor/demo-14-raiser.png)

**单元A：频率测试**
- `On Spam Event`：OnSpammer
- `On Spam Persistent Event`：OnSpammerPersistent

**单元B：性能测试**
- `On Heavy Load Event`：OnHeavyLoad
- `On Heavy Load Condition Event`：OnHeavyLoadCondition

**单元C：自动化测试（根）**
- `On Chain Start`：OnChainStart

**单元C：自动化测试（目标）**
- `On Chain Process`：OnChainProcess
- `On Chain Finish`：OnChainFinish
- `On Trigger Complete`：OnTriggerComplete

**单元D：完整性测试**
- `On Ghost Event`：OnGhost

---

### 接收器设置（RuntimeMonitorReceiver）

![RuntimeMonitorReceiver检查器](/img/game-event-system/examples/14-runtime-monitor/demo-14-receiver.png)

**事件（资产引用）：**
- 与触发器相同的事件

**链事件（用于检查器绑定）：**
- `On Chain Process`、`On Chain Finish`、`On Trigger Complete`
- 这些具有**基于检查器的监听器**（在行为窗口中拖放）
- 补充基于代码的API监听器

---

## 💻 代码详解

### 模拟性能问题（单元B）

**RuntimeMonitorReceiver.cs - 繁重执行：**
```csharp
public void OnHeavyExecution(GameObject sender, DamageInfo info)
{
    // ⚠️ 测试的故意延迟
    // 在生产中，永远不要在游戏逻辑中使用Thread.Sleep！
    // 这强制执行时间 >5毫秒以触发监视器警告
    Thread.Sleep(6);  // ← 模拟昂贵计算
    
    Debug.Log($"[Receiver] Processed heavy data. Latency: 6ms (simulated)");
}
```

**为什么有效：**
- `Thread.Sleep(6)` 阻塞主线程6毫秒
- 监视器的性能选项卡跟踪每个监听器的执行时间
- 6毫秒超过5毫秒阈值 → 触发黄色警告
- 用 `Thread.Sleep(12)` 点击按钮2次 → 红色关键警告

---

### 构建编程自动化（单元C）

**RuntimeMonitorRaiser.cs - Awake()图表构建：**
```csharp
private ChainHandle _chainProcessHandle;
private ChainHandle _chainFinishHandle;
private TriggerHandle _triggerCompleteHandle;

private void Awake()
{
    // ✅ 在代码中构建链（不是可视化图表！）
    
    // 步骤1：Start → （延迟0.5秒）→ Process
    _chainProcessHandle = onChainStart.AddChainEvent(
        targetEvent: onChainProcess,
        delay: 0.5f,           // ← 暂停半秒
        passArgument: true     // ← 转发DamageInfo
    );
    
    // 步骤2：Process → （条件 + 延迟0.2秒）→ Finish
    _chainFinishHandle = onChainProcess.AddChainEvent(
        targetEvent: onChainFinish,
        delay: 0.2f,
        condition: (info) => info.amount > 50f,  // ← 仅高伤害继续
        passArgument: true
    );
    
    // 步骤3：Finish → （触发器，阻止参数）→ Complete
    _triggerCompleteHandle = onChainFinish.AddTriggerEvent(
        targetEvent: onTriggerComplete,
        passArgument: false    // ← 阻止参数（类型转换为void）
    );
}

private void OnDestroy()
{
    // ✅ 清理：动态图表强制要求
    onChainStart.RemoveChainEvent(_chainProcessHandle);
    onChainProcess.RemoveChainEvent(_chainFinishHandle);
    onChainFinish.RemoveTriggerEvent(_triggerCompleteHandle);
}
```

**图表执行流程：**
```
🖱️ 用户交互：按钮点击
│
🚀 [ 启动 ] ➔ onChainStart.Raise(DamageInfo)
│   📦 载荷：{ amount: 100, isCritical: true }
│
⏳ [ 调度 ] ➔ 系统暂停0.5秒
│   └─► ⚙️ onChainProcess.Raise(DamageInfo)
│
⚖️ [ 评估 ] ➔ 门：`100 > 50` ? 
│   └─► ✅ 结果：是（条件通过）
│
⏳ [ 调度 ] ➔ 系统暂停0.2秒
│   └─► 🎯 onChainFinish.Raise(DamageInfo)
│
🧪 [ 净化 ] ➔ 参数剥离：`DamageInfo` ➔ `void`
│   └─► 🏁 onTriggerComplete.Raise()
│
📊 最终结果：管道完成 | ⚡ 时序：总延迟0.7秒
```

**监视器可见性：**
- **自动化选项卡：** 显示这个精确的树结构
- **最近事件选项卡：** 显示带时序的顺序触发模式
- **性能选项卡：** 跟踪每个步骤的执行时间

---

### 注册多优先级监听器（单元B）

**RuntimeMonitorReceiver.cs - OnEnable()：**
```csharp
private void OnEnable()
{
    // ✅ 用多样性填充监听器选项卡
    
    // 基本监听器（无优先级）
    onSpamEvent.AddListener(OnSpamReceived);
    
    // 优先级监听器（执行顺序）
    onHeavyLoadEvent.AddPriorityListener(OnHeavyPreCheck, priority: 100);   // 第1个运行
    onHeavyLoadEvent.AddPriorityListener(OnHeavyExecution, priority: 0);    // 第2个运行（此处延迟）
    onHeavyLoadEvent.AddPriorityListener(OnHeavyPostCheck, priority: -100); // 第3个运行
    
    // 带优先级的条件监听器
    onHeavyLoadConditionEvent.AddConditionalListener(
        OnHeavyCriticalWarning,
        predicate: (sender, info) => info.isCritical,  // ← 仅在关键时
        priority: 50
    );
}

private void OnDisable()
{
    // ✅ 清理
    onSpamEvent.RemoveListener(OnSpamReceived);
    
    onHeavyLoadEvent.RemovePriorityListener(OnHeavyPreCheck);
    onHeavyLoadEvent.RemovePriorityListener(OnHeavyExecution);
    onHeavyLoadEvent.RemovePriorityListener(OnHeavyPostCheck);
    
    onHeavyLoadConditionEvent.RemoveConditionalListener(OnHeavyCriticalWarning);
}
```

**监视器可见性：**
- **监听器选项卡：** 显示 `OnHeavyLoad` 的4个监听器
  - 优先级分解：高（1）、普通（1）、低（1）
  - 条件（1）带谓词预览
- **性能选项卡：** 跟踪累积执行时间（所有监听器的总和）

---

### 持久化监听器管理（单元A）

**RuntimeMonitorReceiver.cs - Awake/OnDestroy：**
```csharp
private void Awake()
{
    // ✅ 持久化监听器（在场景重新加载中存活）
    // 在Awake中注册，在OnDestroy中清理
    onSpamPersistentEvent.AddPersistentListener(OnSpamPersistentLog, priority: -10);
}

private void OnDestroy()
{
    // ✅ 清理持久化
    onSpamPersistentEvent.RemovePersistentListener(OnSpamPersistentLog);
}

public void OnSpamPersistentLog()
{
    // 空方法——仅供监视器计数
    // 模拟后台跟踪（例如分析、成就）
}
```

**监视器可见性：**
- **监听器选项卡：** 显示 `OnSpammerPersistent` 的"持久化监听器：1"
- **仪表板：** 跟踪持久化监听器健康

---

## 🎯 生产调试工作流

### 场景1：战斗期间帧率下降

**症状：**
- FPS从60降至30
- Unity Profiler无明显峰值

**调试步骤：**
1. 打开**性能选项卡**
2. 按"平均时间"排序（降序）
3. 查找执行时间 >2毫秒的事件
4. 点击事件 → **详细信息选项卡** → 查看调用者方法
5. 优化繁重的监听器或降低触发频率

---

### 场景2：事件未触发

**症状：**
- UI按钮点击无反应
- 预期行为未发生

**调试步骤：**
1. 打开**最近事件选项卡**
2. 搜索预期的事件名称
3. **如果找到：** 事件触发但监听器未响应
   - 转到**监听器选项卡** → 检查监听器数量
   - 验证方法名称匹配
4. **如果未找到：** 事件未被触发
   - 检查触发器代码的 `.Raise()` 调用
   - 验证检查器中的事件资产引用

---

### 场景3：怀疑内存泄漏

**症状：**
- 内存使用随时间增长
- GC峰值增加

**调试步骤：**
1. 打开**性能选项卡**
2. 检查"GC分配"列
3. 查找每次触发分配 >0 KB的事件
4. 点击事件 → **监听器选项卡** → 检查闭包分配
5. 重构以避免每次触发分配

---

### 场景4：幽灵事件（死代码）

**症状：**
- 警告选项卡显示 `[无监听器]`

**调试步骤：**
1. 打开**警告选项卡**
2. 识别幽灵事件
3. **选项A：** 事件仅用于调试 → 忽略警告
4. **选项B：** 监听器注册失败
   - 检查 `OnEnable` 中的 `AddListener` 调用
   - 验证事件资产引用匹配
5. **选项C：** 死代码 → 删除 `.Raise()` 调用

---

## 🔑 监视器最佳实践

### ✅ 应该做

**在开发期间：**
- 在第二显示器上保持监视器打开
- 添加新事件后检查
- 验证监听器数量符合预期
- 优化前后进行分析

**在压力测试期间：**
- 生成高负载（如此示例）
- 监控性能选项卡中 >1毫秒的事件
- 检查警告选项卡中的完整性问题
- 导出指标供团队审查

**在生产构建中：**
- 在开发构建中启用监视器
- 在目标设备上测试（移动、主机）
- 在现实场景中进行分析
- 记录性能基线

---

### ❌ 不应该做

**性能反模式：**
- 每帧触发事件（>60/秒）而不批处理
- 在监听器中分配内存（闭包、LINQ）
- 同步调用昂贵操作

**调试反模式：**
- 忽略黄色警告（"只是警告"）
- 仅依赖 `Debug.Log` 进行事件调试
- 跳过监听器清理（缺少 `OnDisable`）
- 在生产构建中留下测试事件

---

## 📊 监视器与Unity Profiler

| 功能             | 游戏事件监视器 | Unity Profiler  |
| ---------------- | -------------- | --------------- |
| **重点**         | 仅事件系统     | 整个引擎        |
| **粒度**         | 每事件指标     | 每方法调用      |
| **监听器跟踪**   | ✅ 内置         | ❌ 手动          |
| **频率分析**     | ✅ 内置         | ⚠️ 间接          |
| **流程可视化**   | ✅ 自动化选项卡 | ❌ 不适用        |
| **警告**         | ✅ 自动         | ❌ 手动分析      |
| **学习曲线**     | 简单           | 陡峭            |
| **最适合**       | 事件调试       | 整体性能        |

**推荐工作流程：**
1. **监视器：** 识别有问题的事件
2. **Unity Profiler：** 深入研究监听器方法
3. **监视器：** 验证修复降低了执行时间

---

## 🎯 下一步

您已经掌握了完整的 `GameEventSystem` 工作流——从基本事件到企业级可观察性。示例部分已完成！

**下一步：**
- 探索**[工具与支持](../tools/codegen-and-cleanup.md)**了解高级功能
- 查看**[最佳实践](../scripting/best-practices.md)**了解生产模式
- 查看**[社区与支持](../tools/community-and-support.md)**获取帮助

---

## 📚 相关文档

- **[运行时监视器工具](../tools/runtime-monitor.md)** - 完整监视器文档
- **[最佳实践](../scripting/best-practices.md)** - 性能优化模式
- **[编程流程](../scripting/programmatic-flow.md)** - 在代码中构建图表
- **[API参考](../scripting/api-reference.md)** - 完整方法签名