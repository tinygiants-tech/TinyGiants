---
slug: programmatic-flow-api
title: "Building Event Flows in Pure Code: The Programmatic Flow API"
authors: [tinygiants]
tags: [ges, unity, scripting, flow-graph, advanced]
description: "When visual editors aren't flexible enough — like procedural levels or AI behavior trees — build your entire event flow graph programmatically with full API parity."
image: /img/home-page/game-event-system-preview.png
---

Your AI director needs to compose different event chains based on difficulty. Easy mode: enemies telegraph attacks for 2 seconds, then strike. Hard mode: 0.5-second telegraphs, attacks chain into combos, and environmental hazards trigger on each combo hit. The exact flow graph depends on runtime state — player count, difficulty setting, current level, enemy type. You can't pre-build this in a visual editor because the topology itself is dynamic.

This is where the Programmatic Flow API comes in. Every single feature you can configure in the GES visual editor — triggers, chains, conditions, delays, argument transformers — has a corresponding code API. Full parity, zero exceptions. You can build, modify, and tear down event flow graphs entirely at runtime.

And here's the real power move: you can mix programmatic and visual flows. Design your static, known flows in the editor. Layer dynamic, runtime-determined flows on top via code. They all execute through the same pipeline.

<!-- truncate -->

## Full API Parity: What It Means

When we say "full API parity," we mean it literally. The visual Node Editor is a GUI wrapper around the same API you have access to in code. Every trigger connection you draw in the editor calls `AddTriggerEvent()` under the hood. Every chain connection calls `AddChainEvent()`. The inspector fields for delay, condition, and argument passing are direct parameters to these methods.

This means anything you learn in the visual editor translates 1:1 to code, and vice versa. There are no editor-only features and no code-only features. The only difference is the interface — drag-and-drop vs. method calls.

## Building Triggers Programmatically

A trigger event is a parallel fan-out: when Event A fires, Events B, C, and D also fire simultaneously. Here's the full API signature:

```csharp
TriggerHandle handle = sourceEvent.AddTriggerEvent(
    targetEvent: targetEvent,
    delay: 0f,
    condition: () => isNightTime,
    passArgument: true,
    argumentTransformer: null,
    priority: 0
);
```

Let's break down each parameter:

### targetEvent

The event to trigger when the source fires. Can be any GES event type — void, typed, or sender.

```csharp
[SerializeField] private GameEvent onDoorOpened;
[SerializeField] private GameEvent onLightsOn;
[SerializeField] private GameEvent onAlarmDisabled;

private void SetupRoom()
{
    // When door opens, turn on lights and disable alarm simultaneously
    onDoorOpened.AddTriggerEvent(targetEvent: onLightsOn);
    onDoorOpened.AddTriggerEvent(targetEvent: onAlarmDisabled);
}
```

### delay

How long to wait (in seconds) before firing the target event. Zero means immediate (same frame as the source).

```csharp
// Door opens, lights flicker on 0.5s later
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    delay: 0.5f
);
```

### condition

A predicate that must return `true` for the trigger to fire. Evaluated at the moment the source event raises, not at setup time.

```csharp
// Only trigger lights if it's nighttime
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    delay: 0f,
    condition: () => TimeOfDayManager.IsNight
);
```

Pass `null` for unconditional triggers.

### passArgument

Whether to forward the source event's argument to the target event. This is where type compatibility matters — if the source is `GameEvent<int>` and the target is also `GameEvent<int>`, setting `passArgument: true` forwards the integer value.

```csharp
// Source raises with damage amount, target receives the same amount
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageNumberSpawn,
    passArgument: true
);
```

### argumentTransformer

When the source and target have different types, or you need to modify the value, provide a transformer delegate. We covered these in the argument transformers post, and they work identically in the programmatic API.

```csharp
// Source sends int damage, target expects float for UI scaling
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageScale,
    passArgument: true,
    argumentTransformer: (object arg) => (float)(int)arg / 100f
);
```

