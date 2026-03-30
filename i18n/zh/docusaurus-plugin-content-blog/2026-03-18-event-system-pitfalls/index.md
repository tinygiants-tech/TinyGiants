---
slug: api-best-practices
title: "上线才发现的事件系统坑：内存泄漏、数据污染、递归陷阱"
authors: [tinygiants]
tags: [ges, unity, scripting, best-practices, architecture]
description: "那些测 5 分钟发现不了、QA 玩 30 分钟才暴露的 Bug。孤儿委托导致的内存泄漏、跨会话的数据污染、不崩溃的死循环 —— 以及如何全部预防。"
image: /img/home-page/game-event-system-preview.png
---

你一直在每次测试 5 分钟。跑得好好的。然后 QA 提了个 Bug："30 分钟游玩过程中内存持续增长。加载 6 个场景后帧率从 60 降到 40。"你去 Profile。一个应该只有 12 个监听器的事件上注册了 847 个。每次场景加载都添加了新的订阅但从未移除旧的。对象被销毁了，但它们的委托引用还活着，把已经死掉的 MonoBehaviour 钉在内存里，垃圾回收器碰都碰不到。

或者这个："第二次进入 Play Mode 后血量数值不对。第一次运行没问题。"你按 Play，测战斗，停止。再按 Play，玩家以 73 HP 开始而不是 100。上一个会话的 ScriptableObject 状态泄漏了，因为没人重置它。

再或者经典的：游戏卡了 3 秒，然后 Unity 崩溃。事件 A 的监听器触发了事件 B，事件 B 的监听器触发了事件 A。栈溢出。但有时候它不崩溃 —— 只是卡住，在一个不产生任何可见错误的死循环里吃 CPU。

这些不是假设。这些是我见过的上线游戏里的真实 Bug。根本原因都一样：事件系统的模式单独看没问题，但到了规模化的时候就崩了。

<!-- truncate -->

## 事件系统的七宗罪

在聊解决方案之前，先把失败模式列出来。每个事件系统 —— 不只是 GES，不只是 Unity 的，任何语言里的任何发布/订阅实现 —— 都有这些潜在陷阱。能不能上线的区别在于，团队是在第一轮 QA 之前还是之后才知道这些。

### 第一宗罪：孤儿订阅

这是存在时间最久的事件系统 Bug。在 `Awake()` 里订阅，忘了取消订阅。对象被销毁了，但委托还持有引用。垃圾回收器没法回收这个 MonoBehaviour，因为事件的调用列表还指着它。

```csharp
public class BadExample : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onDamage;

    private void Awake()
    {
        onDamage.AddListener(HandleDamage);
        // No corresponding RemoveListener anywhere
    }

    private void HandleDamage(int amount)
    {
        // This method will be called even after the object is "destroyed"
        // Unity marks it as destroyed, but the C# object is still alive
        // because the delegate reference prevents GC
        transform.position += Vector3.up; // MissingReferenceException
    }
}
```

阴险的地方在于：第一个场景完全没问题。第二个场景运气好也没问题。内存泄漏是看不见的，直到有人玩了 20 分钟，加载了足够多的场景，累积了几百个孤儿委托。

在 Profiler 里，你会看到托管内存随每次场景加载稳步增长。泄漏的不只是 MonoBehaviour —— 还包括这些 MonoBehaviour 引用的一切：纹理、网格、材质。一个泄漏的监听器就能钉住数兆字节的资产。

### 第二宗罪：跨会话的数据污染

Unity 的 Play Mode 有一个微妙的陷阱。ScriptableObject 实例在 Play Mode 会话之间持久存在于内存中。如果你的事件（作为 ScriptableObject）存储了运行时状态 —— 监听器列表、缓存值、调度句柄 —— 那些状态在你停止游玩后还在。

按 Play，订阅 5 个监听器，停止。再按 Play。那 5 个监听器还"注册"在 ScriptableObject 的内存里……但拥有它们的 MonoBehaviour 已经没了。现在列表里有 5 个死委托，加上新会话的 5 个新委托。停了又 Play 10 次？50 个死委托。

