---
slug: batch-event-creation
title: "Need 100 Events? The Game Event Creator Batch Wizard Guide"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tutorial, tools]
description: "Stop creating events one by one. The GES Batch Creator lets you queue up dozens of events across types and create them all in one click."
image: /img/home-page/game-event-system-preview.png
---

The design doc just landed in your inbox. New combat system. You start scanning through the requirements and mentally tallying the events you'll need: player attacks, enemy hits, damage dealt, critical hits, dodges, blocks, parries, staggers, knockbacks, death blows, combo chains, weapon switches, buff applications, debuff expirations... you're on page two and you've already counted forty events across six categories and at least four different parameter types.

You know what comes next. Open Unity. Right-click in the Project window. Create > ScriptableObject. Rename it. Select it. Configure the type. Assign a category. Repeat. Forty times. For the typed events, you'll also need to make sure the concrete event classes exist first -- and if they don't, you'll need to write them or generate them before you can even create the asset.

<!-- truncate -->

You're looking at an afternoon. Not building the combat system. Not implementing game logic. Just... setting up the plumbing. Creating event assets one at a time, copy-pasting names from the design doc, manually organizing them into folders, and praying you don't introduce a typo that causes a silent failure three weeks from now.

I've been on projects where the event setup phase for a new feature took longer than the feature implementation itself. Not because the events were complex -- most were straightforward signals or single-parameter carriers -- but because the sheer manual overhead of doing anything forty times in Unity is brutal. And that's before we talk about the problems that manual creation introduces.

## The Real Problem: Death by a Thousand Right-Clicks

Let's be specific about what "creating events manually" actually looks like in a typical Unity project, because the pain isn't obvious until you've lived it.

### The Basic Loop (Per Event)

For each event, assuming you're using ScriptableObject-based events (which you should be), the minimum process is:

1. Navigate to the right folder in the Project window
2. Right-click > Create > find the right menu option
3. Name the asset (carefully -- typos are hard to catch later)
4. Select the asset
5. Configure any fields in the Inspector
6. Repeat

That's maybe 30 seconds per event if you're fast and the folder structure is already set up. For 50 events, that's 25 minutes of mechanical clicking. Your brain goes numb by event number 12, which is exactly when you start making mistakes.

### The Typed Event Tax

But it gets worse for typed events. If you're using a generic event system (which most serious implementations do), you need a concrete class for each parameter type before you can create an event asset. Want a `SingleGameEvent` that carries a float? Fine, `SingleGameEvent` probably already exists as a built-in. Want one that carries your custom `DamageInfo` struct? Now you need to:

1. Create a new C# script
2. Write the concrete class that inherits from the generic base
3. Write the corresponding listener class
4. Write the corresponding editor drawer (if you want Inspector support)
5. Wait for Unity to compile
6. Now you can create the ScriptableObject asset

For each new type. Every time.

```csharp
// This is what you'd have to write manually for EACH custom type:
[System.Serializable]
public class DamageInfoGameEvent : GameEventBase<DamageInfo> { }

[System.Serializable]
public class DamageInfoGameEventListener : GameEventListenerBase<DamageInfo> { }

// And maybe a custom property drawer too...
// Now multiply this by every custom type in your project.
```

Some teams automate this with T4 templates or custom editor scripts, but that's its own maintenance burden. And you're still creating the actual event assets one at a time.

### The Naming Consistency Problem

Here's a subtler issue. When three different programmers create events independently over the course of a week, you end up with naming inconsistencies that haunt you forever:

- `OnPlayerDied` (past tense)
- `PlayerDeath` (noun, no prefix)
- `player_death_event` (snake_case with suffix)
- `EnemyHitEvent` (PascalCase with suffix)
- `OnDamageDealt` (consistent with the first one, but only by coincidence)

There's no enforcement point. No validation. No "hey, you used a different naming convention than the other 40 events in this category." Each event is created in isolation, so inconsistencies creep in naturally.

You might say "just establish a convention and enforce it in code review." Sure. And code reviewers will catch naming inconsistencies in a list of 50 new events on a Friday afternoon PR. Right.

### The Categorization Afterthought

Nobody organizes events at creation time. You're in a hurry. You create the event, name it, and move on. Organization happens "later." Except later, you have 200 events in a flat folder and reorganizing them means updating every reference across the entire project.

Categories should be a first-class part of event creation, not something you bolt on after the fact. But when you're right-clicking your way through 50 events, adding a categorization step to each one feels like adding insult to injury.

### The Mixed Batch Nightmare