### priority

When multiple triggers exist on the same source event, priority determines execution order (higher first). Usually 0 is fine unless you have ordering requirements among triggers.

### The TriggerHandle

The returned `TriggerHandle` is your reference for later management:

```csharp
TriggerHandle handle = sourceEvent.AddTriggerEvent(targetEvent: targetEvent);

// Later: remove this specific trigger
sourceEvent.RemoveTriggerEvent(handle);
```

Always store the handle if there's any chance you'll need to remove the trigger later. This is especially important for dynamic flows that change during gameplay.

![Runtime API Demo](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

## Building Chains Programmatically

A chain event is a sequential blocking connection: Event A fires, then after a delay, Event B fires, and optionally the system waits for B's listeners to complete before proceeding.

```csharp
ChainHandle handle = sourceEvent.AddChainEvent(
    targetEvent: targetEvent,
    delay: 1f,
    duration: 2f,
    condition: null,
    passArgument: true,
    argumentTransformer: null,
    waitForCompletion: false
);
```

Most parameters work the same as triggers. The chain-specific ones are:

### delay

Time to wait after the source fires before the chain target fires. This is the "gap" between steps.

### duration

How long this chain step is considered "active." This affects the overall flow timing when multiple chains are connected in sequence.

### waitForCompletion

When `true`, the chain system waits for all listeners on the target event to finish (including any async operations they kick off) before the chain can proceed to subsequent steps. This is the "blocking" in "sequential blocking."

```csharp
// Animation must finish before proceeding
onBossPhaseStart.AddChainEvent(
    targetEvent: onPlayBossAnimation,
    delay: 0f,
    duration: 3f,
    waitForCompletion: true
);

// After animation, spawn adds
onPlayBossAnimation.AddChainEvent(
    targetEvent: onSpawnAdds,
    delay: 0.5f,
    duration: 0f,
    waitForCompletion: false
);
```

![Chain Demo](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### ChainHandle Management

```csharp
ChainHandle handle = sourceEvent.AddChainEvent(targetEvent: targetEvent);

// Remove later
sourceEvent.RemoveChainEvent(handle);
```

## Mixing Programmatic and Visual Flows

This is where things get really powerful. You can design your base flow graph visually in the editor — the static, known-at-design-time connections — and then layer dynamic connections on top at runtime.

```csharp
public class DifficultyFlowManager : MonoBehaviour
{
    [Header("Base Events (connected visually in editor)")]
    [SerializeField] private GameEvent onEnemySpawned;
    [SerializeField] private GameEvent onEnemyAttackWindup;
    [SerializeField] private GameEvent onEnemyAttackStrike;

    [Header("Hard Mode Events")]
    [SerializeField] private GameEvent onComboFollowUp;
    [SerializeField] private GameEvent onEnvironmentHazard;

    private List<TriggerHandle> _hardModeHandles = new List<TriggerHandle>();

    public void EnableHardMode()
    {
        // Add combo follow-ups (doesn't exist in visual graph)
        var comboHandle = onEnemyAttackStrike.AddTriggerEvent(
            targetEvent: onComboFollowUp,
            delay: 0.3f,
            condition: () => Random.value > 0.5f // 50% chance
        );
        _hardModeHandles.Add(comboHandle);

        // Environmental hazards on combos
        var hazardHandle = onComboFollowUp.AddTriggerEvent(
            targetEvent: onEnvironmentHazard,
            delay: 0.1f
        );
        _hardModeHandles.Add(hazardHandle);
    }

    public void DisableHardMode()
    {
        foreach (var handle in _hardModeHandles)
        {
            // Remove each dynamic connection
            // The visual connections remain untouched
            handle.Source.RemoveTriggerEvent(handle);
        }
        _hardModeHandles.Clear();
    }
}
```

The visual editor connections are always there — they're part of the asset data. The programmatic connections layer on top and can be added/removed without affecting the visual graph. This is a clean separation between "designed behavior" and "dynamic behavior."

## Expression Tree Predicates for Conditions

When building conditions programmatically, you have full access to C# lambda expressions. But GES goes a step further with Expression Tree compilation for conditions used in the visual editor. In code, you can leverage the same optimization:

```csharp
// Simple lambda — works fine
onDamage.AddTriggerEvent(
    targetEvent: onCriticalDamage,
    condition: () => currentHealth < maxHealth * 0.25f
);

// Captured variables — also works, GES handles the closure correctly
float threshold = difficultySettings.criticalHealthPercent;
onDamage.AddTriggerEvent(
    targetEvent: onCriticalDamage,
    condition: () => currentHealth < maxHealth * threshold
);
```

For conditions that are evaluated very frequently (high-frequency events with many conditional triggers), the performance characteristics of your predicate matter. Simple field comparisons are effectively free. Complex LINQ queries or methods with allocation inside the predicate are not — keep predicates lean.

```csharp
// GOOD: simple field comparison, near-zero cost
condition: () => isAlive && currentPhase == BossPhase.Rage

// BAD: allocation inside predicate, runs every time event fires
condition: () => GetAllEnemies().Where(e => e.IsAlive).Count() > 5

// BETTER: cache the result and check the cached value
condition: () => aliveEnemyCount > 5
```

## Handle-Based Cleanup Patterns

When you build complex dynamic flows, you accumulate handles. Managing them cleanly is essential to avoid leaked connections. Here are the patterns I use:

### Pattern 1: List Collection

For a known set of dynamic connections that are added and removed as a unit:

```csharp
private List<TriggerHandle> _triggerHandles = new List<TriggerHandle>();
private List<ChainHandle> _chainHandles = new List<ChainHandle>();

private void BuildDynamicFlow()
{
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventB));
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventC));
    _chainHandles.Add(eventB.AddChainEvent(targetEvent: eventD, delay: 1f));
}

private void TearDownDynamicFlow()
{
    foreach (var h in _triggerHandles)
        h.Source.RemoveTriggerEvent(h);
    foreach (var h in _chainHandles)
        h.Source.RemoveChainEvent(h);

    _triggerHandles.Clear();
    _chainHandles.Clear();
}
```

### Pattern 2: Flow Context Object

For more complex flows, wrap all handles in a context object:

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
private EventFlowContext _currentFlow;

private void SetupBossPhase(int phase)
{
    // Tear down previous phase's dynamic flow
    _currentFlow?.Dispose();
    _currentFlow = new EventFlowContext();

    switch (phase)
    {
        case 1:
            _currentFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onShieldPulse, delay: 0.5f));
            break;
        case 2:
            _currentFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onRageSwipe, condition: () => bossHealth < 0.5f));
            _currentFlow.AddChain(onRageSwipe.AddChainEvent(
                targetEvent: onSummonAdds, delay: 2f));
            break;
        case 3:
            _currentFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onDesperationBlast));
            _currentFlow.AddTrigger(onDesperationBlast.AddTriggerEvent(
                targetEvent: onScreenFlash));
            _currentFlow.AddChain(onDesperationBlast.AddChainEvent(
                targetEvent: onAreaDamage, delay: 1f, waitForCompletion: true));
            break;
    }
}

