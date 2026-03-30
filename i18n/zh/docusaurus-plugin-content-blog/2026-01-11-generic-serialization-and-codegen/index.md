---
slug: generic-serialization-and-codegen
title: "Unity 泛型序列化之墙：类型安全的事件不该有样板代码税"
authors: [tinygiants]
tags: [ges, unity, architecture, codegen, tutorial]
description: "Unity 无法序列化泛型类型。这意味着每个事件类型都需要一个具体类。这意味着样板代码地狱——除非你的工具帮你全部生成。"
image: /img/home-page/game-event-system-preview.png
---

你写了一个 `GameEvent<T>`。干净、类型安全、优雅。你创建了一个 `GameEvent<float>` 字段用来广播血量变化，打上 `[SerializeField]`。切到 Inspector 一看——字段消失了。就像你让 Unity 除以零一样，它用一片空白面板回敬你。

这是 Unity 最古老的架构痛点。序列化系统不懂泛型，从来没懂过。每一个试图构建类型安全、数据驱动事件系统的开发者都一头撞上了这堵墙。

这不是什么小麻烦，而是那种会毒化整个架构的限制。你要么放弃类型安全，要么淹没在样板代码里，要么接受你那漂亮的泛型设计永远无法触及 Inspector。多年来社区的标准答案一直是"手写具体类就行了"。但问题来了——如果样板代码是 100% 可预测的，为什么要人来写？

<!-- truncate -->

## 为什么 Unity 无法序列化泛型

在尝试修复之前，先搞清楚底层发生了什么。

Unity 的序列化系统——驱动 Inspector、prefab 保存、场景文件和资产存储的引擎——设计于 C# 泛型在游戏开发中还不常见的年代。它基于具体类型和已知的固定内存布局运作。当序列化器遇到一个字段时，它需要在编译时知道确切的类型，才能分配内存、绘制 Inspector GUI、把数据写入磁盘。

当 Unity 遇到这样的字段：

```csharp
[SerializeField] private GameEvent<float> healthChanged;
```

它不知道该怎么办。泛型类型参数 `T` 意味着从序列化器的角度来看内存布局是不固定的。它无法创建 Inspector drawer，因为不知道该显示什么字段。它无法将引用存入场景文件，因为不知道具体类型。所以它唯一能做的就是——彻底忽略这个字段。

字段能编译通过，在 C# 代码里是存在的。但在 Unity 的 Inspector 和序列化管线眼中，它不存在。没有警告，没有报错，就是静默忽略。

这意味着如果你想要类型安全的事件，而且需要在 Inspector 里能用——这才是可视化工作流的全部意义——你需要为每一个想用的类型写一个具体的、非泛型的子类：

```csharp
// You have to write one of these for EVERY type
[CreateAssetMenu]
public class FloatGameEvent : GameEvent<float> { }

[CreateAssetMenu]
public class Int32GameEvent : GameEvent<int> { }

[CreateAssetMenu]
public class StringGameEvent : GameEvent<string> { }

[CreateAssetMenu]
public class Vector3GameEvent : GameEvent<Vector3> { }
```

一行有意义的信息——类型参数——包裹在完整的类声明里。每一个类型都是如此。

## 样板代码的数学题

来做一道让你不太舒服的算术题。

一个正经的事件系统，每种类型不只需要一个具体事件类，还需要一个 binding field 让可视化工作流能把事件连接到响应。每种类型至少两个生成产物。

一个典型的中等规模 Unity 项目大约会用到 15 种不同的事件类型：几个基础类型（`int`、`float`、`bool`、`string`），一些 Unity 类型（`Vector3`、`Color`、`GameObject`、`Transform`），再加上几个游戏特有的自定义 struct（`DamageInfo`、`ItemData`、`QuestProgress`）。

15 个类型 x 2 个产物 = 30 段几乎一模一样的样板代码。

再算上 Sender 变体。Sender 事件有两个泛型参数——谁发送的、携带什么数据。想要 `GameEvent<GameObject, float>` 来做每个实体的血量？又是一个具体类加一个 binding field。一个保守的项目可能有 5-10 个 Sender 组合。

