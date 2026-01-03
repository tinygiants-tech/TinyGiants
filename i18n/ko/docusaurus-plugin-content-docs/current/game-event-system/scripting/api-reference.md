---
sidebar_label: 'API Reference'

sidebar_position: 5
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# API Reference

Complete API reference documentation for the GameEvent system. All event types implement strict type-safe interfaces with comprehensive functionality for event-driven architecture.

:::info Namespace 

All classes and interfaces are located in the `TinyGiants.GameEventSystem.Runtime` namespace.

:::

```csharp
using TinyGiants.GameEventSystem.Runtime;
```

------

## Event Types Overview

The GameEvent system provides three event type variants

| Type                            | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| **`GameEvent`**                 | Parameterless events for simple notifications       |
| **`GameEvent<T>`**              | Single-argument events for passing typed data       |
| **`GameEvent<TSender, TArgs>`** | Dual-argument events for sender-aware communication |

All methods below are available across these types with appropriate parameter variations.

------

## 🚀 Event Raising & Cancellation

<details>
<summary>Raise()</summary>

Triggers the event immediately, invoking all registered listeners in execution order.

**Execution Order**: Basic → Priority → Conditional → Persistent → Triggers → Chains

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void Raise();
```

**Example:**

```csharp
myEvent.Raise();
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void Raise(T argument);
```

**Parameters:**

| Name       | Type | Description                               |
| ---------- | ---- | ----------------------------------------- |
| `argument` | `T`  | The data payload to pass to all listeners |

**Example:**

```csharp
// Raise with float value
healthEvent.Raise(50.5f);

// Raise with custom type
scoreEvent.Raise(new ScoreData { points = 100, combo = 5 });
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void Raise(TSender sender, TArgs args);
```

**Parameters:**

| Name     | Type      | Description                            |
| -------- | --------- | -------------------------------------- |
| `sender` | `TSender` | The source object triggering the event |
| `args`   | `TArgs`   | The data payload to pass to listeners  |

**Example:**

```csharp
// Raise with GameObject sender and damage data
damageEvent.Raise(this.gameObject, new DamageInfo(10));

// Raise with player sender
playerEvent.Raise(playerInstance, new PlayerAction { type = "Jump" });
```

</TabItem> </Tabs>

</details>

<details>
<summary>Cancel()</summary>

Stops any active Inspector-configured scheduled execution (delay or repeating) for this event asset.

```csharp
void Cancel();
```

**Example:**

```csharp
// Stop automatic repeating configured in Inspector
myEvent.Cancel();
```

:::warning Scope Limitation 

This **ONLY** cancels schedules initiated by the Inspector's "Schedule Configuration". It does **NOT** cancel manual schedules created via `RaiseDelayed()` or `RaiseRepeating()`. Use `CancelDelayed(handle)` or `CancelRepeating(handle)` for those. 

:::

</details>

## ⏱️ Time-Based Scheduling

<details>
<summary>RaiseDelayed()</summary>

Schedules the event to fire once after a specified delay.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
ScheduleHandle RaiseDelayed(float delay);
```

**Parameters:**

| Name    | Type    | Description                                      |
| ------- | ------- | ------------------------------------------------ |
| `delay` | `float` | Time in seconds to wait before raising the event |

**Returns:** `ScheduleHandle` - Handle for cancellation

**Example:**

```csharp
// Raise after 5 seconds
ScheduleHandle handle = myEvent.RaiseDelayed(5f);

// Cancel if needed
myEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
ScheduleHandle RaiseDelayed(T argument, float delay);
```

**Parameters:**

| Name       | Type    | Description                                      |
| ---------- | ------- | ------------------------------------------------ |
| `argument` | `T`     | The data to pass when the event executes         |
| `delay`    | `float` | Time in seconds to wait before raising the event |

**Returns:** `ScheduleHandle` - Handle for cancellation

**Example:**

```csharp
// Spawn enemy after 3 seconds
ScheduleHandle handle = spawnEvent.RaiseDelayed(enemyType, 3f);

// Cancel spawn
spawnEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
ScheduleHandle RaiseDelayed(TSender sender, TArgs args, float delay);
```

