---
slug: raising-and-scheduling-api
title: "时间驱动事件：为什么协程不适合做延迟和循环"
authors: [tinygiants]
tags: [ges, unity, scripting, tutorial, advanced]
description: "协程让简单延迟变得容易，但让其他一切变得痛苦。取消、生命周期回调、重复管理——Unity 中处理时间驱动事件有更好的方式。"
image: /img/home-page/game-event-system-preview.png
---

你需要在手雷落地后延迟2秒引爆。挺简单的，你写了个协程。`IEnumerator DelayedExplosion()`，yield return `new WaitForSeconds(2f)`，调用爆炸逻辑。整整齐齐大概10行。感觉还不错。

然后策划说："玩家应该可以拆弹。"好了，现在你得存一个 `Coroutine` 引用才能调 `StopCoroutine()`。但等等——如果玩家在协程启动之前就拆了呢？需要空检查。如果 GameObject 在等待中途被销毁了呢？又一个空检查。如果玩家恰好在协程完成的那一帧拆弹呢？竞争条件。你的10行现在变成了25行，而你甚至还没处理"显示拆弹消息 vs 显示爆炸"的分支逻辑。

这就是 Unity 中每个时间驱动事件的故事。第一版实现很干净。第二个需求把代码翻了一倍。第三个需求让你开始怀疑人生。

<!-- truncate -->

## 协程对简单延迟的税

老实说说，一个"简单延迟"在生产级 Unity 代码里到底长什么样。不是教程版——是要发布的版本。

```csharp
public class BombController : MonoBehaviour
{
    [SerializeField] private float fuseTime = 2f;

    private Coroutine _explosionCoroutine;
    private bool _isArmed;
    private bool _isExploded;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;
        _explosionCoroutine = StartCoroutine(DelayedExplosion());
    }

    public void Defuse()
    {
        if (!_isArmed || _isExploded) return;

        if (_explosionCoroutine != null)
        {
            StopCoroutine(_explosionCoroutine);
            _explosionCoroutine = null;
        }

        _isArmed = false;
        ShowDefuseMessage(); // 你怎么知道该调这个？
    }

    private IEnumerator DelayedExplosion()
    {
        yield return new WaitForSeconds(fuseTime);
        _isExploded = true;
        _explosionCoroutine = null;
        DoExplosion();
        // "完成后"的逻辑呢？
        // 就……放这里？祈祷没有别的东西需要知道？
    }

    private void OnDestroy()
    {
        if (_explosionCoroutine != null)
            StopCoroutine(_explosionCoroutine);
    }
}
```

大约40行就为了"等2秒然后爆炸，可以取消"。而我们还没开始搞有意思的部分。

## 再加上重复：中毒伤害问题

你的游戏有中毒效果。每次跳10点伤害，每秒一次，跳5次。又一个协程。

```csharp
private Coroutine _poisonCoroutine;
private int _poisonTicksRemaining;

public void ApplyPoison(int damage, float interval, int ticks)
{
    if (_poisonCoroutine != null)
        StopCoroutine(_poisonCoroutine);

    _poisonCoroutine = StartCoroutine(PoisonRoutine(damage, interval, ticks));
}

private IEnumerator PoisonRoutine(int damage, float interval, int ticks)
{
    _poisonTicksRemaining = ticks;

    for (int i = 0; i < ticks; i++)
    {
        yield return new WaitForSeconds(interval);
        ApplyDamage(damage);
        _poisonTicksRemaining--;
        // 怎么通知 UI 剩余次数？
        // 传个回调？存个引用？触发个事件？
    }

    _poisonCoroutine = null;
    // 中毒自然到期了。怎么区分这个
    // 和"中毒被解除"的清理逻辑？
}

public void CurePoison()
{
    if (_poisonCoroutine != null)
    {
        StopCoroutine(_poisonCoroutine);
        _poisonCoroutine = null;
        _poisonTicksRemaining = 0;
        // 播放解毒特效？UI 怎么知道要更新？
    }
}
```

注意到模式了吗？每个时间驱动的行为都需要：
- 一个 `Coroutine` 字段来追踪引用
- 一个带空检查的 `StopCoroutine()` 调用
- 手动状态追踪（`_poisonTicksRemaining`）
- 没有内置方式区分"自然完成"和"被取消"
- 没有内置方式通知其他系统进度

而这只是一种中毒效果。如果可以多个中毒叠加呢？那需要 `List<Coroutine>`。如果每种中毒有不同的跳伤频率？不同的持续时间？不同的取消条件？

