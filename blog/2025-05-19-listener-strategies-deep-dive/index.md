---
slug: listener-strategies-deep-dive
title: "Four Listener Strategies: Priority, Conditional, Persistent, and Handle-Based Management"
authors: [tinygiants]
tags: [ges, unity, scripting, advanced, best-practices]
description: "When multiple systems listen to the same event, execution order matters. Master GES's four listener types and the deterministic 6-layer execution pipeline."
image: /img/home-page/game-event-system-preview.png
---

The UI refreshed before the data updated. The health bar shows 100 when it should show 75. The save system captured the old state instead of the new one. The sound effect played before the animation started. Sound familiar?

These are execution order bugs, and they're among the most insidious problems in event-driven architectures. In a naive event system — including Unity's built-in `UnityEvent` and vanilla C# `event` — listeners execute in registration order. Whichever system subscribed first runs first. That order depends on `Awake()` and `OnEnable()` timing, which depends on script execution order, which depends on... well, sometimes nothing deterministic at all.

GES solves this with a deterministic 6-layer execution pipeline and four distinct listener strategies. You explicitly declare not just *what* listens to an event, but *when* it should run relative to other listeners, *under what conditions* it should fire, and *whether it survives scene transitions*.

<!-- truncate -->

## The 6-Layer Execution Pipeline

When you call `Raise()` on a GES event, listeners don't all fire in a random pile. They execute in a strict, deterministic order across six layers:

1. **Basic Listeners** (FIFO — first in, first out)
2. **Priority Listeners** (High priority number executes first)
3. **Conditional Listeners** (Filtered by predicate, then prioritized)
4. **Persistent Listeners** (Cross-scene, with priority)
5. **Trigger Events** (Parallel fan-out to other events)
6. **Chain Events** (Sequential blocking execution)

This order is always the same. Layer 1 always runs before Layer 2. Within each layer, the internal ordering rules apply (FIFO for basic, priority-sorted for priority, etc.). This determinism is what eliminates the "why did the UI update before the data" class of bugs.

Let's break down each listener type.

## Layer 1: Basic Listeners — Simple and Fast

Basic listeners are the default. Subscribe, receive callbacks, done.

```csharp
// Subscribe
onPlayerDamaged.AddListener(HandleDamage);

// Unsubscribe
onPlayerDamaged.RemoveListener(HandleDamage);
```

```csharp
private void HandleDamage(int amount)
{
    currentHealth -= amount;
}
```

Basic listeners execute in FIFO order — the first to subscribe runs first. This is fine when you genuinely don't care about ordering, which is more common than you might think. If the damage handler and the hit flash effect and the pain sound are all independent reactions to the same event, their relative order doesn't matter.

**When to use:** Independent reactions where order is irrelevant. Most listeners in most projects fall into this category.

**When NOT to use:** When one listener's side effects change state that another listener reads. That's where priority listeners come in.

## Layer 2: Priority Listeners — Explicit Execution Order

Priority listeners let you explicitly control which listeners run first.

```csharp
// Higher number = runs first
onPlayerDamaged.AddPriorityListener(ApplyDamageReduction, priority: 100);
onPlayerDamaged.AddPriorityListener(UpdateHealthData, priority: 50);
onPlayerDamaged.AddPriorityListener(RefreshHealthUI, priority: 25);
onPlayerDamaged.AddPriorityListener(PlayHitSound, priority: 10);
onPlayerDamaged.AddPriorityListener(LogDamageAnalytics, priority: 0);
```

In this setup, `ApplyDamageReduction` always runs first (priority 100), then `UpdateHealthData` (50), then `RefreshHealthUI` (25), then the sound (10), then analytics (0). The UI always sees the correct post-reduction health value because the data update ran before it.

