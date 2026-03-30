---
slug: listener-strategies-deep-dive
title: "执行顺序的隐患：'谁先响应'背后的 Bug"
authors: [tinygiants]
tags: [ges, unity, scripting, advanced, best-practices]
description: "UI 比数据更新还快？恭喜你踩到了执行顺序 Bug。C# 事件为什么必然导致这种问题，确定性监听管线又是怎么根治的。"
image: /img/home-page/game-event-system-preview.png
---

玩家受到 25 点伤害。血量系统扣血。UI 刷新血条。但血条显示的是 100 而不是 75。你盯着代码看了 20 分钟才反应过来：UI 的监听器比血量系统的监听器先执行了。UI 读到的是旧值，渲染完了，血量系统才完成扣血。等数据正确的时候，这一帧已经画完了。

你刚刚发现了"执行顺序 Bug"。如果你用事件驱动架构上过线，八成已经在不知情的情况下发布过好几个这样的 Bug。它们在测试环境下表现正常 —— 因为脚本恰好按正确顺序初始化了 —— 然后到了线上就炸，因为 Unity 换了个加载顺序。

这不是什么边缘情况，而是大多数事件系统的结构性缺陷 —— 包括 Unity 的 `UnityEvent` 和标准 C# `event` 委托。一旦搞明白为什么，你就再也回不去了。

<!-- truncate -->

## 为什么"注册顺序"是一种糟糕的执行策略

在原生 C# 事件系统里，监听器按注册顺序执行。先订阅的先跑。听起来挺合理，直到你想想"注册顺序"到底取决于什么。

Unity 里，大部分订阅发生在 `Awake()` 或 `OnEnable()` 中。它们的执行顺序取决于：

1. **Script Execution Order** —— 可以在 Project Settings 里配，但谁会真的给 30 多个脚本都配一遍？
2. **GameObject 创建顺序** —— 取决于场景层级中的位置，有人在 Scene View 里拖一下就变了。
3. **Prefab 实例化时机** —— 运行时 Spawn 的对象比场景对象订阅得更晚。
4. **AddComponent 顺序** —— 对于动态构建的对象，组件顺序决定了生命周期时序。

所以，你的监听器执行顺序取决于场景层级、实例化时机、脚本执行顺序设置和组件排列。把一个 GameObject 在层级里挪个位置？行为可能就变了。晚一帧实例化一个 Prefab？执行顺序就不一样了。把系统重构成用 AddComponent 而不是 Prefab？一切都移位了。

这就是为什么"UI 显示过期数据"的 Bug 这么常见。不是你代码写错了 —— 是隐式排序太脆弱了，会因为跟你逻辑完全无关的原因而改变。

## "先数据后视图"：人人都知道但没人能强制执行

每个游戏开发者都知道这个原则：先更新数据，再渲染。Model 在 View 前面，状态变更在展示之前。计算机科学入门课就教了。

但用 C# 事件怎么强制执行？

```csharp
// In HealthSystem.cs
private void OnEnable()
{
    onPlayerDamaged += ApplyDamage; // mutates HP
}

// In HealthBarUI.cs
private void OnEnable()
{
    onPlayerDamaged += RefreshHealthBar; // reads HP
}
```

谁先执行？看谁的 `OnEnable()` 先触发。谁的 `OnEnable()` 先触发？看 Script Execution Order。能保证吗？勉强可以 —— 你可以在 Project Settings 里设定两个脚本的执行顺序。但如果有 15 个系统监听同一个事件呢？

Script Execution Order 无法扩展。你最终会得到一个噩梦般的相对排序矩阵，每加一个新系统就可能崩掉。而且它只影响 `Awake`/`OnEnable`/`Start` 的顺序，并不影响委托实际的调用顺序（那取决于 `+=` 的调用序列）。

用原生 C# 事件的真实答案是：你无法强制执行。你只能祈祷。

## 条件执行：没人聊的性能问题

这里有个更微妙的问题。你有一个物理相关的事件，在每个 `FixedUpdate` 都会触发。可能是 `onCollisionDetected` 或 `onPositionUpdated`，每秒触发 50 次。

你有 8 个系统监听这个事件。但大多数只关心特定条件：
- 伤害系统只关心碰撞涉及敌人的情况。
- 音效系统只关心冲击力超过阈值的情况。
- 粒子系统只关心特定材质类型。
- AI 系统只关心玩家参与的情况。