## 生命周期回调的缺失

看看 JavaScript 开发者觉得理所当然的东西：

```javascript
const timer = setTimeout(() => explode(), 2000);
clearTimeout(timer); // 干净的取消
```

再看看 C# 异步开发者觉得理所当然的：

```csharp
var cts = new CancellationTokenSource();
await Task.Delay(2000, cts.Token);
cts.Cancel(); // 干净的取消，有正确的异常处理
```

这两种范式都有清晰的生命周期语义。你知道什么时候开始、什么时候完成、什么时候被取消。你可以在每个状态转换上挂回调。

Unity 协程什么都没有。协程是个黑盒。它要么在跑，要么不在跑。没有 `OnCompleted` 回调。没有 `OnCancelled` 回调。没有重复操作的 `OnStep` 回调。你得每次都自己造，用手动状态追踪和到处交叉引用的布尔标志。

结果呢？你的 MonoBehaviour 开始变成这样：

```csharp
private Coroutine _explosionCoroutine;
private Coroutine _poisonCoroutine;
private Coroutine _shieldRegenCoroutine;
private Coroutine _buffTimerCoroutine;
private Coroutine _respawnCoroutine;
private bool _isExploding;
private bool _isPoisoned;
private bool _isRegenerating;
private bool _isBuffed;
private bool _isRespawning;
private int _poisonTicksLeft;
private float _buffTimeLeft;
```

十个时间驱动行为等于十个协程字段、十个布尔标志，和大概十个长得几乎一模一样的方法：启动协程、存引用、停之前先空检查、重置标志。你的组件 60% 的代码都是计时器管理样板。

## 脆弱性问题

协程绑定在启动它的 MonoBehaviour 上。如果那个 GameObject 被销毁了——对象池回收、场景切换、手动 Destroy——上面的每个协程都会悄悄死掉。没有通知，没有清理回调，没有警告。

这意味着：
- 池化手雷对象上的爆炸协程？对象回池时悄悄被取消了。
- 玩家对象上的 buff 计时器？加载新场景时没了。
- 重复的雷达扫描？雷达站 prefab 被回收的瞬间就死了。

你可以给对象用 `DontDestroyOnLoad`，但那有自己的问题。你可以在一个持久的单例上启动协程，但那就失去了自然的生命周期绑定。每种方案都有需要更多代码来管理的取舍。

## 如果调度就是……一个 API 呢？

这就是 GES 采取根本不同方法的地方。不是把计时器逻辑包在你手动管理的协程里，GES 把调度当作事件本身的一等 API。

### 立即执行：Raise()

最简单的情况——现在就触发事件，没有延迟。

```csharp
[GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;

// 立即触发
onBombExplode.Raise();
```

所有监听器在同一帧同步执行。不涉及协程。

带类型的事件：

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onDamageDealt;

onDamageDealt.Raise(42);
```

Sender 事件：

```csharp
[GameEventDropdown, SerializeField] private Int32SenderGameEvent onDamageFromSource;

onDamageFromSource.Raise(this, 42);
```

### 延迟执行：RaiseDelayed()

安排一个事件在延迟后触发。一行代码，返回一个 handle。

```csharp
ScheduleHandle handle = onBombExplode.RaiseDelayed(2f);
```

就这样。两秒后 `onBombExplode` 触发。这个 handle 就是你管理这次调度执行的凭证——取消、生命周期回调、状态检查全靠它。

带类型的事件，参数在调用时就捕获了：

```csharp
ScheduleHandle handle = onDamageDealt.RaiseDelayed(50, 1.5f);
```

值 `50` 在你调 `RaiseDelayed()` 时就锁定了。如果你传进去的变量在延迟到期前变了，用的还是原始值。没有意外。

![Delayed Event Behavior](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

### 重复执行：RaiseRepeating()

按固定间隔触发事件，可以是固定次数也可以无限循环。

```csharp
// 中毒：每秒 10 点伤害，共 5 次
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);
```

`count` 是总执行次数，不是重复次数。`count: 5` 表示事件触发 5 次。

![Repeating Event Finite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

无限重复——心跳、雷达扫描、环境特效：

```csharp
// 雷达扫描：每 2 秒一次，永不停止
ScheduleHandle handle = onRadarPing.RaiseRepeating(interval: 2f, count: -1);
```

传 `count: -1` 就会一直跑到你取消为止。

![Repeating Event Infinite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

## ScheduleHandle：协程本该成为的样子

`RaiseDelayed()` 和 `RaiseRepeating()` 返回的 `ScheduleHandle` 才是真正的核心。它有三个生命周期回调，精确解决了协程让你手动处理的那些问题。

### OnStep：每次执行后

```csharp
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);

