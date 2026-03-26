---
slug: event-finder-scene-scanner
title: "Who's Using This Event? Scene Scanning with Game Event Finder"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, debugging, tools]
description: "Before deleting or refactoring an event, you need to know who's referencing it. The Event Finder scans your entire scene and shows you exactly where every event is used."
image: /img/home-page/game-event-system-preview.png
---

"Is anyone still using `OnPlayerDeath`?" You ask the team in Slack. Silence. Someone replies "I think the HUD uses it?" Another person says "maybe the achievement system?" Nobody actually knows. And nobody is brave enough to delete it, because if something references it and you remove it, you've just created a null reference that might not surface until a playtester dies in level 7.

So the event stays. Along with the other 30 events that nobody is sure about. Your event system slowly fills with ghosts — events that might be used, might not be, and nobody can tell which is which.

<!-- truncate -->

This is a real problem, and it's one that Unity's built-in tools can't solve. Ctrl+Shift+F searches your code files, but it doesn't search Inspector references. An event might have zero mentions in code but be referenced by 15 MonoBehaviours through serialized fields. The text search finds nothing, but the event is very much in use.

The Game Event Finder solves this by doing what Unity's search can't: scanning every MonoBehaviour in the scene using reflection, finding every field that references any game event, and presenting the results in a clear, actionable window.

## How It Works Under the Hood

The Event Finder uses C# reflection to scan all MonoBehaviours in the currently loaded scene(s). For each component, it inspects every serialized field — public fields and `[SerializeField]` private fields — and checks whether the field's value references the event you're searching for.

This is a deep scan. It doesn't just check direct GameEvent fields. It inspects:

- Direct `GameEvent` references
- `GameEvent<T>` typed references
- Sender event references
- Fields nested inside serializable classes and structs
- Arrays and lists containing event references
- ScriptableObject references that happen to be GameEvents

The scan is thorough but fast. For a typical scene with a few hundred MonoBehaviours, it completes in under a second. For very large scenes (thousands of objects), it might take a couple of seconds. Either way, it's a one-click operation — you don't need to configure anything or set up search parameters.

## Two View Modes

The Finder presents results in two modes, and you can switch between them freely.

### List View

![Finder List View](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-list.png)

List View shows every reference as a flat, scrollable list. Each row represents one reference — one field on one component on one GameObject that points to the searched event.

Each row displays:
- **GameObject Name** — the object that has the reference
- **Hierarchy Path** — the full path in the scene hierarchy (e.g., `Canvas/HUD/HealthBar`)
- **Component Name** — which script holds the reference (e.g., `DamageHandler`)
- **Field Name** — the specific field (e.g., `onDamageReceived`)
- **Status Indicator** — green for active GameObjects, red for inactive ones

List View is best when you want to see every single reference without any grouping. It's the "give me everything" mode. You can scan through it quickly to count references, spot patterns, or find a specific object.

### Grouped View

![Finder Grouped View](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-grouped.png)

Grouped View organizes results by component type. Instead of a flat list, you see collapsible groups:

```
▼ DamageHandler (3 references)
  ├── Player/PlayerCharacter — onDamageReceived
  ├── Enemies/Goblin — onDamageDealt
  └── Enemies/Dragon — onDamageDealt

▼ HealthBarUI (2 references)
  ├── Canvas/HUD/PlayerHealthBar — damageEvent
  └── Canvas/HUD/BossHealthBar — damageEvent

▼ AchievementTracker (1 reference)
  └── Managers/AchievementManager — combatEvents[2]
```

Grouped View is best when you're trying to understand the architectural picture. "Which systems use this event?" is answered at a glance by looking at the group headers. You can see that `OnDamageDealt` is used by the combat system, the UI system, and the achievement system — three separate concerns, all connected through one event.

## Status Indicators: Active vs. Inactive

Every reference in the Finder is tagged with a status indicator:

- **Green** — the GameObject is active in the hierarchy. This reference is live and will respond to events at runtime.
- **Red** — the GameObject is inactive. The reference exists, but it won't respond to events unless the object is activated.

This distinction matters more than you might think. Inactive references are easy to forget about. You deactivate a UI panel during development, forget about it, and then wonder why the Finder shows references that don't seem to do anything at runtime. The red indicator immediately flags these dormant references.

It also helps with optimization. If you see that an event has 20 references but 15 of them are on inactive objects, that's useful information. Maybe those inactive objects are pooled enemies that get activated during gameplay — in which case, the references are fine. Or maybe they're leftover debug objects that should be cleaned up.

## Reference Details

Each reference row in the Finder provides enough context to identify exactly what's going on without having to navigate to the object:

**GameObject Name** — the name of the object. Combined with the hierarchy path, this uniquely identifies the object in the scene.

**Hierarchy Path** — the full path from the scene root. This is critical in large scenes where multiple objects might share the same name. "Enemy" could be anywhere, but "BattleArena/Waves/Wave3/EnemyGroup/Enemy" tells you exactly where it is.

**Script Name** — the MonoBehaviour class that contains the reference. Knowing the script tells you which system is involved. A reference in `AudioManager` is very different from a reference in `AchievementTracker`, even if both point to the same event.

**Field Name** — the specific field on the component. This is the serialized field name from the code. If a component has multiple event references, the field name tells you which one points to your event.

For array and list references, the field name includes the index: `damageEvents[0]`, `damageEvents[1]`, etc. This is useful when a component stores multiple event references in a collection.

