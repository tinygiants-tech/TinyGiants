---
slug: game-event-dropdown-attribute
title: "GameEventDropdown: One Attribute to Fix All Event Reference Problems"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, scripting, tutorial]
description: "Stop dragging event assets manually. The GameEventDropdown attribute gives you a type-safe, searchable, categorized event picker right in the Inspector."
image: /img/home-page/game-event-system-preview.png
---

Have you ever dragged the wrong event asset into a field? I have. I dragged an `OnDamageDealt` (which was a `GameEvent<int>`) into a slot that expected a `GameEvent<float>`, and Unity happily accepted it because the SerializeField type was just `ScriptableObject`. No warning, no error — until runtime, when the cast failed and I spent 20 minutes figuring out why the damage numbers were null.

This is the kind of bug that shouldn't exist. The information to prevent it was right there — the types are known at edit time. The problem was the tooling. A raw `SerializeField` with manual drag-and-drop has zero type awareness, zero search capability, and zero organizational context.

<!-- truncate -->

The `[GameEventDropdown]` attribute fixes all of this in a single line of code. It replaces the default object picker with a custom dropdown that's type-safe, searchable, and categorized. You literally add one attribute to your existing field and the entire workflow improves.

Let me show you what it does and how to use it across different event patterns.

## The Problem with Traditional Event References

Let's look at the standard approach to referencing events in a MonoBehaviour:

```csharp
public class DamageHandler : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent<float> damageEvent;
    [GameEventDropdown, SerializeField] private GameEvent<float> healEvent;
    [GameEventDropdown, SerializeField] private GameEvent criticalHitEvent;
    [GameEventDropdown, SerializeField] private GameEvent deathEvent;

    // ... 10 more event references
}
```

This works. But it has problems:

1. **No search.** To assign `damageEvent`, you have to navigate the Project window, find the right folder, find the right asset, and drag it over. With 200+ events, this is painful.

2. **No type safety at the drag level.** Unity's object picker shows all ScriptableObjects, or all GameEvents. It won't filter to only `GameEvent<float>`. You can easily assign a `GameEvent<int>` to a `GameEvent<float>` field if the serialization is ambiguous.

3. **No organizational context.** The default picker shows a flat, alphabetical list. No categories, no databases, no grouping. Finding "OnPlayerDamaged" in a list of 200 events is a chore.

4. **Easy to assign the wrong event.** Names like `OnDamageDealt` and `OnDamageReceived` look similar in a flat list. One is raised by the attacker, the other by the defender. Mix them up and your game logic is silently wrong.

## The GameEventDropdown Attribute

The fix is one attribute:

```csharp
public class DamageHandler : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent<float> damageEvent;

    [GameEventDropdown, SerializeField] private GameEvent<float> healEvent;

    [GameEventDropdown, SerializeField] private GameEvent criticalHitEvent;

    [GameEventDropdown, SerializeField] private GameEvent deathEvent;
}
```

That's it. Same fields, same types, same serialization. But now the Inspector shows a custom dropdown instead of the default object picker.

![Raiser Dropdown](/img/game-event-system/visual-workflow/game-event-raiser/raiser-dropdown.png)

## Fuzzy Search by Event Name

The dropdown includes a search bar at the top. Start typing and it filters the list in real time using fuzzy matching.

Type "dam" and you'll see:
- OnDamageDealt
- OnDamageReceived
- OnDamageBlocked
- OnDamageOverTime

Type "plyr dam" and the fuzzy matcher narrows it to events matching both tokens:
- OnPlayerDamaged
- OnPlayerDamageReduced

This is the same fuzzy search system used throughout GES — it's forgiving of abbreviations, partial matches, and out-of-order terms. When you have hundreds of events, the search bar turns a scroll-and-hunt exercise into a type-and-pick one.

The search is also fast. It's not doing a file system scan — it's querying the in-memory event database, which is already indexed and cached. Even with 500+ events, search results appear instantly.

## Automatic Type Filtering

Here's where the attribute really earns its keep: it automatically filters the dropdown to only show events that match the field's type.

If your field is `GameEvent<float>`, the dropdown only shows `GameEvent<float>` events. No `GameEvent<int>`, no `GameEvent<string>`, no parameterless `GameEvent`. Just floats.