handle.OnStep((remainingCount) =>
{
    Debug.Log($"中毒跳伤！还剩 {remainingCount} 次");
    UpdatePoisonStackUI(remainingCount);
});
```

`OnStep` 在每次单独执行后触发。`remainingCount` 告诉你还剩多少次。无限循环时始终为 `-1`。延迟事件（单次执行）触发一次，`remainingCount` 为 `0`。

不需要手动计数器追踪。不需要 `_poisonTicksRemaining` 字段。Handle 自己知道。

### OnCompleted：自然完成

```csharp
handle.OnCompleted(() =>
{
    Debug.Log("所有中毒跳伤结束了");
    RemovePoisonVisualEffect();
    ShowPoisonExpiredMessage();
});
```

在所有计划的执行完成时触发。只对有限次数的调度触发——无限循环永远不会自然完成。对于 `RaiseDelayed()`，在单次延迟执行后触发。

这是延迟后链接行为的干净方式。不需要嵌套协程，不需要回调意大利面。

### OnCancelled：手动取消

```csharp
handle.OnCancelled(() =>
{
    Debug.Log("中毒被提前解除了！");
    PlayCureParticleEffect();
    ShowPoisonCuredMessage();
});
```

在你手动取消调度时触发。自然完成时不触发。两个回调互斥。

这个区分正是协程做不到的。如果中毒自然到期，显示"已消散"消息。如果被解毒，播放解毒动画。用协程的话你需要一个布尔标志来追踪是哪种情况。用 Handle 的话，API 直接告诉你。

### 链式调用：流畅模式

三个回调都返回 Handle，所以你可以链式调用：

```csharp
ScheduleHandle handle = onCountdown.RaiseRepeating(interval: 1f, count: 10)
    .OnStep((remaining) => UpdateCountdownUI(remaining))
    .OnCompleted(() => TriggerLaunch())
    .OnCancelled(() => AbortLaunch());
```

跟协程比一下——循环、计数器、一个追踪"是取消还是完成"的布尔标志，以及各自的清理路径对应的独立方法。这是完全不同层次的表达力。

## 取消：三种方式，都很干净

### 直接 Handle 取消

```csharp
handle.Cancel();
```

对任何活跃的 Handle 都有效。

### 通过事件取消：CancelDelayed()

```csharp
onBombExplode.CancelDelayed(handle);
```

功能上等同于 `handle.Cancel()`，但在管理多个 Handle 时读起来更清楚——你在强调操作的是哪个事件。

### 通过事件取消：CancelRepeating()

```csharp
onRadarPing.CancelRepeating(handle);
```

重复调度用同样的模式。

### 安全取消

如果有可能 Handle 已经完成了，取消前先检查 `IsActive`：

```csharp
private void StopAllSchedules()
{
    if (_explosionHandle.IsActive)
        _explosionHandle.Cancel();

    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();

    if (_radarHandle.IsActive)
        _radarHandle.Cancel();
}
```

取消一个不活跃的 Handle 是空操作（不会抛异常），但检查 `IsActive` 让意图更清晰。

## Inspector 集成：可视化调度

策划特别喜欢这个功能：调度 API 和 Inspector 的 Behavior Window 是协同工作的。你可以不写代码就在可视化界面配置延迟和重复设置。

![Behavior Schedule](/img/game-event-system/visual-workflow/game-event-behavior/behavior-schedule.png)

Behavior 组件暴露：
- **Delay**：首次触发前的秒数
- **Repeat Count**：重复次数（0 = 只执行一次，-1 = 无限）
- **Repeat Interval**：两次重复之间的秒数

这些底层直接映射到 `RaiseDelayed()` 和 `RaiseRepeating()`。策划配了一个2秒延迟、3次重复、每次间隔1秒——这等价于代码里的 `RaiseDelayed(2f)` 后接 `RaiseRepeating(interval: 1f, count: 3)`。

策划不写代码就能调时序。程序员在脚本中覆盖或扩展同样的时序。两条路径产出相同的 ScheduleHandle 管理方式。谁都不用争谁拥有时序逻辑。

![Delayed Event Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

## 完整对比：炸弹拆除

把所有东西串起来。开头的炸弹场景——但这次用 GES 调度。

### 协程版本（你今天会写的）

```csharp
public class BombCoroutine : MonoBehaviour
{
    [SerializeField] private float fuseTime = 30f;
    [SerializeField] private float tickInterval = 1f;

