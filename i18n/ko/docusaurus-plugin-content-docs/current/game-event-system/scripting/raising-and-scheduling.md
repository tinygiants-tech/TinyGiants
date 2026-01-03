---
sidebar_label: 'Raising & Scheduling'
sidebar_position: 1
---

# Raising & Scheduling

At its core, the Game Event System is about sending signals. While the Inspector handles visual bindings, the **Runtime API** gives programmers precise control over *when* and *how* these signals are fired.

This guide covers immediate execution, time-based scheduling, and the cancellation of pending events.

---

## 🚀 Immediate Execution (`Raise`)

The `Raise()` method is the standard way to fire an event. It executes all listeners (Inspector, Code, Flow Graph) synchronously in the current frame.

### 1. Void Events
Events with no arguments.

```csharp
[GameEventDropdown] public GameEvent onPlayerJump;

void Update()
{
    if (Input.GetButtonDown("Jump"))
    {
        // Fires immediately
        onPlayerJump.Raise();
    }
}
```

### 2. Single Argument Events

Events that carry a specific data payload (T).

```csharp
[GameEventDropdown] public GameEvent<float> onHealthChanged;

public void TakeDamage(float damage)
{
    currentHealth -= damage;
    
    // Type-safe invocation
    onHealthChanged.Raise(currentHealth);
}
```

### 3. Sender + Argument Events

Events that verify the **Source** of the event (TSender) and carry data (TArgs).

```csharp
// Define types: Sender is GameObject, Arg is DamageInfo
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onActorDamaged;

public void Hit()
{
    var info = new DamageInfo { amount = 50, type = DamageType.Fire };
    
    // Passes 'this.gameObject' as the sender
    onActorDamaged.Raise(this.gameObject, info);
}
```