If your field is `GameEvent` (parameterless), it only shows parameterless events.

If your field is `GameEventSender<DamageInfo>`, it only shows sender events with the `DamageInfo` type.

```csharp
[GameEventDropdown, SerializeField] private GameEvent<float> damageEvent;
// Dropdown shows ONLY GameEvent<float> events:
// ✓ OnDamageDealt (float)
// ✓ OnHealAmount (float)
// ✓ OnSpeedChanged (float)
// ✗ OnScoreChanged (int) — hidden, wrong type
// ✗ OnPlayerDied (void) — hidden, wrong type
// ✗ OnEnemySpawned (EnemyData) — hidden, wrong type
```

This eliminates the entire category of "assigned the wrong event type" bugs. They simply can't happen because the wrong types don't appear in the list.

## Categorized by Database and Category

The dropdown organizes events hierarchically:

```
▼ MainDatabase
  ▼ Combat
    OnDamageDealt
    OnDamageReceived
    OnCriticalHit
  ▼ Movement
    OnSpeedChanged
    OnJumpForce
▼ UIDatabase
  ▼ HUD
    OnHealthBarUpdate
    OnManaBarUpdate
```

This mirrors the organizational structure you set up in the Event Creator and Event Editor. If you've been disciplined about categorizing your events (and you should be), the dropdown reflects that organization perfectly.

The hierarchy is collapsible. You can expand just the category you're interested in and ignore the rest. For large projects, this is dramatically faster than a flat alphabetical list.

![Raiser Example Dropdown](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-dropdown.png)

## Code Examples: Usage Patterns

Let's look at how the `[GameEventDropdown]` attribute works with different event types and common usage patterns.

### Parameterless Event Usage

```csharp
public class GameManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onGameStarted;

    [GameEventDropdown, SerializeField] private GameEvent onGamePaused;

    [GameEventDropdown, SerializeField] private GameEvent onGameResumed;

    public void StartGame()
    {
        // Initialize game systems...
        Time.timeScale = 1f;
        onGameStarted.Raise();
    }

    public void TogglePause()
    {
        if (Time.timeScale > 0)
        {
            Time.timeScale = 0f;
            onGamePaused.Raise();
        }
        else
        {
            Time.timeScale = 1f;
            onGameResumed.Raise();
        }
    }
}
```

### Typed Event Usage

```csharp
public class CombatSystem : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent<float> onDamageDealt;

    [GameEventDropdown, SerializeField] private GameEvent<int> onComboCountChanged;

    [GameEventDropdown, SerializeField] private GameEvent<Vector3> onImpactPosition;

    public void ProcessHit(float damage, Vector3 hitPoint)
    {
        onDamageDealt.Raise(damage);
        onImpactPosition.Raise(hitPoint);

        comboCount++;
        onComboCountChanged.Raise(comboCount);
    }
}
```

### Sender Event Usage

```csharp
public class EnemyAI : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent<float> onAttackPerformed;

    public void PerformAttack(float damage)
    {
        // The sender pattern includes gameObject automatically
        onAttackPerformed.Raise(damage, gameObject);

        // Listeners receive both the damage value AND a reference
        // to this enemy's GameObject — useful for tracking who
        // attacked, applying directional effects, etc.
    }
}
```

![Raiser Example Code](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-code.png)

## The Event API: Raise, Cancel, and SetInspectorListenersActive

Once you have an event reference (assigned via the dropdown or any other method), GES provides a clean API for interacting with it.

### Raise()

The most common operation. Fire the event.

```csharp
// Parameterless
myEvent.Raise();

// Typed
myFloatEvent.Raise(42.0f);

// Sender
mySenderEvent.Raise(data, gameObject);
```

Raise is synchronous by default — all listeners execute before Raise returns. This means you can safely do things after Raise and know all responses have completed:

```csharp
damageEvent.Raise(damage);
// At this point, ALL listeners have already responded
// Health bars updated, sounds played, particles spawned
Debug.Log("All damage responses complete");
```

### Cancel()

Cancel stops any scheduled or repeating behaviors associated with this event.