private void OnDestroy()
{
    _currentFlow?.Dispose();
}
```

### Pattern 3: Scoped with Using

If the flow context implements `IDisposable`, you can scope it in methods that build temporary flows:

```csharp
// Not typical for game flows, but useful for test setups
using (var flow = new EventFlowContext())
{
    flow.AddTrigger(eventA.AddTriggerEvent(targetEvent: eventB));

    // Test...
    eventA.Raise();

    // flow.Dispose() called automatically, connections removed
}
```

## Complete Example: Procedural Dungeon Event Wiring

Let's build something real. A procedural dungeon generator creates rooms, and each room type needs different event wiring. Trap rooms, treasure rooms, boss rooms — each has a unique flow graph that's determined at runtime.

```csharp
public class DungeonRoom
{
    public RoomType Type;
    public GameEvent OnPlayerEntered;
    public GameEvent OnPlayerExited;
    public GameEvent OnRoomCleared;
    public GameEventInt OnDamageInRoom;
    public List<GameEvent> RoomSpecificEvents;
}

public class DungeonEventWiring : MonoBehaviour
{
    [Header("Shared Events")]
    [SerializeField] private GameEvent onDungeonStarted;
    [SerializeField] private GameEvent onPlayerDied;
    [SerializeField] private GameEventInt onPlayerDamaged;
    [SerializeField] private GameEvent onBossDefeated;

