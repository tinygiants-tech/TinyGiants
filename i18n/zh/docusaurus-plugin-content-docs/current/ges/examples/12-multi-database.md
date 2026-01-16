---
sidebar_label: '12 多数据库'
sidebar_position: 13
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 12 多数据库：模块化事件架构

<VideoGif src="/video/game-event-system/example/12-multi-database.mp4" />

## 📋 概述

在拥有数百个事件的大型项目（RPG、MMO、复杂模拟）中，将所有事件存储在单个庞大的数据库资产中会变成维护噩梦——编辑器性能缓慢、Git合并冲突和组织混乱。**多数据库系统**通过允许您将事件拆分到多个模块化ScriptableObject资产（例如 `Core_DB`、`Combat_DB`、`UI_DB`）中来解决这个问题，每个资产都独立管理。

:::tip 💡 您将学到
- 如何创建和管理多个事件数据库
- 管理器如何在运行时以零性能成本合并数据库
- 流程图如何无缝连接不同数据库中的事件
- 团队协作和版本控制的组织策略

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/12_MultiDatabase/12_MultiDatabase.unity
```

### 本示例演示的内容

此示例**重用了Demo 11中完全相同的链式事件逻辑**（5步发射协议），但有一个关键的架构差异：

**Demo 11：** 所有6个事件存储在 `GameEventDatabase_Chain.asset`（单个文件）

**Demo 12：** 相同的6个事件**分布在3个独立的数据库文件中：**
- `GameEventDatabase_Core.asset` - 逻辑流程事件
- `GameEventDatabase_Combat.asset` - 动作和特效事件
- `GameEventDatabase_System.asset` - 工具和清理事件

**结果：** 运行时行为相同，但模块化组织具有更好的可扩展性。

---

## 🗂️ 数据库架构

### 物理资产结构

![项目资产](/img/game-event-system/examples/12-multi-database/demo-12-assets.png)

**在项目窗口中：**
```
📂 12_MultiDatabase/
│
├── 🧠 GameEventDatabase_Core.asset      ➔ [ 📦 2个事件 ]
│   ├── 🎬 0_StartSequence               ➔ 介绍逻辑
│   └── ⚙️ 1_SystemCheck                 ➔ 初始化
│
├── ⚔️ GameEventDatabase_Combat.asset    ➔ [ 📦 2个事件 ]
│   ├── ⚡ 2_Charge                      ➔ 技能启动
│   └── 🔥 3_Fire                        ➔ 抛射物逻辑
│
├── 🛠️ GameEventDatabase_System.asset    ➔ [ 📦 2个事件 ]
│   ├── ⏳ 4_CoolDown                    ➔ 全局计时器
│   └── 📁 5_Archive                     ➔ 持久化/保存
│
└── 🕸️ GameEventFlow_MultiDatabase.asset ➔ [ 🌐 流程图 ]
    └─ (连接上述所有数据库中的事件)