**Parameters:**

| Name     | Type      | Description                                      |
| -------- | --------- | ------------------------------------------------ |
| `sender` | `TSender` | The sender to pass when the event executes       |
| `args`   | `TArgs`   | The data to pass when the event executes         |
| `delay`  | `float`   | Time in seconds to wait before raising the event |

**Returns:** `ScheduleHandle` - Handle for cancellation

**Example:**

```csharp
// Delayed damage application
ScheduleHandle handle = damageEvent.RaiseDelayed(
    attackerObject, 
    new DamageInfo(25), 
    2f
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RaiseRepeating()</summary>

Schedules the event to fire repeatedly at fixed intervals.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
ScheduleHandle RaiseRepeating(float interval, int repeatCount = -1);
```

**Parameters:**

| Name          | Type    | Description                                                  |
| ------------- | ------- | ------------------------------------------------------------ |
| `interval`    | `float` | Seconds between each execution                               |
| `repeatCount` | `int`   | Number of repetitions. Use `-1` for infinite (default: `-1`) |

**Returns:** `ScheduleHandle` - Handle for cancellation

**Example:**

```csharp
// Repeat 10 times
ScheduleHandle handle = tickEvent.RaiseRepeating(1f, repeatCount: 10);

// Repeat forever (infinite loop)
ScheduleHandle infinite = pulseEvent.RaiseRepeating(0.5f);

// Stop infinite loop
pulseEvent.CancelRepeating(infinite);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
ScheduleHandle RaiseRepeating(T argument, float interval, int repeatCount = -1);
```

**Parameters:**

| Name          | Type    | Description                                                  |
| ------------- | ------- | ------------------------------------------------------------ |
| `argument`    | `T`     | The data to pass with each execution                         |
| `interval`    | `float` | Seconds between each execution                               |
| `repeatCount` | `int`   | Number of repetitions. Use `-1` for infinite (default: `-1`) |

**Returns:** `ScheduleHandle` - Handle for cancellation

**Example:**

```csharp
// Deal damage every second, 5 times
ScheduleHandle poison = damageEvent.RaiseRepeating(5, 1f, repeatCount: 5);

// Spawn waves infinitely every 30 seconds
ScheduleHandle waves = waveEvent.RaiseRepeating(waveData, 30f);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
ScheduleHandle RaiseRepeating(TSender sender, TArgs args, float interval, int repeatCount = -1);
```

**Parameters:**

| Name          | Type      | Description                                                  |
| ------------- | --------- | ------------------------------------------------------------ |
| `sender`      | `TSender` | The sender to pass with each execution                       |
| `args`        | `TArgs`   | The data to pass with each execution                         |
| `interval`    | `float`   | Seconds between each execution                               |
| `repeatCount` | `int`     | Number of repetitions. Use `-1` for infinite (default: `-1`) |

**Returns:** `ScheduleHandle` - Handle for cancellation

**Example:**

```csharp
// Regenerate health every 2 seconds, 10 times
ScheduleHandle regen = healEvent.RaiseRepeating(
    playerObject,
    new HealInfo(5),
    2f,
    repeatCount: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>CancelDelayed()</summary>

Cancels a specific delayed event created with `RaiseDelayed()`.

```csharp
bool CancelDelayed(ScheduleHandle handle);
```

**Parameters:**

| Name     | Type             | Description                             |
| -------- | ---------------- | --------------------------------------- |
| `handle` | `ScheduleHandle` | The handle returned by `RaiseDelayed()` |

**Returns:** `bool` - `true` if successfully cancelled, `false` if already executed or invalid

**Example:**

```csharp
ScheduleHandle handle = explosionEvent.RaiseDelayed(5f);

// Cancel before explosion happens
if (explosionEvent.CancelDelayed(handle))
{
    Debug.Log("Explosion defused!");
}
```

</details>

<details>
<summary>CancelRepeating()</summary>

Cancels a specific repeating event created with `RaiseRepeating()`.

```csharp
bool CancelRepeating(ScheduleHandle handle);
```

**Parameters:**

| Name     | Type             | Description                               |
| -------- | ---------------- | ----------------------------------------- |
| `handle` | `ScheduleHandle` | The handle returned by `RaiseRepeating()` |

**Returns:** `bool` - `true` if successfully cancelled, `false` if already finished or invalid

**Example:**

```csharp
ScheduleHandle handle = tickEvent.RaiseRepeating(1f);

