---
slug: programmatic-flow-api
title: "运行时构建事件流：当可视化编辑器不够用的时候"
authors: [tinygiants]
tags: [ges, unity, scripting, flow-graph, advanced]
description: "程序化地牢、动态 AI、Mod 支持 —— 有些事件流在编辑期根本不存在。如何用代码构建、混合和拆除完整的事件图。"
image: /img/home-page/game-event-system-preview.png
---

你的程序化地牢生成器刚刚造了一个有三块压力板和一个尖刺陷阱的房间。下一个房间是一个连接着锁门的拉杆谜题。再下一个是 Boss 竞技场，环境危害根据 Boss 的血量阶段激活。这些事件关系在编辑期一个都不存在。地牢布局取决于玩家 30 秒前输入的种子。

你怎么连接这些事件？

传统做法是写一个巨大的 switch 语句。每种房间类型手动订阅和取消订阅事件处理器。每种 AI 难度手动串联不同的攻击模式。每个 Mod 创建的内容手动解析配置文件并翻译成事件连接。"手动"就是问题所在 —— 每当拓扑在运行时改变，你就在重新实现事件连线逻辑。

可视化节点编辑器在处理设计期已知的流程时非常棒。但它们从根本上无法处理运行前根本不存在的流程。而越来越多最有趣的游戏系统恰恰就是事件图动态生成的那种。

<!-- truncate -->

## 程序化内容的难题

具体来说。你在做一个 Roguelike。每次运行从房间模板池里生成 15-25 个房间。每个模板定义了房间里有哪些交互物件 —— 压力板、拉杆、门、陷阱、宝箱、敌人刷新点。但这些物件之间的*连接*取决于生成器产生的具体布局。

房间模板 A 有一块压力板和一个尖刺陷阱。一次运行中，压力板延迟 1 秒触发尖刺。另一次运行（不同难度），同样的模板立刻触发尖刺但提前 0.5 秒播放警告音。模板一样，事件连线不一样。

团队一般怎么处理？

### If-Else 大法

```csharp
public void WireRoom(Room room, DifficultySettings difficulty)
{
    if (room.HasPressurePlate && room.HasSpikeTrap)
    {
        if (difficulty.level == Difficulty.Easy)
        {
            room.pressurePlate.onActivated += () =>
            {
                PlayWarningSound();
                StartCoroutine(DelayedSpikes(room.spikeTrap, 1.5f));
            };
        }
        else if (difficulty.level == Difficulty.Hard)
        {
            room.pressurePlate.onActivated += () =>
            {
                room.spikeTrap.Activate();
            };
        }
    }

    if (room.HasLever && room.HasDoor)
    {
        room.lever.onPulled += () => room.door.Open();

        if (difficulty.level == Difficulty.Hard)
        {
            room.lever.onPulled += () =>
            {
                StartCoroutine(ResetLever(room.lever, 5f));
            };
        }
    }

    // ... 200 more lines for other combinations
}
```

小游戏够用。但一个有 30 种房间模板和 4 个难度等级的 Roguelike，你得面对数百行条件连线代码。每加一个新房间模板就得改这个方法。每加一种新交互物件还得改。而且那些 Lambda 订阅？房间销毁时你永远也没法干净地取消订阅。内存泄漏是写死在代码里的。

### 数据驱动方案（好一点，但还是痛）

有些团队转向数据驱动模型 —— 用 JSON 或 ScriptableObject 配置来定义连接：

```json
{
    "room_type": "trap_room",
    "connections": [
        {
            "source": "pressure_plate",
            "target": "spike_trap",
            "delay": 1.0,
            "condition": "player_in_range"
        }
    ]
}
```

架构上更干净了，但现在你需要自定义解析器、自定义连接管理器、自定义条件评估、自定义生命周期管理。你在事件系统之上又建了一个迷你事件系统。而且它跟你用来做静态部分的可视化编辑器毫无集成。

### 理想方案