你面对的是 40 多段样板代码，唯一有意义的变化就是类型名。每一段都是一个复制粘贴的机会，每一段都是潜在的拼写错误，每一段在基类接口变化时都需要更新。

而且这还不只是初始创建的问题，维护才是大头。有人重构了基础事件类但忘了更新三个具体类型。有人添加了新类型但放错了文件夹。有人复制粘贴了 `IntGameEvent`，改名为 `FloatGameEvent`，但忘了改里面的泛型参数。代码能编译，测试能过，两周后你才发现 float 事件一直在静默转换成 int。

这不是假设。这在真实项目里经常发生。

## 常见解决方案（以及为什么都不行）

Unity 社区从不缺创意。来看看大家试过什么方案，以及为什么没一个真正解决问题的。

### 手写样板代码："写就完了"

暴力方案。手动创建每一个具体类。技术上能用，但是：

- 枯燥且容易出错。你在做毫无创造价值的机械工作。
- 每次添加新类型都需要创建多个文件。漏掉一个就静默崩溃。
- 重构基类意味着要逐个修改每一个派生类。
- 没人能坚持做到一致。六个月后，你的代码库看起来像三个人用三种不同方式写了同一个系统。因为确实是这样。

### 放弃类型安全：用 `object`

有些系统通过使用 `object` 来绕过泛型问题：

```csharp
public class GenericEvent : ScriptableObject
{
    public void Raise(object data) { /* broadcast to listeners */ }
}

// Usage
scoreEvent.Raise(42);           // Boxed int — works
scoreEvent.Raise("oops");       // Wrong type — also compiles, breaks at runtime
scoreEvent.Raise(new Enemy());  // Also compiles. Also wrong. Also runtime.
```

恭喜，你通过丢掉使用泛型的全部理由来"解决"了序列化问题。现在每个事件调用都是潜在的运行时错误。每个监听者都需要手动类型转换和空值检查。你基本上是在 C# 里重建了 JavaScript 的类型系统。

装箱/拆箱的性能开销也不太好看，尤其是高频触发事件时。但真正的代价是开发者的信心——你永远无法确定一个事件携带的是不是正确的类型，除非读遍每一个调用点。

### T4 模板：方向对了，执行不行

有些开发者用 T4 文本模板或自定义编辑器脚本来自动生成样板代码。思路其实是对的——识别出代码是可预测的，然后自动化它。但大多数实现都是：

- 脆弱的。T4 模板你多看它一眼就坏了。
- 不透明的。搭建模板的人走了之后，没人看得懂模板语法。
- 外部的。它们活在正常的 Unity 工作流之外，人们会忘记它们的存在。
- 手动的。你仍然需要记得去运行那个生成步骤。

### 复制粘贴：最诚实的答案

说实话——大多数人实际上就是这么干的。复制一个现有的具体类，改类型名，改泛型参数，保存。能用到不能用为止。什么时候不能用呢：

- 你复制了错误的模板，继承了错误的基类
- 你忘了重命名某个地方，出现了重复的类名
- 你粘贴到了错误的命名空间
- 你连续做了 30 次，到第 15 次时眼睛就开始花了

每个人都这么干过。每个人最终都会后悔。

## 其他语言怎么做的

这个问题不只是 Unity 独有的，但大多数其他生态系统已经解决了。

**Rust** 有 `#[derive(...)]` 宏，在编译时自动实现 trait 样板。定义好 struct，加一个 derive 属性，搞定。

**Go** 有 `go generate`——一个内置在语言工具链里的一等公民代码生成工具。写一次生成器，在注释里引用它，工具链搞定剩下的。

**C# 自身**有 Roslyn source generator，可以在编译时基于现有类型生成代码。理论上这是完美方案。但实际上，Unity 的编译管线对 source generator 的支持有限，调试体验不太好，工具链也还在追赶中。在变好，但还没到"开箱即用"的程度。

这些方案背后的规律是一样的：**如果样板代码是可预测的，就应该让机器来写。** 一个人手打 `public class FloatGameEvent : GameEvent<float> { }` 做的事情完全可以用一个只有一个变量的模板来表达。这本来就是编译器该干的活。

回到根本问题：你的事件样板代码是 100% 可预测的。具体类名遵循固定模式。泛型参数是唯一的变量。Binding field 也遵循同样的模式。那人为什么还要写这些？