```

**关键观察：**
每个数据库都是一个**ScriptableObject资产**——项目中的物理 `.asset` 文件。您可以：
- 将它们移动到不同的文件夹
- 分配给不同的团队成员（无合并冲突！）
- 在运行时动态加载/卸载它们
- 独立进行版本控制

:::note 📦 数据库作为资产

事件数据库是ScriptableObjects，这意味着它们：

- 作为 `.asset` 文件存在于您的项目中
- 可以在场景中引用
- 在域重新加载中存活
- 独立序列化

这与在单个JSON配置中存储事件或嵌入场景中的系统有根本不同。

:::

---

## 🎮 如何交互

### 运行时行为测试

场景在**视觉上与Demo 11相同**。相同的炮塔、相同的按钮、相同的发射序列。

**步骤1：进入播放模式**

**步骤2：测试正常发射**
- 点击**"Launch A"**
- **观察：** 完整的5步序列完美执行
  - 系统检查 → 充能（1秒延迟）→ 开火 → 冷却 → 归档
- **幕后：** 执行跨越3个数据库：
  - 步骤1（`SystemCheck`）来自 `Core` 数据库
  - 步骤3（`Fire`）来自 `Combat` 数据库
  - 步骤5（`Archive`）来自 `System` 数据库

**结果：** ✅ 无缝的跨数据库执行

---

### 数据库加载验证

此测试证明模块化加载系统有效：

**步骤3：禁用战斗数据库**
1. 在层级中选择**Game Event Manager**
2. 在检查器中展开**Databases**列表
3. 找到 `GameEventDatabase_Combat` 条目
4. **取消选中**"Active"切换

**步骤4：测试禁用的数据库**
- 点击**"Launch A"**
- **结果：** ❌ 序列在步骤2（充能）处挂起
  - 控制台显示关于缺失事件的错误
  - 步骤3-5从未执行

**步骤5：重新启用战斗数据库**
- 再次**选中**"Active"切换
- 点击**"Launch A"**
- **结果：** ✅ 序列再次工作

**这证明了什么：**
- 数据库可以在运行时动态启用/禁用
- 缺失的数据库会中断执行（符合预期）
- 没有"自动重新加载"魔法——您控制加载的内容

---

## 🏗️ 多数据库配置

### 运行时：管理器设置

在层级中选择**Game Event Manager**以查看多数据库配置：

![管理器数据库](/img/game-event-system/examples/12-multi-database/demo-12-manager.png)

**数据库列表（3个条目）：**
1. ✅ `GameEventDatabase_Core` - 激活
2. ✅ `GameEventDatabase_Combat` - 激活
3. ✅ `GameEventDatabase_System` - 激活

**运行时合并的工作原理：**
```
🚀 系统启动
│
├── 📂 阶段1：发现
│   └── 📚 管理器扫描并读取所有激活的数据库
│
├── 🧩 阶段2：整合
│   └── 🛠️ 将所有事件合并到全局查找表（LUT）
│       ├── 🧬 键：事件GUID（唯一标识符）
│       └── 📦 值：事件引用（直接指针）
│
└── 🔗 阶段3：链接
    └── 🕸️ FlowGraph引用通过GUID解析
```

**性能特性：**
- **查找速度：** O(1) - 与单数据库相同
- **内存开销：** 可忽略（仅字典指针）
- **初始化：** 启动时合并一次数据库
- **运行时成本：** 无 - 已合并

:::tip ⚡ 零性能成本

拥有1个数据库或100个数据库**在运行时没有区别**。管理器在启动时将它们合并到单个查找表中。根据组织需求选择数据库数量，而不是性能考虑。

:::

---

### 设计时：编辑器数据库切换

打开**游戏事件编辑器**管理跨数据库的事件：

![编辑器数据库下拉菜单](/img/game-event-system/examples/12-multi-database/demo-12-editor-dropdown.png)

**数据库下拉菜单（工具栏）：**
显示所有可用的数据库：
- `GameEventDatabase_Core`（已选中）
- `GameEventDatabase_Combat`
- `GameEventDatabase_System`

**工作流程：**
1. **选择数据库：** 选择要编辑的数据库
2. **查看事件：** 编辑器仅显示所选数据库中的事件
3. **创建事件：** 新事件进入当前选中的数据库
4. **切换上下文：** 下拉菜单允许快速导航

**示例 - 查看核心数据库：**
- 下拉菜单：`GameEventDatabase_Core`
- 显示的事件：`0_StartSequence`、`1_SystemCheck`（共2个）
- 隐藏的事件：其他数据库中的所有事件

**示例 - 查看战斗数据库：**
- 下拉菜单：`GameEventDatabase_Combat`
- 显示的事件：`2_Charge`、`3_Fire`（共2个）
- 隐藏的事件：其他数据库中的所有事件

:::note 🔄 上下文切换

编辑器一次显示一个数据库以减少视觉混乱。使用下拉菜单在数据库之间切换。这不影响运行时——所有激活的数据库仍然合并。

:::

---

### 检查器：跨数据库事件选择

在检查器中为脚本分配事件时，**GameEventDropdown**显示来自**所有激活数据库**的事件：

![检查器下拉菜单](/img/game-event-system/examples/12-multi-database/demo-12-inspector-dropdown.png)

**下拉菜单结构：**
事件按数据库和类别分组：
```
⚔️ GameEventDatabase_Combat / Default
├─ ⚡ 2_Charge
└─ ⚡ 3_Fire