你真正想要的是跟可视化事件编辑器一样的能力 —— 触发、链式、条件、延迟、参数传递 —— 但可以从代码访问。程序化构建流程，与可视化流程混合，用完即销毁。同一个管线，同样的执行保证，不同的接口。

## AI 行为的难题

程序化关卡不是唯一的使用场景。AI 行为本质上就是动态的。

简单模式的敌人：预告动作 2 秒，攻击，等 3 秒，重复。事件链简单可预测。

困难模式的敌人：0.5 秒预告，攻击连成连招，终结技触发环境危害，具体连招序列取决于玩家的位置和剩余血量。事件链复杂且每次遭遇都不同。

Boss 战更夸张。第一阶段：简单攻击模式。第二阶段：解锁新攻击，旧模式加速。第三阶段：亡命一搏连接范围伤害。每次阶段转换都会重新布线整个攻击事件图。

你可以把每个阶段硬编码在不同方法里，但事件之间的连接 —— "攻击命中时，0.2 秒后触发屏幕震动，如果血量低于 30% 则 1 秒后触发范围伤害" —— 恰恰是事件流系统应该处理的。问题在于流的拓扑在运行时改变。

## Mod 支持的难题

这个越来越重要了。如果你的游戏支持 Mod，玩家需要为自定义内容定义事件关系。Modder 创建了一种新陷阱类型，需要把它连到已有的游戏事件上 —— 比如"玩家进入触发区时，播放自定义动画，动画结束后造成伤害。"

他们用不了你的可视化编辑器（那是开发工具，不是玩家工具）。他们需要一个代码或配置接口来获得同样的能力。如果你的事件系统功能被锁在 GUI 后面，Modder 就被锁在外面了。

## GES 的程序化 Flow API

GES 可视化 Node Editor 中的每一个功能都有对应的代码 API。完全对等。可视化编辑器是同一套方法的 GUI 外壳。这意味着你在可视化编辑器里学到的一切可以 1:1 翻译到代码，反之亦然。

### 构建 Trigger：并行扇出

Trigger Event 的意思是：当事件 A 触发时，事件 B 也触发（同时）。完整 API：

```csharp
[GameEventDropdown, SerializeField] private SingleGameEvent onDoorOpened;
[GameEventDropdown, SerializeField] private SingleGameEvent onLightsOn;
[GameEventDropdown, SerializeField] private SingleGameEvent onAlarmDisabled;

private void SetupRoom()
{
    // When door opens, lights and alarm react simultaneously
    TriggerHandle h1 = onDoorOpened.AddTriggerEvent(targetEvent: onLightsOn);
    TriggerHandle h2 = onDoorOpened.AddTriggerEvent(targetEvent: onAlarmDisabled);
}
```

完整签名给你可视化编辑器里的每个选项：

```csharp
TriggerHandle handle = sourceEvent.AddTriggerEvent(
    targetEvent: targetEvent,
    delay: 0f,                          // seconds before target fires
    condition: () => isNightTime,       // predicate gate
    passArgument: true,                 // forward source args to target
    argumentTransformer: null,          // transform args between types
    priority: 0                         // ordering among triggers
);
```

**delay** —— 源事件触发后到目标事件触发前的等待时间。零表示同帧。

```csharp
// Door opens, lights flicker on 0.5s later
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    delay: 0.5f
);
```

**condition** —— 在触发时评估的谓词，不是设置时。传 null 表示无条件。

```csharp
// Only trigger lights if it's nighttime
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    condition: () => TimeOfDayManager.IsNight
);
```

**passArgument** —— 将源事件的数据转发给目标。类型兼容性很重要。

```csharp
// Source raises with damage amount, target receives the same
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageNumberSpawn,
    passArgument: true
);
```

**argumentTransformer** —— 当源和目标类型不同，或者你需要修改值时使用。

```csharp
// Source sends int damage, target expects float for UI scaling
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageScale,
    passArgument: true,
    argumentTransformer: (object arg) => (float)(int)arg / 100f
);
```

