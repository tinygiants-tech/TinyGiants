---
slug: event-finder-scene-scanner
title: "Who's Using This Event? Scene Scanning with Game Event Finder"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, debugging, tools]
description: "Before deleting or refactoring an event, you need to know who's referencing it. The Event Finder scans your entire scene and shows you exactly where every event is used."
image: /img/home-page/game-event-system-preview.png
---

Last week I tried to delete an event called `OnEnemyStaggered`. The combat system had been reworked two sprints ago, and I was pretty sure stagger was gone. Pretty sure. Not certain. So I did what every Unity developer does in that situation: I asked the team. One person said "I think it was removed." Another said "check the HUD, maybe the stagger indicator still uses it." A third person just shrugged.

Nobody knew. And I wasn't about to delete it and find out the hard way during QA.

<!-- truncate -->

This is the "who's using this?" problem, and if you've worked on any Unity project with more than a dozen events, you've hit it. It's not a theoretical concern. It's the reason your event library has 40 events but only 25 of them are actually doing anything. The other 15? Ghosts. Nobody deletes them because nobody can prove they're safe to delete. And so they accumulate, cluttering your project, confusing new team members, and making every refactoring session feel like defusing a bomb.

Let's talk about why this problem is so hard to solve with Unity's existing tools, and then look at what a real solution looks like.

## The Dependency Visibility Problem

Every programming environment has some concept of "find all references." Your IDE does it for code. Databases have dependency graphs. Even spreadsheet software can trace cell references. But Unity event systems? They exist in a weird blind spot where no single tool can give you the full picture.

### C# Events and Delegates: Grep Works, Sort Of

If you're using plain C# events or delegates, your best bet is a text search. Ctrl+Shift+F in your IDE, search for `OnEnemyStaggered`, and you'll find every `.cs` file that subscribes to it or invokes it.

This works. For code. But here's what it misses: anything configured through the Inspector. If a MonoBehaviour has a serialized field that holds an event reference, and that reference was set by dragging an asset into the Inspector, there's no mention of it in any `.cs` file. The text search returns zero results, and you conclude the event is unused. Except it's not — three GameObjects in Scene 4 reference it through Inspector bindings. You delete it, ship a build, and the bug report comes in two days later from a playtester who reached the boss fight.

### UnityEvent: The Serialized Mystery Box

UnityEvent is even worse for dependency tracking. UnityEvent bindings are serialized inside scene files and prefabs as YAML. They don't appear in your C# code at all. There is no programmatic way to enumerate "all UnityEvent bindings that target this method" across your project. You'd have to parse raw `.unity` and `.prefab` files, which is technically possible but practically insane.

Some developers try to work around this by searching the serialized YAML directly:

```
// Sure, you could grep scene files for GUID references...
// but can you imagine maintaining that workflow?
// "Before deleting any event, parse all .unity files for this asset's GUID"
```

Nobody does this. And so UnityEvent bindings become invisible dependencies that silently break when you change things.

### ScriptableObject Events: Better, But Not There

