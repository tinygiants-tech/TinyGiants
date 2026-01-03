---
sidebar_label: 'Programmatic Flow'
sidebar_position: 3
---

# Programmatic Flow

While the **Visual Flow Graph** is excellent for static, design-time logic, game development often requires constructing event relationships **dynamically at runtime**.

The **Programmatic Flow API** allows you to build Triggers (Fan-out) and Chains (Sequences) entirely via C# code. This is essential for:
*   **Procedural Generation:** Wiring events for objects spawned at runtime.
*   **Dynamic Quests:** creating logic steps based on player choices.
*   **Temporary Status Effects:** Chaining damage ticks or buffs that expire.

---

## ⚡ Core Concepts: Triggers vs. Chains

Before coding, it is crucial to understand the difference between the two flow types handled by the internal managers (`GameEventTriggerManager` and `GameEventChainManager`).

| Feature              | ⚡ Triggers (Fan-Out)                   | 🔗 Chains (Sequence)                            |
| :------------------- | :------------------------------------- | :--------------------------------------------- |
| **Execution Mode**   | **Parallel** (Fire-and-Forget)         | **Sequential** (Blocking)                      |
| **Failure Handling** | Independent (If A fails, B still runs) | Strict (If A fails, the chain stops)           |
| **Timing**           | Synchronous (unless `delay` is used)   | Coroutine-based (supports `wait` & `duration`) |
| **Ordering**         | Sorted by **Priority**                 | Executed in **Order of Addition**              |
| **Use Case**         | VFX, Achievements, UI Updates          | Cutscenes, Tutorials, Turn Logic               |

---

## 1. Triggers (Parallel Execution)

Use `AddTriggerEvent` to make one event automatically fire others. All registered triggers execute immediately (or after their individual delay) when the source event is raised.

### Basic Usage

When `onPlayerDeath` fires, automatically fire `onPlayDeathSound` and `onShowGameOverUI`.

```csharp
[GameEventDropdown] public GameEvent onPlayerDeath;
[GameEventDropdown] public GameEvent onPlayDeathSound;
[GameEventDropdown] public GameEvent onShowGameOverUI;

void Awake()
{
    // These happen effectively at the same time
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound);
    onPlayerDeath.AddTriggerEvent(onShowGameOverUI);
}
```

### Advanced Configuration (Priority & Conditions)

You can inject logic into the connection without modifying the events themselves.

```csharp
// 1. High Priority: Heal first
onPotionUsed.AddTriggerEvent(
    targetEvent: onRegenHealth,
    priority: 100 // Higher numbers run first
);

// 2. Low Priority: Play sound after logic starts
onPotionUsed.AddTriggerEvent(
    targetEvent: onPlaySound,
    delay: 0.2f, // Optional delay
    priority: 10
);

// 3. Conditional: Only trigger particle if graphics settings allow
onPotionUsed.AddTriggerEvent(
    targetEvent: onParticleEffect,
    condition: () => GameSettings.EnableParticles
);
```

:::info Automatic Argument Passing
By default (passArgument: true), Triggers attempt to pass the data from the Source to the Target. If types match (e.g., int to int), it flows automatically. If types mismatch, you need a **Transformer** (see below).
:::

------

## 2. Chains (Sequential Execution)

Use `AddChainEvent` to build a strictly ordered execution list on a single event.

### The Sequence Logic (The Queue)

When you add multiple chain nodes to **the same source event**, they form a **Queue**. The system executes them one by one, waiting for the previous node's `duration` to finish before starting the next node.

This allows you to orchestrate a complex timeline (A → Wait → B → Wait → C) managed entirely by the source event, without linking B directly to C.

```csharp
[GameEventDropdown] public GameEvent onTurnStart;
[GameEventDropdown] public GameEvent onDrawCard;
[GameEventDropdown] public GameEvent onRefreshMana;

void Awake()
{
    // --- The "Turn Start" Timeline ---
    
    // Step 1: Draw Card
    // Setting 'duration' means: "Execute this, then WAIT 0.5s before processing the next item in the list."
    onTurnStart.AddChainEvent(onDrawCard, duration: 0.5f);
    
    // Step 2: Refresh Mana
    // This runs automatically AFTER Step 1 finishes (and its 0.5s duration passes).
    onTurnStart.AddChainEvent(onRefreshMana);
    
    // Note: I attach both to 'onTurnStart'. 
    // I do NOT attach Step 2 to 'onDrawCard', because I don't want 
    // drawing a card from a spell to accidentally trigger mana refresh.
}
```

### Async Waiting (waitForCompletion)

If your event listeners launch Coroutines or Async tasks, you can force the chain to wait for them.