用标准 C# 事件，8 个监听器每次都会全部执行。每个内部检查条件，不满足就直接返回。这意味着每秒 50 次触发，每次 8 个方法调用、8 次条件检查、8 次可能的缓存未命中。就一个事件。

```csharp
private void HandleCollision(CollisionData data)
{
    if (!data.InvolvesEnemy()) return; // most calls bail here

    // Actual work that rarely runs
    ApplyDamage(data);
}
```

单次检查确实很便宜。但"便宜乘以每秒 400 次再乘以 8 个监听器"就不便宜了，尤其在移动端。而这个模式 —— 进入函数、检查条件、立刻返回 —— 本身就是浪费。你付出了函数调用的开销，只为了什么都不干。

你真正想要的是"除非条件满足，否则别调用我"。前置过滤，而不是后置过滤。

## 跨场景持久化：AudioManager 问题

每个 Unity 项目都有一个 AudioManager。它活在 `DontDestroyOnLoad` 对象上，需要响应每个场景的事件来播放音效 —— 受击音、死亡音、拾取音，都由游戏事件触发。

用标准 C# 事件会遇到问题。加载新场景时：

1. 所有场景对象被销毁，它们的事件订阅也跟着消失。
2. 新场景对象带着新的事件实例被创建。
3. AudioManager 的订阅是在旧事件实例上的。没了。

于是 AudioManager 每次场景加载后都得重新订阅。它需要知道每个场景里的每个事件。它变成了一个引用了一切的上帝对象。

或者你用静态事件，然后就有了新问题：AudioManager 什么时候订阅？如果在 `Awake()` 里订阅，所有事件都存在了吗？如果事件定义在还没加载的 ScriptableObject 上呢？场景特定的事件实例重新创建后还是同一个身份吗？

常见的变通方案 —— 静态事件总线、Service Locator、带注册 API 的单例管理器 —— 都能用但增加了架构重量。AudioManager 不应该需要了解场景管理。它应该只是说"我要听这个事件，永远，不管在哪个场景。"

## Lambda 陷阱：C# 的隐性内存泄漏

这个坑连有经验的 C# 开发者都踩。

```csharp
private void OnEnable()
{
    onDamage += (int amount) => currentHealth -= amount;
}

private void OnDisable()
{
    // How do you unsubscribe? You CAN'T.
    onDamage -= (int amount) => currentHealth -= amount;
    // This creates a NEW delegate. It doesn't match the original.
}
```

每个 Lambda 表达式都会创建一个新的委托实例。即使代码一字不差，`RemoveListener` 也无法匹配，因为它是内存中的另一个对象。原来的委托还在订阅列表里，还持有对你 MonoBehaviour 的引用，GC 两个都回收不了。

在 10 个系统、5 个场景里这么做，你就有了一个缓慢的内存泄漏，只有在玩了 20-30 分钟后才会显现。QA 无法稳定复现的那种泄漏，因为它取决于加载了多少场景、什么顺序加载的。

修复方法一旦知道就很简单 —— 缓存委托或用方法引用 —— 但语言让危险的写法看起来自然，安全的写法看起来啰嗦。这是一个失败之坑，而不是成功之坑。

## 你到底需要监听系统具备什么能力

退一步，列出需求：

1. **确定性顺序**：数据逻辑永远在视图逻辑之前执行。无论注册时机如何。
2. **条件过滤**：不调用不关心的监听器。前置过滤，不是后置过滤。
3. **跨场景存活**：部分监听器需要在场景加载后继续存在，无需重新订阅。
4. **干净的生命周期**：订阅、取消订阅、无悬挂引用、无隐性泄漏。
5. **可组合性**：在同一个事件上混用不同的监听策略，互不冲突。

标准 C# 事件在你小心的情况下能做到第 4 条，其他的都做不到。UnityEvent 加了 Inspector 支持也能做到第 4 条，但其他的同样做不到。这就是 GES 监听系统填补的空白。

## GES 的四种监听器类型

GES 提供四种不同的监听策略，每种面向一个特定的架构需求。它们在一个确定性的 6 层管线中执行，你永远知道顺序。

### 第 1 层：Basic Listener（FIFO）