## 三种事件类型，一套系统

在看 GES 怎么处理代码生成之前，先了解它提供的三种事件架构。每种对应一种特定的通信模式。

### Void 事件：`GameEvent`

最简单的形式。没有数据载荷的事件。"某件事发生了"——这就是全部信息。

![Creator Parameterless](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

```csharp
[GameEventDropdown, SerializeField] private GameEvent onLevelComplete;

public void CompleteLevel()
{
    onLevelComplete.Raise();
}
```

没有泛型参数，没有序列化问题，不需要代码生成。直接创建 ScriptableObject 资产就能用。游戏开始、游戏结束、暂停、恢复、到达检查点——任何"事情本身就是全部信息"的信号。

### 单参数事件：`GameEvent<T>` 变成具体类

携带一个类型化数据的事件。"某件事发生了，这是相关信息。"

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

这就是序列化之墙出现的地方。你不能在 Inspector 里直接用 `GameEvent<float>`。GES 通过具体类型来解决，比如 `SingleGameEvent`、`Int32GameEvent`、`BooleanGameEvent` 等等：

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;

public void AddScore(int points)
{
    currentScore += points;
    onScoreChanged.Raise(currentScore);
}
```

注意：字段类型是 `Int32GameEvent`，不是 `GameEvent<int>`。它是一个具体的、非泛型的类，Unity 可以序列化、检视和存储。底层它继承自 `GameEvent<int>`，但 Unity 永远看不到泛型——它只看到具体子类。

使用场景：分数变化（`Int32GameEvent`）、血量更新（`SingleGameEvent`）、伤害数值（`SingleGameEvent`）、物品数量、冷却计时器，任何一条数据就能说清全部情况的场景。

### Sender 事件：`GameEvent<TSender, TArgs>` 变成具体类

携带发送者身份和事件数据的事件。"这个特定的事情发生在了这个特定的对象身上，详情在这。"

![Creator Sender](/img/game-event-system/visual-workflow/game-event-creator/creator-sender.png)

两个泛型参数意味着手动系统中更多的样板代码。GES 生成的具体类型如 `GameObjectDamageInfoGameEvent`：

```csharp
[GameEventDropdown, SerializeField] private GameObjectDamageInfoGameEvent onDamageTaken;

public void TakeDamage(DamageInfo info)
{
    currentHealth -= info.amount;
    onDamageTaken.Raise(gameObject, info);
}
```

当多个实例共享相同的事件类型时，Sender 参数至关重要。十个敌人都触发同一个 `onDamageTaken` 事件——sender 参数让监听者能够区分"Boss 受伤了"和"一个小兵受伤了"，不需要任何额外接线。

使用场景：战斗事件（谁打了谁、打了多少）、交互事件（哪个 NPC、什么对话）、物理事件（哪个物体、什么力）。任何"谁"和"什么"同样重要的时候。

## 32 个预生成类型覆盖大多数项目

GES 开箱即带 32 种常用类型的具体实现。大多数项目根本不需要生成任何东西。

![Basic Types](/img/game-event-system/examples/02-basic-types-event/demo-02-editor.png)

预生成集合包括：

- **基础类型：** `int`、`float`、`bool`、`string`、`byte`、`double`、`long`
- **Unity 数学：** `Vector2`、`Vector3`、`Vector4`、`Quaternion`
- **Unity 视觉：** `Color`、`Color32`
- **Unity 引用：** `GameObject`、`Transform`、`Component`、`Object`
- **Unity 结构体：** `Rect`、`Bounds`、`Ray`、`RaycastHit`
- **集合等更多类型**

实际上，这些预生成类型能覆盖 70-80% 的典型项目事件需求。分数追踪、血量系统、UI 更新、位置广播、基础游戏状态——全都不用碰代码生成器。

剩下的 20-30% 才是你的游戏变得有意思的地方：自定义 struct，比如 `DamageInfo`、`QuestProgress`、`InventorySlot`、`DialogueLine`。这就是 Creator 派上用场的时候了。

## Creator：在创建事件时自动生成代码

GES 设计中的关键洞察是：代码生成不是一个单独的步骤。它在你用自定义类型创建事件时自动发生。

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

当你打开 Game Event Creator 并选择一个还没有具体事件类的类型时，GES 当场就给你生成。你不需要打开单独的代码生成工具，不需要运行命令，完全不用想样板代码的事。你只是说"我要一个携带 `DamageInfo` 的事件"，然后具体类就出现了。

### 生成了什么

对于使用自定义类型的单参数事件，Creator 生成两样东西：

**1. 具体事件类：**

```csharp
// Auto-generated by GES
public class DamageInfoGameEvent : GameEvent<DamageInfo> { }
```

**2. Partial binding 类：**

```csharp
public partial class GameEventManager
{
    /// <summary>
    /// The field name MUST match the Event Class Name + "Action"
    /// This allows the EventBinding system to find it via reflection.
    /// </summary>
    public partial class EventBinding
    {
        [HideInInspector]
        public UnityEvent<DamageInfo> DamageInfoGameEventAction;
    }
}
```

Binding 类是可视化工作流的关键——它让 Behavior Window 能把事件连接到响应方法，而你不需要写任何接线代码。`partial` 关键字意味着这些生成的文件在编译时能干净地和 GES 框架的其余部分合并。

对于 Sender 事件，同样的模式，两个类型参数：

```csharp
// Auto-generated by GES
public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }

