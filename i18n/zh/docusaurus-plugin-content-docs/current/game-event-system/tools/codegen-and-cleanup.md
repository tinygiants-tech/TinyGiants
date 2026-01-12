---
sidebar_label: '代码生成与清理'
sidebar_position: 1
---

# 代码生成与维护

为了实现最大性能和**完美的Unity Inspector集成**，**游戏事件系统**依赖于特定数据类型的具体C#类。

虽然`GameEvent<T>`很强大，但Unity的Inspector（`UnityEvent`）无法直接序列化泛型类型。此工具集自动创建这些包装类，确保您的自定义数据类型（结构体、类、枚举）在Inspector中原生显示，而无需编写一行样板代码。

## 🚀 访问工具

这些实用工具位于**[游戏事件系统](../visual-workflow/game-event-system)**中，您可以通过以下方法访问：

**从系统仪表板：**
```
游戏事件系统窗口 → 点击"Generate/Clean Game Event Code"或"Clean All Game Event Code"
```

![alt text](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

---

## 📂 架构

在使用工具之前，理解代码的位置很重要。系统严格分离**核心逻辑**和**用户数据**，以确保您可以在不丢失生成文件的情况下升级插件。
```text
Assets/
├── 📁 TinyGiants/                  # [核心逻辑] 不可变的插件根目录
│   └── 📁 GameEventSystem/
│
└── 📁 TinyGiantsData/              # [用户数据] 您生成内容的圣地
    └── 📁 GameEventSystem/
        └── 📁 CodeGen/             # 💾 自动生成的C#类
            ├── 📁 Basic/           # 🛡️ 基本类型（必需的系统文件）
            └── 📁 Custom/          # 💾 您的自定义类型（由工具管理）
```

:::info **项目结构**

您可以参考前面的章节**[项目结构](../intro/project-structure.md)**以详细了解整个项目目录的结构

:::

:::danger 不要修改'Basic'文件夹
`TinyGiantsData/GameEventSystem/CodeGen/Basic`文件夹包含基本系统类型（Int、Float、Bool、String等）。

**永远不要手动删除或修改此文件夹中的文件。**

如果您不小心删除了Basic文件夹，或者系统报告缺少基本类型（如Int32GameEvent），您可以自行修复环境。

1. 打开**游戏事件系统**（`Tools > TinyGiants > Game Event System`）。
2. 点击窗口顶部的**Initialize Event System**按钮。
3. 系统将：
   - 重新创建目录结构。
   - 重新生成所有缺失的基本类型代码。

:::

------

## 📝 理解生成的代码

当您为某个类型（例如，int或自定义的`DamageInfo`结构体）生成代码时，工具会创建一个包含两个关键部分的文件：

1. **事件类**：一个具体的包装器（例如，Int32GameEvent），继承自`GameEvent<T>`。
2. **绑定字段**：`GameEventManager`的部分类扩展，添加了`UnityEvent<T>`字段，允许Inspector通过反射绑定监听器。

### 示例：基本类型（Int32）
```csharp
// =============================================================
// 基本游戏事件 - 自动生成
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. ScriptableObject类
    public class Int32GameEvent : GameEvent<int> { }
    
    // 2. Inspector绑定
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<int> Int32GameEventAction;
        }
    }
}
```

### 示例：自定义Sender类型

对于同时携带**Sender**和**Arguments**的事件：
```csharp
// =============================================================
// 自定义SENDER游戏事件 - 自动生成
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. ScriptableObject类
    public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }
    
    // 2. Inspector绑定
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
        }
    }
}
```

------

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## ⚡ 代码生成器工具

**游戏事件代码生成器**具有选项卡界面，允许您在简单的单参数事件和复杂的sender-argument事件之间切换。两种模式都支持**批量排队**，这意味着您可以设置多个类型并一次性生成它们。

<Tabs>
  <TabItem value="single" label="单参数" default>

  ![Code Generator - Single Parameter](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

  对于携带单个数据有效载荷的事件（例如，`SingleGameEvent`或`MyClassGameEvent`），使用此模式。

  1.  **快速添加**：使用下拉菜单快速添加标准C#类型（Double、Long、Vector3等）。
  2.  **搜索自定义类型**：在项目中键入任何类、结构体或枚举的名称。
  3.  **队列系统**：点击**Add**将类型移动到"Selected Queue"。
  4.  **批量生成**：点击绿色的**Generate Code(s)**按钮同时为所有排队的类型创建文件。

  </TabItem>
  <TabItem value="sender" label="带Sender">

  ![Code Generator - With Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_sender.png)

  对于需要知道**谁**触发了事件以及**发生了什么**的事件（例如，`Player`发送了`DamageInfo`），使用此模式。

  1.  **选择Sender类型**：通常是`GameObject`或特定脚本（例如，`PlayerController`）。
  2.  **选择参数类型**：有效载荷数据（例如，`DamageInfo`）。
  3.  **添加对**：创建特定组合（例如，`GameObject` → `DamageInfo`）并将其添加到队列。
  4.  **批量生成**：一次操作生成所有定义的对。

  </TabItem>
</Tabs>

:::tip 自动编译
点击"Generate"后，Unity将触发脚本重新编译。编译完成后，新的事件类型将立即在**创建资产菜单**和**事件编辑器**中可用。
:::

---

## 🧹 代码清理工具

随着项目的发展，您可能会删除旧的结构体或重构代码，留下未使用的GameEvent类。**代码清理器**镜像生成器的界面，允许您安全地过滤和批量删除过时的文件。

它**仅针对Custom文件夹**（`TinyGiantsData/.../Custom`）。它永远不会显示或删除`Basic`文件夹中的文件，从而保护系统完整性。

<Tabs>
  <TabItem value="single" label="单参数" default>

  ![Code Cleaner - Single Parameter](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_single.png)

  列出所有用于`GameEvent<T>`的自定义生成文件。

  *   **搜索与过滤**：按类型名称查找文件（例如，搜索"Damage"将找到`DamageInfoGameEvent.cs`）。
  *   **全选/清除**：快速管理大型列表。
  *   **多选**：勾选单个文件或使用"Select All"。
  *   **删除**：红色的**Delete All Selected Files**按钮删除所有选中项的`.cs`文件及其`.meta`文件。

  </TabItem>
  <TabItem value="sender" label="带Sender">

  ![Code Cleaner - With Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_sender.png)

  列出所有用于`GameEvent<Sender, Args>`的自定义生成文件。

  *   **复杂过滤**：您可以按Sender名称或参数名称搜索。
  *   **文件检查**：点击任何文件旁边的**对象图标**📦，在删除前在项目窗口中ping/高亮显示脚本（用于仔细检查引用）。
  *   **批量删除**：一键安全删除多个Sender-Event定义。

  </TabItem>
</Tabs>

------

## ☢️ 全部清理（重置）

**Clean All Game Event Code**按钮是"核选项"。

- **操作**：删除`TinyGiantsData/GameEventSystem/CodeGen/Custom`中的**所有**自定义文件。
- **保留**：它**保留**Basic文件夹。
- **使用场景**：当您想要对自定义事件执行硬重置时，或者如果您重构了大量类型并且只想重新生成当前需要的内容时，使用此选项。