```csharp
// The chain will pause here until all listeners of 'onPlayCutscene' 
// have finished their work (yield return null).
onLevelEnd.AddChainEvent(onPlayCutscene, waitForCompletion: true);

// This runs only after the cutscene is fully processed
onLevelEnd.AddChainEvent(onLoadNextLevel);
```

:::warning Chain Breaking
If a condition returns false or an exception occurs in a Chain Node, **the entire subsequent chain is halted**. This is useful for conditional logic (e.g., "Stop combo attack if enemy blocked").
:::

------

## 🔄 Data Flow & Transformers

The most powerful feature of the Programmatic Flow is **Argument Transformation**. This allows you to bridge events with incompatible types or extract specific data from complex objects.

### 1. Complex to Void (Filter)

Trigger a generic event only based on specific data.

```csharp
// Source: Damage Event (float amount)
// Target: Critical Hit Event (Void)
onDamageTaken.AddTriggerEvent(
    targetEvent: onCriticalHitEffect,
    condition: (amount) => amount > 50f, // Only if damage > 50
    passArgument: false // Target is void, don't pass the float
);
```

### 2. Simple Transformation (Type Casting)

Map a complex object event to a simple primitive event.

- **Source:** `GameEvent<Enemy> (OnEnemyKilled)`
- **Target:** `GameEvent<int> (OnAddXP)`

```csharp
[GameEventDropdown] public GameEvent<Enemy> onEnemyKilled;
[GameEventDropdown] public GameEvent<int> onAddXP;

void Awake()
{
    // Extract the 'xpValue' from the Enemy object and pass it to the int event
    onEnemyKilled.AddTriggerEvent(
        targetEvent: onAddXP,
        passArgument: true,
        argumentTransformer: (enemy) => enemy.xpValue 
    );
}
```

### 3. Sender & Argument Transformation

For `GameEvent<TSender, TArgs>`, the transformer receives both parameters.

```csharp
// Source: Player picked up item (Sender: Player, Args: ItemData)
// Target: Notification (string)
onItemPickup.AddTriggerEvent(
    targetEvent: onShowNotification,
    passArgument: true,
    argumentTransformer: (player, item) => $"{player.Name} found a {item.Rarity} item!"
);
```

------

## 🧹 Lifecycle Management

Unlike standard listeners (AddListener), dynamic Triggers and Chains return a **Handle**. You must manage these handles to prevent memory leaks or unwanted logic persistence, especially when pooling objects.

### Using Handles

```csharp
private TriggerHandle _triggerHandle;

void OnEnable()
{
    // Save the handle
    _triggerHandle = onDoorOpen.AddTriggerEvent(onLightOn);
}

void OnDisable()
{
    // Use the handle to remove ONLY this specific link
    if (_triggerHandle != null)
    {
        onDoorOpen.RemoveTriggerEvent(_triggerHandle);
        _triggerHandle = null;
    }
}
```

### Bulk Cleanup

If an object is being destroyed or returned to a pool, you can wipe all dynamic logic associated with an event.

```csharp
void OnDestroy()
{
    // Removes ALL dynamic triggers targeting this event
    myEvent.RemoveAllTriggerEvents();
    
    // Removes ALL dynamic chains targeting this event
    myEvent.RemoveAllChainEvents();
}
```

## 📜 API Summary

| Method Signature                                             | Returns         | Description                          |
| ------------------------------------------------------------ | --------------- | ------------------------------------ |
| **Trigger Registration**                                     |                 | *Parallel / Fire-and-Forget*         |
| `AddTriggerEvent(GameEventBase target, float delay, Func<bool> condition, int priority)` | `TriggerHandle` | Adds a trigger to a Void event.      |
| `AddTriggerEvent(GameEventBase target, float delay, Func<T, bool> condition, bool passArg, Func<T, object> transformer, int priority)` | `TriggerHandle` | Adds a trigger to a Typed event.     |
| `AddTriggerEvent(GameEventBase target, float delay, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, int priority)` | `TriggerHandle` | Adds a trigger to a Sender event.    |
| **Chain Registration**                                       |                 | *Sequential / Blocking*              |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<bool> condition, bool wait)` | `ChainHandle`   | Adds a chain step to a Void event.   |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<T, bool> condition, bool passArg, Func<T, object> transformer, bool wait)` | `ChainHandle`   | Adds a chain step to a Typed event.  |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, bool wait)` | `ChainHandle`   | Adds a chain step to a Sender event. |
| **Cleanup**                                                  |                 | *Removal*                            |
| `RemoveTriggerEvent(TriggerHandle handle)`                   | `void`          | Removes a specific trigger node.     |
| `RemoveChainEvent(ChainHandle handle)`                       | `void`          | Removes a specific chain node.       |
| `RemoveAllTriggerEvents()`                                   | `void`          | Clears all dynamic triggers.         |
| `RemoveAllChainEvents()`                                     | `void`          | Clears all dynamic chains.           |