默认方式。订阅，收回调，搞定。

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onPlayerDamaged;

private void OnEnable()
{
    onPlayerDamaged.AddListener(HandleDamage);
}

private void OnDisable()
{
    onPlayerDamaged.RemoveListener(HandleDamage);
}

private void HandleDamage(int amount)
{
    currentHealth -= amount;
}
```

Basic Listener 按 FIFO 顺序执行 —— 先订阅的先调用。在你真的不在乎顺序的时候用它们。对同一事件的独立反应：受击闪光、疼痛音效、镜头抖动。它们的相对顺序不重要，因为它们不读取彼此的状态。

### 第 2 层：Priority Listener（显式排序）

这就是解决执行顺序问题的地方。Priority Listener 让你明确声明哪个监听器先跑。

```csharp
// Higher number = runs first
onPlayerDamaged.AddPriorityListener(ApplyDamageReduction, priority: 100);
onPlayerDamaged.AddPriorityListener(UpdateHealthData, priority: 50);
onPlayerDamaged.AddPriorityListener(RefreshHealthUI, priority: 25);
onPlayerDamaged.AddPriorityListener(PlayHitSound, priority: 10);
onPlayerDamaged.AddPriorityListener(LogDamageAnalytics, priority: 0);
```

`ApplyDamageReduction` 永远先执行（优先级 100）。永远。不管哪个脚本先加载、哪个 GameObject 先创建、场景层级怎么排。然后是 `UpdateHealthData`（50），再是 `RefreshHealthUI`（25）。UI 永远看到的是减伤后、更新后的 HP 值。

![Priority Behavior Ordered](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

对比一下没有显式排序的情况 —— 混乱的执行顺序随初始化时机变化：

![Priority Behavior Chaotic](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

#### 可扩展的优先级约定

我发现定义团队统一的优先级常量非常有价值：

```csharp
public static class EventPriority
{
    public const int CRITICAL    = 200;  // Validation, security, sanity checks
    public const int HIGH        = 100;  // State mutations, data changes
    public const int NORMAL      = 50;   // Game logic, behavior reactions
    public const int LOW         = 25;   // UI updates, visual effects
    public const int BACKGROUND  = 10;   // Audio, particles, non-critical feedback
    public const int CLEANUP     = 0;    // Logging, analytics, telemetry
}
```

```csharp
onPlayerDamaged.AddPriorityListener(ValidateInput, EventPriority.CRITICAL);
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);
onPlayerDamaged.AddPriorityListener(CheckDeathCondition, EventPriority.NORMAL);
onPlayerDamaged.AddPriorityListener(UpdateHealthBar, EventPriority.LOW);
onPlayerDamaged.AddPriorityListener(PlayHitSound, EventPriority.BACKGROUND);
onPlayerDamaged.AddPriorityListener(TrackDamageMetrics, EventPriority.CLEANUP);
```

新系统要监听同一个事件时，选个合适的层级插进去就行。不用审查其他每个监听器的注册顺序，不用跳 Script Execution Order 的舞。选好层级就完事了。

同优先级的监听器在该层内按 FIFO 执行 —— 这是正确的兜底行为，因为同层内的顺序本来就不应该重要。如果重要，就给它们不同的优先级。

### 第 3 层：Conditional Listener（前置过滤执行）

Conditional Listener 加了一个谓词门。只有在事件触发的那一刻条件为真，监听器才会执行。

```csharp
// Only react to damage when the shield is down
onPlayerDamaged.AddConditionalListener(
    call: HandleDamage,
    condition: () => !isShielded,
    priority: 50
);
```

条件在任何监听逻辑执行之前就被评估了。如果返回 false，监听器被完全跳过 —— 没有方法调用，除了谓词评估本身没有任何开销。

对于带类型参数的事件，条件可以检查参数：

```csharp
// Only react to critical hits (damage > 50)
onPlayerDamaged.AddConditionalListener(
    call: HandleCriticalHit,
    condition: (int damage) => damage > 50,
    priority: 75
);
```

对于带发送者的事件，两个都能检查：

```csharp
// Only react to damage from bosses
onDamageFromSource.AddConditionalListener(
    call: HandleBossDamage,
    condition: (GameObject sender, int damage) => sender.CompareTag("Boss"),
    priority: 75
);
```

这就解决了高频事件问题。不再是 8 个监听器每秒执行 50 次然后提前退出，而是只有条件满足的监听器才真正执行。其余的在谓词层面就被跳过了 —— 比完整的方法调用便宜得多。

Conditional Listener 同样按优先级排序，所以你在一次订阅中同时获得了过滤和排序。护盾检查优先级 100，护甲减伤优先级 50，各自按条件执行。

### 第 4 层：Persistent Listener（跨场景存活）

Persistent Listener 在 `SceneManager.LoadScene()` 调用后仍然存活。它们跨场景切换持续接收事件，无需重新订阅。

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDamaged;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyDied;
    [GameEventDropdown, SerializeField] private SingleGameEvent onItemPickedUp;

    private void OnEnable()
    {
        onPlayerDamaged.AddPersistentListener(PlayHitSound, priority: 10);
        onEnemyDied.AddPersistentListener(PlayDeathSound, priority: 10);
        onItemPickedUp.AddPersistentListener(PlayPickupSound, priority: 10);
    }

    private void OnDestroy()
    {
        onPlayerDamaged.RemovePersistentListener(PlayHitSound);
        onEnemyDied.RemovePersistentListener(PlayDeathSound);
        onItemPickedUp.RemovePersistentListener(PlayPickupSound);
    }

    private void PlayHitSound() { /* ... */ }
    private void PlayDeathSound() { /* ... */ }
    private void PlayPickupSound() { /* ... */ }
}
```

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