// Stop repeating
if (tickEvent.CancelRepeating(handle))
{
    Debug.Log("Timer stopped!");
}
```

</details>

## 🎧 Listener Management

<details>
<summary>AddListener()</summary>

Registers a basic listener with standard execution priority.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void AddListener(UnityAction call);
```

**Parameters:**

| Name   | Type          | Description                        |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | Callback method with no parameters |

**Example:**

```csharp
myEvent.AddListener(OnEventTriggered);

void OnEventTriggered()
{
    Debug.Log("Event fired!");
}
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void AddListener(UnityAction<T> call);
```

**Parameters:**

| Name   | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | Callback method receiving typed argument |

**Example:**

```csharp
scoreEvent.AddListener(OnScoreChanged);

void OnScoreChanged(int newScore)
{
    Debug.Log($"Score: {newScore}");
}
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void AddListener(UnityAction<TSender, TArgs> call);
```

**Parameters:**

| Name   | Type                          | Description                             |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | Callback receiving sender and arguments |

**Example:**

```csharp
damageEvent.AddListener(OnDamageDealt);

void OnDamageDealt(GameObject attacker, DamageInfo info)
{
    Debug.Log($"{attacker.name} dealt {info.amount} damage");
}
```

</TabItem> </Tabs>

:::tip Duplicate Prevention 

If the listener already exists, it will be removed and re-added to prevent duplicates. 

:::

</details>

<details>
<summary>RemoveListener()</summary>

Unregisters a basic listener from the event.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void RemoveListener(UnityAction call);
```

**Parameters:**

| Name   | Type          | Description                        |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | Callback method with no parameters |

**Example:**

```csharp
myEvent.RemoveListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void RemoveListener(UnityAction<T> call);
```

**Parameters:**

| Name   | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | Callback method receiving typed argument |

**Example:**

```csharp
scoreEvent.RemoveListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void RemoveListener(UnityAction<TSender, TArgs> call);
```

**Parameters:**

| Name   | Type                          | Description                             |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | Callback receiving sender and arguments |

**Example:**

```csharp
damageEvent.RemoveListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveAllListeners()</summary>

Clears all Basic, Priority, and Conditional listeners from the event.

```csharp
void RemoveAllListeners();
```

**Example:**

```csharp
// Clean up all listeners
myEvent.RemoveAllListeners();
```

:::warning Scope 

Does **NOT** remove Persistent listeners or Trigger/Chain events for safety reasons. 

:::

</details>

<details>
<summary>AddPriorityListener()</summary>

Registers a listener with explicit execution priority. Higher priority values execute first.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void AddPriorityListener(UnityAction call, int priority);
```

**Parameters:**

| Name       | Type          | Description                                       |
| ---------- | ------------- | ------------------------------------------------- |
| `call`     | `UnityAction` | Callback method                                   |
| `priority` | `int`         | Execution priority (higher = earlier, default: 0) |

**Example:**

```csharp
myEvent.AddPriorityListener(CriticalHandler, 100);
myEvent.AddPriorityListener(NormalHandler, 50);
myEvent.AddPriorityListener(LowPriorityHandler, 10);
// Execution order: CriticalHandler → NormalHandler → LowPriorityHandler
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void AddPriorityListener(UnityAction<T> call, int priority);
```

**Parameters:**

| Name       | Type             | Description                                       |
| ---------- | ---------------- | ------------------------------------------------- |
| `call`     | `UnityAction<T>` | Callback method                                   |
| `priority` | `int`            | Execution priority (higher = earlier, default: 0) |

**Example:**

```csharp
healthEvent.AddPriorityListener(UpdateUI, 100);
healthEvent.AddPriorityListener(PlaySound, 50);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void AddPriorityListener(UnityAction<TSender, TArgs> call, int priority);
```

**Parameters:**

| Name       | Type                          | Description                                       |
| ---------- | ----------------------------- | ------------------------------------------------- |
| `call`     | `UnityAction<TSender, TArgs>` | Callback method                                   |
| `priority` | `int`                         | Execution priority (higher = earlier, default: 0) |

**Example:**

```csharp
attackEvent.AddPriorityListener(ProcessCombat, 100);
attackEvent.AddPriorityListener(ShowVFX, 50);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemovePriorityListener()</summary>

