---
slug: api-best-practices
title: "GES API Best Practices: Architecture Patterns, Memory Management, and Pitfall Prevention"
authors: [tinygiants]
tags: [ges, unity, scripting, best-practices, architecture]
description: "Avoid memory leaks, data pollution, and recursive event traps. This guide covers the essential patterns and anti-patterns for production GES usage."
image: /img/home-page/game-event-system-preview.png
---

You exit Play Mode and something feels wrong. You enter Play Mode again and the data is already dirty — values from the last session leaked through. Or worse: you have a memory leak that only shows up after playing for 10 minutes, and you can't reproduce it consistently because it depends on which scenes you loaded in which order.

These aren't GES-specific problems. They're event system problems. Any decoupled architecture that uses pub/sub patterns has the same failure modes — dangling references, leaked subscriptions, stale state, recursive loops. The difference is that GES has built-in mechanisms to prevent most of them, and explicit patterns for the rest.

This post is the "things I wish I knew before shipping" guide. Every pattern here comes from a real bug that cost real debugging time.

<!-- truncate -->

## The Golden Rule: OnEnable Subscribe, OnDisable Unsubscribe

If you internalize one thing from this entire blog series, make it this:

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

Not `Awake`/`OnDestroy`. Not `Start`/`OnApplicationQuit`. `OnEnable`/`OnDisable`.

Here's why:

**`OnEnable`/`OnDisable` tracks the object's active state.** When a GameObject is deactivated, its `OnDisable` fires and the listener is removed. When it's reactivated, `OnEnable` fires and the listener is re-added. This means disabled objects don't receive events, which is almost always the correct behavior.

**`Awake`/`OnDestroy` only fires once per lifetime.** If you deactivate and reactivate an object, `Awake` doesn't fire again. So if you subscribed in `Awake` and the object is deactivated, it's still subscribed but shouldn't be receiving events.

**`Start` has timing issues.** `Start` runs after `Awake` but only on the first frame the object is active. If another object raises an event in its `Awake`, your `Start`-subscribed listener misses it. `OnEnable` runs earlier in the lifecycle, catching more events.

**The exception: Persistent listeners.** For objects that use `DontDestroyOnLoad`, you might subscribe in `OnEnable` and unsubscribe in `OnDestroy` (not `OnDisable`), because `OnDisable` fires during scene transitions for active objects. But for persistent listeners specifically, use `AddPersistentListener` in `OnEnable` and `RemovePersistentListener` in `OnDestroy`.

```csharp
// Standard pattern for scene-scoped listeners
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

// Pattern for DontDestroyOnLoad objects
private void OnEnable()
{
    myEvent.AddPersistentListener(HandleEvent, 0);
}

private void OnDestroy()
{
    myEvent.RemovePersistentListener(HandleEvent);
}
```

## Auto Static Reset: How GES Prevents Data Pollution

One of the nastiest bugs in Unity development is data pollution between Play Mode sessions. If you have static fields or ScriptableObject state that isn't reset when you exit Play Mode, the next play session starts with dirty data.

GES handles this with an **Auto Static Reset** mechanism. When you exit Play Mode in the editor, GES automatically clears:

- All static event caches
- All listener registrations
- All scheduled event handles
- All trigger and chain connections created at runtime

This means your events start clean every time you press Play. You don't need to manually call any reset methods or implement `[RuntimeInitializeOnLoadMethod]` hacks.

### What About ScriptableObject State?

GES events are ScriptableObject-based, and ScriptableObject instances persist between Play Mode sessions in the editor. But the event's *runtime state* — listeners, schedules, flow connections — is kept in separate static structures that get wiped by the auto-reset.

The event *asset itself* (its configured name, type, Inspector connections) persists because that's design-time data. The *runtime subscriptions and dynamic state* do not persist because that's play-time data. This separation is deliberate and prevents the most common class of data pollution bugs.

### When Auto Reset Isn't Enough

If you're storing state *on* the event (custom properties you've added to subclasses), you need to handle that yourself. The auto-reset only covers GES's internal state, not your custom extensions. Use `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` for your own static state.

## Avoiding Recursive Event Traps

Recursive events are when Event A's listener raises Event B, and Event B's listener raises Event A. Or the simpler version: Event A's listener raises Event A.

```csharp
// INFINITE LOOP - DON'T DO THIS
private void OnEnable()
{
    onHealthChanged.AddListener(HandleHealthChange);
}

private void HandleHealthChange(int newHealth)
{
    // ... process health ...

    // This triggers HandleHealthChange again, which triggers it again...
    onHealthChanged.Raise(newHealth);
}
```

GES doesn't automatically break recursive cycles because sometimes you *want* re-entrant raises (rarely, but it happens). Instead, use a guard flag:

```csharp
private bool _isProcessingHealth;

private void HandleHealthChange(int newHealth)
{
    if (_isProcessingHealth) return;
    _isProcessingHealth = true;

    try
    {
        // ... process health ...

        // Safe: won't recurse because of the guard
        onHealthChanged.Raise(newHealth);
    }
    finally
    {
        _isProcessingHealth = false;
    }
}
```

