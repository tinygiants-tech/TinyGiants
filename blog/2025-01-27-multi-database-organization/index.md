---
slug: multi-database-organization
title: "200 Events and Counting: Multi-Database Modular Management in Practice"
authors: [tinygiants]
tags: [ges, unity, architecture, best-practices, tutorial]
description: "When your project outgrows a single event container, GES Multi-Database architecture keeps everything organized, searchable, and conflict-free."
image: /img/home-page/game-event-system-preview.png
---

You're six months into development. Your event system has grown to 200 events. Every time you need to find one, you open the event dropdown and scroll. And scroll. And scroll some more. "OnPlayerHealthChanged"... no, that's not it. "OnPlayerHealthDepleted"... nope. "OnPlayerHPLow"... wait, who named it that? After three minutes of squinting at an alphabetical list, you find it — or give up and create a duplicate because you're not sure if it already exists.

This is what happens when a single flat event container meets a real production project. It's not a failure of the event system concept — it's an organizational problem. And like most organizational problems, the solution is structure.

GES addresses this with Multi-Database architecture: a modular system that lets you split events into logical groups, search across them instantly, and scale to any project size without losing your mind.

<!-- truncate -->

## Why Single Containers Don't Scale

Let's be clear about why a single event container becomes unmanageable. It's not just "too many items in a list." There are structural problems that compound as your project grows.

### Problem 1: Naming Collisions

In a flat namespace, every event competes for unique naming. Your UI team creates `OnButtonClicked`. Your combat team creates `OnButtonClicked` (for the controller button). Now you have a conflict, and someone has to rename theirs to `OnUIButtonClicked` or `OnControllerButtonClicked`. Multiply this by 200 events across 5 teams, and you spend more time bikeshedding names than building features.

### Problem 2: Cognitive Overload

The human brain can handle about 7 items in working memory. A dropdown with 200 events is not a usable interface — it's a phone book. Even with alphabetical sorting, finding the right event requires knowing its exact name, which you often don't.

### Problem 3: Ownership Confusion

Who owns the `OnGameStateChanged` event? Is it the game flow team? The save system team? The analytics team? In a flat structure, ownership is implicit and often ambiguous. When it's time to modify or deprecate an event, nobody knows who to ask.

### Problem 4: Git Merge Conflicts

If all events live in a single ScriptableObject container (or a single folder), every team member who adds or modifies an event touches the same file. Git merge conflicts become a daily occurrence, and resolving them in serialized ScriptableObject data is significantly more painful than resolving conflicts in code.

## The Multi-Database Architecture

GES solves this with a simple but powerful concept: instead of one event container, you have multiple independent databases. Each database is a separate ScriptableObject asset that manages its own collection of events.

![Multi Database Manager](/img/game-event-system/examples/12-multi-database/demo-12-manager.png)

The `GameEventManager` sits at the top level, aware of all databases. Individual databases are self-contained modules that can be created, loaded, and unloaded independently.

### How It Works

Think of it like namespaces in C#, or modules in a Node.js project. Each database is a boundary:

- **Core Events** — fundamental game lifecycle events (start, pause, quit, save, load)
- **UI Events** — button clicks, menu transitions, dialog opens/closes
- **Audio Events** — music triggers, SFX requests, volume changes
- **Combat Events** — damage, death, spawn, buff, debuff
- **Inventory Events** — item pickup, drop, equip, use, craft
- **Progression Events** — level up, achievement unlocked, quest complete

Each database contains only the events relevant to its domain. When a UI developer opens the event dropdown, they see 20-30 UI events — not 200 events from every system in the game.

![Database Assets](/img/game-event-system/examples/12-multi-database/demo-12-assets.png)

## Practical Setup: Splitting Your Project

Let's walk through setting up a multi-database structure for a mid-sized RPG project.

### Step 1: Plan Your Modules

Before creating databases, think about your project's natural boundaries. A good rule of thumb: if a group of events would make sense as a namespace in code, it should be its own database.

Here's a typical structure for an RPG:

```
GameEvents/
├── Core.asset          (15-20 events: lifecycle, scene management, save/load)
├── Player.asset        (25-30 events: health, mana, movement, abilities)
├── Combat.asset        (20-25 events: damage, death, aggro, buffs)
├── UI.asset            (30-40 events: menus, HUD, dialogs, tooltips)
├── Audio.asset         (15-20 events: music, SFX, ambient, voice)
├── Inventory.asset     (15-20 events: pickup, drop, equip, craft)
├── Quest.asset         (10-15 events: accept, progress, complete, fail)
├── World.asset         (10-15 events: weather, time of day, zone enter/exit)
└── Social.asset        (10-15 events: NPC dialogue, trade, party)
```