## Quick Actions: Ping, Focus, and Frame

The Finder isn't just for reading — it's for acting. Each reference row includes quick action buttons that let you navigate to the referenced object instantly.

### Ping

The Ping action flashes the referenced GameObject in the Hierarchy window. This is Unity's built-in ping behavior — the object's row briefly highlights yellow, making it easy to spot even in a deep hierarchy.

Ping is non-disruptive. It doesn't change your selection, doesn't move the Scene camera, doesn't alter the Inspector. You just get a visual flash to confirm "that's the object." It's the lightest-weight way to locate something.

Use Ping when you want to quickly verify where an object is in the hierarchy without changing your current context.

### Focus

The Focus action selects the referenced GameObject and opens it in the Inspector. This is the "I want to inspect this reference" action. After clicking Focus:

1. The Hierarchy selection changes to the target object
2. The Inspector shows the target object's components
3. You can immediately see and edit the component that holds the event reference

Focus is the most common action I use. When I'm auditing event references, I typically scan the Finder list, then Focus on anything that looks unexpected or needs attention.

### Frame

The Frame action moves the Scene camera to center on the referenced GameObject. This is the visual equivalent of Focus — instead of seeing the object in the Inspector, you see it in the 3D Scene view.

Frame is invaluable for spatial understanding. If you're wondering "which objects in the scene reference OnExplosion," you can Frame each one and see their positions. Maybe they're all clustered in one area — that tells you something about the level design. Or maybe one of them is way out of bounds — that's probably a bug.

## The Safe Deletion/Refactoring Workflow

The Event Finder's primary use case isn't casual browsing — it's safe maintenance. Here's the workflow I use whenever I need to delete, rename, or refactor an event:

### Step 1: Scan Before You Touch

Before deleting or modifying any event, open the Event Finder and scan for it. This takes five seconds and gives you complete information about every reference in the scene.

### Step 2: Assess the Impact

Look at the scan results:
- **Zero references** — safe to delete. Nobody is using it.
- **All references are on inactive objects** — probably safe to delete, but check if those objects are pooled or loaded dynamically.
- **Active references** — you need to update or replace these before removing the event.

### Step 3: Update References

If the event has active references, use the Focus action to navigate to each one. Update the reference to point to the replacement event, or remove the component/behavior if it's no longer needed.

### Step 4: Re-Scan

After updating, scan again. Make sure the reference count is zero (or only inactive/expected references remain).

### Step 5: Delete

Now you can safely delete the event, knowing you won't create any null references.

```
// Without Event Finder:
// "I think nobody uses this event... let me delete it..."
// *deletes*
// *builds game*
// *playtester reaches level 7*
// "NullReferenceException in DamageHandler.OnDamageReceived"
// *spends 30 minutes tracking it down*

// With Event Finder:
// *scans* — 3 active references found
// *updates all 3*
// *re-scans* — 0 references
// *deletes safely*
```

### Handling Cross-Scene References

One important caveat: the Finder scans currently loaded scenes. If your project uses additive scene loading, make sure all relevant scenes are loaded before scanning. An event might have zero references in your main scene but five references in a UI scene that's loaded additively.

For thorough auditing, I load all game scenes additively, run the scan, and then document the results. This is especially important before major refactoring passes.

## Using the Finder for Architecture Audits

Beyond deletion safety, the Event Finder is a powerful audit tool. Here are some patterns I look for:

**Over-connected events.** If one event has 30+ references, it might be doing too much. Consider splitting it into more specific events. An `OnGameStateChanged` that everything listens to is an anti-pattern — it's essentially a global callback that undermines the decoupling benefits of an event system.

**Under-connected events.** Events with zero or one reference might be over-engineered. If only one component listens to an event, consider whether a direct method call would be simpler. Events add value when they decouple multiple systems. For one-to-one communication, they're overhead.

**Unexpected references.** When you scan an event and find a reference in a system you didn't expect — say, the audio system is listening to a physics event — that's a signal to investigate. It might be intentional (play a sound when something collides) or it might be a leftover from debugging.

**Inactive reference patterns.** A high ratio of inactive-to-active references suggests objects that should probably be cleaned up or that your pooling system is holding onto too many dormant objects.

## Performance Considerations

The Event Finder uses reflection, which is inherently slower than direct field access. However, it's an editor-only tool — it doesn't affect runtime performance at all. The scan happens on-demand when you click the scan button, not continuously.

For scenes with under 1000 MonoBehaviours, the scan is essentially instant. For very large scenes (5000+ components), it might take 2-3 seconds. The Finder shows a progress indicator during the scan so you know it's working.

The reflection results are not cached between scans. This is intentional — you want fresh data every time, especially if you've been making changes between scans. The slight cost of re-scanning is worth the guarantee of accuracy.

## Wrapping Up

The Game Event Finder answers the question that nobody on your team can: "who's using this event?" It replaces guessing with data, and it turns the terrifying act of deleting an event into a safe, verified operation.

The two view modes (List and Grouped) give you both the detailed and architectural perspectives. The status indicators separate active from inactive references. And the quick actions (Ping, Focus, Frame) let you navigate to any reference instantly.

Build the habit of scanning before modifying. It takes five seconds and prevents hours of debugging. Your future self — the one who would have been tracking down a null reference in level 7 at 11 PM — will thank you.

Next up, we'll look at the Game Event Editor — the main dashboard for managing all your events with search, filters, batch operations, and that satisfying color-coded status system.

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