The `try/finally` ensures the guard is always reset, even if an exception occurs in the processing logic. Without it, an exception would leave `_isProcessingHealth` stuck at `true` and the handler would never fire again.

### Identifying Recursive Risks

Any time a listener raises an event (including different events that might cycle back), you have a recursion risk. Map it out:

```
OnDamageDealt → HandleDamage → raises OnHealthChanged
OnHealthChanged → HandleHealth → raises OnDamageDealt (if reflected damage)
```

That's a cycle. Guard both handlers, or restructure so reflected damage uses a separate event that doesn't cycle back.

The Runtime Monitor's Warnings tab will flag events that are raised while they're already being processed — that's a recursion detection in action.

![Monitor Warnings](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

## Event Granularity: When to Split vs. Combine

One of the most common design questions: "Should I have one `OnPlayerStateChanged` event or separate `OnPlayerDamaged`, `OnPlayerHealed`, `OnPlayerDied` events?"

### Split when:

- **Different listeners care about different subsets.** If 10 systems listen to `OnPlayerDied` but only 2 care about `OnPlayerHealed`, a combined event forces 8 systems to check and discard irrelevant raises.
- **The data shapes differ.** Damage has amount + damage type + source. Healing has amount + heal type. Death has nothing (or just a reason). Cramming these into one struct makes the event unwieldy.
- **Performance matters for high-frequency events.** Conditional checking on every raise adds overhead. Separate events eliminate the check entirely.

### Combine when:

- **All listeners need to react to all variants.** A logging system that tracks every player state change doesn't want five separate subscriptions.
- **The event is rare and the data is uniform.** If it fires once per minute and the data shape is the same, the overhead of extra event assets isn't worth it.
- **You need to guarantee ordering across variants.** If "damaged" and "healed" both need to trigger the same UI refresh in the same priority pipeline, a single event simplifies the ordering.

### The 80/20 Rule

In practice, I lean toward more granular events. It's easier to combine events later (via triggers: "when A fires, also fire B") than to split them. Starting granular gives you flexibility; starting broad locks you in.

## Handle Management for Scheduled Events

Lost handles are the #2 cause of bugs after missing unsubscriptions. If you call `RaiseDelayed()` or `RaiseRepeating()` and throw away the handle, you can never cancel that scheduled event.

```csharp
// ANTI-PATTERN: handle is lost
private void StartPoison()
{
    onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1); // infinite!
    // How do you stop this? You can't. It runs forever.
}
```

Always store handles for scheduled events:

```csharp
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

For multiple concurrent schedules, use a list:

```csharp
private List<ScheduleHandle> _activeSchedules = new List<ScheduleHandle>();

private void ScheduleSomething()
{
    var handle = onEvent.RaiseDelayed(2f);
    _activeSchedules.Add(handle);
}

private void CancelAllSchedules()
{
    foreach (var handle in _activeSchedules)
    {
        if (handle.IsActive)
            handle.Cancel();
    }
    _activeSchedules.Clear();
}

private void OnDisable()
{
    CancelAllSchedules();
}
```

## Lambda Traps and Delegate Caching

We covered this in the listener strategies post, but it bears repeating in the context of best practices because it's the single most reported "bug" that isn't actually a bug.

```csharp
// BROKEN: can't unsubscribe
onDamage.AddListener((int amount) => health -= amount);

// CORRECT: method reference
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

This applies to all listener types — basic, priority, conditional, persistent. Any time you need to remove a listener later, the delegate reference must be stable.

## Muting Inspector Listeners During Batch Operations

GES events can have listeners configured in the Inspector (via GameEventBehavior components). These visual listeners fire alongside your code listeners. Sometimes you want to suppress them temporarily — for example, during a batch operation that raises an event many times in quick succession.

```csharp
// Suppress Inspector-configured listeners
myEvent.SetInspectorListenersActive(false);

// Batch operation: raises the event 100 times
for (int i = 0; i < 100; i++)
{
    myEvent.Raise(processedItems[i]);
}

// Re-enable Inspector listeners
myEvent.SetInspectorListenersActive(true);

// Final raise with visual feedback
myEvent.Raise(summary);
```

This is useful when the Inspector listeners trigger visual effects (particles, sounds, UI animations) that would be overwhelming or performance-killing during batch processing. The code listeners still fire normally — only the Inspector-bound responses are muted.

Don't forget to re-enable them. A `try/finally` block is your friend:

```csharp
myEvent.SetInspectorListenersActive(false);
try
{
    // batch work...
}
finally
{
    myEvent.SetInspectorListenersActive(true);
}
```

## Common Anti-Patterns and Fixes

Let's catalog the most common mistakes and their solutions.

### Anti-Pattern 1: Not Unsubscribing

**Symptom:** `MissingReferenceException` in the console after changing scenes. Memory usage grows over time. Events trigger handlers on destroyed objects.

**Cause:** Listener registered in `OnEnable` (or `Awake` or `Start`) but never removed.

**Fix:**

```csharp
// Always pair subscribe with unsubscribe
private void OnEnable() => myEvent.AddListener(Handle);
private void OnDisable() => myEvent.RemoveListener(Handle);
```

### Anti-Pattern 2: Lost Schedule Handles

**Symptom:** Events fire unexpectedly after you thought you cancelled everything. Delayed events trigger on destroyed objects. Repeating events run forever.

**Cause:** `RaiseDelayed()` or `RaiseRepeating()` called without storing the returned handle.

**Fix:**

```csharp
// Always store handles
private ScheduleHandle _handle;
_handle = myEvent.RaiseDelayed(2f);
// Cancel in OnDisable
```

### Anti-Pattern 3: RemoveAllListeners() Affecting Other Systems

**Symptom:** After one system calls `RemoveAllListeners()`, other unrelated systems stop receiving the event.

**Cause:** `RemoveAllListeners()` removes all basic, priority, and conditional listeners — including those registered by other scripts.

**Fix:** Don't use `RemoveAllListeners()` as a cleanup mechanism for individual components. Each component should remove only its own listeners:

```csharp
// BAD: nuclear option, kills everyone's listeners
private void OnDisable()
{
    myEvent.RemoveAllListeners();
}

// GOOD: surgical, removes only yours
private void OnDisable()
{
    myEvent.RemoveListener(MyHandler);
    myEvent.RemovePriorityListener(MyOtherHandler);
}
```

`RemoveAllListeners()` is appropriate during major state transitions — like loading a completely new game session — where you genuinely want to wipe all subscriptions.

### Anti-Pattern 4: Expensive Conditions on High-Frequency Events

**Symptom:** Frame rate drops when events fire frequently. Profiler shows time spent in condition evaluation.

**Cause:** Complex predicates (LINQ queries, GetComponent calls, Find operations) used as conditional listener predicates on events that fire every frame or multiple times per frame.

**Fix:** Cache the condition result and check the cache:

```csharp
// BAD: expensive every frame
onPositionUpdate.AddConditionalListener(
    HandleNearbyEnemies,
    () => Physics.OverlapSphere(transform.position, 10f).Length > 0,
    priority: 50
);

// GOOD: check periodically, use cached result
private bool _hasNearbyEnemies;

private void FixedUpdate()
{
    // Expensive check once per physics frame
    _hasNearbyEnemies = Physics.OverlapSphere(
        transform.position, 10f, enemyLayer).Length > 0;
}

onPositionUpdate.AddConditionalListener(
    HandleNearbyEnemies,
    () => _hasNearbyEnemies,  // Cheap field read
    priority: 50
);
```

### Anti-Pattern 5: Raising Events in Constructors or Field Initializers

**Symptom:** Events fire before anything is subscribed. Null reference exceptions on first frame.

**Cause:** Raising events in field initializers or constructors, which execute before `Awake`/`OnEnable`.

**Fix:** Only raise events from `Start()` or later in the Unity lifecycle. If you need first-frame initialization events, use `Start()`:

```csharp
// BAD: too early, nothing is listening yet
private int _health = InitHealth(); // InitHealth() raises OnHealthSet

// GOOD: listeners are subscribed by Start
private void Start()
{
    onHealthSet.Raise(maxHealth);
}
```

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

## Architecture Pattern: The Service Locator Bridge

For large projects with multiple subsystems, consider a bridge pattern where each subsystem has a dedicated "event interface" class:

```csharp
public class CombatEventInterface : MonoBehaviour
{
    [Header("Outgoing Events (raised by combat system)")]
    [SerializeField] private GameEventInt onDamageDealt;
    [SerializeField] private GameEvent onCombatStarted;
    [SerializeField] private GameEvent onCombatEnded;

    [Header("Incoming Events (listened by combat system)")]
    [SerializeField] private GameEvent onPlayerDied;
    [SerializeField] private GameEventInt onHealReceived;

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

    // Public methods for the combat system to raise events
    public void NotifyDamageDealt(int amount) => onDamageDealt.Raise(amount);
    public void NotifyCombatStarted() => onCombatStarted.Raise();
    public void NotifyCombatEnded() => onCombatEnded.Raise();
}
```

This pattern centralizes all event wiring for a subsystem in one place. The `CombatSystem` class itself has zero knowledge of GES — it just calls methods on `CombatEventInterface`. This makes the combat system testable without events and the event wiring auditable in one file.

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

## Checklist: Before You Ship

Run through this before considering your event architecture production-ready:

1. Every `AddListener` has a corresponding `RemoveListener` in the opposite lifecycle method
2. Every `AddPersistentListener` has a `RemovePersistentListener` in `OnDestroy`
3. Every `RaiseDelayed`/`RaiseRepeating` handle is stored and cancelled in `OnDisable`
4. No lambdas used for listeners that need removal (delegate caching or method references)
5. No recursive event patterns without guard flags
6. `RemoveAllListeners()` only used for global resets, not per-component cleanup
7. Conditional predicates are cheap (field reads, not computations)
8. High-frequency events have minimal listener counts
9. Inspector listeners are muted during batch operations
10. Runtime Monitor shows no warnings during a full play-through

These ten checks will catch 95% of event system bugs before they reach production.

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