Total: ~170-200 events, organized into 9 databases with 10-40 events each. Each database is small enough to browse comfortably in a dropdown.

### Step 2: Create the Databases

In the GES Manager window, create each database as a separate ScriptableObject asset. Give each one a clear, short name and assign it a category color for visual distinction.

### Step 3: Assign Events to Databases

Move existing events into their appropriate databases. GES uses GUID-based references, so moving an event from one database to another doesn't break any existing references. The event's GUID stays the same — only its organizational home changes.

This is a critical feature: **reorganization is always safe**. You can split a database, merge two databases, or move events between databases at any time without breaking a single listener binding.

### Step 4: Configure the Manager

The `GameEventManager` component references all active databases. You can configure which databases load at startup and which are loaded dynamically.

![Manager Databases](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

## The Category System and Fuzzy Search

Even within a well-organized database, finding the right event should be instant. GES provides two tools for this: categories and fuzzy search.

### Categories

Each event can be tagged with one or more categories within its database. For example, in the Combat database:

- **Damage:** `OnPlayerDamaged`, `OnEnemyDamaged`, `OnCriticalHit`, `OnDamageBlocked`
- **Death:** `OnPlayerDeath`, `OnEnemyDeath`, `OnBossDeath`, `OnPartyWipe`
- **Spawn:** `OnEnemySpawned`, `OnWaveStarted`, `OnBossAppeared`
- **Buffs:** `OnBuffApplied`, `OnBuffExpired`, `OnDebuffApplied`, `OnDebuffCleansed`

Categories appear as collapsible groups in the event dropdown, turning a flat list into a navigable tree.

### Fuzzy Search

When you start typing in the event dropdown, GES performs fuzzy matching across all active databases. Type "plyr dmg" and it finds `OnPlayerDamaged`. Type "boss die" and it finds `OnBossDeath`. The search is fast (sub-millisecond) and forgiving — you don't need to remember the exact event name.

![Editor Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-editor-dropdown.png)

This combination of database boundaries, categories, and fuzzy search means that finding any event in a 200+ event project takes about 2 seconds, not 3 minutes.

## Dynamic Runtime Loading and Unloading

Not every event database needs to be in memory at all times. GES supports dynamic loading and unloading of databases at runtime, which has both performance and architectural benefits.

### Memory Optimization

A multiplayer lobby doesn't need combat events loaded. A cutscene sequence doesn't need inventory events. By unloading irrelevant databases, you reduce the memory footprint of your event system to only what's currently needed.

```csharp
public class SceneEventLoader : MonoBehaviour
{
    [SerializeField] private GameEventManager eventManager;
    [SerializeField] private GameEventDatabase combatDatabase;
    [SerializeField] private GameEventDatabase inventoryDatabase;

    public void OnEnterCombatScene()
    {
        eventManager.LoadDatabase(combatDatabase);
    }

    public void OnExitCombatScene()
    {
        // All listeners in the combat scene have been cleaned up via OnDisable.
        // Now we can safely unload the database.
        eventManager.UnloadDatabase(combatDatabase);
    }

    public void OnEnterTownScene()
    {
        eventManager.LoadDatabase(inventoryDatabase);
        // Combat database stays unloaded — no enemies in town
    }
}
```

### Modular Content Loading

For games with DLC or modular content, each content module can bring its own event database. The base game has its databases, and the "Dragon Expansion" DLC adds a `DragonEvents.asset` database with events specific to dragon encounters. The DLC events integrate seamlessly with the base game's event system — no code changes required.

### Feature Toggles

During development, you can enable or disable entire feature modules by loading or unloading their event databases. Working on the new crafting system? Load the Crafting database. It's not ready for QA yet? Unload it. The rest of the game functions normally because no other system depends on the crafting events.

## Team Collaboration: Avoiding Git Merge Conflicts

This is the unglamorous but incredibly practical benefit of multi-database architecture. Let's talk about what happens when four developers work on the same project.

### The Single Container Problem

With one event container:

```
Developer A: adds OnQuestAccepted to EventDatabase.asset
Developer B: adds OnItemCrafted to EventDatabase.asset
Developer C: modifies OnPlayerDamaged in EventDatabase.asset
Developer D: adds OnNPCDialogueStarted to EventDatabase.asset
```

All four developers modify the same file. When they push to Git, three of them get merge conflicts. Resolving merge conflicts in Unity's serialized ScriptableObject format (YAML) is tedious and error-prone. One wrong merge can corrupt the entire event database.

### The Multi-Database Solution

```
Developer A: adds OnQuestAccepted to QuestEvents.asset       (only they touch this file)
Developer B: adds OnItemCrafted to InventoryEvents.asset     (only they touch this file)
Developer C: modifies OnPlayerDamaged in CombatEvents.asset  (only they touch this file)
Developer D: adds OnNPCDialogueStarted to SocialEvents.asset (only they touch this file)
```

Zero conflicts. Each developer works in their own database. The only time a conflict occurs is when two developers modify the same database — which, with proper team organization, is rare.

### Best Practices for Team Structure

Align database ownership with team responsibilities:

| Database | Owner | Backup |
|----------|-------|--------|
| Core | Lead Programmer | Tech Lead |
| Player | Player Systems Dev | Gameplay Lead |
| Combat | Combat Designer | Combat Programmer |
| UI | UI Programmer | UI Designer |
| Audio | Audio Programmer | Sound Designer |
| Inventory | Systems Programmer | Gameplay Lead |
| Quest | Quest Designer | Narrative Lead |

When you need a new event, you know exactly which database it belongs to and who to coordinate with. No more "who added this event?" mysteries.

## GUID-Based References: The Safety Net

The entire multi-database architecture rests on one foundational feature: **GUID-based references**. Every event has a globally unique identifier that never changes, regardless of:

- Which database the event belongs to
- The event's name
- The event's file path in the project
- The database's name or location

This means you can reorganize your event architecture at any time:

**Split a database that's gotten too large:**
The "Gameplay" database grew to 80 events? Split it into "Player," "Combat," and "World." Move events between them. Every listener reference survives because GUIDs don't change.

**Merge databases that are too granular:**
The "Weather" and "TimeOfDay" databases only have 5 events each? Merge them into "World." Move events. Every reference survives.

**Rename events for clarity:**
"OnEvt_PlrHP_Chg" was named by a developer who was in a hurry. Rename it to "OnPlayerHealthChanged." Every reference survives.

**Reorganize the project folder structure:**
Move `Assets/Events/` to `Assets/Data/GameEvents/`. Every reference survives.

This safety net is what makes the multi-database architecture practical, not just theoretical. Without GUID protection, reorganizing events would be a terrifying operation that could break hundreds of listener bindings. With it, reorganization is a routine maintenance task.

![Manager Overview](/img/game-event-system/visual-workflow/game-event-manager/manager-overview.png)

## Scaling Strategies

As your project grows, here are proven patterns for keeping the event architecture manageable.

### Start Small, Split When Needed

Don't create 10 databases on day one. Start with 2-3 (Core, UI, Gameplay). When a database exceeds 30-40 events, split it. GES makes splitting painless, so there's no cost to starting simple.

### Name Events Consistently

Adopt a naming convention and stick to it. A common pattern:

```
On[Subject][Action]
OnPlayerDamaged
OnEnemySpawned
OnItemEquipped
OnQuestCompleted
OnUIMenuOpened
```

The `On` prefix signals "this is an event." The subject comes before the action for alphabetical grouping (all Player events cluster together, all Enemy events cluster together).

### Use Categories as Sub-Namespaces

Within a database, categories provide a second level of organization. A 40-event Combat database with categories (Damage, Death, Spawn, Buffs, Status) is as easy to navigate as a 10-event database without categories.

### Document Cross-Database Dependencies

Some events naturally cross module boundaries. The `OnPlayerDeath` event in the Player database triggers responses in Combat, UI, Audio, and Quest. Document these cross-database connections in a simple spreadsheet or wiki page. GES doesn't enforce module boundaries — any listener can reference any event from any loaded database — but knowing the cross-cutting concerns helps with maintenance.

### Review Event Usage Regularly

GES's runtime monitor and editor tools show you which events are actually being raised and listened to. Periodically review for:

- **Dead events:** events that exist but are never raised. Delete them.
- **Orphan listeners:** listeners bound to events that are never raised. Remove them.
- **Duplicate events:** two events that serve the same purpose. Consolidate them.
- **Overly broad events:** an event that always requires the listener to filter. Consider splitting into more specific events.

## Key Takeaways

1. **Organization is not optional at scale.** A flat list of 200 events is a productivity drain, not a convenience.
2. **Multi-Database splits events along natural module boundaries.** Each database is small enough to browse, specific enough to own, and independent enough to avoid merge conflicts.
3. **GUID-based references make reorganization safe.** Move, rename, split, merge — nothing breaks.
4. **Dynamic loading keeps memory lean.** Load only the event databases your current scene needs.
5. **Team alignment with database ownership prevents conflicts.** Both Git merge conflicts and human organizational conflicts.

The difference between a 200-event project that's manageable and one that's a nightmare isn't the number of events — it's the structure around them.

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
