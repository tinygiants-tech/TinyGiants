---
slug: batch-event-creation
title: "Need 100 Events? The Game Event Creator Batch Wizard Guide"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tutorial, tools]
description: "Stop creating events one by one. The GES Batch Creator lets you queue up dozens of events across types and create them all in one click."
image: /img/home-page/game-event-system-preview.png
---

You just got the design doc for the new combat system. You scan through it and start counting: OnPlayerAttack, OnEnemyHit, OnDamageDealt, OnCriticalHit, OnDodge, OnBlock, OnParry, OnStaggered, OnKnockback, OnDeathBlow... and that's just the first page. Fifty events across six categories, three different parameter types. You're looking at an afternoon of right-click > Create > configure > rename > repeat.

Or you could queue them all up and create them in one click. That's what the Game Event Creator's batch wizard is for.

<!-- truncate -->

I've been on projects where setting up the event layer for a new feature took longer than implementing the feature itself. Not because the events were complex — they were mostly straightforward — but because the manual process of creating, naming, categorizing, and configuring each one individually is death by a thousand paper cuts. The Game Event Creator eliminates that entire workflow.

Let's walk through every feature of the Creator, from the three event modes to the batch queue system, and I'll show you how to go from a design doc to a fully configured event set in minutes.

## The Three Event Modes

The Game Event Creator supports three distinct event modes, each designed for a different communication pattern. Understanding which mode to use is the first step.

### Parameterless Events

