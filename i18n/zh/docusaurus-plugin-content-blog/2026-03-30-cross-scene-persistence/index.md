---
slug: cross-scene-persistence
title: "跨场景事件：没人聊但人人踩的持久化问题"
authors: [tinygiants]
tags: [ges, unity, cross-scene, architecture, best-practices]
description: "场景切换会打断事件订阅。静态事件会造成幽灵引用。DontDestroyOnLoad 只是创可贴。如何构建真正能在场景加载后存活的事件通信。"
image: /img/home-page/game-event-system-preview.png
---

你的 `AudioManager` 播放背景音乐。它订阅了 `OnLevelStart`，在玩家进入新区域时切换曲目。你把 `AudioManager` 放在 `DontDestroyOnLoad` 对象上保持跨场景存活。开发期间一切正常，因为你一直在同一个场景里测试。

然后有人第一次从关卡 1 加载到关卡 2。音乐不切了。`AudioManager` 还活着 —— `DontDestroyOnLoad` 尽职了 —— 但事件订阅没有存活下来。或者更糟：旧的订阅还在，指向关卡 1 里已经被销毁的事件触发方，下次有东西尝试调用它时你会在游戏中途收到一个 `MissingReferenceException`。

这就是持久化问题，每个有多个场景的 Unity 项目迟早都会撞上。

<!-- truncate -->

## 根本矛盾

Unity 的场景系统和事件系统建立在对对象生命周期截然不同的假设上。

场景是**临时的**。加载一个场景，用它，卸载它。场景里的对象与它同生共死。这很干净、可预测，也符合玩家体验游戏的方式 —— 去到新区域，离开旧区域。

事件需要**持久性**。全局的数据分析系统需要听到每个场景的伤害事件。存档系统需要响应存档点事件，不管玩家在哪一关。成就追踪器需要在整个游玩会话中累积数据。

这两个模型是矛盾的。而 Unity 并没有给你好的工具来调和它们。

## 静态事件：幽灵订阅问题

大多数开发者首先尝试的是静态事件：

```csharp
public static class GameEvents
{
    public static event Action OnLevelStart;
    public static event Action<int> OnPlayerDamaged;
    public static event Action OnPlayerDied;
}
```

静态事件跨场景加载持久化，因为它们存在于类上而非对象上。问题解决了对吧？

没那么简单。静态事件持久化了，但**订阅它们的对象**没有。场景卸载时，场景里的每个 MonoBehaviour 都被销毁。如果其中一个 MonoBehaviour 订阅了静态事件而没在 `OnDisable` 或 `OnDestroy` 中取消订阅，你就有了一个幽灵订阅 —— 一个指向已销毁对象的委托。

下次事件触发时：

```
MissingReferenceException: The object of type 'EnemySpawner'
has been destroyed but you are still trying to access it.
```

修复看似简单：永远在 `OnDisable` 中取消订阅。但 `OnDisable` 在场景切换时有自己的问题（后面会讲）。而且即使你很自律，一个脚本里漏掉一次取消订阅就会造成一个只在场景切换时才显现的 Bug —— 最难复现、最容易在测试中遗漏的那种。

静态事件还造成了另一个架构问题：**一切都是全局的**。没有"这个事件属于这个场景"或"这个事件只在这个上下文中有意义"的概念。整个项目中的每个系统都能看到并订阅每个事件。对于真正全局的事件如 `OnApplicationPause` 还行，但对于场景特定的事件如 `OnDoorOpened` 或 `OnPuzzleSolved` 就一团糟了。

## 实例事件：随场景消亡

相反的方案 —— MonoBehaviour 上的实例事件：

```csharp
public class LevelManager : MonoBehaviour
{
    public event Action OnLevelStart;
    public event Action OnLevelComplete;
}
```

干净且有作用域。只有引用了 `LevelManager` 的对象才能订阅。场景卸载时 `LevelManager` 被销毁，所有订阅跟着消失。没有幽灵引用。