返回的 `TriggerHandle` 是你后续清理的引用：

```csharp
// Store the handle
TriggerHandle handle = sourceEvent.AddTriggerEvent(targetEvent: targetEvent);

// Later: remove this specific connection
sourceEvent.RemoveTriggerEvent(handle);
```

![Trigger Flow Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### 构建 Chain：顺序阻塞执行

Chain Event 的意思是：事件 A 触发，然后延迟一段时间后事件 B 触发，B 的监听器执行完后事件 C 触发。有序的、带时序控制的顺序执行。

```csharp
ChainHandle handle = sourceEvent.AddChainEvent(
    targetEvent: targetEvent,
    delay: 1f,                    // gap before this step fires
    duration: 2f,                 // how long this step is "active"
    condition: null,              // predicate gate
    passArgument: true,           // forward args
    argumentTransformer: null,    // transform args
    waitForCompletion: false      // block until listeners finish?
);
```

Chain 特有的参数：

**delay** —— 源触发后到这个链步骤执行之间的间隔。

**duration** —— 这个步骤被视为"活跃"的时长。影响多个 Chain 串联时的整体流程时序。

**waitForCompletion** —— 为 true 时，Chain 系统会等目标事件的所有监听器执行完毕后才继续后续步骤。这就是"阻塞"的意思。

```csharp
// Boss sequence: play animation (wait for it), then spawn enemies
onBossPhaseStart.AddChainEvent(
    targetEvent: onPlayBossAnimation,
    delay: 0f,
    duration: 3f,
    waitForCompletion: true
);

onPlayBossAnimation.AddChainEvent(
    targetEvent: onSpawnAdds,
    delay: 0.5f,
    duration: 0f,
    waitForCompletion: false
);
```

![Chain Flow Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### 混合可视化和程序化流程

架构真正发力的地方在这里。你在可视化编辑器里设计基础流程图 —— 那些静态的、设计期已知的连接。然后在运行时叠加动态连接。它们全部通过同一个管线执行。

```csharp
public class DifficultyFlowManager : MonoBehaviour
{
    [Header("Base Events (connected visually in editor)")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemySpawned;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyAttackWindup;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyAttackStrike;

    [Header("Hard Mode Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onComboFollowUp;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnvironmentHazard;

    private List<TriggerHandle> _hardModeHandles = new List<TriggerHandle>();

    public void EnableHardMode()
    {
        _hardModeHandles.Add(onEnemyAttackStrike.AddTriggerEvent(
            targetEvent: onComboFollowUp,
            delay: 0.3f,
            condition: () => Random.value > 0.5f
        ));

        _hardModeHandles.Add(onComboFollowUp.AddTriggerEvent(
            targetEvent: onEnvironmentHazard,
            delay: 0.1f
        ));
    }

    public void DisableHardMode()
    {
        foreach (var handle in _hardModeHandles)
            handle.Source.RemoveTriggerEvent(handle);
        _hardModeHandles.Clear();
    }
}
```

可视化编辑器的连接始终存在 —— 它们已经烘焙进资产了。程序化连接叠加在上面，可以随时添加或移除而不影响可视化图。"设计行为"和"动态行为"干净地分离。

## 基于 Handle 的清理模式

构建复杂的动态流程时，你会积累 Handle。干净地管理它们对于避免泄漏连接至关重要。以下是生产环境中可用的模式。

### 模式 1：列表收集

一组作为整体添加和移除的连接：

```csharp
private List<TriggerHandle> _triggerHandles = new List<TriggerHandle>();
private List<ChainHandle> _chainHandles = new List<ChainHandle>();

private void BuildFlow()
{
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventB));
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventC));
    _chainHandles.Add(eventB.AddChainEvent(targetEvent: eventD, delay: 1f));
}

private void TearDownFlow()
{
    foreach (var h in _triggerHandles)
        h.Source.RemoveTriggerEvent(h);
    foreach (var h in _chainHandles)
        h.Source.RemoveChainEvent(h);

    _triggerHandles.Clear();
    _chainHandles.Clear();
}
```

### 模式 2：Flow 上下文对象

需要结构化生命周期管理的复杂流程：

```csharp
public class EventFlowContext : System.IDisposable
{
    private List<TriggerHandle> _triggers = new List<TriggerHandle>();
    private List<ChainHandle> _chains = new List<ChainHandle>();

    public void AddTrigger(TriggerHandle handle) => _triggers.Add(handle);
    public void AddChain(ChainHandle handle) => _chains.Add(handle);

    public void Dispose()
    {
        foreach (var h in _triggers)
            h.Source.RemoveTriggerEvent(h);
        foreach (var h in _chains)
            h.Source.RemoveChainEvent(h);
        _triggers.Clear();
        _chains.Clear();
    }
}
```

```csharp
private EventFlowContext _currentPhaseFlow;

private void SetupBossPhase(int phase)
{
    _currentPhaseFlow?.Dispose();
    _currentPhaseFlow = new EventFlowContext();

    switch (phase)
    {
        case 1:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onShieldPulse, delay: 0.5f));
            break;
        case 2:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onRageSwipe,
                condition: () => bossHealth < 0.5f));
            _currentPhaseFlow.AddChain(onRageSwipe.AddChainEvent(
                targetEvent: onSummonAdds, delay: 2f));
            break;
        case 3:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onDesperationBlast));
            _currentPhaseFlow.AddTrigger(onDesperationBlast.AddTriggerEvent(
                targetEvent: onScreenFlash));
            _currentPhaseFlow.AddChain(onDesperationBlast.AddChainEvent(
                targetEvent: onAreaDamage, delay: 1f, waitForCompletion: true));
            break;
    }
}

private void OnDestroy()
{
    _currentPhaseFlow?.Dispose();
}
```

每次 Boss 阶段切换都会 Dispose 上一个流程并构建新的。没有泄漏的连接。第三阶段时不会有第一阶段的陈旧事件连线留着。

## 完整示例：程序化地牢事件连线

让我们构建开头提到的 Roguelike 地牢系统。每种房间类型有自己的事件连线，完全在运行时确定。

```csharp
public class DungeonRoom
{
    public RoomType Type;
    public SingleGameEvent OnPlayerEntered;
    public SingleGameEvent OnPlayerExited;
    public SingleGameEvent OnRoomCleared;
    public Int32GameEvent OnDamageInRoom;
    public List<SingleGameEvent> RoomSpecificEvents;
}

public class DungeonEventWiring : MonoBehaviour
{
    [Header("Shared Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onDungeonStarted;
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDied;
    [GameEventDropdown, SerializeField] private Int32GameEvent onPlayerDamaged;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBossDefeated;

    [Header("Effect Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayTrapSound;
    [GameEventDropdown, SerializeField] private SingleGameEvent onSpawnTreasureParticles;
    [GameEventDropdown, SerializeField] private SingleGameEvent onStartBossMusic;
    [GameEventDropdown, SerializeField] private SingleGameEvent onStopBossMusic;
    [GameEventDropdown, SerializeField] private SingleGameEvent onScreenShake;

    private Dictionary<DungeonRoom, EventFlowContext> _roomFlows
        = new Dictionary<DungeonRoom, EventFlowContext>();

    public void WireRoom(DungeonRoom room)
    {
        var flow = new EventFlowContext();

        switch (room.Type)
        {
            case RoomType.Trap:
                WireTrapRoom(room, flow);
                break;
            case RoomType.Treasure:
                WireTreasureRoom(room, flow);
                break;
            case RoomType.Boss:
                WireBossRoom(room, flow);
                break;
            case RoomType.Safe:
                break;
        }

        _roomFlows[room] = flow;
    }

    private void WireTrapRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Player enters -> traps fire after 1 second (if room not cleared)
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: room.OnDamageInRoom,
            delay: 1f,
            condition: () => !room.OnRoomCleared.HasFired()
        ));

        // Room damage -> screen shake + trap sound
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onScreenShake
        ));
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onPlayTrapSound,
            delay: 0.1f
        ));

        // Forward room damage to player damage system
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onPlayerDamaged,
            passArgument: true
        ));
    }

    private void WireTreasureRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Player enters -> sparkle particles
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onSpawnTreasureParticles
        ));

        // Chain: enter -> wait 2s -> room cleared
        flow.AddChain(room.OnPlayerEntered.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 2f
        ));
    }

    private void WireBossRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Enter -> boss music
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onStartBossMusic
        ));

        // Boss defeated -> chain: stop music -> shake -> room cleared
        flow.AddChain(onBossDefeated.AddChainEvent(
            targetEvent: onStopBossMusic,
            delay: 0.5f,
            waitForCompletion: true
        ));
        flow.AddChain(onStopBossMusic.AddChainEvent(
            targetEvent: onScreenShake,
            delay: 0.2f
        ));
        flow.AddChain(onScreenShake.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 1f
        ));

        // Safety net: exiting boss room stops music
        flow.AddTrigger(room.OnPlayerExited.AddTriggerEvent(
            targetEvent: onStopBossMusic
        ));
    }

    public void UnwireRoom(DungeonRoom room)
    {
        if (_roomFlows.TryGetValue(room, out var flow))
        {
            flow.Dispose();
            _roomFlows.Remove(room);
        }
    }

    public void UnwireAllRooms()
    {
        foreach (var flow in _roomFlows.Values)
            flow.Dispose();
        _roomFlows.Clear();
    }

    private void OnDestroy()
    {
        UnwireAllRooms();
    }
}
```

![Monitor Automation Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

看看这给你带来了什么。程序化生成器创建房间并调用 `WireRoom()`。每个房间得到它需要的事件连接。房间卸载或本轮结束时，`UnwireRoom()` 或 `UnwireAllRooms()` 清理一切。没有泄漏的委托，没有孤儿连接，不用手动追踪哪些 Lambda 订阅了什么。

而且房间特定事件（`OnPlayerEntered`、`OnDamageInRoom`）和全局共享事件（`onPlayerDamaged`、`onScreenShake`）共存。局部作用域和全局作用域，动态连线，通过同一套 Handle 清理模式管理。

## 保持条件精简

构建带条件的动态流程时有一个重要注意点。条件谓词在源事件每次触发时都会执行，不只是设置时。对于高频事件，谓词的开销很重要。

```csharp
// GOOD: simple field comparison, near-zero cost
condition: () => isAlive && currentPhase == BossPhase.Rage

// BAD: allocation inside predicate, runs every event firing
condition: () => GetAllEnemies().Where(e => e.IsAlive).Count() > 5

// BETTER: cache the result, check the cache
condition: () => aliveEnemyCount > 5
```

对于程序化地牢连线，这通常不是问题 —— 房间事件不会每秒触发 60 次。但如果你在为物理或移动事件构建动态流程，把谓词控制在简单的字段读取。

## 什么时候用可视化 vs 程序化

**可视化编辑器**适用于：
- 流程在设计期已知
- 策划需要查看和修改
- 你想不重编译就快速迭代
- 连接在各版本间稳定

**程序化 API** 适用于：
- 流程依赖运行时状态
- 程序化生成决定图的结构
- AI 系统动态组合行为
- 你需要与其他代码系统紧密集成
- 流程是临时的 —— 在游戏过程中创建和销毁

**两者混合**适用于：
- 你有稳定的基础（可视化）加动态扩展（代码）
- 部分连接面向策划，部分面向程序
- 你想要静态部分的可视化清晰度，和动态部分的代码灵活性

程序化 API 不是可视化编辑器的替代品，而是同一个系统的另一半。合在一起，它们覆盖了从"策划在编辑器里拖一根线"到"AI 导演在运行时根据玩家技能分析重新布线整个攻击图"的完整频谱。

同一个管线。同样的执行保证。同样的 Handle 生命周期。只是构建图的方式不同。

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