    private Coroutine _explosionCoroutine;
    private Coroutine _countdownCoroutine;
    private bool _isArmed;
    private bool _hasExploded;
    private int _ticksRemaining;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;
        _hasExploded = false;
        _ticksRemaining = Mathf.FloorToInt(fuseTime / tickInterval);

        _explosionCoroutine = StartCoroutine(ExplosionRoutine());
        _countdownCoroutine = StartCoroutine(CountdownRoutine());
    }

    private IEnumerator ExplosionRoutine()
    {
        yield return new WaitForSeconds(fuseTime);
        _hasExploded = true;
        _explosionCoroutine = null;
        // 通知爆炸……但怎么通知？直接引用？UnityEvent？
        Debug.Log("BOOM!");
    }

    private IEnumerator CountdownRoutine()
    {
        while (_ticksRemaining > 0)
        {
            yield return new WaitForSeconds(tickInterval);
            _ticksRemaining--;
            // 通知 UI……但怎么通知？
            Debug.Log($"滴答... {_ticksRemaining}");
        }
        _countdownCoroutine = null;
    }

    public void AttemptDefusal()
    {
        if (!_isArmed || _hasExploded) return;

        _isArmed = false;

        if (_explosionCoroutine != null)
        {
            StopCoroutine(_explosionCoroutine);
            _explosionCoroutine = null;
        }
        if (_countdownCoroutine != null)
        {
            StopCoroutine(_countdownCoroutine);
            _countdownCoroutine = null;
        }

        // 是拆了还是炸了？检查 _hasExploded。
        // 通知其他系统？手动调用。
        Debug.Log("拆除成功！");
    }

    private void OnDestroy()
    {
        if (_explosionCoroutine != null)
            StopCoroutine(_explosionCoroutine);
        if (_countdownCoroutine != null)
            StopCoroutine(_countdownCoroutine);
    }
}
```

大约50行。两个协程字段、两个布尔标志、手动通知（那些 `// 但怎么通知？` 的注释）、没有生命周期回调，UI 要么得轮询 `_ticksRemaining` 要么直接引用这个组件。

### GES 版本

```csharp
public class BombController : MonoBehaviour
{
    [Header("Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;
    [GameEventDropdown, SerializeField] private Int32GameEvent onCountdownTick;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombArmed;

    [Header("Settings")]
    [SerializeField] private float fuseTime = 30f;
    [SerializeField] private float tickInterval = 1f;

    private ScheduleHandle _explosionHandle;
    private ScheduleHandle _countdownHandle;
    private bool _isArmed;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;

        onBombArmed.Raise();

        int totalTicks = Mathf.FloorToInt(fuseTime / tickInterval);

        _explosionHandle = onBombExplode.RaiseDelayed(fuseTime)
            .OnCompleted(() => Debug.Log("BOOM! 炸弹爆炸了。"));

        _countdownHandle = onCountdownTick.RaiseRepeating(
            totalTicks, interval: tickInterval, count: totalTicks)
            .OnStep((remaining) => Debug.Log($"滴答... 还剩 {remaining} 秒"));
    }

    public void AttemptDefusal(float progress)
    {
        if (!_isArmed) return;
        if (progress < 1f) return;

        _isArmed = false;

        if (_explosionHandle.IsActive) _explosionHandle.Cancel();
        if (_countdownHandle.IsActive) _countdownHandle.Cancel();

        _explosionHandle.OnCancelled(() => Debug.Log("爆炸已取消！"));

        onBombDefused.Raise();
    }

    private void OnDisable()
    {
        if (_explosionHandle.IsActive) _explosionHandle.Cancel();
        if (_countdownHandle.IsActive) _countdownHandle.Cancel();
    }
}
```

UI 那边完全解耦——完全不引用 `BombController`：

```csharp
public class BombUI : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onCountdownTick;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;
    [SerializeField] private TextMeshProUGUI countdownText;
    [SerializeField] private GameObject bombPanel;

    private void OnEnable()
    {
        onCountdownTick.AddListener(UpdateCountdown);
        onBombDefused.AddListener(ShowDefusedMessage);
        onBombExplode.AddListener(ShowExplosionScreen);
    }

    private void OnDisable()
    {
        onCountdownTick.RemoveListener(UpdateCountdown);
        onBombDefused.RemoveListener(ShowDefusedMessage);
        onBombExplode.RemoveListener(ShowExplosionScreen);
    }

    private void UpdateCountdown(int secondsRemaining)
    {
        bombPanel.SetActive(true);
        countdownText.text = $"{secondsRemaining}";
        if (secondsRemaining <= 5)
            countdownText.color = Color.red;
    }

    private void ShowDefusedMessage()
    {
        countdownText.text = "已拆除";
        countdownText.color = Color.green;
    }

    private void ShowExplosionScreen()
    {
        bombPanel.SetActive(false);
    }
}
```