表现为：
- 事件触发次数比预期多（上次会话的幽灵监听器）
- 第一次触发事件就 `MissingReferenceException`（死委托尝试调用）
- 长时间开发过程中编辑器性能逐渐下降

对于静态字段，问题更严重。静态字段只在特定配置下才能存活 Domain Reload（开启了 "Enter Play Mode Settings" 优化时）。当它们存活时，任何静态缓存、注册表或状态都会在会话间被污染。

### 第三宗罪：递归触发

事件 A 的监听器触发事件 B。事件 B 的监听器触发事件 A。或者更简单的版本：事件 A 的监听器触发事件 A。栈溢出。

```csharp
// Infinite recursion
private void HandleHealthChanged(int newHealth)
{
    // "I need to notify everyone that health changed"
    onHealthChanged.Raise(newHealth);
    // This calls HandleHealthChanged, which calls Raise, which calls...
}
```

直接版本很明显。间接版本更难发现：

```
OnDamageDealt -> HandleDamage -> raises OnHealthChanged
OnHealthChanged -> HandleHealthCheck -> raises OnDamageDealt (reflected damage)
OnDamageDealt -> HandleDamage -> raises OnHealthChanged
... forever
```

两个事件，两个监听器，一个无限循环。而且它不一定崩溃。如果循环因为某个状态条件（比如血量归零）最终退出了，它可能只是造成一次持续数秒的卡顿，难以复现，因为它取决于特定的游戏状态。

### 第四宗罪：丢失的 Schedule Handle

你调用 `RaiseRepeating()` 传了 `count: -1`（无限），然后没存 Handle。事件永远触发下去。你没法停止它。跑着它的协程没有外部引用。它就……一直跑。

```csharp
private void StartAmbientEffect()
{
    // "I'll cancel this later"
    // narrator: they did not cancel this later
    onAmbientPulse.RaiseRepeating(interval: 0.5f, count: -1);
}
```

Handle 被方法返回然后立刻丢弃了。如果这个方法每次场景加载都运行一次，你就每个场景多一个无限重复事件。10 个场景后，你有 10 个重叠的环境脉冲，每个每秒触发 2 次。本来应该是每秒 2 次的变成了 20 次。

### 第五宗罪：Lambda 陷阱（再说一次）

之前在监听器策略的文章里讲过了，但它在这个列表里是因为它是事件系统被报告最多的"Bug"。匿名委托无法取消订阅。

```csharp
private void OnEnable()
{
    onDamage.AddListener((int amount) => health -= amount);
}

private void OnDisable()
{
    // This creates a NEW lambda. It doesn't match the one above.
    onDamage.RemoveListener((int amount) => health -= amount);
    // The original is still subscribed. Memory leak.
}
```

语言让危险的模式看起来自然。安全的模式看起来啰嗦。这是一个失败之坑。

### 第六宗罪：核弹级的 RemoveAllListeners

系统 A 管理一个子系统的事件。清理时调用 `RemoveAllListeners()` 来清除自己的注册。但 `RemoveAllListeners()` 移除的是所有监听器 —— 包括系统 B、C、D 注册的。

```csharp
// CombatSystem.cs
private void OnDisable()
{
    // "Clean up my listeners"
    onPlayerDamaged.RemoveAllListeners();  // OOPS: killed AudioManager's listener too
}
```

AudioManager 不播受击音了，AnalyticsTracker 不记录伤害事件了，AchievementSystem 不追踪里程碑了。就因为一个系统在需要手术刀的地方用了大锤。

这在快速原型变成生产代码时特别常见。`RemoveAllListeners()` 写起来比追踪个别引用快。你的系统是唯一监听器时没问题。其他系统开始订阅同一个事件时就悄无声息地崩了。

### 第七宗罪：昂贵的谓词

Conditional Listener 的谓词在事件每次触发时都会被评估。如果事件每秒触发 60 次，而谓词做了一次 Physics.OverlapSphere，那就是每个 Conditional Listener 每秒 60 次球体检测。