🧠 GameEventDatabase_Core / Default
├─ 📍 🎬 0_StartSequence        ➔ [ 当前选中 ]
└─ ⚙️ 1_SystemCheck

🛠️ GameEventDatabase_System / Default
├─ ⏳ 4_CoolDown
└─ 💾 5_Archive
```

**关键行为：**
- **所有激活的数据库：** 下拉菜单包括管理器加载的每个数据库中的事件
- **数据库标签：** 事件前缀数据库名称以便清晰
- **类别分组：** 事件在每个数据库内按类别组织
- **类型过滤：** 仅显示与字段类型签名匹配的事件

**示例分配：**
```csharp
[GameEventDropdown] 
public GameObjectDamageInfoGameEvent sequenceStartEvent;
```

下拉菜单显示：
- ✅ `0_StartSequence`（来自Core数据库）- 兼容类型
- ❌ 类型不匹配时隐藏其他事件

:::tip 🎯 智能过滤

下拉菜单自动按以下方式过滤：

1. **类型兼容性** - 仅显示与字段类型匹配的事件
2. **激活的数据库** - 仅显示管理器加载的数据库中的事件
3. **数据库/类别** - 分组以便轻松导航

这可以防止类型错误并使大型项目易于导航。

:::

---

## 🔑 多数据库优势

### 团队协作

**问题：** 10个开发人员都在编辑 `GlobalDatabase.asset`
- 持续的Git合并冲突
- 加载时编辑器长时间冻结
- 所有权不明确

**解决方案：** 基于模块的数据库所有权
```
📂 Databases/
│
├── 🧠 Core_DB.asset         ➔ 💻 [ 所有者：首席程序员 ]
│   └─ 全局状态、初始化和低级触发器。
│
├── ⚔️ Combat_DB.asset       ➔ 🤺 [ 所有者：战斗团队 ]
│   └─ 攻击序列、AI行为和伤害逻辑。
│
├── 🖥️ UI_DB.asset           ➔ 🎨 [ 所有者：UI团队 ]
│   └─ 菜单转换、HUD更新和按钮反馈。
│
├── 🔊 Audio_DB.asset        ➔ 🎧 [ 所有者：音频团队 ]
│   └─ 环境循环、音效触发器和音乐状态切换。
│
├── 🗺️ Level1_DB.asset       ➔ 📐 [ 所有者：关卡设计师A ]
│   └─ 关卡1特定的谜题、触发器和事件。
│
└── 🗺️ Level2_DB.asset       ➔ 📐 [ 所有者：关卡设计师B ]
    └─ 关卡2特定的谜题、触发器和事件。
```

**结果：**
- ✅ 无冲突并行工作
- ✅ 清晰的模块所有权
- ✅ 更快的Git操作（更小的差异）
- ✅ 更容易的代码审查（更小的变更集）

---

### 逻辑组织

**问题：** 一个数据库中有500个事件
- 难以找到特定事件
- 系统之间没有明确的界限
- 难以理解依赖关系

**解决方案：** 领域驱动的数据库设计
```
⚔️ Combat_DB             ➔ [ 50个事件 ]
   └─ 攻击、防御和高频伤害逻辑。

🏃 Movement_DB           ➔ [ 30个事件 ]
   └─ 行走、跳跃、冲刺和基于物理的状态变化。