    [Header("Effect Events")]
    [SerializeField] private GameEvent onPlayTrapSound;
    [SerializeField] private GameEvent onSpawnTreasureParticles;
    [SerializeField] private GameEvent onStartBossMusic;
    [SerializeField] private GameEvent onStopBossMusic;
    [SerializeField] private GameEvent onScreenShake;

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
                // Safe rooms have no special wiring
                break;
        }

        _roomFlows[room] = flow;
    }

    private void WireTrapRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Player enters -> trigger traps after 1 second
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: room.OnDamageInRoom,
            delay: 1f,
            condition: () => !room.OnRoomCleared.HasFired()
        ));

        // Damage in room -> screen shake + trap sound
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
        // Player enters -> spawn particles immediately
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onSpawnTreasureParticles
        ));

        // Room cleared -> chain: wait 2s, then mark cleared
        flow.AddChain(room.OnPlayerEntered.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 2f
        ));
    }

    private void WireBossRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Player enters -> start boss music
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onStartBossMusic
        ));

        // Boss defeated -> chain: stop music, then screen shake,
        // then mark room cleared
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

        // Player exits boss room -> stop music (safety net)
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

![Monitor Automation](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

This is the kind of thing you simply can't do with a static visual editor. The room types, counts, and connections are all determined at runtime by the procedural generator. But the underlying event infrastructure — the scheduling, the listener pipeline, the condition evaluation — is the same battle-tested GES core that powers the visual workflows.

## When to Go Programmatic vs. Visual

**Use the visual editor when:**
- The flow topology is known at design time
- Designers need to read and modify the flow
- You want quick iteration without recompilation
- The connections are relatively stable across builds

**Use the programmatic API when:**
- The flow topology depends on runtime state
- Procedural generation determines the event graph
- AI systems need to compose behavior dynamically
- You need tight integration with other code systems
- The flow is temporary (created and destroyed during gameplay)

**Mix both when:**
- You have a stable base flow (visual) with dynamic extensions (code)
- Some connections are designer-facing and others are programmer-facing
- You want the best of both worlds — visual clarity for the static parts, code flexibility for the dynamic parts

The programmatic API isn't a replacement for the visual editor. It's the other half of the same system, designed for the cases where visual editing isn't flexible enough. Together, they cover the full spectrum of event flow design.

---

🚀 Global Developer Service Matrix

**🇨🇳 China Developer Community**
- 🛒 [Unity China Asset Store](https://tinygiants.tech/ges/cn)
- 🎥 [Bilibili Video Tutorials](https://tinygiants.tech/bilibili)
- 📘 [Technical Documentation](https://tinygiants.tech/docs/ges)
- 💬 QQ Group (1071507578)

**🌐 Global Developer Community**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord Community](https://tinygiants.tech/discord)
- 🎥 [YouTube Channel](https://tinygiants.tech/youtube)
- 🎮 [Unity Forum Thread](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub](https://github.com/tinygiants-tech/TinyGiants)

**📧 Support & Collaboration**
- 🌐 [TinyGiants Studio](https://tinygiants.tech)
- ✉️ [Support Email](mailto:support@tinygiants.tech)
