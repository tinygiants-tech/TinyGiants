---
sidebar_label: '数据库与流程图'
sidebar_position: 2

---

# 游戏事件管理器

**游戏事件管理器** 是整个系统的运行时大脑。它负责将您的数据（事件和流程）加载到内存中，管理它们的生命周期，并提供实时遥测。

与仪表板（用于*创建*的工具）不同，管理器是*保存*您数据的容器。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-full.png)

---

## 🏗️ 数据架构

在深入UI之前，理解此系统如何存储数据至关重要。

### 存储模型

1. **基于容器的存储**：事件不是松散的文件。它们作为 **子资产** 存储在父 **数据库资产**（`.asset`）内。
2. **关注点分离**：
   - **数据库**：存储事件定义（标识、名称、类型）。
   - **流程图**：存储逻辑节点（触发器、链、连接）。
3. **"保护区"**：默认情况下，所有资产都在 `Assets/TinyGiantsData/GameEventSystem/` 中创建。

:::danger 关键：不要手动删除子资产

因为事件是子资产，**永远不要** 通过展开数据库资产直接从项目视图中删除它们。

**正确工作流**：

- ✅ **删除事件**：使用 **[游戏事件编辑器](./game-event-editor.md)**
- ✅ **删除流程**：使用 **[游戏事件流程编辑器](../flow-graph/game-event-node-editor.md)**

**为什么？** 手动删除会破坏GUID引用并损坏数据库完整性。
:::

---

## 🗃️ 数据库管理

本节控制场景中哪些事件集处于活动状态。系统支持 **多数据库架构**，允许您拆分事件（例如，"Core"、"Combat"、"UI"）并根据需要加载它们。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

### 管理操作

| 操作 | 描述 |
| :-------------------- | :----------------------------------------------------------- |
| **活动/非活动** | 切换此数据库是否已加载。非活动数据库在运行时不会解析事件查找。 |
| **移除（×）** | **仅从此列表** 移除数据库。它 **不会** 从项目中删除资产文件。 |
| **+ 创建新的** | 在 `TinyGiantsData/GameEventSystem/Database` 文件夹中创建新的 `.asset` 数据库文件并在此处添加。 |
| **📂 添加现有** | 打开文件选择器以添加您之前创建的数据库（此操作将搜索Assets目录下的所有数据库资产并在下拉列表中显示）。 |

### 理解活动与非活动

**活动数据库**（绿色徽章）：

- ✅ 事件可在Inspector中绑定
- ✅ 事件可在运行时触发
- ✅ 出现在游戏事件编辑器搜索中

**非活动数据库**（黄色徽章）：

- ⏸️ 临时禁用而不从列表中移除
- 🔒 事件无法触发或绑定
- 💡 适用于季节性内容或DLC事件

:::tip 项目上下文菜单
您也可以直接在项目窗口中创建数据库：
```
右键点击 → Create → TinyGiants → Game Event System → Game Event Database
```

然后通过 **"Add Existing"** 按钮将其添加到管理器。
:::

---

## 🕸️ 流程图管理

与数据库类似，本节管理您的 **可视化逻辑容器**。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-flowgraphs.png)

### 什么是流程容器？

**流程容器** 是一个ScriptableObject，它保存多个"流程图"（可视化事件序列）。

**常见工作流**：

- **全局流程**：跨所有场景的持久逻辑（例如，UI事件、音频触发器）
- **关卡特定流程**：按场景加载/卸载（例如，Boss战斗序列、教程步骤）

### 管理操作

与数据库相同的控件：

- **创建新的**：生成新的流程容器资产
- **添加现有**：注册先前创建的流程容器
- **活动/非活动**：启用或禁用流程执行
- **移除（×）**：从管理器注销（不删除资产）

:::info 编辑流程图
流程图本身在 **[游戏事件流程编辑器](../flow-graph/game-event-node-editor.md)** 中编辑，而不是在这里。管理器仅控制 **加载哪些流程**。
:::

---

## 📊 实时统计（遥测）

Inspector提供三个专用面板来监控事件系统的健康状况和组成。

### 1. 概览统计

跟踪事件的绑定状态。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-overview.png)

| 指标 | 描述 |
| :------------------ | :----------------------------------------------------------- |
| **总事件数** | 所有活动数据库中所有事件的总和。 |
| **已绑定事件** | 当前 **在Inspector中配置** 的事件数量（可视化绑定）。 |
| **运行时绑定** | 通过代码绑定的事件（`AddListener`）在 **[运行时监控器](../tools/runtime-monitor.md)** 中单独跟踪。 |

**进度条**：显示已绑定（配置了监听器）的事件百分比。

:::tip 播放模式自动刷新
在播放模式期间，统计面板会自动更新以反映运行时监听器注册。当您在代码中调用 `AddListener()` 时，已绑定事件计数会发生变化。
:::

---

### 2. 组成

显示事件架构的复杂度分布。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-composition.png)

| 类别 | 定义 | 示例使用场景 |
| :------------------- | :----------------------------- | :---------------------------------------------- |
| **空事件** | 简单信号（无参数） | `OnGameStart`、`OnPause`、`OnButtonClick` |
| **单参数** | 类型化有效载荷事件 | `OnHealthChanged(float)`、`OnScoreUpdated(int)` |
| **带Sender** | 源感知事件 | `OnDamage(GameObject sender, float amount)` |

**为什么这很重要**：

- 高百分比的空事件 = 简单、易于维护的架构
- 高百分比的Sender事件 = 复杂、数据丰富的系统，具有详细跟踪

---

### 3. 事件类型注册表

项目当前编译和支持的每种数据类型的实时注册表。

#### 内置类型（开箱即用）

系统预装了对 **32种标准类型** 的原生支持，按使用分类：