![Priority Behavior Ordered](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

### Recommended Priority Scale

I've found it helpful to define priority constants so the team uses consistent values:

```csharp
public static class EventPriority
{
    public const int CRITICAL    = 200;  // Security, validation, sanity checks
    public const int HIGH        = 100;  // Data mutations, state changes
    public const int NORMAL      = 50;   // Game logic, behavior changes
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

This pattern scales. When a new system needs to listen to the same event, you pick the appropriate tier and slot it in. No need to audit every other listener's registration order.

### What Happens With Equal Priorities?

Listeners with the same priority value execute in FIFO order within that priority tier. So if two listeners both have priority 50, the one that subscribed first runs first. This is the correct fallback — within a priority tier, order shouldn't matter (and if it does, you should give them different priorities).

![Priority Behavior Chaotic](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

The image above shows what happens without priorities — chaotic execution order that changes unpredictably. Compare that to the deterministic ordering when priorities are assigned.

### Removal

```csharp
onPlayerDamaged.RemovePriorityListener(UpdateHealthData);
```

Note: you remove by the callback reference, not by priority value. This means you need to keep a reference to the method or delegate — more on that in the lambda trap section below.

## Layer 3: Conditional Listeners — Filter Before Execution

Conditional listeners add a predicate gate. The listener only fires if the condition evaluates to `true` at the moment the event is raised.

```csharp
// Only react to damage when the shield is down
onPlayerDamaged.AddConditionalListener(
    call: HandleDamage,
    condition: () => !isShielded,
    priority: 50
);
```

The condition is evaluated every time the event fires. If it returns `false`, the listener is skipped entirely — it doesn't execute, doesn't cost anything beyond the predicate evaluation.

### Typed Conditions

For typed events, the condition can inspect the argument:

```csharp
// Only react to critical hits (damage > 50)
onPlayerDamaged.AddConditionalListener(
    call: HandleCriticalHit,
    condition: (int damage) => damage > 50,
    priority: 75
);
```

### Sender Conditions

For sender events, inspect both sender and args:

```csharp
// Only react to damage from bosses
onDamageFromSource.AddConditionalListener(
    call: HandleBossDamage,
    condition: (GameObject sender, int damage) => sender.CompareTag("Boss"),
    priority: 75
);
```

### Why Not Just Check Inside the Listener?

You could write this:

```csharp
private void HandleDamage(int amount)
{
    if (!isShielded)
    {
        // actual logic
    }
}
```

And that works. But conditional listeners have two advantages:

1. **The predicate is evaluated before any listener logic runs.** If your listener does expensive work — lookups, calculations, allocation — the conditional check prevents that work entirely when the condition is false.

2. **Separation of concerns.** The "should I react?" logic is declared at subscription time, not buried inside the handler. This makes the handler simpler and the subscription code more readable.

For high-frequency events (like per-frame position updates or collision checks), conditional listeners can meaningfully reduce wasted work.

### Priority Within Conditional Listeners

Conditional listeners are sorted by their priority value, just like priority listeners. So you get both filtering AND ordering in a single subscription.

```csharp
// Shield check runs first (priority 100), only if player is in combat
onPlayerDamaged.AddConditionalListener(
    HandleShieldAbsorption,
    () => isInCombat,
    priority: 100
);

// Armor reduction runs second (priority 50), only for physical damage
onPlayerDamaged.AddConditionalListener(
    HandleArmorReduction,
    (int dmg) => currentDamageType == DamageType.Physical,
    priority: 50
);
```

## Layer 4: Persistent Listeners — Surviving Scene Transitions

Persistent listeners are the cross-scene communication tool. They survive `SceneManager.LoadScene()` calls and continue receiving events across scene transitions.

```csharp
onPlayerDamaged.AddPersistentListener(TrackLifetimeDamage, priority: 0);
```

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

### Use Cases

**AudioManager:** Lives on a `DontDestroyOnLoad` object. Needs to hear events from every scene without re-subscribing.

```csharp
public class AudioManager : MonoBehaviour
{
    [SerializeField] private GameEvent onPlayerDamaged;
    [SerializeField] private GameEvent onEnemyDied;
    [SerializeField] private GameEvent onItemPickedUp;

    private void OnEnable()
    {
        onPlayerDamaged.AddPersistentListener(PlayHitSound, priority: 10);
        onEnemyDied.AddPersistentListener(PlayDeathSound, priority: 10);
        onItemPickedUp.AddPersistentListener(PlayPickupSound, priority: 10);
    }

    private void OnDestroy()
    {
        // IMPORTANT: persistent listeners must be manually removed
        onPlayerDamaged.RemovePersistentListener(PlayHitSound);
        onEnemyDied.RemovePersistentListener(PlayDeathSound);
        onItemPickedUp.RemovePersistentListener(PlayPickupSound);
    }

    private void PlayHitSound() { /* ... */ }
    private void PlayDeathSound() { /* ... */ }
    private void PlayPickupSound() { /* ... */ }
}
```

**Analytics/Telemetry:** Tracks events across the entire session.

**Save System:** Listens for save-relevant events regardless of current scene.

![Persistent Scene Setup](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

### Critical Warning: Manual Removal Required

Persistent listeners are NOT automatically removed when a scene unloads. They stick around. If the object that registered the listener gets destroyed without calling `RemovePersistentListener()`, you'll have a dangling delegate pointing at a destroyed object — and that's a `MissingReferenceException` waiting to happen.

Always remove persistent listeners in `OnDestroy()`, not `OnDisable()`. `OnDisable()` fires on scene unload for active objects, which might be too early if you're using `DontDestroyOnLoad`.

```csharp
// WRONG: OnDisable fires during scene transition
private void OnDisable()
{
    onEvent.RemovePersistentListener(MyHandler); // Too early for DontDestroyOnLoad
}

// RIGHT: OnDestroy fires when the object is actually destroyed
private void OnDestroy()
{
    onEvent.RemovePersistentListener(MyHandler);
}
```

### RemoveAllListeners() Does NOT Remove Persistent

This is by design. When you call `RemoveAllListeners()`, it clears:
- Basic Listeners
- Priority Listeners
- Conditional Listeners

But it leaves Persistent Listeners intact. The reasoning is that `RemoveAllListeners()` is typically called during scene cleanup or system reset, and persistent listeners are explicitly meant to survive those operations.

If you need to remove everything including persistent listeners, you must call `RemovePersistentListener()` for each one explicitly. This is intentional friction — removing persistent listeners should be a deliberate action, not a side effect of a broad cleanup.

## Layers 5 & 6: Trigger and Chain Events

These aren't "listeners" in the traditional sense — they're event-to-event connections managed by the flow graph. But they execute as part of the same pipeline.

**Layer 5: Trigger Events** — When Event A fires, Events B, C, and D also fire in parallel (fan-out). This is the "also notify these" pattern.

**Layer 6: Chain Events** — When Event A fires, Event B fires after a delay, then Event C fires after Event B completes (sequential blocking). This is the "do these in order" pattern.

We covered these in detail in the trigger/chain posts. The key point here is that they execute after all listener layers, which means your data is fully updated before flow propagation begins.

## The Lambda Trap: Cache Your Delegates

This is the single most common mistake I see with event systems, and it applies to C# events generally, not just GES.

```csharp
// BROKEN: Can't remove this
private void OnEnable()
{
    onDamage.AddListener((int amount) =>
    {
        currentHealth -= amount;
    });
}

private void OnDisable()
{
    // How do you remove the lambda? You can't reference it.
    // This does NOT work:
    onDamage.RemoveListener((int amount) =>
    {
        currentHealth -= amount;
    });
    // This creates a NEW lambda, which doesn't match the original.
}
```

Each lambda expression creates a new delegate instance. Even if the code is identical, `RemoveListener` can't match it because it's a different object in memory.

**The fix: cache the delegate.**

```csharp
private System.Action<int> _damageHandler;

private void OnEnable()
{
    _damageHandler = (amount) => currentHealth -= amount;
    onDamage.AddListener(_damageHandler);
}

private void OnDisable()
{
    onDamage.RemoveListener(_damageHandler);
}
```

Or better yet, just use a method reference:

```csharp
private void OnEnable()
{
    onDamage.AddListener(HandleDamage);
}

private void OnDisable()
{
    onDamage.RemoveListener(HandleDamage);
}

private void HandleDamage(int amount)
{
    currentHealth -= amount;
}
```

Method references are stable — `HandleDamage` always refers to the same delegate for the same instance. This is the safest pattern and the one I recommend for all listener subscriptions.

The only time lambdas are acceptable for listeners is when you genuinely don't need to remove them — like a persistent listener that lives for the entire application lifetime. Even then, caching is cleaner.

## Choosing the Right Listener Strategy

Here's a decision matrix:

| Question | Answer | Use |
|----------|--------|-----|
| Do I care about execution order? | No | `AddListener` (Basic) |
| Do I care about execution order? | Yes | `AddPriorityListener` |
| Should this listener sometimes skip? | Yes | `AddConditionalListener` |
| Does this listener survive scene loads? | Yes | `AddPersistentListener` |
| Do I need filtering AND ordering? | Yes | `AddConditionalListener` with priority |
| Is this cross-scene AND ordered? | Yes | `AddPersistentListener` with priority |

### Combining Strategies

In practice, a single event often has multiple listener types:

```csharp
// Data layer: priority listener, runs first
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);