![Creator Parameterless](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

Parameterless events are the simplest — they signal that something happened, without carrying any data. Think of them as notifications: "hey, this thing occurred."

```csharp
// These events carry no data — they're pure signals
// OnGameStarted, OnLevelComplete, OnPauseToggled, OnInventoryOpened

// Raising a parameterless event
gameStartedEvent.Raise();

// Listening is equally simple
public void OnGameStarted()
{
    InitializeHUD();
    StartBackgroundMusic();
}
```

Use parameterless events when the fact that something happened is all the information listeners need. Don't fall into the trap of making every event carry data "just in case" — it adds complexity for no benefit.

Common parameterless events include: game state transitions (start, pause, resume, quit), UI navigation events (menu opened, tab switched), checkpoint reached, save completed, and similar "announcement" events.

### Single Parameter Events

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

Single parameter events carry one piece of typed data along with the signal. This is the most common event type in practice, because most gameplay events naturally carry context.

```csharp
// An event that carries damage information
// GameEvent<float> — OnDamageDealt carries the damage amount
// GameEvent<int> — OnScoreChanged carries the new score
// GameEvent<Vector3> — OnExplosion carries the explosion position
// GameEvent<EnemyData> — OnEnemySpawned carries full enemy info

// Raising with data
damageEvent.Raise(35.5f);
scoreEvent.Raise(currentScore);
explosionEvent.Raise(transform.position);

// Listening with typed parameter
public void OnDamageDealt(float amount)
{
    healthBar.Reduce(amount);
    ShowDamageNumber(amount);
}
```

The type system is fully open — you can use any serializable type as the parameter. Primitives like `int`, `float`, `string`, and `bool` work out of the box. Unity types like `Vector3`, `Color`, `GameObject`, and `Transform` are supported. And your own custom structs and classes work too, as long as they're serializable.

### Sender Events

![Creator Sender](/img/game-event-system/visual-workflow/game-event-creator/creator-sender.png)

Sender events carry both a data payload and a reference to the GameObject that raised the event. This pattern is essential when listeners need to know not just what happened, but who caused it.

```csharp
// Sender events include the source GameObject
// Raising a sender event — note the gameObject parameter
damageSenderEvent.Raise(35.5f, gameObject);

// Listening with both value and sender
public void OnDamageDealt(float amount, GameObject source)
{
    healthBar.Reduce(amount);

    // Now we know WHO dealt the damage
    ShowDamageDirection(source.transform.position);
    TrackDamageSource(source);

    // Maybe apply thorns damage back to the attacker
    if (hasThornsEffect)
    {
        var attackerHealth = source.GetComponent<Health>();
        attackerHealth?.TakeDamage(amount * thornsMultiplier);
    }
}
```

Sender events are invaluable for combat systems, interaction systems, and any scenario where the relationship between the source and the target matters. They eliminate the need for FindObjectOfType calls or complex reference chains.

## The Fuzzy Type Search System

One of the most useful features in the Creator is the fuzzy type search. When you're creating a single-parameter or sender event, you need to specify the parameter type. Instead of typing the exact full type name, you can just start typing and the Creator searches for matching types.

The search system automatically discovers all serializable types in your project and all loaded assemblies. Type "dam" and it'll show you `DamageInfo`, `DamageType`, `DamageResult`, and anything else that matches. Type "vec" and you'll see `Vector2`, `Vector3`, `Vector4`, and your custom `VelocityVector` if you have one.

This discovery is project-aware — it scans your actual assemblies, not a pre-built list. So your custom types show up immediately after compilation, no extra registration needed.

The search uses fuzzy matching, so you don't need to remember exact names. "EnemDat" will find `EnemyData`. "PlyrInf" will find `PlayerInfo`. It's forgiving of typos and abbreviations, which matters a lot when you're creating events in bulk and don't want to stop and look up exact type names.

## The Batch Queue System

This is where the Creator really shines. Instead of creating events one at a time, you build up a queue of events and then create them all in a single operation.

Here's how the flow works:

**Step 1: Configure an event.** Select the mode (parameterless, single, or sender), set the name, choose a category, and for typed events, select the parameter type.

**Step 2: Add to queue.** Click the "Add to Queue" button. The event gets added to a list at the bottom of the Creator window. The form resets so you can immediately configure the next one.

**Step 3: Repeat.** Keep adding events. Mix and match types freely — you can have parameterless events, float events, and custom-type sender events all in the same queue. There's no limit to the queue size.

**Step 4: Review.** Before creating anything, scroll through the queue and verify everything looks right. Each queued event shows its name, category, mode, and parameter type. You can remove individual items if you made a mistake.

**Step 5: Create All.** Hit the "Create All" button and watch them appear. GES creates every event asset, sets up the scriptable objects, assigns categories, and triggers code generation for any new types that need it.

The batch nature of this isn't just a convenience — it's actually more reliable than creating events individually. The system can resolve type dependencies across the batch, ensure no naming conflicts exist before creating anything, and run code generation once for all new types instead of once per event.

## Smart Code Generation Integration

Here's a detail that might not be obvious: when you batch-create events with custom parameter types, the Creator coordinates with the Code Generator intelligently.

If you create 10 events and 3 of them use `DamageInfo` as the parameter type, the Code Generator only generates the `DamageInfo` support code once. If you already had a `GameEvent<float>` in your project and you create 5 more float events, no new code generation happens for that type — it already exists.

The system tracks which types already have generated support and only generates what's missing. This means:

- No duplicate generated files
- No unnecessary compilation cycles
- Faster batch creation for projects that already have many event types
- Clean code generation output even when creating dozens of events at once

```csharp
// If your project already has these generated:
// - GameEvent<float> support
// - GameEvent<int> support
// - GameEvent<string> support

// And you batch-create events using float, int, string,
// DamageInfo, and EnemyData...

// Only DamageInfo and EnemyData support gets generated.
// The existing types are recognized and skipped.
```

## Step-by-Step: Creating 10 Events in Under a Minute

Let's walk through a concrete example. Say we're building an inventory system and we need these events:

1. `OnInventoryOpened` — parameterless
2. `OnInventoryClosed` — parameterless
3. `OnItemPickedUp` — carries `ItemData`
4. `OnItemDropped` — carries `ItemData`
5. `OnItemUsed` — carries `ItemData` with sender
6. `OnItemEquipped` — carries `ItemData` with sender
7. `OnItemUnequipped` — carries `ItemData` with sender
8. `OnInventoryFull` — parameterless
9. `OnGoldChanged` — carries `int`
10. `OnWeightChanged` — carries `float`

Here's the process:

**0:00 — Open the Creator** from the System Dashboard or menu.

**0:05 — Event 1: OnInventoryOpened.** Mode: Parameterless. Name: "OnInventoryOpened". Category: "Inventory". Add to queue.

**0:10 — Event 2: OnInventoryClosed.** Same mode and category. Just change the name. Add to queue.

**0:15 — Event 3: OnItemPickedUp.** Mode: Single Parameter. Name: "OnItemPickedUp". Category: "Inventory". Type: search "ItemDat" → select `ItemData`. Add to queue.

**0:20 — Events 4-7.** Same pattern. The type search remembers your recent selections, so `ItemData` is already at the top. For sender events (5, 6, 7), just switch the mode toggle. Name, queue, repeat.

**0:35 — Event 8: OnInventoryFull.** Switch back to Parameterless. Name it, queue it.

**0:40 — Event 9: OnGoldChanged.** Single Parameter, type "int". Queue.

**0:45 — Event 10: OnWeightChanged.** Single Parameter, type "float". Queue.

**0:50 — Review the queue.** Scroll through all 10. Verify names, categories, types.

**0:55 — Click "Create All."** Done. Ten events, properly categorized, with all necessary code generation triggered.

That's under a minute for what would have been 15-20 minutes of manual asset creation, and with fewer mistakes because you reviewed everything in one place before committing.

## Event Naming and Category Configuration

A few tips on naming and categorizing your events in the queue:

**Naming conventions matter.** Settle on a convention and stick to it. I prefer the `On[Subject][Action]` pattern: `OnPlayerDamaged`, `OnEnemySpawned`, `OnInventoryOpened`. Some teams prefer `[Subject]_[Action]`: `Player_Damaged`, `Enemy_Spawned`. The Creator doesn't enforce a pattern, so this is a team decision.

**Categories are your folders.** Use them to group related events. Good categories map to game systems: "Combat", "Inventory", "UI", "Audio", "Physics", "AI". Bad categories are too granular ("PlayerCombatMelee") or too broad ("Gameplay").

**You can change categories later.** Don't stress about getting it perfect in the Creator. The Event Editor lets you reorganize events between categories at any time. The Creator just sets the initial assignment.

**Batch by category.** When using the queue, I find it most efficient to create all events for one category, then switch to the next category. This minimizes context switching and reduces the chance of mis-categorizing an event.

## When Batch Creation Isn't the Right Tool

The Creator is optimized for creating new events. If you need to:

- **Modify existing events** — use the Event Editor
- **Configure behaviors** — use the Behavior Window
- **Rename or recategorize** — use the Event Editor
- **Delete events** — use the Event Editor's batch delete mode

The Creator is purely additive. It creates new things. For everything else, the other tools in the GES toolchain are better suited.

## Wrapping Up

The Game Event Creator's batch wizard transforms event setup from a tedious manual process into a fast, reliable, reviewable operation. Queue up your events, review them, create them all at once, and move on to the actual game logic.

The combination of three event modes, fuzzy type search, and the batch queue system means you can go from a design document to a fully configured event architecture in minutes instead of hours. And because you review the entire batch before creation, you catch naming mistakes and type mismatches before they become problems.

Next up, we'll look at the Behavior Window — where you configure event responses, conditions, delays, and loops entirely in the Inspector, without writing a single line of code.

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