🎒 Inventory_DB          ➔ [ 80个事件 ]
   └─ 拾取、使用、丢弃和物品耐久度机制。

📜 Quest_DB              ➔ [ 100个事件 ]
   └─ 开始、进度和复杂的完成里程碑。

🖥️ UI_DB                 ➔ [ 70个事件 ]
   └─ 菜单转换、HUD更新和对话系统。

🔊 Audio_DB              ➔ [ 40个事件 ]
   └─ 动态音乐层和本地化音效触发器。

🗺️ Level_Specific_DB     ➔ [ 130个事件 ]
   └─ 每个关卡独特的环境和谜题事件。
```

**结果：**
- ✅ 清晰的概念边界
- ✅ 易于定位相关事件
- ✅ 可理解的依赖关系
- ✅ 模块化测试（仅加载需要的数据库）

---

### 动态加载

**用例：** 具有多个关卡的移动游戏

**问题：** 在启动时加载所有1000个事件浪费内存

**解决方案：** 运行时数据库管理
```csharp
void LoadLevel(int levelIndex)
{
    // 卸载前一个关卡的事件
    manager.UnloadDatabase("Level" + (levelIndex - 1));
    
    // 加载当前关卡的事件
    manager.LoadDatabase("Level" + levelIndex);
    
    // 保持核心系统始终加载
    // (Core_DB、Combat_DB、UI_DB保持激活)
}
```

**结果：**
- ✅ 更低的内存占用
- ✅ 更快的关卡转换
- ✅ 在低端设备上更好的性能
- ✅ 模块化内容更新（修补单个数据库）

---

## 🛠️ 代码架构

### 位置无关代码

Demo 12的代码与Demo 11**完全相同**。脚本不知道也不关心事件存在于哪个数据库中：

**MultidatabaseRaiser.cs：**
```csharp
[GameEventDropdown]
public GameObjectDamageInfoGameEvent sequenceStartEvent;

public void RequestLaunchA()
{
    // 无论此事件在哪个数据库中都有效
    // 可以是Core_DB、Combat_DB或任何其他数据库
    sequenceStartEvent.Raise(turretA, info);
}
```

**MultidatabaseReceiver.cs：**
```csharp
// 绑定到来自不同数据库的事件的方法
public void OnSystemCheck(GameObject sender, DamageInfo args)    // Core_DB
public void OnStartCharging(GameObject sender, DamageInfo args)  // Combat_DB
public void OnFireWeapon(GameObject sender, DamageInfo args)     // Combat_DB
public void OnCoolDown(GameObject sender, DamageInfo args)       // System_DB
public void OnSequenceArchived(GameObject sender, DamageInfo args) // System_DB
```

**关键洞察：**
脚本通过**GUID**（存储在序列化字段中）引用事件，而不是通过数据库路径。管理器在运行时将GUID解析为事件实例，无论它们包含在哪个数据库中。

---

### 流程图跨数据库连接

流程图无缝连接来自不同数据库的事件：

**视觉流程（与Demo 11相同）：**
```
🧠 [ Core_DB ] ➔ 启动层
│  ├─ 🎬 0_StartSequence   ➔ 🔘 根（点火）
│  └─ ⚙️ 1_SystemCheck     ➔ 🛡️ 条件（守卫）
│
       ▼ (信号交接)
│
⚔️ [ Combat_DB ] ➔ 动作层
│  ├─ ⚡ 2_Charge           ➔ ⏱️ 延迟（准备）
│  └─ 🔥 3_Fire             ➔ 🚀 动作（执行）
│
       ▼ (信号交接)