但现在跨场景通信不可能了。你的 `AudioManager`（活在 `DontDestroyOnLoad` 的世界里）需要当前场景中 `LevelManager` 的引用。怎么获得？每次场景加载后 `FindObjectOfType`？静态注册表？Service Locator？每种方案都增加了复杂度和耦合 —— 恰恰是事件本应消除的东西。

而且场景卸载后，你的 `AudioManager` 还持有对已销毁 `LevelManager` 的引用。希望你做了 null 检查。

## DontDestroyOnLoad 创可贴

"把事件系统放在 `DontDestroyOnLoad` 对象上就好了。"

这是最常见的建议，而且确实有点用。你创建一个持久化的 `EventManager`，持有所有事件，标记 `DontDestroyOnLoad`，然后所有东西都订阅它。

但关于 `DontDestroyOnLoad`，人们不会告诉你的是：

**问题 1：非 DDOL 对象在场景切换时会触发 `OnDisable`。** Unity 卸载场景时，场景中的每个 MonoBehaviour 都收到 `OnDisable` 和 `OnDestroy`。如果你的监听器在 `OnDisable` 中取消订阅（理应如此），它们就在场景切换期间取消订阅了。你的事件系统瞬间没有监听器了。如果这个窗口期内有东西触发事件，没人听得到。

**问题 2：切换期间的执行顺序不保证。** 新场景加载时，`OnEnable` 在所有新 MonoBehaviour 上触发。但什么顺序？如果 `EnemySpawner.OnEnable` 在 `LevelManager.OnEnable` 之前触发，而 Spawner 需要订阅 LevelManager 还没初始化的事件，你就得到一个 null 引用。在你机器上能用（Unity 恰好按正确顺序初始化了）。在 QA 的机器上不行。

**问题 3：重复的 DDOL 对象。** 如果你的持久化 `EventManager` 在一个被加载两次的场景里（测试时从不同起始场景按 Play 很常见），你就有两个 `EventManager`。现在每个事件有两份。一半监听器订阅了一份，另一半订阅了另一份。啥都不工作但 Inspector 里一切看起来正常。

## Bootstrap 场景模式

有些团队用"Bootstrap"场景解决重复问题。游戏总是先加载一个 Bootstrap 场景，创建所有持久化管理器，然后以 Additive 方式加载实际的游戏场景。

这能用，但增加了实实在在的复杂度：

- **你不能从任何场景直接按 Play 了。** 必须从 Bootstrap 场景开始，或者写编辑器工具在你的测试场景之前自动加载 Bootstrap。
- **加载顺序变得关键。** Bootstrap 必须在任何游戏场景访问其系统之前完成初始化。这通常意味着一个加载画面，即使加载很快。
- **场景管理变复杂了。** 你现在在管理 Additive 场景加载，意味着要管理哪些场景已加载、哪些正在加载、哪些正在卸载 —— 同时进行。

它能用。大量上线的游戏用这个模式。但这是纯粹为了绕过持久化问题而存在的基础设施。是管道工程，不是游戏逻辑。

## 多场景编辑让情况更糟

Unity 的 Additive 场景加载对大世界很强大 —— 同时加载村庄场景、地形场景和 UI 场景。但它让持久化问题翻倍了。

哪个场景拥有哪个事件？如果 `OnShopOpened` 在村庄场景里，`OnInventoryChanged` 在玩家场景里，村庄卸载时会怎样？`OnShopOpened` 消失了，但仍然加载的玩家场景中的对象可能还在监听它。它们现在订阅了一个不存在的东西，而且自己不知道。

卸载场景本应是干净的。有了跨场景事件引用，一点都不干净。

## 生命周期问题

让我们精确追踪场景切换时使用事件的完整过程：

1. `SceneManager.LoadScene("Level2")` 被调用
2. Unity 开始卸载当前场景
3. 当前场景所有 MonoBehaviour 触发 `OnDisable`（监听器取消订阅）
4. 当前场景所有 MonoBehaviour 触发 `OnDestroy`
5. 当前场景完全卸载
6. 新场景开始加载
7. 新场景所有 MonoBehaviour 触发 `Awake`
8. 新场景所有 MonoBehaviour 触发 `OnEnable`（监听器重新订阅）
9. 新场景所有 MonoBehaviour 触发 `Start`