```csharp
// 60 sphere casts per second, just for the condition check
onPositionUpdate.AddConditionalListener(
    HandleNearbyEnemies,
    () => Physics.OverlapSphere(transform.position, 10f, enemyLayer).Length > 0,
    priority: 50
);
```

Profiler 显示时间花在了"条件评估"上，你纳闷为什么事件系统这么慢。事件系统没问题。是你的谓词在一个本应是廉价布尔检查的委托里干了整个物理系统的活。

## GES 的预防模式

现在聊解决方案。有些内置在 GES 里，有些是你通过约定来执行的。

### 黄金法则：OnEnable / OnDisable

如果整个博客系列你只记住一件事，就记这个：

```csharp
private void OnEnable()
{
    myEvent.AddListener(HandleEvent);
}

private void OnDisable()
{
    myEvent.RemoveListener(HandleEvent);
}
```

不是 `Awake` / `OnDestroy`。不是 `Start` / `OnApplicationQuit`。是 `OnEnable` / `OnDisable`。

为什么偏偏是这对：

**OnEnable/OnDisable 追踪的是活跃状态。** 禁用一个 GameObject？`OnDisable` 触发，监听器移除。重新激活？`OnEnable` 触发，监听器重新添加。禁用的对象不接收事件 —— 这几乎永远是正确的。

**Awake/OnDestroy 只触发一次。** 禁用再重新激活一个在 Awake 中订阅的对象？它在禁用期间还在订阅状态，接收着不该处理的事件。

**Start 有时序问题。** 另一个对象在它的 Awake 中触发事件。你在 Start 中订阅的监听器错过了。OnEnable 在生命周期中更早执行。

唯一的例外：`DontDestroyOnLoad` 对象上的 Persistent Listener。在 `OnEnable` 中用 `AddPersistentListener` 订阅，在 `OnDestroy` 中用 `RemovePersistentListener` 移除（不是 OnDisable，因为对于活跃对象，OnDisable 在场景切换时就会触发）。

```csharp
// Standard: scene-scoped listeners
private void OnEnable()
{
    myEvent.AddListener(HandleEvent);
    myEvent.AddPriorityListener(HandlePriority, 50);
}

private void OnDisable()
{
    myEvent.RemoveListener(HandleEvent);
    myEvent.RemovePriorityListener(HandlePriority);
}

// Exception: DontDestroyOnLoad persistent listeners
private void OnEnable()
{
    myEvent.AddPersistentListener(HandleEvent, 0);
}

private void OnDestroy()
{
    myEvent.RemovePersistentListener(HandleEvent);
}
```

### Auto Static Reset：GES 内置的数据污染预防

GES 通过 Auto Static Reset 机制处理 ScriptableObject 持久化问题。退出 Play Mode 时，GES 自动清除：

- 所有静态事件缓存
- 所有监听器注册
- 所有已调度的事件句柄
- 所有运行时创建的 Trigger 和 Chain 连接

每次按 Play 你的事件都是干净的。不需要手动重置方法，不需要 `[RuntimeInitializeOnLoadMethod]` 之类的 hack。事件资产本身（名称、类型、Inspector 配置）持久化，因为那是设计期数据。运行时状态（监听器、调度、流程连接）被清除，因为那是运行期数据。

这个区分是刻意的。设计期数据应该在会话间持久化 —— 你不想每次测试都重新配置事件。运行时数据不应该持久化 —— 你不想上次会话的幽灵监听器。

如果你在事件子类上存了自定义状态（你自己的属性或字段），需要自己处理重置。Auto Reset 覆盖的是 GES 的内部状态，不是你的扩展。你自己的静态字段用 `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`。

### 递归防护模式

GES 不会自动打断递归循环，因为有时候重入触发是有意的（很少，但存在）。用一个防护标志代替：