`BombController` 不知道 UI 的存在。`BombUI` 不知道炸弹的内部状态。它们通过带调度的事件通信。炸弹调度自己的爆炸和倒计时，UI 监听并响应。拆弹时取消调度，生命周期回调处理分支。没有协程，没有 `Update()` 循环，没有交叉引用。

## 实战模式

### 中毒持续伤害

```csharp
public class PoisonEffect : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onPoisonDamage;

    private ScheduleHandle _poisonHandle;

    public void ApplyPoison(int damagePerTick, float interval, int ticks)
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);

        _poisonHandle = onPoisonDamage.RaiseRepeating(
            damagePerTick, interval: interval, count: ticks)
            .OnStep((remaining) => UpdatePoisonUI(remaining))
            .OnCompleted(() => ShowPoisonExpired())
            .OnCancelled(() => ShowPoisonCured());
    }

    public void CurePoison()
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);
    }

    private void OnDisable()
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);
    }
}
```

### 雷达 / 心跳系统

```csharp
public class RadarSystem : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private SingleGameEvent onRadarPing;

    private ScheduleHandle _scanHandle;

    private void OnEnable()
    {
        _scanHandle = onRadarPing.RaiseRepeating(interval: 2f, count: -1)
            .OnStep((_) => Debug.Log("雷达扫描已发送"));
    }

    private void OnDisable()
    {
        if (_scanHandle.IsActive)
            onRadarPing.CancelRepeating(_scanHandle);
    }
}
```

这就是完整的雷达系统。七行实际逻辑。没有协程，没有 Update 循环，没有手动计时器追踪。启用时开始，禁用时停止。

## 什么时候用什么

**用 `Raise()`** 做即时通知：玩家死亡、按钮点击、物品收集。不涉及时序。

**用 `RaiseDelayed()`** 做一次性延迟事件：引信到期后爆炸、过场后对话、死亡计时器后重生。任何等一会儿再发生一次的东西。

**用有限次数的 `RaiseRepeating()`** 做持续伤害、引导技能、倒计时、多步序列。任何固定次数脉冲的东西。

**用 count: -1 的 `RaiseRepeating()`** 做心跳系统、轮询循环、环境特效、雷达扫描。任何跑到你显式停止为止的东西。

**始终保存 Handle**——如果有任何可能需要取消的话。实际上你几乎总是需要它。

**始终在 `OnDisable()` 中清理**。如果你的 MonoBehaviour 在调度活跃时被销毁了，取消它。不取消的话 GES 不会崩溃，但孤立的调度是代码坏味道。

## 速查表

| 方法 | 返回值 | 描述 |
|--------|---------|-------------|
| `Raise()` | void | 立即执行 |
| `Raise(arg)` | void | 带参数立即执行 |
| `Raise(sender, args)` | void | 带 sender + args 立即执行 |
| `RaiseDelayed(delay)` | ScheduleHandle | 延迟触发 void 事件 |
| `RaiseDelayed(arg, delay)` | ScheduleHandle | 延迟触发带类型事件 |
| `RaiseDelayed(sender, args, delay)` | ScheduleHandle | 延迟触发 sender 事件 |
| `RaiseRepeating(interval, count)` | ScheduleHandle | 重复触发 void 事件 |
| `RaiseRepeating(arg, interval, count)` | ScheduleHandle | 重复触发带类型事件 |
| `handle.OnStep(callback)` | ScheduleHandle | 每次执行后回调 |
| `handle.OnCompleted(callback)` | ScheduleHandle | 自然完成后回调 |
| `handle.OnCancelled(callback)` | ScheduleHandle | 手动取消后回调 |
| `handle.Cancel()` | void | 取消调度 |
| `handle.IsActive` | bool | 检查是否仍在运行 |

调度 API 把原本是协程管理样板的东西压缩成了声明式的、Handle 管理的事件时序。模式始终如一：触发、拿到 Handle、挂回调、用完取消。一旦内化了这个模式，你会真心好奇为什么自己以前要写 `IEnumerator` 来做一个简单的延迟。

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