问题在第 3 步和第 8 步之间的空隙。在这段时间里，你的事件系统没有场景级别的监听器。任何 DDOL 对象在这个窗口期触发事件就是在对着虚空喊话。

而第 8 步内部的顺序在不同机器或 Unity 版本间不确定。系统 A 可能需要订阅系统 B 初始化的事件。如果 B 的 `OnEnable` 在 A 之后执行，你就得到一个表现为海森堡 Bug 的竞态条件。

需要跨场景持久化的真实系统示例：
- **AudioManager** —— 必须听到任何场景的 `OnLevelStart`、`OnBossFight`、`OnVictory`
- **AnalyticsManager** —— 必须追踪会话中每个场景的事件
- **SaveSystem** —— 必须响应 `OnCheckpointReached`，不管在哪个场景
- **AchievementTracker** —— 必须跨所有场景累积进度数据

这些都是必须听到任何场景事件的系统。持久化问题不是学术讨论 —— 它阻挡了真实游戏中的真实功能。

## GES 如何解决这个问题

GES 从架构层面解决持久化问题，而不是用变通方案。

### ScriptableObject 事件存在于场景之外

这是关键洞察。在 GES 中，事件是 ScriptableObject 资产，存在于项目的 Assets 文件夹里 —— 不在任何场景中。它们是项目级别的资源，不是场景级别的对象。

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField]
    private SingleGameEvent onLevelStart;

    [GameEventDropdown, SerializeField]
    private SingleGameEvent onBossFight;
}
```

关卡 1 卸载、关卡 2 加载时，`onLevelStart` 事件资产哪儿也不去。它不属于任何场景。它存在于项目级别，独立于场景生命周期。你的 `AudioManager`（DDOL）保持对同一个事件资产的引用。新场景的 `LevelManager` 也获得对同一个事件资产的引用。通信就这么通了。

不需要静态事件。不需要事件管理器单例。不需要 Bootstrap 场景。ScriptableObject 架构让跨场景通信成为事件存储方式的自然结果，而不是你必须特意启用的特殊功能。

### Behavior Window：自动生命周期管理

GES 的 Behavior Window 可视化地处理订阅生命周期。当你通过 Behavior Window 绑定监听器时，它在 `OnEnable` 中自动订阅、在 `OnDisable` 中自动取消订阅。不需要手写订阅代码。不可能忘记取消订阅。

![Behavior Window with Persistent Listener](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

这意味着场景切换直接就能用：

1. 旧场景卸载 —— `OnDisable` 触发 —— Behavior Window 自动取消订阅旧监听器
2. 新场景加载 —— `OnEnable` 触发 —— Behavior Window 自动订阅新监听器
3. 事件资产从未被销毁，所以订阅无缝连接到同一个事件

没有空隙。没有竞态条件。没有幽灵引用。

### Persistent Listener：显式的跨场景存活

对于真正需要跨场景加载持久化的系统 —— 你的 `AudioManager`、你的 `AnalyticsManager` —— GES 提供 Persistent Listener。

在代码中使用 `AddPersistentListener`：

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField]
    private SingleGameEvent onLevelStart;

    private void OnEnable()
    {
        onLevelStart.AddPersistentListener(HandleLevelStart);
    }

    private void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(HandleLevelStart);
    }

    private void HandleLevelStart(string levelName)
    {
        // Change music based on level
    }
}
```

Persistent Listener 存储在与普通监听器分离的层中。它们能存活过场景切换因为：
- 事件是 ScriptableObject（存在于场景之外）
- 监听器在 DDOL 对象上（存活过切换）
- Persistent 注册显式告诉事件系统"跨加载保留这个"

在 Behavior Window 里有一个 **Persistent 复选框** —— 就是 `AddPersistentListener` 的可视化等价物。勾上它，该绑定就能存活过场景切换，不需要任何代码。

### 场景切换时发生了什么（逐步）

之前同样的切换追踪，但这次用 GES：