```csharp
private bool _isProcessingHealth;

private void HandleHealthChange(int newHealth)
{
    if (_isProcessingHealth) return;
    _isProcessingHealth = true;

    try
    {
        // Process health logic...

        // Safe: won't recurse because of the guard
        onHealthChanged.Raise(newHealth);
    }
    finally
    {
        _isProcessingHealth = false;
    }
}
```

`try/finally` 至关重要。没有它的话，处理逻辑里抛个异常就会让 `_isProcessingHealth` 永远卡在 true。这个 Handler 在剩余的整个会话里都不会再触发了。

对于间接循环（A 触发 B 触发 A），要么两个 Handler 都加防护，要么重构让循环使用一个不会反馈的独立事件：

```
// Before (cycles):
OnDamage -> HandleDamage -> raises OnHealthChanged
OnHealthChanged -> HandleHealth -> raises OnDamage (reflected)

// After (no cycle):
OnDamage -> HandleDamage -> raises OnHealthChanged
OnHealthChanged -> HandleHealth -> raises OnReflectedDamage (separate event)
OnReflectedDamage -> HandleReflected -> does NOT raise OnHealthChanged
```

Runtime Monitor 的 Warnings 标签页会标记在已经处理中的事件上再次触发的情况。如果你在测试时看到递归警告，说明有个循环需要加防护。