public partial class GameEventManager
{
    public partial class EventBinding
    {
        [HideInInspector]
        public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
    }
}
```

干净、精简、正确。没有拼写错误，没有遗漏的 attribute，没有不一致。命名约定是自动的：类型名 + `GameEvent` 作为类名，类型名 + `GameEvent` + `Action` 作为 binding 字段名。每个生成的文件都遵循完全相同的模式。

## CodeGen 工具：维护，不是创建

![Code Tools](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

你可能会问：如果 Creator 自动处理了生成，那单独的 CodeGen 工具是干嘛的？

CodeGen 工具是为维护场景准备的：

![CodeGen Tool](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

- **版本控制合并后。** 两个开发者在不同分支上各自生成了事件。合并带来了新的事件资产但没带生成的代码。CodeGen 工具会扫描缺少具体类的事件并重新生成。
- **升级 GES 后。** 新版本可能改变了生成代码的模板。CodeGen 工具可以重新生成所有具体类以匹配新模板。
- **清理废弃类型。** 你删了一个已经有生成事件的自定义 struct。CodeGen 工具的清理模式会找到孤立的生成文件并清除它们。

这么理解吧：Creator 是你的日常工作流，CodeGen 工具是你的季度维护操作。大多数开发者会频繁使用 Creator，很少用 CodeGen 工具。

## 完整演练：从自定义 Struct 到可用事件

来走一个从头到尾的真实场景，看看从"我需要一个自定义事件"到"它在游戏里跑起来了"总共需要多少步。

**场景：** 你在做一个战斗系统。当实体受到伤害时，你需要广播谁被打了、多少伤害、什么类型、命中点在哪。

### 第一步：定义你的数据 Struct

```csharp
namespace MyGame.Combat
{
    [Serializable]
    public struct DamageInfo
    {
        public float amount;
        public DamageType type;
        public Vector3 hitPoint;
        public bool isCritical;
    }
}
```

这是不管用不用 GES 你都要写的游戏代码。没有任何 GES 特有的东西。

### 第二步：在 Creator 中创建事件

打开 Game Event Creator。选择"Single Parameter"作为事件类型。选择或输入 `DamageInfo` 作为参数类型。给事件资产命名为 `OnDamageTaken`。点击 Create。

GES 自动生成 `DamageInfoGameEvent` 和它的 binding field。事件资产创建完毕，可以使用了。总耗时：大约 5 秒。

### 第三步：接线发送端

```csharp
using MyGame.Combat;
using UnityEngine;