<details>
<summary>📋 查看支持的内置类型</summary>


| C#类型 | 数学 | 组件 | 资产 |
| :------- | :----------- | :--------------- | :-------------- |
| `int` | `Vector2` | `GameObject` | `Sprite` |
| `float` | `Vector3` | `Transform` | `Texture2D` |
| `double` | `Vector4` | `RectTransform` | `Material` |
| `bool` | `Vector2Int` | `Rigidbody` | `AudioClip` |
| `string` | `Vector3Int` | `Rigidbody2D` | `AnimationClip` |
| `byte` | `Quaternion` | `Collider` | |
| `long` | `Rect` | `Collider2D` | |
| `char` | `Bounds` | `Camera` | |
| | `Color` | `Light` | |
| | | `ParticleSystem` | |

</details>

**您可以做什么**：立即使用这些类型中的任何一种创建事件，无需代码生成。
```csharp
// 内置类型事件示例
[GameEventDropdown] public Int32GameEvent OnScoreChanged;
[GameEventDropdown] Vector3GameEvent OnPositionUpdated;
[GameEventDropdown] GameObjectGameEvent OnObjectSpawned;
```

---

#### 自定义与Sender类型

当您使用 **自定义类**（例如，`PlayerStats`）或 **Sender事件**（例如，`<GameObject, DamageInfo>`）创建事件时，这些类型会在代码生成后自动出现在此列表中。

**示例显示**：

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-type.png)

**创建过程**：

1. 在C#中编写您的自定义类
2. 使用 **[游戏事件创建器](./game-event-creator.md)** 创建事件（生成代码和事件子资产）
3. 类型出现在此注册表中
4. 现在您可以使用自定义类型创建事件资产

---

## 🛠 最佳实践

### ✅ 应该做

**拆分您的数据库**

保持模块化结构以获得更好的组织：
```tex
📁 Database/
├─ Global_DB.asset        (核心游戏事件)
├─ Combat_DB.asset        (战斗特定事件)
├─ UI_DB.asset            (UI交互事件)
└─ Tutorial_DB.asset      (教程序列事件)
```

**好处**：

- 更清晰的组织
- 更容易协作（不同团队成员处理不同数据库）
- 更好的性能（仅加载所需内容）

---

**在每个场景中保留管理器**

确保 `GameEventManager` 对象存在于每个场景中：

- 管理器使用 `DontDestroyOnLoad` 在场景之间持久化
- 如果缺失，打开 **[游戏事件系统窗口](./game-event-system.md)** 自动创建它

---

**使用"添加现有"进行团队协作**

与队友合作时：

1. 队友创建数据库并提交到版本控制
2. 您拉取最新更改
3. 打开管理器Inspector → 点击 **"Add Existing"**
4. 选择新数据库
5. ✅ GUID引用保持完整，无损坏链接！

---

### ❌ 不要做

**永远不要手动删除资产**
```
❌ 错误：项目窗口 → 展开数据库资产 → 删除事件子资产
✅ 正确：游戏事件编辑器 → 选择事件 → 点击删除按钮
```

**为什么？** 手动删除会损坏数据库并破坏所有引用。

---

**不要移动到Plugins文件夹**

将您的数据文件夹（`TinyGiantsData`）保留在 `Plugins` 文件夹 **之外**：
```
✅ 正确：Assets/TinyGiantsData/GameEventSystem/
❌ 错误：Assets/Plugins/TinyGiantsData/GameEventSystem/
```

---

## 🔧 Inspector上下文菜单

右键点击 `GameEventManager` 组件以访问实用程序命令：

### 清理无效绑定

**目的**：删除在任何活动数据库中不再存在的事件绑定。

**何时使用**：

- 通过游戏事件编辑器删除事件后
- 从管理器移除数据库后
- 清理旧项目时

**它的作用**：扫描所有绑定并删除孤立引用。

---

### 同步所有数据库事件

**目的**：将管理器的内部绑定列表与活动数据库中的所有事件同步。

**何时使用**：

- 从另一个项目导入事件后
- 添加包含许多事件的新数据库后
- 当绑定列表似乎不同步时

**它的作用**：

- 为新事件添加绑定
- 删除已删除事件的绑定
- 保留现有配置

---

## ❓ 故障排除

### 管理器对象缺失

**问题**：在场景层级视图中找不到 `GameEventManager`

**解决方案**：

1. 通过 `Tools → TinyGiants → Game Event System` 打开 **[游戏事件系统窗口](./game-event-system.md)**
2. 查看顶部的状态栏
3. 如果显示蓝色按钮，点击 **"Initialize System"**
4. 管理器将自动创建

---

### 事件未出现在编辑器中

**问题**：在下拉菜单或搜索中找不到我的事件。

**检查清单**：

- ✅ 数据库是否 **活动**（绿色徽章）？
- ✅ 数据库是否已添加到管理器？
- ✅ 数据库中是否实际存在事件？（在 **[游戏事件编辑器](./game-event-editor.md)** 中检查）
- ✅ 场景中是否存在管理器 **GameObject**？

---

### 数据库似乎已损坏

**问题**：Inspector显示关于"孤立子资产"或数据库完整性问题的错误。

**恢复**：

1. 右键点击管理器组件
2. 选择 **"Clean Invalid Bindings"**
3. 在项目窗口中右键点击数据库资产
4. 选择 **"Validate Database"**（如果可用）
5. 保存场景并重启Unity

**预防**：始终使用游戏事件编辑器删除事件，永远不要手动删除。

:::tip 关键要点
管理器是您的 **数据容器**。将其想象成一个图书馆：数据库是书架，事件是书籍。管理器决定哪些书架是打开的（活动的），并跟踪谁在阅读哪些书籍（绑定）。
:::