![Monitor Warnings](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

### Handle 管理：永远存储，永远取消

每个 `RaiseDelayed()` 和 `RaiseRepeating()` 都返回 ScheduleHandle。永远存起来。永远在 OnDisable 中取消。

```csharp
// ANTI-PATTERN: handle lost forever
private void StartPoison()
{
    onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1);
    // Can never cancel this. Runs until application quits.
}

// CORRECT: stored and managed
private ScheduleHandle _poisonHandle;

private void StartPoison()
{
    _poisonHandle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1);
}

private void CurePoison()
{
    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();
}

private void OnDisable()
{
    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();
}
```

多个并发调度的情况：

```csharp
private List<ScheduleHandle> _activeSchedules = new List<ScheduleHandle>();

private void ScheduleSomething()
{
    var handle = onEvent.RaiseDelayed(2f);
    _activeSchedules.Add(handle);
}

private void CancelAll()
{
    foreach (var handle in _activeSchedules)
    {
        if (handle.IsActive) handle.Cancel();
    }
    _activeSchedules.Clear();
}

private void OnDisable() => CancelAll();
```

### SetInspectorListenersActive：批量静音

GES 事件可以在 Behavior Window 中可视化配置监听器。批量操作时 —— 加载 100 个物品、处理批量数据、重置状态 —— 触发粒子、音效、UI 动画的可视化监听器会让人崩溃。

```csharp
myEvent.SetInspectorListenersActive(false);
try
{
    for (int i = 0; i < 100; i++)
    {
        myEvent.Raise(processedItems[i]);
    }
}
finally
{
    myEvent.SetInspectorListenersActive(true);
}

// Final raise with visual feedback
myEvent.Raise(summary);
```

代码监听器照常触发。只有 Inspector 配置的可视化响应被静音。`try/finally` 确保即使批处理抛异常也能重新启用。

### 精准移除：永远不要用 RemoveAllListeners 做清理

每个组件只该移除自己的监听器：

```csharp
// BAD: destroys everyone's subscriptions
private void OnDisable()
{
    myEvent.RemoveAllListeners();
}

// GOOD: removes only what you own
private void OnDisable()
{
    myEvent.RemoveListener(MyHandler);
    myEvent.RemovePriorityListener(MyOtherHandler);
}
```

`RemoveAllListeners()` 只适合全局状态重置 —— 加载全新的游戏会话、测试后重置。它移除 Basic、Priority 和 Conditional 监听器，但故意保留 Persistent Listener（因为那些显式选择了不参与清理）。

### 缓存你的委托

方法引用是监听器最安全的模式：

```csharp
// BROKEN: anonymous lambda, can never be removed
onDamage.AddListener((int amount) => health -= amount);

// CORRECT: method reference, stable identity
onDamage.AddListener(HandleDamage);
private void HandleDamage(int amount) => health -= amount;

// ALSO CORRECT: cached delegate for when you need closures
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

所有监听器类型都适用。任何你打算移除的监听器都需要一个稳定的委托引用。

### 保持谓词廉价

Conditional Listener 的谓词应该是字段读取，不是计算：

```csharp
// BAD: physics query every time the event fires
onPositionUpdate.AddConditionalListener(
    HandleNearby,
    () => Physics.OverlapSphere(transform.position, 10f).Length > 0,
    priority: 50
);

// GOOD: update the cache periodically, read it cheaply
private bool _hasNearbyEnemies;

private void FixedUpdate()
{
    _hasNearbyEnemies = Physics.OverlapSphere(
        transform.position, 10f, enemyLayer).Length > 0;
}

onPositionUpdate.AddConditionalListener(
    HandleNearby,
    () => _hasNearbyEnemies,
    priority: 50
);
```

每个 FixedUpdate 一次物理查询 vs 每次事件触发一次。对于每帧触发多次的事件，这是流畅游戏和卡成幻灯片的区别。

## 架构模式：Service Event Interface

大型项目里，把每个子系统的事件连线集中到一个专门的接口类中：

```csharp
public class CombatEventInterface : MonoBehaviour
{
    [Header("Outgoing Events")]
    [GameEventDropdown, SerializeField] private Int32GameEvent onDamageDealt;
    [GameEventDropdown, SerializeField] private SingleGameEvent onCombatStarted;
    [GameEventDropdown, SerializeField] private SingleGameEvent onCombatEnded;

    [Header("Incoming Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDied;
    [GameEventDropdown, SerializeField] private Int32GameEvent onHealReceived;

    private CombatSystem _combat;

    private void OnEnable()
    {
        _combat = GetComponent<CombatSystem>();
        onPlayerDied.AddPriorityListener(_combat.HandlePlayerDeath, 100);
        onHealReceived.AddPriorityListener(_combat.HandleHeal, 100);
    }

    private void OnDisable()
    {
        onPlayerDied.RemovePriorityListener(_combat.HandlePlayerDeath);
        onHealReceived.RemovePriorityListener(_combat.HandleHeal);
    }

    public void NotifyDamageDealt(int amount) => onDamageDealt.Raise(amount);
    public void NotifyCombatStarted() => onCombatStarted.Raise();
    public void NotifyCombatEnded() => onCombatEnded.Raise();
}
```

CombatSystem 本身完全不知道 GES 的存在。它调用 CombatEventInterface 上的方法。这让战斗系统可以脱离事件进行测试，事件连线集中在一个文件里方便审查。出问题时，你只需要检查一个类就能看到战斗系统涉及的所有事件。

## 上线前检查清单

在认为你的事件架构达到生产就绪之前过一遍：

1. 每个 `AddListener` 都有对应的 `RemoveListener` 在相反的生命周期方法中
2. 每个 `AddPersistentListener` 都有 `RemovePersistentListener` 在 `OnDestroy` 中
3. 每个 `RaiseDelayed` / `RaiseRepeating` 的 Handle 都已存储并在 `OnDisable` 中取消
4. 需要移除的监听器没有使用 Lambda（只用委托缓存或方法引用）
5. 没有缺少防护标志的递归事件模式
6. `RemoveAllListeners()` 只用于全局重置，绝不用于单组件清理
7. Conditional 谓词是廉价的（字段读取，不是计算）
8. 高频事件的监听器数量最小化
9. 批量操作时 Inspector 监听器被静音
10. Runtime Monitor 在完整通关过程中没有显示任何警告

这十项检查能在 Bug 到达玩家之前捕获 95%。剩下的 5% 是你游戏代码里的逻辑 Bug，不是事件系统的问题 —— Runtime Monitor 也能帮你找到那些。

所有这些的共同规律是一样的：事件系统之所以强大，正是因为它解耦了东西。但解耦意味着编译器无法捕获那些耦合本可以暴露的错误。你必须自己执行纪律 —— 或者使用一个替你执行的系统。

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