:::warning Auto-Scheduling Logic
If you have configured **Action Delay** or **Repeat** settings in the Inspector for a specific event asset, calling Raise() will automatically respect those settings (e.g., it might wait 2 seconds before actually firing).
See [Inspector Integration](#-inspector-integration) below.
:::

------

## ⏱️ Delayed Execution (RaiseDelayed)

Sometimes you want to schedule an event for the future without using a Coroutine. The system provides a built-in scheduler.

All scheduling methods return a `ScheduleHandle`, which is crucial if you need to cancel the event before it fires.

```csharp
[GameEventDropdown] public GameEvent onBombExplode;

public void PlantBomb()
{
    Debug.Log("Bomb Planted...");
    
    // Fire event after 5.0 seconds
    ScheduleHandle handle = onBombExplode.RaiseDelayed(5.0f);
}
```

### Passing Arguments with Delay

The API fully supports generics for delayed calls.

```csharp
// Wait 1.5s, then send the float value '100f'
onScoreAdded.RaiseDelayed(100f, 1.5f);

// Wait 0.5s, then pass Sender and Args
onItemPickup.RaiseDelayed(this, itemData, 0.5f);
```

------

## 🔄 Repeating Execution (RaiseRepeating)

Use this to create loops, timers, or polling mechanisms entirely within the event system.

| Parameter   | Description                                         |
| ----------- | --------------------------------------------------- |
| interval    | Time (seconds) between each fire.                   |
| repeatCount | How many times to fire? Set to -1 for **Infinite**. |

### Example: Poison Effect

Damage the player every 1 second, for 5 ticks.

```csharp
[GameEventDropdown] public GameEvent<int> onTakeDamage;

private void ApplyPoison()
{
    // Fire immediately (optional), then repeat 5 times every 1s
    // Note: RaiseRepeating waits for the interval before the FIRST fire by default
    onTakeDamage.RaiseRepeating(10, interval: 1.0f, repeatCount: 5);
}
```

### Example: Radar Scan (Infinite)

Ping a radar event every 2 seconds forever.

```csharp
private ScheduleHandle _radarHandle;

void Start()
{
    // -1 means execute forever until cancelled
    _radarHandle = onRadarPing.RaiseRepeating(2.0f, repeatCount: -1);
}
```

------

## 🔔 Monitoring & Lifecycle Callbacks

The `ScheduleHandle` is not just for cancellation. It provides three built-in callbacks that allow you to monitor the state of a scheduled task, this is essential for updating UI progress bars, triggering follow-up logic, or cleaning up resources.

```csharp
[GameEventDropdown] public GameEvent onStatusUpdate;

private void StartTrackedLoop()
{
    // Start a task that repeats 5 times every 1 second
    ScheduleHandle handle = onStatusUpdate.RaiseRepeating(interval: 1.0f, repeatCount: 5);

    // 1. Triggered on every tick (Step)
    handle.OnStep += (remainingCount) => 
    {
        Debug.Log($"[Schedule] Execution step! Cycles remaining: {remainingCount}");
    };

    // 2. Triggered when the task finishes naturally
    handle.OnCompleted += () => 
    {
        Debug.Log("[Schedule] Task finished successfully.");
    };

    // 3. Triggered if the task is stopped manually via code
    handle.OnCancelled += () => 
    {
        Debug.Log("[Schedule] Task was cancelled by the user.");
    };
}
```

### Callback Definitions

| Callback        | Invocation Timing                                            | Typical Use Case                                             |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **OnStep**      | Fires immediately after each event execution. Pass the remaining repeatCount. | Updating countdown timers or "progress" UI.                  |
| **OnCompleted** | Fires when the task reaches its repeatCount and finishes naturally. | Triggering a "Cooldown Finished" or "Combo Ended" logic.     |
| **OnCancelled** | Fires specifically when CancelDelayed or CancelRepeating is called. | Stopping associated VFX/SFX or resetting a character's state. |

:::tip Handle Disposal
You don't need to manually unsubscribe from these callbacks. The ScheduleHandle is automatically cleaned up by the internal scheduler once the task reaches a terminal state (Completed or Cancelled).
:::

------

## 🛑 Cancellation

Stopping pending events is just as important as starting them. There are two distinct ways to cancel events, depending on how they were started.

### 1. Canceling Manual Schedules
If you used `RaiseDelayed` or `RaiseRepeating`, you received a **ScheduleHandle**. You must use this handle to stop that specific task.

#### Canceling a Delayed Call

```csharp
public void DefuseBomb()
{
    // Stop the pending delayed execution
    if (_bombHandle != null)
    {
        // Returns true if successfully cancelled
        bool success = onBombExplode.CancelDelayed(_bombHandle); 
    }
}
```

#### Canceling a Repeating Loop

```csharp
public void StopRadar()
{
    // Stop the manual loop
    if (_radarHandle != null)
    {
        onRadarPing.CancelRepeating(_radarHandle);
    }
}
```

### 2. Canceling Automatic (Inspector) Schedules

If an event is looping or delaying because of its **Inspector Configuration** (Behavior Window), use the parameterless Cancel() method.

- **Target**: Stops the **active** auto-sequence (Delay or Loop) on this event asset.
- **Safety**: Raise() automatically calls Cancel() internally before starting a new auto-sequence to prevent overlapping loops.

```csharp
// Stops the "Action Delay" or "Repeat" logic currently running 
// that was triggered by a previous .Raise() call
onEvent.Cancel();
```

:::danger Important Distinction
**Cancel() does NOT remove listeners.**

- **Cancel()**: Stops time-based execution (Pending timers/loops). The event acts as if it was never fired.
- **RemoveAllListeners()**: Unsubscribes all scripts so they no longer receive future events.
  :::

------

## 🔌 Inspector Integration

It is vital to understand how code interacts with the **Visual Behavior Configuration**.

When you call Raise() in code, the system checks the **Schedule Configuration** defined in the [Game Event Behavior Window](../visual-workflow/game-event-behavior.md):

1. **Code**: myEvent.Raise() called.
2. **System Check**: Does this event have Action Delay > 0 in Inspector?
   - **Yes**: The system implicitly converts this to a RaiseDelayed.
   - **No**: It fires immediately.
3. **System Check**: Does this event have Repeat Interval > 0?
   - **Yes**: The system starts a loop automatically.

:::tip Best Practice
If you want **pure code control**, leave the Schedule settings in the Inspector at 0.
If you want **designers to tune timing**, use Raise() and let the Inspector control the delay.
:::

------

## 🔇 Muting Visuals (SetInspectorListenersActive)

In complex systems, you often want to separate **Game Logic** (Data) from **Game Feel** (Visuals/Sound).

Use SetInspectorListenersActive(false) to mute the "Visual/Scene" layer while keeping the "Logic/Code" layer running.

### Use Case: Fast-Forwarding or Loading

Imagine loading a save file. You need to fire OnItemAdded 100 times to populate the inventory, but you **don't** want to play 100 sound effects or spawn 100 UI popups.

```csharp
public void LoadSaveData(List<Item> items)
{
    // 1. Mute the "flashy" stuff (Inspector bindings)
    onItemAdded.SetInspectorListenersActive(false);

    // 2. Process logic (Data listeners still run!)
    foreach(var item in items)
    {
        // This updates the backend inventory data
        // BUT skips the UI/Sound configured in Editor
        onItemAdded.Raise(item); 
    }

    // 3. Re-enable visuals
    onItemAdded.SetInspectorListenersActive(true);
    
    // 4. Refresh UI once
    onInventoryUpdated.Raise();
}
```

------

## 📜 API Summary

| Method Signature                                             | Returns          | Description                                                  |
| :----------------------------------------------------------- | :--------------- | :----------------------------------------------------------- |
| **Immediate Execution**                                      |                  |                                                              |
| `Raise()`                                                    | `void`           | Fires a Void event immediately.                              |
| `Raise(T argument)`                                          | `void`           | Fires a Single-Argument event immediately.                   |
| `Raise(TSender sender, TArgs args)`                          | `void`           | Fires a Sender+Argument event immediately.                   |
| **Delayed Execution**                                        |                  |                                                              |
| `RaiseDelayed(float delay)`                                  | `ScheduleHandle` | Schedules a Void event to fire after `delay` seconds.        |
| `RaiseDelayed(T arg, float delay)`                           | `ScheduleHandle` | Schedules a Typed event to fire after `delay` seconds.       |
| `RaiseDelayed(TSender s, TArgs a, float delay)`              | `ScheduleHandle` | Schedules a Sender event to fire after `delay` seconds.      |
| **Repeating Execution**                                      |                  |                                                              |
| `RaiseRepeating(float interval, int count)`                  | `ScheduleHandle` | Starts a repeating loop. Set `count` to -1 for infinite.     |
| `RaiseRepeating(T arg, float interval, int count)`           | `ScheduleHandle` | Starts a repeating Typed loop.                               |
| `RaiseRepeating(TSender s, TArgs a, float interval, int count)` | `ScheduleHandle` | Starts a repeating Sender loop.                              |
| **Cancellation & Control**                                   |                  |                                                              |
| `Cancel()`                                                   | `void`           | Stops any **Inspector-configured** auto-loops/delays for this event. |
| `CancelDelayed(ScheduleHandle handle)`                       | `bool`           | Cancels a specific manual delayed task. Returns true if successful. |
| `CancelRepeating(ScheduleHandle handle)`                     | `bool`           | Cancels a specific manual repeating task. Returns true if successful. |
| `SetInspectorListenersActive(bool isActive)`                 | `void`           | Mutes or unmutes the scene-based `UnityEvent` listeners at runtime. |