1. `SceneManager.LoadScene("Level2")` 被调用
2. Unity 开始卸载关卡 1
3. 关卡 1 MonoBehaviour 触发 `OnDisable` —— Behavior Window 自动取消订阅它们的监听器
4. 关卡 1 MonoBehaviour 触发 `OnDestroy`
5. 关卡 1 完全卸载
6. **事件资产完好无损** —— 它们是 ScriptableObject，不是场景对象
7. **Persistent Listener 完好无损** —— 它们注册在 DDOL 对象上
8. 关卡 2 开始加载
9. 关卡 2 MonoBehaviour 触发 `OnEnable` —— Behavior Window 自动订阅它们的监听器
10. 关卡 2 MonoBehaviour 触发 `Start`

关键区别：第 5 步和第 9 步之间，事件系统不是空的。Persistent Listener 仍然活跃。如果 DDOL 系统在加载期间触发事件，Persistent Listener 能听到。场景特定的监听器消失了（这是对的），但全局系统从未丢失连接。

### 持久化的场景配置

![Scene Setup for Persistent Events](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

场景配置很直观：你的持久化管理器活在 DDOL 对象上，使用 Persistent Listener 绑定。场景特定对象使用普通的 Behavior Window 绑定。事件资产放在任何场景都能访问的共享数据库中。

![Persistent Event Editor](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

### 多数据库动态加载

对于有很多场景的大型项目，GES 支持多个事件数据库。你可以按上下文组织事件：

- **核心数据库** —— 启动时加载的全局事件（`OnApplicationPause`、`OnSaveRequested`、`OnAchievementUnlocked`）
- **战斗数据库** —— 战斗场景活跃时加载（`OnDamageDealt`、`OnEnemyDefeated`）
- **UI 数据库** —— 随 UI 场景加载（`OnMenuOpened`、`OnSettingsChanged`）

![Manager with Multiple Databases](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

场景特定的数据库随场景一起加载和卸载。核心数据库始终保持加载。未加载数据库中的事件变为非活跃 —— 它们不会触发，尝试 Raise 是空操作而不是报错。

这给了你静态事件所缺乏的作用域（"这个事件只在这个场景加载时存在"），又没有实例事件的脆弱性（"这个事件在这个对象死亡时消失"）。

### 要注意的反模式

一个要避免的错误：忘了在 `OnDestroy` 中移除 Persistent Listener。

```csharp
// BAD - persistent listener leaks if this object is destroyed
private void OnEnable()
{
    onLevelStart.AddPersistentListener(HandleLevelStart);
}

// GOOD - clean up in OnDestroy for DDOL objects
private void OnDestroy()
{
    onLevelStart.RemovePersistentListener(HandleLevelStart);
}
```

普通监听器在 `OnDisable` 中取消订阅。Persistent Listener 应该在 `OnDestroy` 中取消订阅 —— 因为 Persistent Listener 的全部意义就是在场景切换时的 `OnDisable` 中存活下来。如果你把移除放在 `OnDisable`，就违背了初衷。

GES 的 Runtime Monitor（特别是 Warnings 标签页）会标记注册在非 `DontDestroyOnLoad` 对象上的 Persistent Listener。这几乎总是 Bug —— 你告诉事件系统"跨场景加载保留这个监听器"，但对象本身活不过加载。

## 更大的图景

跨场景持久化不只是一个技术问题 —— 它是一个影响整个项目结构的架构决策。错误的选择会级联成单例、Service Locator、Bootstrap 场景、加载顺序依赖、和散布在每个脚本中的防御性 null 检查。

GES 的方案 —— ScriptableObject 事件加显式持久化控制 —— 意味着你不必在"一切全局化"和"什么都不能跨场景"之间二选一。事件存在于项目级别。监听器根据自身需求选择持久化方式。常见情况自动处理生命周期，特殊情况显式控制。

你的 `AudioManager` 用 Persistent Listener 订阅一次，就能在整个会话中听到每个场景的事件。你的 `EnemySpawner` 通过 Behavior Window 订阅，场景卸载时自动断开，下一个场景自动重连。两种模式在同一个事件上共存。不需要特殊配置。不需要 Bootstrap 场景。没有竞态条件。

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