│
🛠️ [ System_DB ] ➔ 维护层
│  ├─ ⏳ 4_CoolDown         ➔ ⌛ 等待（恢复）
│  └─ 💾 5_Archive          ➔ 🧹 过滤（清理）
```

**幕后：**
- 每个节点存储事件的**GUID**
- 管理器在运行时将GUID解析为实际事件
- 即使事件在数据库之间移动，连接仍然有效
- 重组时没有"链接断裂"

:::tip 🔗 基于GUID的引用

事件通过不可变的GUID引用，而不是文件路径。您可以：

- 在数据库之间移动事件
- 重命名数据库文件
- 重组文件夹结构

只要事件的GUID不改变，所有引用都保持有效。

:::

---

## 📊 最佳实践

### 何时创建多个数据库

**好理由：**
- ✅ **团队所有权** - 不同团队在不同系统上工作
- ✅ **逻辑域** - 清晰的概念边界（战斗、UI、音频）
- ✅ **动态加载** - 按关卡或模式加载/卸载事件
- ✅ **版本控制** - 减少合并冲突
- ✅ **测试** - 仅为特定测试加载相关数据库

**坏理由：**
- ❌ **性能** - 多数据库没有运行时成本，所以不要为了速度而拆分
- ❌ **事件数量** - 一个数据库中50个事件没问题，不要过度拆分
- ❌ **过早优化** - 从一个数据库开始，当感到痛苦时再拆分

---

### 推荐的数据库结构

**小型项目（< 100个事件）：**
```
📂 Databases/
└─ 🧠 GameEventDatabase_Main.asset   ➔ [ 📦 一体化 ]
   └─ (所有战斗、UI和系统事件都在这里)
```

**中型项目（100-300个事件）：**
```
📂 Databases/
├─ 🧠 Core_DB.asset         ➔ [ ⚙️ 基础系统 ]
├─ 🎮 Gameplay_DB.asset     ➔ [ ⚔️ 主要机制 ]
└─ 🖥️ UI_DB.asset           ➔ [ 🎨 菜单和HUD ]
```

**大型项目（300+个事件）：**
```
📂 Databases/
├─ 🧠 Core_DB.asset         ➔ 💻 [ 全局系统 ]
├─ ⚔️ Combat_DB.asset       ➔ 🤺 [ 战斗机制 ]
├─ 🏃 Movement_DB.asset     ➔ 🤸 [ 角色运动 ]
├─ 🎒 Inventory_DB.asset    ➔ 📦 [ 物品和网格管理 ]
├─ 📜 Quest_DB.asset        ➔ 📖 [ 任务和故事逻辑 ]
├─ 🖥️ UI_DB.asset           ➔ 🎨 [ 全局界面 ]
├─ 🔊 Audio_DB.asset        ➔ 🎧 [ 动态音景 ]
│
└─ 🗺️ Level_Specific/        ➔ 📐 [ 每个关卡的独特事件 ]
   ├─ Level_01_DB.asset
   ├─ Level_02_DB.asset
   └─ ...
```

---

### 命名约定

**数据库文件：**
- `GameEventDatabase_[模块].asset`（编辑器工具所需的前缀）
- 示例：`GameEventDatabase_Combat.asset`、`GameEventDatabase_UI.asset`

**事件名称：**
- 步骤/优先级前缀：`0_StartSequence`、`1_SystemCheck`
- 或模块前缀：`Combat_AttackStart`、`UI_MenuOpen`
- 避免通用名称：`Event1`、`MyEvent`（难以搜索）

---

## 🎯 下一步

您已经学会了如何跨多个数据库组织事件，以获得更好的可扩展性和协作。接下来，让我们探索运行时API的使用。

**下一章**：在**[13 运行时API](./13-runtime-api.md)**中查看运行时事件操作

---

## 📚 相关文档

- **[游戏事件管理器](../visual-workflow/game-event-manager.md)** - 数据库加载和管理
- **[游戏事件编辑器](../visual-workflow/game-event-editor.md)** - 多数据库编辑工作流程
- **[最佳实践](../scripting/best-practices.md)** - 大型项目的组织模式