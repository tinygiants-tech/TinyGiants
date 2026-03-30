---
slug: raising-and-scheduling-api
title: "Raise, RaiseDelayed, RaiseRepeating: The Complete Event Scheduling API Guide"
authors: [tinygiants]
tags: [ges, unity, scripting, tutorial, advanced]
description: "Stop writing coroutines for delayed events. GES gives you one-liner scheduling with delays, repeats, lifecycle callbacks, and cancellation — all handle-managed."
image: /img/home-page/game-event-system-preview.png
---

You want to delay an explosion by 2 seconds after a grenade lands. In vanilla Unity, that's a coroutine — `IEnumerator DelayedExplosion()`, yield return `new WaitForSeconds(2f)`, the actual explosion logic, plus you need to store the `Coroutine` reference so you can cancel it if the grenade gets shot mid-air, plus null-check the game object because maybe it got destroyed during the wait. Twenty-ish lines of code for what is conceptually a single operation: "raise this event in 2 seconds."

Or you write one line: `explosionEvent.RaiseDelayed(2f)`. You get back a handle. You can cancel it, attach lifecycle callbacks, and forget about coroutine management entirely. That's what GES scheduling is about — collapsing the ceremony around timed event execution into a clean, handle-managed API.

This post walks through every scheduling method GES offers, from immediate raises to repeating loops, with the lifecycle callbacks and cancellation patterns that make them production-ready.

<!-- truncate -->

## Immediate Execution: The Three Raise() Overloads

Before we get to the fancy scheduling stuff, let's nail down the basics. GES supports three event type signatures, and each one has a corresponding `Raise()` call.

### Void Events (No Arguments)

The simplest case. Something happened, no data attached.

```csharp
// Create or reference the event
[GameEventDropdown, SerializeField] private GameEvent onPlayerDied;

// Raise it
onPlayerDied.Raise();
```

Every listener subscribed to `onPlayerDied` fires immediately, in the same frame. No allocation, no delay, no coroutine. This is your bread and butter for notifications — "something happened, react to it."

### Typed Events (Single Argument)

When you need to pass data with the event.

```csharp
// A typed event carrying damage info
[GameEventDropdown, SerializeField] private GameEventInt onDamageDealt;

// Raise with data
onDamageDealt.Raise(42);
```

The argument gets passed to every listener. The type safety here is enforced at compile time — you can't accidentally raise an `int` event with a `string`. This matters when you have dozens of events and a refactor changes a data type.

### Sender Events (Sender + Arguments)

When listeners need to know both *who* sent the event and *what* the data is.

```csharp
// Sender event: who dealt how much damage
[GameEventDropdown, SerializeField] private GameEventSenderInt onDamageFromSource;

// Raise with sender context
onDamageFromSource.Raise(this, 42);
```

The sender reference lets listeners do things like "ignore damage from friendlies" or "track damage per source for kill attribution." It's the same pattern as C#'s `EventHandler<T>` but without the boilerplate class hierarchies.

All three overloads execute synchronously. The event fires, all listeners execute in order, and control returns to your code. No frames skipped, no async weirdness.

## Delayed Execution: RaiseDelayed()

Now things get interesting. `RaiseDelayed()` schedules an event to fire after a specified delay in seconds. It uses Unity's coroutine system under the hood, but you never touch coroutines directly.

### Void Delayed

```csharp
ScheduleHandle handle = onExplosion.RaiseDelayed(2f);
```

That's it. Two seconds from now, `onExplosion` fires. The returned `ScheduleHandle` is your ticket to managing this scheduled execution — more on that in a moment.

### Typed Delayed

```csharp
ScheduleHandle handle = onDamageDealt.RaiseDelayed(50, 1.5f);
```

Deal 50 damage after 1.5 seconds. The argument is captured at call time, not at execution time. This is important — if you're passing a variable, its value at the moment you call `RaiseDelayed()` is what gets used, not whatever the variable holds 1.5 seconds later.

### Sender Delayed

```csharp
ScheduleHandle handle = onDamageFromSource.RaiseDelayed(this, 50, 1.5f);
```

Same pattern. Sender and args are both captured immediately.