AudioManager 订阅一次就完事了。场景加载后不用重新订阅，不用追踪哪个事件在哪个场景里，不需要上帝对象模式。

对 Analytics、SaveSystem、AchievementTracker 同样适用 —— 任何活在整个会话中、需要听到每个场景事件的东西。

![Persistent Scene Setup](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

#### 重要：必须手动移除

Persistent Listener 在场景卸载时不会自动移除。这正是它的意义。但这意味着你必须在拥有它的对象销毁时手动移除，否则就会有悬挂委托。

永远在 `OnDestroy()` 而不是 `OnDisable()` 中移除 Persistent Listener。对于 `DontDestroyOnLoad` 对象，`OnDisable()` 在场景切换时就会触发，太早了。

```csharp
// WRONG: fires during scene transition for DontDestroyOnLoad objects
private void OnDisable()
{
    onEvent.RemovePersistentListener(MyHandler);
}

// RIGHT: fires when the object is actually destroyed
private void OnDestroy()
{
    onEvent.RemovePersistentListener(MyHandler);
}
```

#### RemoveAllListeners() 是故意受限的

调用 `RemoveAllListeners()` 时，它清除 Basic、Priority 和 Conditional 监听器，但不碰 Persistent Listener。

这是设计如此。`RemoveAllListeners()` 是一个清理操作 —— 场景切换、系统重置、测试拆解。Persistent Listener 显式地不参与场景范围的清理。如果你要移除它们，就逐个调用 `RemovePersistentListener()`。刻意的摩擦用于刻意的决策。

## 6 层执行管线

当 GES 事件的 `Raise()` 被调用时，所有监听器按照严格的、确定性的顺序跨 6 层执行：

1. **Basic Listener** —— FIFO 顺序
2. **Priority Listener** —— 优先级数值越高越先执行
3. **Conditional Listener** —— 谓词过滤后按优先级排序
4. **Persistent Listener** —— 跨场景，带优先级
5. **Trigger Event** —— 并行扇出到其他事件
6. **Chain Event** —— 顺序阻塞执行

第 1 层永远在第 2 层之前执行。第 2 层在第 3 层之前。永远如此。每层内部遵循各自的排序规则。这种确定性消除了"为什么 UI 比数据先更新"这一类 Bug。

实际项目中，一个事件经常同时使用多种监听器类型：

```csharp
// Data layer: priority listener, runs first
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);

// UI layer: basic listeners, order among them doesn't matter
onPlayerDamaged.AddListener(UpdateHealthBar);
onPlayerDamaged.AddListener(FlashDamageIndicator);

// Analytics: persistent, survives scene transitions
onPlayerDamaged.AddPersistentListener(TrackDamage, EventPriority.CLEANUP);

// Special case: conditional, only during boss fights
onPlayerDamaged.AddConditionalListener(
    ApplyBossModifier,
    () => isBossFight,
    EventPriority.CRITICAL
);
```

管线确保这些按正确顺序执行，不管它们何时注册：Conditional (CRITICAL) -> Priority (HIGH) -> Basic (FIFO) -> Persistent (CLEANUP) -> Triggers -> Chains。

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

Runtime Monitor 的 Listeners 标签页展示每个事件的所有活跃订阅，按类型分组。在你需要验证监听器配置是否正确时非常有用。

## Lambda 陷阱：已解决

还记得 C# 事件的 Lambda 问题吗？GES 有同样的约束 —— 委托必须可引用才能移除。但模式很直接：

```csharp
// BROKEN: can't remove this
onDamage.AddListener((int amount) => health -= amount);

// CORRECT: method reference, always stable
onDamage.AddListener(HandleDamage);
private void HandleDamage(int amount) => health -= amount;

// ALSO CORRECT: cached delegate
private System.Action<int> _handler;
private void OnEnable()
{
    _handler = (amount) => health -= amount;
    onDamage.AddListener(_handler);
}
private void OnDisable()
{
    onDamage.RemoveListener(_handler);
}
```

方法引用是最安全的模式。同一个实例上，`HandleDamage` 永远指向同一个委托。所有监听器订阅都用这个，除非你有特殊理由需要 Lambda。

## 实战模式：用优先级层级实现 MVC

这是一个干净地映射到 MVC 的模式，并且通过事件系统本身来强制执行：

```csharp
public static class EventPriority
{
    public const int VALIDATION  = 200;  // Reject bad data
    public const int MODEL       = 100;  // Mutate state
    public const int CONTROLLER  = 50;   // React to state changes
    public const int VIEW        = 25;   // Update visuals
    public const int SIDE_EFFECT = 10;   // Audio, analytics
}
```

```csharp
// Model
onItemPurchased.AddPriorityListener(DeductCurrency, EventPriority.MODEL);
onItemPurchased.AddPriorityListener(AddToInventory, EventPriority.MODEL);

// Controller
onItemPurchased.AddPriorityListener(CheckForAchievements, EventPriority.CONTROLLER);
onItemPurchased.AddPriorityListener(TriggerTutorialHint, EventPriority.CONTROLLER);

// View
onItemPurchased.AddPriorityListener(RefreshShopUI, EventPriority.VIEW);
onItemPurchased.AddPriorityListener(PlayPurchaseAnimation, EventPriority.VIEW);

// Side effects
onItemPurchased.AddPriorityListener(PlayCashRegisterSound, EventPriority.SIDE_EFFECT);
onItemPurchased.AddPersistentListener(LogPurchaseAnalytics, EventPriority.SIDE_EFFECT);
```

数据校验最先执行。状态变更第二。游戏逻辑第三反应。UI 永远看到的是最终状态。副作用最后跑。这个顺序由管线强制执行，而不是靠祈祷脚本按正确顺序初始化。

Model 层的监听器共享优先级 100，所以它们在该层内按 FIFO 顺序执行。没问题 —— `DeductCurrency` 和 `AddToInventory` 是独立操作，都需要在 Controller 层反应之前完成。它们之间没有时序依赖。

## 如何选择正确的策略

| 问题 | 答案 | 使用 |
|------|------|------|
| 我在乎执行顺序吗？ | 不 | `AddListener` (Basic) |
| 我在乎执行顺序吗？ | 是 | `AddPriorityListener` |
| 这个监听器有时候该跳过吗？ | 是 | `AddConditionalListener` |
| 这个监听器需要跨场景存活吗？ | 是 | `AddPersistentListener` |
| 需要同时过滤和排序吗？ | 是 | `AddConditionalListener` 带 priority |
| 跨场景且需要排序？ | 是 | `AddPersistentListener` 带 priority |

通常从场景就能看出该用哪个。独立的视觉反应？Basic。数据先于视图的排序？Priority。高频过滤？Conditional。会话生命周期的服务？Persistent。

大多数项目里的大多数事件会混合使用。6 层管线让它们和谐共处，你不用操心交互影响。执行顺序是结构性的，不是偶然的。

下次在 UI 里看到过期数据，查查你的监听器优先级。修复通常只需要一行代码。

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