```csharp
// Start a repeating poison effect
poisonEvent.Raise(5.0f);  // Configured with repeat count -1

// Later, cure the poison
poisonEvent.Cancel();  // Stops all repeating behaviors
```

This is essential for events with repeating schedules. Without Cancel, you'd need to track timers manually or destroy the listener objects. Cancel provides a clean, centralized way to stop recurring behaviors.

### SetInspectorListenersActive()

This method enables or disables all Inspector-configured behaviors for an event at runtime.

```csharp
// Disable all Inspector-configured responses for this event
myEvent.SetInspectorListenersActive(false);

// The event can still be raised, but Inspector behaviors won't fire
myEvent.Raise();  // Code listeners still respond, Inspector ones don't

// Re-enable
myEvent.SetInspectorListenersActive(true);
```

This is useful for temporary state changes. During a cutscene, you might want to disable gameplay event responses without unregistering them. When the cutscene ends, re-enable them and everything resumes as before.

```csharp
public class CutsceneManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent<float> onDamageDealt;

    [GameEventDropdown, SerializeField] private GameEvent onEnemySpawned;

    public void StartCutscene()
    {
        // Mute gameplay responses during cutscene
        onDamageDealt.SetInspectorListenersActive(false);
        onEnemySpawned.SetInspectorListenersActive(false);
    }

    public void EndCutscene()
    {
        // Resume normal gameplay responses
        onDamageDealt.SetInspectorListenersActive(true);
        onEnemySpawned.SetInspectorListenersActive(true);
    }
}
```

![Raiser Example Behavior](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-behavior.png)

## Practical Tips

**Use the attribute everywhere.** There's no downside. It doesn't change serialization, doesn't affect runtime performance, and strictly improves the editing experience. I add `[GameEventDropdown]` to every event field as a matter of habit.

**Combine with [Header] for organization.** When a component has many event references, use Unity's `[Header]` attribute to group them:

```csharp
[Header("Combat Events")]
[GameEventDropdown, SerializeField] private GameEvent<float> onDamageDealt;

[GameEventDropdown, SerializeField] private GameEvent<float> onDamageReceived;

[Header("UI Events")]
[GameEventDropdown, SerializeField] private GameEvent onInventoryToggled;

[GameEventDropdown, SerializeField] private GameEvent<string> onTooltipRequested;
```

**Name your events clearly.** The dropdown is only as good as your naming conventions. `OnDmg` is terrible. `OnDamageDealtToPlayerByEnemy` is too long. `OnPlayerDamaged` is right — clear, specific, and scannable.

**Leverage category structure.** If your dropdown is overwhelming even with search, it's a sign your categories need work. Break "Gameplay" into "Combat", "Movement", "Interaction". Break "UI" into "HUD", "Menus", "Notifications". The dropdown's hierarchy makes well-organized events a pleasure to work with.

## Why Not Just Use Unity's Built-in Object Picker?

Fair question. Unity's default object picker does let you search for assets by name. But it lacks:

- **Type filtering** — it shows all events regardless of parameter type
- **Category hierarchy** — it's a flat list
- **Fuzzy search** — it requires exact substring matching
- **Database awareness** — it doesn't understand GES's multi-database structure

The `[GameEventDropdown]` attribute is a purpose-built tool for a specific job. It understands the GES type system, the organizational structure, and the common usage patterns. The default picker is generic. This is specialized, and the difference shows.

## Wrapping Up

The `[GameEventDropdown]` attribute is one of those small things that has an outsized impact on daily workflow. One line of code per field, and you get type-safe selection, fuzzy search, category hierarchy, and zero chance of assigning the wrong event type.

Combined with the `.Raise()`, `.Cancel()`, and `.SetInspectorListenersActive()` API, you have a complete, clean interface for working with events from code. The attribute handles the configuration side (making sure you reference the right event), and the API handles the runtime side (raising, cancelling, and controlling events).

If you take one thing from this post, let it be this: add `[GameEventDropdown]` to every event field in your project. It takes 30 seconds to add and prevents an entire category of bugs.

In the next post, we'll look at the Game Event Finder — a tool that scans your entire scene and tells you exactly who's referencing any given event. It's the answer to "is anyone still using this event?" that you've been guessing at until now.

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