Real design docs don't give you 50 events of the same type. They give you a mix:

- 12 parameterless events (game state transitions, UI triggers)
- 15 float events (damage values, health changes, speed modifiers)
- 8 events with a custom `CombatHitInfo` struct (which doesn't have generated support yet)
- 6 events with `Vector3` parameters (positions, directions)
- 9 sender events with various types (need to know who caused the event)

Managing this manually means constantly switching between creating assets, writing boilerplate code, waiting for compilation, and then going back to creating more assets. The context switching alone kills your productivity.

And if you mess up the order -- create the assets before the concrete types exist -- you get compilation errors and have to backtrack.

## The Creator Window: Queue It, Review It, Ship It

The GES Creator Window was built specifically to eliminate every problem I just described. It's not an incremental improvement on the manual process. It's a different workflow entirely.

The core idea is simple: instead of creating events one at a time, you build up a queue of everything you need, review it all at once, and then create everything in a single operation.

### Three Modes for Three Patterns

The Creator supports three event modes, matching the three communication patterns you'll use in practice.

**Parameterless Events** -- pure signals that carry no data. "Something happened."

![Creator Parameterless](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

```csharp
// Parameterless events are the simplest pattern
// OnGameStarted, OnLevelComplete, OnPauseToggled
[GameEventDropdown, SerializeField] private SingleGameEvent gameStartedEvent;

gameStartedEvent.Raise();
```

You set a name, assign a category, and add it to the queue. That's it. No type selection needed.

**Single Parameter Events** -- carry one piece of typed data.

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

```csharp
// Single parameter events carry typed data
// Float32GameEvent for damage, Int32GameEvent for scores
[GameEventDropdown, SerializeField] private Float32GameEvent damageEvent;

damageEvent.Raise(35.5f);
```

Here you also select the parameter type -- and this is where the Creator's fuzzy type search system really shines.

**Sender Events** -- carry data plus a reference to the GameObject that raised the event.

![Creator Sender](/img/game-event-system/visual-workflow/game-event-creator/creator-sender.png)

```csharp
// Sender events include the source GameObject
[GameEventDropdown, SerializeField] private Float32GameEvent damageSenderEvent;

damageSenderEvent.Raise(35.5f, gameObject);
```

Essential for combat systems, interaction systems, and any scenario where the relationship between source and target matters.

### Fuzzy Type Search: Find Any Type Instantly

When you're creating a single-parameter or sender event, you need to specify the parameter type. The Creator provides a fuzzy search that automatically discovers every serializable type in your project and all loaded assemblies.

Type "dam" and it shows `DamageInfo`, `DamageType`, `DamageResult`. Type "vec" and you see `Vector2`, `Vector3`, `Vector4`, plus any custom types matching the pattern. The search is project-aware -- it scans your actual assemblies, so custom types appear immediately after compilation with no registration needed.

The fuzzy matching is forgiving. "EnemDat" finds `EnemyData`. "PlyrInf" finds `PlayerInfo`. When you're queuing up 30 events and don't want to stop and look up exact type names, this matters more than you'd think.

### The Batch Queue: The Whole Point

This is the heart of the Creator. Here's the flow:

**Step 1: Configure.** Pick a mode (parameterless, single, sender), set the name, choose a category, and for typed events, select the parameter type.

**Step 2: Add to queue.** Click "Add to Queue." The event gets added to a list at the bottom of the window. The form resets so you can immediately configure the next one.

**Step 3: Repeat.** Keep adding. Mix types freely -- parameterless, float, custom struct senders, all in the same queue. No limit on queue size.

**Step 4: Review.** Before creating anything, scroll through the queue. Each entry shows its name, category, mode, and parameter type. Remove anything that looks wrong. This is your last chance to catch typos and miscategorizations -- and unlike reviewing 50 individual assets scattered across folders, reviewing a single queue takes thirty seconds.

**Step 5: Create All.** Hit "Create All." GES creates every event asset, sets up the ScriptableObjects, assigns categories, and coordinates code generation for any new types.

### Smart Code Generation: The Magic Behind the Scenes

Here's where the Creator really earns its keep. Remember the "typed event tax" I described earlier -- the boilerplate code you need for each custom parameter type? The Creator handles that automatically.

When you queue events with custom parameter types, the Creator coordinates with the code generation pipeline intelligently:

- If a type already has generated support (like built-in `float`, `int`, `string`), the Creator creates the event immediately. No code generation needed.
- If a type needs new support (your custom `DamageInfo` struct), the Creator generates all necessary code automatically.
- If multiple events in the queue use the same new type, code generation happens once, not once per event.

The smart batching works like this: the Creator splits your queue into two groups. Events using existing types get created immediately. Events needing new type support get their code generated first, and after Unity finishes compiling, the Creator automatically creates the pending events. You queue everything up front, and the Creator figures out the dependency order.

```csharp
// You create a custom type:
[System.Serializable]
public struct DamageInfo
{
    public float amount;
    public DamageType type;
    public Vector3 hitPoint;
}

// You queue up 5 events that use DamageInfo in the Creator.
// The Creator auto-generates all necessary support code ONCE,
// waits for compilation, then creates all 5 events.
// You wrote zero boilerplate.
```

No duplicate generated files. No unnecessary compilation cycles. No manual "create the type support, wait for compile, then create the assets" dance.

### Category Assignment at Creation Time

Remember the categorization problem? The Creator makes category assignment a required step during event creation, not an afterthought. Every event in the queue has a category before it gets created. You're forced to think about organization while you're thinking about the event itself -- which is exactly when it's cheapest to make that decision.

And because you can see the entire queue with categories before creating anything, you can spot organizational issues immediately. "Wait, why did I put OnWeaponSwitch in the UI category? That should be Combat."

## A Real Scenario: From Design Doc to Event Set

Let's walk through a concrete example. New inventory system, ten events needed:

1. `OnInventoryOpened` -- parameterless, category: Inventory
2. `OnInventoryClosed` -- parameterless, category: Inventory
3. `OnItemPickedUp` -- carries `ItemData`, category: Inventory
4. `OnItemDropped` -- carries `ItemData`, category: Inventory
5. `OnItemUsed` -- sender with `ItemData`, category: Inventory
6. `OnItemEquipped` -- sender with `ItemData`, category: Equipment
7. `OnItemUnequipped` -- sender with `ItemData`, category: Equipment
8. `OnInventoryFull` -- parameterless, category: Inventory
9. `OnGoldChanged` -- carries `int`, category: Economy
10. `OnWeightChanged` -- carries `float`, category: Inventory

Open the Creator. Parameterless mode. Name: "OnInventoryOpened". Category: "Inventory". Add to queue. Change name to "OnInventoryClosed". Add to queue. Switch to Single Parameter mode. Name: "OnItemPickedUp". Type search: "ItemDat" -- select `ItemData`. Add to queue. Keep going. For sender events (5, 6, 7), toggle the mode. For events 9 and 10, the types are built-in -- just type "int" or "float".

Under a minute for all ten. Review the queue. Everything looks right. Hit "Create All."

If `ItemData` didn't have generated support yet, the Creator generates it automatically, waits for compilation, and creates the pending events. You don't manage that pipeline -- you just queue and go.

Compare that to the manual approach: navigate folders, right-click, create, rename, configure, repeat -- ten times. Plus potentially writing boilerplate for `ItemData` support. Plus organizing into categories after the fact. Plus catching the typo in "OnItemUnequiped" during code review three days later.

## What the Creator Doesn't Do

The Creator is purely additive. It creates new events. For everything else:

- **Modifying existing events** -- use the Event Editor
- **Configuring behaviors/responses** -- use the Behavior Window
- **Renaming or recategorizing** -- use the Event Editor
- **Deleting events** -- use the Event Editor's batch delete mode
- **Regenerating code for existing types** -- use the Code Generator (maintenance tool)

This separation is intentional. The Creator does one thing well: getting new events into your project as fast and accurately as possible. The other tools in the GES toolchain handle everything after creation.

## Why This Matters More Than You Think

Event creation seems like a small thing. It's "just" setup work. But setup work has a way of expanding to fill available time, and more importantly, the friction of manual creation actively discourages good event architecture.

When creating an event takes 30 seconds of mechanical clicking, developers start taking shortcuts. They reuse events that don't quite fit instead of creating the right one. They skip categories because it's one more step. They use `string` parameters instead of proper custom types because creating the type support is too much overhead for a "simple" event.

When creating an event takes 3 seconds of typing a name and clicking "Add to Queue," developers create the right events with the right types in the right categories. Lower friction leads to better architecture. It's that simple.

The batch queue pattern also fundamentally changes when you think about events. Instead of creating them piecemeal as you implement features, you can sit down with the design doc, queue up everything at once, review the full set for consistency, and then move on to implementation with all your plumbing in place. Planning and execution become separate steps, which is almost always better.

Next up, we'll look at the Behavior Window -- where designers configure event responses, conditions, delays, and loops entirely in the Inspector, without touching a single line of code.

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