Unregisters a priority listener.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void RemovePriorityListener(UnityAction call);
```

**Parameters:**

| Name   | Type          | Description                        |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | Callback method with no parameters |

**Example:**

```csharp
myEvent.RemovePriorityListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void RemovePriorityListener(UnityAction<T> call);
```

**Parameters:**

| Name   | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | Callback method receiving typed argument |

**Example:**

```csharp
scoreEvent.RemovePriorityListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void RemovePriorityListener(UnityAction<TSender, TArgs> call);
```

**Parameters:**

| Name   | Type                          | Description                             |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | Callback receiving sender and arguments |

**Example:**

```csharp
damageEvent.RemovePriorityListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddConditionalListener()</summary>

Registers a listener that only executes when a condition evaluates to true.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void AddConditionalListener(UnityAction call, Func<bool> condition, int priority = 0);
```

**Parameters:**

| Name        | Type          | Description                                |
| ----------- | ------------- | ------------------------------------------ |
| `call`      | `UnityAction` | Callback method                            |
| `condition` | `Func<bool>`  | Predicate function (null = always execute) |
| `priority`  | `int`         | Execution priority (default: 0)            |

**Example:**

```csharp
myEvent.AddConditionalListener(
    OnHealthLow,
    () => playerHealth < 20,
    priority: 10
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority = 0);
```

**Parameters:**

| Name        | Type             | Description                      |
| ----------- | ---------------- | -------------------------------- |
| `call`      | `UnityAction<T>` | Callback method                  |
| `condition` | `Func<T, bool>`  | Predicate receiving the argument |
| `priority`  | `int`            | Execution priority (default: 0)  |

**Example:**

```csharp
scoreEvent.AddConditionalListener(
    OnHighScore,
    score => score > 1000,
    priority: 5
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void AddConditionalListener(
    UnityAction<TSender, TArgs> call, 
    Func<TSender, TArgs, bool> condition,
    int priority = 0
);
```

**Parameters:**

| Name        | Type                          | Description                              |
| ----------- | ----------------------------- | ---------------------------------------- |
| `call`      | `UnityAction<TSender, TArgs>` | Callback method                          |
| `condition` | `Func<TSender, TArgs, bool>`  | Predicate receiving sender and arguments |
| `priority`  | `int`                         | Execution priority (default: 0)          |

**Example:**

```csharp
damageEvent.AddConditionalListener(
    OnCriticalHit,
    (attacker, info) => info.isCritical,
    priority: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveConditionalListener()</summary>

Unregisters a conditional listener.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void RemoveConditionalListener(UnityAction call);
```

**Parameters:**

| Name   | Type          | Description                        |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | Callback method with no parameters |

**Example:**

```csharp
myEvent.RemoveConditionalListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void RemoveConditionalListener(UnityAction<T> call);
```

**Parameters:**

| Name   | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | Callback method receiving typed argument |

**Example:**

```csharp
scoreEvent.RemoveConditionalListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void RemoveConditionalListener(UnityAction<TSender, TArgs> call);
```

**Parameters:**

| Name   | Type                          | Description                             |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | Callback receiving sender and arguments |

**Example:**

```csharp
damageEvent.RemoveConditionalListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddPersistentListener()</summary>

Registers a global listener that survives scene changes (DontDestroyOnLoad).

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void AddPersistentListener(UnityAction call, int priority = 0);
```

**Parameters:**

| Name       | Type          | Description                     |
| ---------- | ------------- | ------------------------------- |
| `call`     | `UnityAction` | Callback method                 |
| `priority` | `int`         | Execution priority (default: 0) |

**Example:**

```csharp
globalEvent.AddPersistentListener(OnGlobalAction, priority: 100);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void AddPersistentListener(UnityAction<T> call, int priority = 0);
```

**Parameters:**

| Name       | Type             | Description                     |
| ---------- | ---------------- | ------------------------------- |
| `call`     | `UnityAction<T>` | Callback method                 |
| `priority` | `int`            | Execution priority (default: 0) |

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void AddPersistentListener(UnityAction<TSender, TArgs> call, int priority = 0);
```

**Parameters:**

| Name       | Type                          | Description                     |
| ---------- | ----------------------------- | ------------------------------- |
| `call`     | `UnityAction<TSender, TArgs>` | Callback method                 |
| `priority` | `int`                         | Execution priority (default: 0) |

</TabItem> </Tabs>

:::info Persistence 

Persistent listeners remain active across scene loads. Use for global systems like save management or analytics. 

:::

</details>

<details>
<summary>RemovePersistentListener()</summary>

Unregisters a persistent listener.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
void RemovePersistentListener(UnityAction call);
```

**Parameters:**

| Name   | Type          | Description                        |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | Callback method with no parameters |

**Example:**

```csharp
myEvent.RemovePersistentListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
void RemovePersistentListener(UnityAction<T> call);
```

**Parameters:**

| Name   | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | Callback method receiving typed argument |

**Example:**

```csharp
scoreEvent.RemovePersistentListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
void RemovePersistentListener(UnityAction<TSender, TArgs> call);
```

**Parameters:**

| Name   | Type                          | Description                             |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | Callback receiving sender and arguments |

**Example:**

```csharp
damageEvent.RemovePersistentListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

## ⚡ Trigger Events (Fan-Out Pattern)

<details>
<summary>AddTriggerEvent()</summary>

Registers a target event to be triggered automatically when this event is raised.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<bool> condition = null,
    int priority = 0
);
```

**Parameters:**

| Name          | Type            | Description                                             |
| ------------- | --------------- | ------------------------------------------------------- |
| `targetEvent` | `GameEventBase` | The event to trigger                                    |
| `delay`       | `float`         | Optional delay in seconds (default: 0)                  |
| `condition`   | `Func<bool>`    | Optional predicate to gate execution                    |
| `priority`    | `int`           | Execution order relative to other triggers (default: 0) |

**Returns:** `TriggerHandle` - Unique identifier for safe removal

**Example:**

```csharp
// Simple trigger: door opens → light turns on
doorOpenEvent.AddTriggerEvent(lightOnEvent);

// Delayed trigger: explosion after 2 seconds
fuseEvent.AddTriggerEvent(explosionEvent, delay: 2f);

// Conditional trigger
doorOpenEvent.AddTriggerEvent(
    alarmEvent,
    condition: () => isNightTime
);

// Priority-ordered triggers
bossDefeatedEvent.AddTriggerEvent(stopMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(victoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(showRewardsEvent, priority: 50);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    int priority = 0
);
```

**Parameters:**

| Name                  | Type              | Description                                    |
| --------------------- | ----------------- | ---------------------------------------------- |
| `targetEvent`         | `GameEventBase`   | The event to trigger                           |
| `delay`               | `float`           | Optional delay in seconds (default: 0)         |
| `condition`           | `Func<T, bool>`   | Optional predicate receiving the argument      |
| `passArgument`        | `bool`            | Whether to pass data to target (default: true) |
| `argumentTransformer` | `Func<T, object>` | Optional function to transform data            |
| `priority`            | `int`             | Execution priority (default: 0)                |

**Returns:** `TriggerHandle` - Unique identifier for safe removal

**Example:**

```csharp
// Pass argument directly
GameEvent<int> scoreEvent;
GameEvent<int> updateUIEvent;
scoreEvent.AddTriggerEvent(updateUIEvent, passArgument: true);

// Transform argument: int → string
GameEvent<int> scoreEvent;
GameEvent<string> notificationEvent;
scoreEvent.AddTriggerEvent(
    notificationEvent,
    passArgument: true,
    argumentTransformer: score => $"Score: {score}"
);

// Conditional with argument check
GameEvent<float> healthEvent;
GameEvent lowHealthWarningEvent;
healthEvent.AddTriggerEvent(
    lowHealthWarningEvent,
    condition: health => health < 20f,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    int priority = 0
);
```

**Parameters:**

| Name                  | Type                           | Description                                    |
| --------------------- | ------------------------------ | ---------------------------------------------- |
| `targetEvent`         | `GameEventBase`                | The event to trigger                           |
| `delay`               | `float`                        | Optional delay in seconds (default: 0)         |
| `condition`           | `Func<TSender, TArgs, bool>`   | Optional predicate receiving sender and args   |
| `passArgument`        | `bool`                         | Whether to pass data to target (default: true) |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | Optional transformation function               |
| `priority`            | `int`                          | Execution priority (default: 0)                |

**Returns:** `TriggerHandle` - Unique identifier for safe removal

**Example:**

```csharp
// Pass sender and args to another sender event
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent<GameObject, DamageInfo> logEvent;
damageEvent.AddTriggerEvent(logEvent, passArgument: true);

// Transform: extract damage value only
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent<int> damageNumberEvent;
damageEvent.AddTriggerEvent(
    damageNumberEvent,
    passArgument: true,
    argumentTransformer: (sender, info) => info.amount
);

// Conditional based on sender and args
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent criticalHitEvent;
damageEvent.AddTriggerEvent(
    criticalHitEvent,
    condition: (sender, info) => 
        info.isCritical && sender.CompareTag("Player"),
    passArgument: false
);
```

</TabItem> </Tabs>

:::tip Fan-Out Pattern 

Triggers execute in **parallel** - each trigger is independent. If one trigger's condition fails or throws an exception, other triggers still execute. 

:::

</details>

<details>
<summary>RemoveTriggerEvent() (by Handle)</summary>

Safely removes a specific trigger using its unique handle.

```csharp
void RemoveTriggerEvent(TriggerHandle handle);
```

**Parameters:**

| Name     | Type            | Description                                |
| -------- | --------------- | ------------------------------------------ |
| `handle` | `TriggerHandle` | The handle returned by `AddTriggerEvent()` |

**Example:**

```csharp
TriggerHandle handle = doorEvent.AddTriggerEvent(lightEvent);

// Remove specific trigger
doorEvent.RemoveTriggerEvent(handle);
```

:::tip Recommended 

This is the **safest** removal method as it only removes your specific trigger instance. 

:::

</details>

<details>
<summary>RemoveTriggerEvent() (by Target)</summary>

Removes **all** triggers pointing to a specific target event.

```csharp
void RemoveTriggerEvent(GameEventBase targetEvent);
```

**Parameters:**

| Name          | Type            | Description                    |
| ------------- | --------------- | ------------------------------ |
| `targetEvent` | `GameEventBase` | The target event to disconnect |

**Example:**

```csharp
doorEvent.RemoveTriggerEvent(lightEvent);
```

:::warning Broad Impact 

This removes **ALL** triggers targeting this event, including those registered by other systems. Use `RemoveTriggerEvent(handle)` for precision. 

:::

</details>

<details>
<summary>RemoveAllTriggerEvents()</summary>

Removes all trigger events from this event.

```csharp
void RemoveAllTriggerEvents();
```

**Example:**

```csharp
myEvent.RemoveAllTriggerEvents();
```

</details>

## 🔗 Chain Events (Sequential Pattern)

<details>
<summary>AddChainEvent()</summary>

Registers a target event to execute sequentially in a chain.

<Tabs> <TabItem value="void" label="GameEvent" default>

```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<bool> condition = null,
    bool waitForCompletion = false
);
```

**Parameters:**

| Name                | Type            | Description                                     |
| ------------------- | --------------- | ----------------------------------------------- |
| `targetEvent`       | `GameEventBase` | The event to execute in the chain               |
| `delay`             | `float`         | Delay before executing this node (default: 0)   |
| `duration`          | `float`         | Delay after executing this node (default: 0)    |
| `condition`         | `Func<bool>`    | Optional predicate - chain breaks if false      |
| `waitForCompletion` | `bool`          | Wait one frame after execution (default: false) |

**Returns:** `ChainHandle` - Unique identifier for safe removal

**Example:**

```csharp
// Simple sequence: A → B → C
eventA.AddChainEvent(eventB);
eventB.AddChainEvent(eventC);

// Cutscene with delays
fadeOutEvent.AddChainEvent(loadSceneEvent, delay: 1f);
loadSceneEvent.AddChainEvent(fadeInEvent, delay: 0.5f);

// Conditional chain: only continue if condition met
combatEndEvent.AddChainEvent(
    victoryEvent,
    condition: () => playerHealth > 0
);

// Chain with frame wait for async operations
showDialogEvent.AddChainEvent(
    typeTextEvent,
    waitForCompletion: true
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">

```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**Parameters:**

| Name                  | Type              | Description                                     |
| --------------------- | ----------------- | ----------------------------------------------- |
| `targetEvent`         | `GameEventBase`   | The event to execute in the chain               |
| `delay`               | `float`           | Delay before executing this node (default: 0)   |
| `duration`            | `float`           | Delay after executing this node (default: 0)    |
| `condition`           | `Func<T, bool>`   | Optional predicate receiving the argument       |
| `passArgument`        | `bool`            | Whether to pass data to target (default: true)  |
| `argumentTransformer` | `Func<T, object>` | Optional transformation function                |
| `waitForCompletion`   | `bool`            | Wait one frame after execution (default: false) |

**Returns:** `ChainHandle` - Unique identifier for safe removal

**Example:**

```csharp
// Chain with argument passing
GameEvent<int> damageEvent;
GameEvent<int> applyDamageEvent;
GameEvent<int> updateHealthBarEvent;

damageEvent.AddChainEvent(applyDamageEvent, passArgument: true);
applyDamageEvent.AddChainEvent(updateHealthBarEvent, passArgument: true);

// Chain with transformation
GameEvent<int> damageEvent;
GameEvent<float> healthPercentEvent;

damageEvent.AddChainEvent(
    healthPercentEvent,
    passArgument: true,
    argumentTransformer: damage => 
        (float)(currentHealth - damage) / maxHealth
);

// Conditional chain with argument check
GameEvent<int> damageEvent;
GameEvent deathEvent;

damageEvent.AddChainEvent(
    deathEvent,
    condition: damage => (currentHealth - damage) <= 0,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">

```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**Parameters:**

| Name                  | Type                           | Description                                     |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| `targetEvent`         | `GameEventBase`                | The event to execute in the chain               |
| `delay`               | `float`                        | Delay before executing this node (default: 0)   |
| `duration`            | `float`                        | Delay after executing this node (default: 0)    |
| `condition`           | `Func<TSender, TArgs, bool>`   | Optional predicate receiving sender and args    |
| `passArgument`        | `bool`                         | Whether to pass data to target (default: true)  |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | Optional transformation function                |
| `waitForCompletion`   | `bool`                         | Wait one frame after execution (default: false) |

**Returns:** `ChainHandle` - Unique identifier for safe removal

**Example:**

```csharp
// Attack sequence chain
GameEvent<GameObject, AttackData> attackStartEvent;
GameEvent<GameObject, AttackData> playAnimationEvent;
GameEvent<GameObject, AttackData> dealDamageEvent;

attackStartEvent.AddChainEvent(playAnimationEvent, delay: 0f);
playAnimationEvent.AddChainEvent(dealDamageEvent, delay: 0.5f);

// Extract damage value
GameEvent<GameObject, AttackData> dealDamageEvent;
GameEvent<int> showDamageNumberEvent;

dealDamageEvent.AddChainEvent(
    showDamageNumberEvent,
    passArgument: true,
    argumentTransformer: (attacker, data) => data.damage
);

// Victory chain with condition
GameEvent<GameObject, AttackData> attackEndEvent;
GameEvent<GameObject, VictoryData> victoryEvent;

attackEndEvent.AddChainEvent(
    victoryEvent,
    condition: (attacker, data) => data.targetHealth <= 0,
    argumentTransformer: (attacker, data) => 
        new VictoryData { winner = attacker }
);
```

</TabItem> </Tabs>

:::warning Sequential Execution 

Chains are **sequential** (A → B → C). If any node's condition returns `false` or throws an exception, the entire chain **stops** at that point. 

:::

:::tip Triggers vs Chains

- **Triggers** = Parallel (A → [B, C, D]) - all execute independently
- **Chains** = Sequential (A → B → C) - strict order, stops on failure 

:::

</details>

<details>
<summary>RemoveChainEvent() (by Handle)</summary>

Safely removes a specific chain node using its unique handle.

```csharp
void RemoveChainEvent(ChainHandle handle);
```

**Parameters:**

| Name     | Type          | Description                              |
| -------- | ------------- | ---------------------------------------- |
| `handle` | `ChainHandle` | The handle returned by `AddChainEvent()` |

**Example:**

```csharp
ChainHandle handle = eventA.AddChainEvent(eventB);

// Remove specific chain node
eventA.RemoveChainEvent(handle);
```

</details>

<details>
<summary>RemoveChainEvent() (by Target)</summary>

Removes **all** chain nodes pointing to a specific target event.

```csharp
void RemoveChainEvent(GameEventBase targetEvent);
```

**Parameters:**

| Name          | Type            | Description                    |
| ------------- | --------------- | ------------------------------ |
| `targetEvent` | `GameEventBase` | The target event to disconnect |

**Example:**

```csharp
eventA.RemoveChainEvent(eventB);
```

:::warning Broad Impact 

This removes **ALL** chain nodes targeting this event. Use `RemoveChainEvent(handle)` for precision. 

:::

</details>

<details>
<summary>RemoveAllChainEvents()</summary>

Removes all chain events from this event.

```csharp
void RemoveAllChainEvents();
```

**Example:**

```csharp
myEvent.RemoveAllChainEvents();
```

</details>

## 🔧 Configuration & Utility

<details>
<summary>SetInspectorListenersActive()</summary>

Controls whether Inspector-configured listeners should execute when the event is raised.

```csharp
void SetInspectorListenersActive(bool isActive);
```

**Parameters:**

| Name       | Type   | Description                                                |
| ---------- | ------ | ---------------------------------------------------------- |
| `isActive` | `bool` | `true` to enable Inspector listeners, `false` to mute them |

**Example:**

```csharp
// Mute Inspector-configured UI/Audio effects
damageEvent.SetInspectorListenersActive(false);

// Event will only trigger code-registered listeners
damageEvent.Raise(10);

// Re-enable Inspector listeners
damageEvent.SetInspectorListenersActive(true);
```

**Use Cases:**

- Temporarily silence visual/audio effects during cutscenes
- Run backend calculations without triggering UI updates
- Disable scene-specific behavior during loading screens
- Simulate game logic in test/debug mode

:::info Scope 

This setting only affects listeners configured in the **Unity Inspector** via GameEventManager. Listeners registered via `AddListener()` in code are **not affected** and will always execute. 

:::

</details>

------

## 📊 Quick Reference Table

### Method Categories

| Category                  | Methods                                                      | Purpose                                     |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| **Execution**             | `Raise()`, `Cancel()`                                        | Trigger events and stop scheduled execution |
| **Scheduling**            | `RaiseDelayed()`, `RaiseRepeating()`, `CancelDelayed()`, `CancelRepeating()` | Time-based event execution                  |
| **Basic Listeners**       | `AddListener()`, `RemoveListener()`, `RemoveAllListeners()`  | Standard callback registration              |
| **Priority Listeners**    | `AddPriorityListener()`, `RemovePriorityListener()`          | Ordered callback execution                  |
| **Conditional Listeners** | `AddConditionalListener()`, `RemoveConditionalListener()`    | Gated callback execution                    |
| **Persistent Listeners**  | `AddPersistentListener()`, `RemovePersistentListener()`      | Scene-independent callbacks                 |
| **Trigger Events**        | `AddTriggerEvent()`, `RemoveTriggerEvent()`, `RemoveAllTriggerEvents()` | Parallel event chains                       |
| **Chain Events**          | `AddChainEvent()`, `RemoveChainEvent()`, `RemoveAllChainEvents()` | Sequential event chains                     |
| **Configuration**         | `SetInspectorListenersActive()`                              | Runtime behavior control                    |