ScriptableObject-based event systems (the pattern popularized by Ryan Hipple's 2017 GDC talk) improve things somewhat. Since events are actual assets, Unity's "Find References in Scene" can locate GameObjects that reference a specific ScriptableObject.

But "Find References in Scene" has a critical limitation: it only searches the **currently active scene**. If your project uses multiple scenes — and most non-trivial projects do — you'd have to manually open every scene, run the search, note the results, open the next scene, repeat. For a project with 15 scenes, that's 15 manual searches per event. Nobody does this either.

There's also the problem of nested references. If a MonoBehaviour stores your event inside a serializable struct or a list, Unity's built-in search might not find it. The reference exists, but it's buried one level deeper than the search inspects.

### The Fear Factor

The end result of all these limitations is fear. Developers stop deleting events. They stop renaming them. They stop refactoring the event architecture because they can't verify the impact of changes.

I've seen projects where the event folder has 300 assets and the team estimates that maybe 180 are actually in use. The other 120? "We'll clean those up eventually." Eventually never comes, because the cleanup requires dependency information that nobody has.

This is the refactoring tax. Every unused event is noise. Every "maybe it's used?" event is a decision you defer. And the longer you defer, the more entangled things become, until the event system is a liability instead of an asset.

### What Other Tools Get Right

Think about how other tools handle this:

- Your IDE shows "3 references" next to a method signature. You can click through to each one.
- A database schema viewer shows which tables reference a foreign key before you drop it.
- Even CSS tools can tell you which selectors are unused.

Event systems in Unity have historically had nothing comparable. You create events, you use events, and when you want to know the relationship between the two, you're on your own.

### Multi-Scene Makes Everything Worse

Modern Unity projects commonly use additive scene loading. Your main game scene, your UI scene, your audio scene, your level-specific scenes — all loaded at runtime. An event might have zero references in the scene you're currently editing but fifteen references across three other scenes that load additively.

Without a tool that can scan across all loaded scenes simultaneously, you're always working with partial information. And partial information is worse than no information, because it gives you false confidence. "I checked the main scene, no references, safe to delete." Except the UI scene has five references and you didn't check it.

## How GES's Event Finder Solves This

The Game Event System includes a tool called the Event Finder, and it does exactly one thing: it answers "who's using this event?" with complete, accurate data.

You access it from the Event Editor — every event row has a magnifying glass icon. Click it, and the Finder scans every MonoBehaviour in all currently loaded scenes using C# reflection. Not just public fields. Not just direct references. It inspects every serialized field, including `[SerializeField]` private fields, nested serializable classes, arrays, and lists.

The scan is fast. For a typical scene with a few hundred MonoBehaviours, it completes in under a second. For large multi-scene setups, maybe two or three seconds. One click, full results.

### List View: Every Reference, Flat and Sortable

![Finder List View](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-list.png)

List View shows every reference as a flat, scrollable list. Each row is one field on one component on one GameObject that references the searched event. You get the GameObject name, its full hierarchy path (so you know `Canvas/HUD/HealthBar` vs. just "HealthBar"), the component name, and the specific field name.

This is the "give me everything" mode. When you want to count total references, or you're looking for a specific object, or you just want to see the full picture without any grouping, List View is it.

### Grouped View: The Architectural Perspective

![Finder Grouped View](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-grouped.png)

Grouped View organizes results by component type. Instead of a flat list, you see collapsible groups:

```
DamageHandler (3 references)
  Player/PlayerCharacter — onDamageReceived
  Enemies/Goblin — onDamageDealt
  Enemies/Dragon — onDamageDealt

HealthBarUI (2 references)
  Canvas/HUD/PlayerHealthBar — damageEvent
  Canvas/HUD/BossHealthBar — damageEvent

AchievementTracker (1 reference)
  Managers/AchievementManager — combatEvents[2]
```

This answers the higher-level question: "which systems use this event?" At a glance, you can see that `OnDamageDealt` connects the combat system, the UI system, and the achievement system. Three separate concerns, one event. That's the architectural picture, and it's invaluable when you're deciding whether an event is too broadly coupled or appropriately shared.

### Status Indicators: Active vs. Inactive

Every reference is tagged with a color indicator:

- **Green** means the GameObject is active in the hierarchy. This reference is live and will receive events at runtime.
- **Red** means the GameObject is inactive. The reference exists in the scene, but the object won't respond to events unless something activates it.

This distinction catches a class of bugs that are otherwise invisible. You deactivate a UI panel during development, forget about it, and three months later you're staring at the Finder wondering why there's a "dead" reference on an object you don't recognize. The red indicator immediately tells you: this object exists but is dormant.

It also helps with cleanup decisions. If an event has 20 references but 15 are on inactive objects, that's worth investigating. Are those pooled enemies that activate during gameplay? Then the references are fine. Are they leftover debug objects from a prototype phase? Then they should be cleaned up.

### Quick Actions: Ping, Focus, Frame

The Finder isn't read-only. Every reference row has three action buttons:

**Ping** flashes the GameObject in the Hierarchy window — a quick visual confirmation of where the object sits in the hierarchy. It doesn't change your selection or move the camera. It's the lightest-weight way to locate something.

**Focus** selects the GameObject and opens it in the Inspector. This is the "I want to look at this" action. After clicking, the Inspector shows the component that holds the event reference, ready for inspection or editing.

**Frame** moves the Scene camera to center on the referenced GameObject. This gives you spatial context — where is this object in the 3D world? If you're scanning references for `OnExplosion` and one of them is way outside the play area, that's probably a misplaced object that needs attention.

### The Safe Refactoring Workflow

Here's what the Event Finder actually enables — and why it matters more than any individual feature:

1. **Before touching any event**, open the Finder and scan. Five seconds.
2. **Zero references?** Safe to delete. No guessing needed.
3. **All references inactive?** Probably safe, but check if those objects are pooled or dynamically loaded.
4. **Active references?** Use Focus to navigate to each one. Update or remove as needed.
5. **Re-scan.** Confirm the count is now zero or as expected.
6. **Delete with confidence.**

Compare this to the old workflow of "ask the team, grep the codebase, pray, and delete." The Finder replaces guessing with data. It turns event cleanup from a high-anxiety gamble into a routine, verified operation.

The broader impact is that teams actually start maintaining their event libraries. When you can prove an event is unused in five seconds, you delete it. When you can trace every reference before renaming, you rename without fear. The event system stays clean because keeping it clean is no longer a heroic effort — it's just a button click.

That's the difference a proper dependency scanner makes. Not a new feature to learn, but a removal of the fear that prevents you from doing the maintenance your project needs.

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