// UI layer: basic listener, order doesn't matter among UI elements
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

The 6-layer pipeline ensures these all execute in the correct order regardless of when they were registered.

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

The Runtime Monitor's Listeners tab shows you all active subscriptions for each event, broken down by type — an invaluable debugging tool when you need to verify that your listener configuration is correct.

## Real-World Pattern: The MVC Event Bus

Here's a pattern I've used successfully in multiple shipped projects. It maps cleanly to MVC (Model-View-Controller) and uses priority tiers to enforce the architecture:

```csharp
public static class EventPriority
{
    // Validation layer: reject bad data before it propagates
    public const int VALIDATION = 200;

    // Model layer: mutate state
    public const int MODEL = 100;

    // Controller layer: react to state changes
    public const int CONTROLLER = 50;

    // View layer: update visuals
    public const int VIEW = 25;

    // Side effects: audio, analytics, non-critical
    public const int SIDE_EFFECT = 10;
}
```

With this convention, you can wire up any event knowing that data validation happens first, state mutations happen second, game logic reacts third, and the UI always sees the final state. No timing bugs. No stale data in views.

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

The model listeners have the same priority (100), so they run in FIFO order — which is fine because `DeductCurrency` and `AddToInventory` are independent operations that both need to happen before the controller layer reacts.

## Summary

GES gives you four listener types that map to real architectural needs:

- **Basic** for simple, order-independent reactions
- **Priority** for explicit execution ordering
- **Conditional** for filtered, high-efficiency subscriptions
- **Persistent** for cross-scene communication

They execute in a deterministic 6-layer pipeline that eliminates the "which listener ran first?" class of bugs. Combined with the delegate caching pattern and the MVC priority convention, you get an event system that scales from prototype to production without the architectural debt that usually accumulates around event handling.

Next time you see stale data in your UI, check your listener priorities. The fix is usually one line.

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