public class Health : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private DamageInfoGameEvent onDamageTaken;

    private float currentHealth = 100f;

    public void TakeDamage(DamageInfo info)
    {
        currentHealth -= info.amount;
        onDamageTaken.Raise(info);
    }
}
```

在 Inspector 中，`onDamageTaken` 字段会显示为一个项目中所有 `DamageInfoGameEvent` 资产的下拉列表。选择 `OnDamageTaken`，搞定。

### 第四步：接线接收端

这一步在传统方案里需要写监听类、注册回调、管理订阅。用 GES，你在 Behavior Window 里可视化配置：

1. 在 Game Event Editor 中找到 `OnDamageTaken` 事件
2. 打开它的 Behavior Window
3. 添加 action：伤害数字 UI、受击音效、镜头抖动、数据上报
4. 每个 action 指向一个 GameObject 和一个方法——零代码耦合

你的接收端脚本就是普通的有 public 方法的 MonoBehaviour：

```csharp
public class DamageNumbersUI : MonoBehaviour
{
    public void ShowDamageNumber(DamageInfo info)
    {
        // Spawn floating text at info.hitPoint
        // Color based on info.isCritical
        // Size based on info.amount
    }
}
```

### 第五步：享受编译时安全

```csharp
// All of these are caught at compile time, not runtime:
onDamageTaken.Raise(42f);           // Error: float is not DamageInfo
onDamageTaken.Raise("damage");      // Error: string is not DamageInfo
onDamageTaken.Raise(null);          // Error: DamageInfo is a struct, can't be null
```

手写的样板代码：零。自动生成的代码：两个小文件。从"我需要一个伤害事件"到"它能用了"的总时间：不到一分钟。

## 什么时候用哪种事件类型

| 场景 | 事件类型 | 具体示例 |
|------|---------|---------|
| 纯信号，不需要数据 | `GameEvent` (void) | 游戏暂停、关卡完成 |
| 需要广播一个数据 | 单参数 | `Int32GameEvent` 用于分数，`SingleGameEvent` 用于血量 |
| 多个相关字段 | 单参数 + 自定义 struct | `DamageInfoGameEvent` 用于战斗数据 |
| 需要知道谁发送的 | Sender | `GameObjectSingleGameEvent` 用于每实体血量 |
| 每实例追踪 + 丰富数据 | Sender + 自定义 struct | `GameObjectDamageInfoGameEvent` |
| 系统级通知 | `GameEvent` (void) | 场景切换开始、保存完成 |

**通用原则：** 从 void 事件开始。当你需要数据时，用单参数事件——如果不止一个字段，包在 struct 里。只在监听者确实需要知道是哪个具体实例触发了事件时才用 Sender 事件。

## 总结

Unity 的泛型序列化限制是真实存在的、令人烦恼的，而且看不到要消失的迹象。但它不必成为你的问题。

规律很清楚：样板代码是可预测的，所以应该让工具来写。GES 把这个逻辑推到了极致——你永远不需要直接和代码生成打交道。你通过 Creator 创建事件，具体类自动出现。你在字段上用 `[GameEventDropdown, SerializeField]`，Inspector 就能直接用。CodeGen 工具处理那些由团队协作和版本控制带来的边缘情况。

算笔账就明白了。手动方案：40 多个近乎一模一样的文件，手工维护，容易复制粘贴出错，拖慢每一个需要新事件类型的开发者。GES 方案：零手写样板代码，创建时自动生成，端到端类型安全，还有一个维护工具应对偶尔需要刷新生成代码的罕见场景。

如果样板代码是 100% 可预测的，人就不该写它。这不是偷懒——这是工程。

---

🚀 全球开发者服务矩阵

**🇨🇳 国区开发者社区**
- 🛒 [Unity 中国资产商店](https://tinygiants.tech/ges/cn)
- 🎥 [B站官方视频教程](https://tinygiants.tech/bilibili)
- 📘 [高性能架构技术文档](https://tinygiants.tech/docs/ges)
- 💬 国内技术交流群 (1071507578)

**🌐 全球开发者社区**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord 全球技术社区](https://tinygiants.tech/discord)
- 🎥 [YouTube 官方频道](https://tinygiants.tech/youtube)
- 🎮 [Unity 官方论坛专贴](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub 官方主页](https://github.com/tinygiants-tech/TinyGiants)

**📧 支持与合作**
- 🌐 [TinyGiants 工作室主页](https://tinygiants.tech)
- ✉️ [官方支持邮箱](mailto:support@tinygiants.tech)