![Delayed Event Behavior](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

### What Happens Under the Hood

GES spins up a managed coroutine on a persistent runner object. You don't need to worry about the coroutine's lifecycle — it's handled internally. If you cancel the handle, the coroutine stops. If the application quits, outstanding scheduled events are cleaned up automatically.

The delay uses `WaitForSeconds`, which respects `Time.timeScale`. If you pause your game by setting `timeScale` to 0, delayed events pause too. This is usually what you want — a grenade's fuse shouldn't tick during a pause menu.

![Delayed Event Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

## Repeating Execution: RaiseRepeating()

`RaiseRepeating()` fires an event on a regular interval, either a fixed number of times or indefinitely.

### Finite Repetition

```csharp
// Poison damage: 10 damage every 1 second, 5 times total
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);
```

This fires the event 5 times, once per second. After the 5th execution, the schedule completes naturally and the handle becomes inactive.

The `count` parameter is the total number of executions, not the number of *repeats*. So `count: 5` means the event fires 5 times, not "once initially plus 5 repeats."

![Repeating Event Finite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

### Infinite Repetition

```csharp
// Radar scan: ping every 2 seconds, forever
ScheduleHandle handle = onRadarPing.RaiseRepeating(interval: 2f, count: -1);
```

Pass `count: -1` for infinite repetition. The event keeps firing every 2 seconds until you explicitly cancel the handle. This is your pattern for heartbeat systems, polling loops, ambient effects, and anything that runs indefinitely during gameplay.

![Repeating Event Infinite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

### Practical Examples

**Poison damage over time:**

```csharp
public class PoisonEffect : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEventInt onPoisonDamage;

    private ScheduleHandle _poisonHandle;

    public void ApplyPoison(int damagePerTick, float interval, int ticks)
    {
        // Cancel any existing poison first
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);

        _poisonHandle = onPoisonDamage.RaiseRepeating(
            damagePerTick,
            interval: interval,
            count: ticks
        );

        _poisonHandle.OnCompleted(() =>
        {
            Debug.Log("Poison effect expired naturally");
        });
    }

    public void CurePoison()
    {
        if (_poisonHandle.IsActive)
        {
            onPoisonDamage.CancelRepeating(_poisonHandle);
            Debug.Log("Poison cured!");
        }
    }
}
```

**Radar/sonar scanning:**

```csharp
public class RadarSystem : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onRadarPing;

    private ScheduleHandle _scanHandle;

    private void OnEnable()
    {
        _scanHandle = onRadarPing.RaiseRepeating(interval: 2f, count: -1);

        _scanHandle.OnStep((remaining) =>
        {
            // remaining is -1 for infinite loops
            Debug.Log("Radar ping sent");
        });
    }

    private void OnDisable()
    {
        if (_scanHandle.IsActive)
            onRadarPing.CancelRepeating(_scanHandle);
    }
}
```

## ScheduleHandle Lifecycle Callbacks

The `ScheduleHandle` returned by `RaiseDelayed()` and `RaiseRepeating()` isn't just for cancellation. It supports three lifecycle callbacks that let you react to what happens during and after the scheduled execution.

### OnStep: After Each Execution

```csharp
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);

handle.OnStep((remainingCount) =>
{
    Debug.Log($"Poison tick! {remainingCount} ticks remaining");
    // Output: "Poison tick! 4 ticks remaining"
    // Output: "Poison tick! 3 ticks remaining"
    // ... etc
});
```

`OnStep` fires after each individual execution of the event. The `remainingCount` parameter tells you how many executions are left. For infinite loops (`count: -1`), this value is always `-1`.

This is great for updating UI — think a countdown timer display, a progress bar for a channeled ability, or a visual indicator for remaining poison stacks.

For delayed events (single execution), `OnStep` fires once, right after the event raises, with `remainingCount` of `0`.

### OnCompleted: Natural Completion

```csharp
handle.OnCompleted(() =>
{
    Debug.Log("All poison ticks finished");
    RemovePoisonVisualEffect();
});
```

`OnCompleted` fires when the schedule finishes all its planned executions. This only fires for finite schedules — infinite loops never complete naturally (they must be cancelled).

For `RaiseDelayed()`, `OnCompleted` fires after the single delayed execution. This is the clean way to chain actions after a delay without nesting coroutines.

### OnCancelled: Manual Cancellation

```csharp
handle.OnCancelled(() =>
{
    Debug.Log("Poison was cured early!");
    PlayCureParticleEffect();
});
```

`OnCancelled` fires when you manually cancel the schedule via `Cancel()`, `CancelDelayed()`, or `CancelRepeating()`. It does NOT fire on natural completion — the two callbacks are mutually exclusive.

This distinction matters. If poison runs out naturally, you might show a "poison expired" message. If it's cured, you might play a cure animation. `OnCompleted` vs `OnCancelled` lets you differentiate without tracking state yourself.

### Chaining Callbacks

All three callbacks return the handle, so you can chain them fluently:

```csharp
ScheduleHandle handle = onCountdown.RaiseRepeating(interval: 1f, count: 10)
    .OnStep((remaining) => UpdateCountdownUI(remaining))
    .OnCompleted(() => TriggerLaunch())
    .OnCancelled(() => AbortLaunch());
```

Ten lines of coroutine code with state tracking, compressed into a readable chain. This is one of those API patterns that feels obvious in hindsight but saves real cognitive load on every usage.

## Cancellation Patterns

Every scheduled event can be cancelled. The API provides three cancellation methods corresponding to the three scheduling types.

### Cancel() — General Purpose

```csharp
handle.Cancel();
```

Works on any active handle, regardless of whether it was created by `RaiseDelayed()` or `RaiseRepeating()`.

### CancelDelayed(handle) — Via the Event

```csharp
onExplosion.CancelDelayed(handle);
```

Cancels a specific delayed schedule through the event that owns it. Functionally equivalent to `handle.Cancel()`, but reads more clearly when you're managing multiple handles and want to emphasize which event you're operating on.

### CancelRepeating(handle) — Via the Event

```csharp
onRadarPing.CancelRepeating(handle);
```

Same pattern for repeating schedules. Cancel through the event reference.

### Safe Cancellation Pattern

Always check `IsActive` before cancelling if there's any possibility the handle already completed or was already cancelled:

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

Cancelling an already-inactive handle is a no-op (it won't throw), but checking `IsActive` makes your intent clearer and avoids unnecessary work.

## Inspector Auto-Scheduling Integration

Here's something that trips people up initially: the scheduling API and the Inspector's Behavior window work together. When you configure delay and repeat settings in the Inspector on a GameEventBehavior component, those settings are respected when the behavior raises the event.

![Behavior Schedule](/img/game-event-system/visual-workflow/game-event-behavior/behavior-schedule.png)

The Behavior component has fields for:
- **Delay**: how long to wait before the first raise
- **Repeat Count**: how many times to repeat (0 = once, -1 = infinite)
- **Repeat Interval**: time between repeats

These map directly to `RaiseDelayed()` and `RaiseRepeating()` under the hood. When a designer configures a behavior to fire with a 2-second delay and 3 repeats at 1-second intervals, that's equivalent to calling `RaiseDelayed(2f)` followed by `RaiseRepeating(interval: 1f, count: 3)`.

The beauty here is that designers can tune timing in the Inspector without touching code, and programmers can override or extend the same timing in scripts. Both paths produce the same `ScheduleHandle` management.

## Complete Scenario: Bomb Defusal

Let's put everything together with a realistic game scenario. A bomb is planted. It has a 30-second fuse with a visible countdown. Players can attempt to defuse it. If they succeed, the bomb is disarmed. If they fail, it explodes.

```csharp
public class BombController : MonoBehaviour
{
    [Header("Events")]
    [GameEventDropdown, SerializeField] private GameEvent onBombExplode;
    [GameEventDropdown, SerializeField] private GameEventInt onCountdownTick;
    [GameEventDropdown, SerializeField] private GameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private GameEvent onBombArmed;

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

        // Notify everyone the bomb is live
        onBombArmed.Raise();

        // Schedule the explosion
        _explosionHandle = onBombExplode.RaiseDelayed(fuseTime);
        _explosionHandle.OnCompleted(() =>
        {
            Debug.Log("BOOM! Bomb exploded.");
            // Explosion effects, damage, etc. handled by listeners
        });

        // Schedule countdown ticks for UI
        int totalTicks = Mathf.FloorToInt(fuseTime / tickInterval);
        _countdownHandle = onCountdownTick.RaiseRepeating(
            totalTicks,
            interval: tickInterval,
            count: totalTicks
        );

        _countdownHandle.OnStep((remaining) =>
        {
            // The argument (totalTicks) was captured at start,
            // but remaining tells us the real countdown
            Debug.Log($"Tick... {remaining} seconds left");
        });
    }

    public void AttemptDefusal(float defuseProgress)
    {
        if (!_isArmed) return;

        if (defuseProgress >= 1f)
        {
            // Successfully defused!
            _isArmed = false;

            // Cancel the explosion
            if (_explosionHandle.IsActive)
                _explosionHandle.Cancel();

            // Cancel the countdown
            if (_countdownHandle.IsActive)
                _countdownHandle.Cancel();

            // The OnCancelled callbacks fire here
            _explosionHandle.OnCancelled(() =>
            {
                Debug.Log("Explosion cancelled — bomb defused!");
            });

            // Notify systems
            onBombDefused.Raise();
        }
    }

    private void OnDisable()
    {
        // Clean up if object is destroyed mid-countdown
        if (_explosionHandle.IsActive)
            _explosionHandle.Cancel();
        if (_countdownHandle.IsActive)
            _countdownHandle.Cancel();
    }
}
```

And the UI side, completely decoupled:

```csharp
public class BombUI : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEventInt onCountdownTick;
    [GameEventDropdown, SerializeField] private GameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private GameEvent onBombExplode;
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

        // Flash red in the last 5 seconds
        if (secondsRemaining <= 5)
            countdownText.color = Color.red;
    }

    private void ShowDefusedMessage()
    {
        countdownText.text = "DEFUSED";
        countdownText.color = Color.green;
    }

    private void ShowExplosionScreen()
    {
        bombPanel.SetActive(false);
        // Trigger screen shake, flash, etc.
    }
}
```

Notice what's happening here. The `BombController` knows nothing about the UI. The `BombUI` knows nothing about the bomb's internal state. They communicate entirely through events with scheduling. The bomb schedules its own explosion and countdown. The UI listens and reacts. Defusal cancels the schedules, and the lifecycle callbacks handle the state transitions cleanly.

No coroutines written by hand. No `Update()` loops tracking elapsed time. No cross-references between game objects. Just events, schedules, and handles.

## Quick Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `Raise()` | void | Immediate execution |
| `Raise(arg)` | void | Immediate with argument |
| `Raise(sender, args)` | void | Immediate with sender + args |
| `RaiseDelayed(delay)` | ScheduleHandle | Delayed void event |
| `RaiseDelayed(arg, delay)` | ScheduleHandle | Delayed typed event |
| `RaiseDelayed(sender, args, delay)` | ScheduleHandle | Delayed sender event |
| `RaiseRepeating(interval, count)` | ScheduleHandle | Repeating void event |
| `RaiseRepeating(arg, interval, count)` | ScheduleHandle | Repeating typed event |
| `handle.OnStep(callback)` | ScheduleHandle | After each execution |
| `handle.OnCompleted(callback)` | ScheduleHandle | After natural completion |
| `handle.OnCancelled(callback)` | ScheduleHandle | After manual cancellation |
| `handle.Cancel()` | void | Cancel the schedule |
| `handle.IsActive` | bool | Check if still running |

## When to Use What

**Use `Raise()`** for immediate notifications: player died, button clicked, item picked up. No timing involved.

**Use `RaiseDelayed()`** for one-shot timed events: explosion after fuse, dialogue after cutscene, respawn after death timer. Anything that happens once after a wait.

**Use `RaiseRepeating()` with finite count** for damage-over-time, channeled abilities, multi-step animations, countdown sequences. Anything that pulses a fixed number of times.

**Use `RaiseRepeating()` with count: -1** for heartbeat systems, polling loops, ambient effects, radar pings. Anything that runs until explicitly stopped.

**Always store the handle** if there's any chance you'll need to cancel. If you know for certain the schedule will always complete naturally and you don't need lifecycle callbacks, you can discard the handle — but in practice, you almost always want it.

**Always clean up in `OnDisable()`**. If your MonoBehaviour gets destroyed while a schedule is active, cancel it. GES won't crash if you don't, but orphaned schedules are a code smell and can cause unexpected behavior when the listener objects no longer exist.

The scheduling API turns what used to be coroutine management boilerplate into declarative, handle-managed event timing. Once you internalize the pattern — raise, capture handle, attach callbacks, cancel when done — you'll wonder why you ever wrote `IEnumerator` for simple delays.

---

## Next Up

In the next post, we'll explore the four listener strategies in GES — priority, conditional, persistent, and handle-based — and how they form a deterministic 6-layer execution pipeline. When multiple systems listen to the same event, execution order matters, and GES gives you explicit control over it.

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
