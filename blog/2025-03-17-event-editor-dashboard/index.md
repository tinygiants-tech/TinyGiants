---
slug: event-editor-dashboard
title: "Game Event Editor: The Ultimate Event Dashboard with Search, Filters, and Batch Ops"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tools, tutorial]
description: "Manage hundreds of events efficiently with the Game Event Editor's fuzzy search, category filters, batch operations, and color-coded status system."
image: /img/home-page/game-event-system-preview.png
---

Here's a number that should scare you: 237. That's how many events a mid-sized RPG I consulted on had accumulated after 14 months of development. Not a massive AAA project. A team of eight people building a competent action RPG. Two hundred and thirty-seven ScriptableObject event assets, spread across a dozen folders, with names like `OnDmgCalcComplete`, `OnPlayerDamaged`, `OnDamageApplied`, and `OnDamageDealt` — and nobody on the team could tell you the difference between the last two without reading the code.

The project's event system wasn't broken. It was just unmanageable. And the tool they were using to manage it was the Unity Project window.

<!-- truncate -->

If you've ever tried to manage more than about 50 ScriptableObject assets using the Project window, you know the feeling. It's like organizing a library where every book is the same size, the same color, and the only information visible is the title. No genre tags, no checkout status, no way to tell which books haven't been opened in a year. You just scroll and squint.

This post is about why event management becomes a genuine productivity problem as projects scale, what developers typically do about it (spoiler: mostly suffer), and what a purpose-built event management tool actually looks like in practice.

## The Scaling Problem Nobody Warns You About

### The Comfortable Phase: 10-20 Events

Every project starts here, and everything is fine. You have `OnGameStart`, `OnPlayerDeath`, `OnLevelComplete`, maybe a handful of UI events. You know them all by name. You can find any event in the Project window in about two seconds. Life is good.

At this scale, any event management approach works — even no approach at all. Dump them in a single folder, name them whatever you want, and you're fine. This is the phase that tricks people into thinking event management isn't a real concern.

### The Friction Phase: 50-100 Events

This is where things start to itch. Your combat system has 15 events. Your inventory system has 12. The UI has 20. Audio has 8. You open the Project window and start scrolling. Was it `OnDamageDealt` or `OnDamageReceived`? Was the inventory event `OnItemPickedUp` or `OnItemCollected`? You named it six weeks ago and you genuinely don't remember.

You start relying on naming conventions. Prefix everything with the system name: `Combat_OnDamageDealt`, `UI_OnMenuOpened`, `Audio_OnSFXTriggered`. This helps with alphabetical sorting in the Project window, because now all combat events cluster together. But the Project window still shows you nothing about each event besides its name. Is `Combat_OnDamageDealt` a parameterless event or does it carry a float? Is it actively used or is it left over from the prototype? You can't tell without clicking each one individually and reading the Inspector.

### The Breaking Point: 200+ Events

At this scale, the Project window is a liability. Scrolling through 200 alphabetically sorted assets to find one event takes real time. And once you find it, you need context that the Project window simply cannot provide:

- **What type is this event?** Void? Float? A custom DamageInfo struct? You have to select it and check the Inspector.
- **Is this event actually being used?** Does anything listen to it? Are there configured behaviors? The Project window has no way to show this.
- **Which category does this belong to?** Your folder structure implies categories, but folders are a weak organizational tool — events get misfiled, categories overlap, and restructuring folders means updating every reference.
- **Which events need attention?** Out of 200 events, which ones are missing listener configurations? Which ones are orphaned? There's no visual indicator.

At this point, many teams resort to external tracking. Spreadsheets. Confluence pages. README files in the Events folder. A shared Google Doc titled "Event Registry" that was last updated three months ago and lists 170 events when there are actually 215.

All of these go stale. They go stale because maintaining external documentation alongside the actual assets requires discipline that no team sustains indefinitely. Someone creates a new event during a crunch sprint and forgets to update the spreadsheet. Someone renames an event and doesn't update the Confluence page. Within weeks, the external documentation is a rough approximation of reality, not a source of truth.

### What You Actually Need

Think about what Unity provides for other asset types:

- **Animations** get the Animation window with timeline editing, curve visualization, and state machine views.
- **Shaders** get Shader Graph with visual node editing and live preview.
- **UI** gets the UI Builder and Canvas system with visual layout tools.
- **Audio** gets the Audio Mixer window with group management, effects routing, and volume monitoring.

Events get the Project window. The same generic file browser you use for textures, scripts, and every other asset. No type information, no status indicators, no filtering beyond text search, no batch operations. For an architectural element that touches every system in your game, events are managed with the most primitive tool Unity offers.

What you actually need is something purpose-built: a live, searchable, filterable view of every event in your project, showing type, category, listener status, and reference count — all updating in real time as your project changes. Not an external document. Not a folder structure. A tool.

## How GES's Event Editor Solves This

The Game Event System includes a standalone editor window called the Event Editor, and it's designed specifically for the problem described above. It's not an Inspector panel. It's a full dockable window that serves as the central dashboard for your entire event architecture.

![Editor Window Full](/img/game-event-system/visual-workflow/game-event-editor/editor-window-full.png)

### Three-Layer Smart Filtering

The Editor provides three independent filter axes that combine with AND logic. This is the single most important feature for navigating large event collections.

![Editor Toolbar](/img/game-event-system/visual-workflow/game-event-editor/editor-toolbar.png)

**Category filter.** Select a category — Combat, UI, Audio, Inventory, whatever your project uses — and the list immediately narrows to only events in that category. When you're working on the combat system, you filter to Combat and ignore everything else. Cognitive load drops dramatically.

**Type filter.** Narrow by parameter type: Void, Float, Int, String, Custom, or Sender. This answers "I need that float event that handles movement speed" without scrolling. Filter to Float, scan the shorter list, find it.

**Fuzzy search.** The search bar accepts any text and matches fuzzily. Type "plyrdmg" and it finds "OnPlayerDamaged." Type "inv open" and it finds "OnInventoryOpened." The search applies on top of the category and type filters, so you can progressively narrow: Category "Combat" + Type "Float" + search "dmg" = a very short list, even in a 300-event project.

The search updates in real time as you type. No search button, no delay. Just type and watch the list filter. For a project with 200 events, the combination of category + type + search can get you to the exact event you want in about two seconds flat.

### The Event Row: Everything At a Glance

![Editor Event Row](/img/game-event-system/visual-workflow/game-event-editor/editor-event-row.png)

Each event is displayed as a row in the list, and each row packs more information than the Project window shows for any asset:

**Category tag** — color-coded, consistent across all GES tools. You learn the visual pattern quickly: red for Combat, blue for UI, green for Audio (or whatever your scheme is). Scanning a column of colored tags is faster than reading text labels.

**Event name** — the human-readable identifier you'll scan when looking for a specific event.

**Type indicator** — compact display showing whether this is a SingleGameEvent (void), SingleFloatGameEvent, Int32GameEvent, a custom type, or a sender event. No more clicking into the Inspector to check.

**Behavior status button** — and this is the feature that changes how you think about event health:

- **Green** means Inspector-configured behaviors exist. Someone has set up responses through the Behavior window. This event is wired up and working.
- **Blue** means runtime code listeners are registered. Behaviors exist but were set up programmatically, not through the visual tools.
- **Orange** means no configured behaviors. Nothing is listening to this event. It's either newly created and not yet wired up, or it's an orphan that should be deleted.

That color-coded column is a project health dashboard. Scroll through your events and read the colors. A sea of green means your events are well-configured. Scattered orange means you have orphans. This kind of at-a-glance status is something the Project window fundamentally cannot provide, because the Project window doesn't understand what events are or what "configured" means.

Clicking the behavior button opens the Behavior window for that specific event. One click to go from browsing to configuring.

**Finder button** — launches the Event Finder for that event. One click to answer "who's using this?" without leaving the Editor. (If you haven't read the Event Finder post, it scans all loaded scenes using reflection and shows every MonoBehaviour that references the event.)

### Database Switching for Multi-Database Projects

![Editor Database Switch](/img/game-event-system/visual-workflow/game-event-editor/editor-database-switch.png)

Larger projects benefit from splitting events across multiple databases — core gameplay events in one database, DLC events in another, debug events in a third. The Event Editor has a database switch dropdown that lets you toggle between them. All filters and search terms are preserved when switching, so if you were filtered to "Combat" category, switching databases shows the Combat category in the new database.

This keeps event management scalable even for projects that outgrow a single flat collection.

### The Config Bar

![Editor Config Bar](/img/game-event-system/visual-workflow/game-event-editor/editor-config-bar.png)

The bottom bar houses persistent view settings. Page Mode divides events into pages (10, 25, 50, or 100 per page) with navigation controls. Full Mode shows everything in a scrollable list. Page Mode keeps the window responsive even with thousands of events. Full Mode is better for audits where you want to see an entire category at once.

The Config Bar also provides a secondary database switch for quick access, mirroring the toolbar control.

### Batch Operations: Cleanup at Scale

This is where the Event Editor earns its keep during maintenance phases.

![Editor Batch Mode](/img/game-event-system/visual-workflow/game-event-editor/editor-batch-mode.png)

**Drag reorder** lets you rearrange events within a category. Drag related events next to each other, or order them by workflow stage. This doesn't affect runtime behavior — event order is irrelevant at runtime — but it helps with organization and readability.

**Multi-select delete** is the batch operation you'll use most during cleanup.

![Editor Batch Delete](/img/game-event-system/visual-workflow/game-event-editor/editor-batch-delete.png)

Enable Delete Mode from the toolbar and checkboxes appear next to every event. Check the ones you want to remove, or use "Select All" to check everything visible (respecting current filters — this is important). Click "Delete Selected" and they're all removed in one operation, after a confirmation dialog that shows exactly what will be deleted.

Here's where the filter integration becomes powerful: filter to a specific category, set the type, and then "Select All" only selects events matching those filters. Need to delete all unused debug void events? Filter to Category "Debug" + Type "Void", check the behavior colors (look for orange — no listeners), Select All, delete. A thirty-second operation that would take fifteen minutes of individual clicks in the Project window.

**Category editing** lets you reassign events to different categories directly from the Editor. No need to navigate to each event individually.

### Direct Tool Access From Every Row

Every event row is a launchpad to other GES tools. From any row, you can:

- Open the **Creator** to add new events
- Open the **Behavior Window** to configure listeners (the behavior status button)
- Open the **Finder** to scan for scene references (the magnifying glass button)
- **Delete** the event with confirmation

This means the Event Editor isn't just a list — it's a navigation hub. You browse your events here, then launch into the specific tool you need with one click. No menu diving, no window hunting.

## What This Actually Changes

The Event Editor doesn't add new capabilities to your events. It doesn't change how events fire or how listeners respond. What it changes is your relationship with your event architecture.

Without a management tool, large event collections become opaque. You avoid looking at them. You create new events without checking if a similar one exists. You don't clean up old ones because the effort isn't worth the risk. The event system grows unchecked, and its value as a decoupling mechanism degrades as the signal-to-noise ratio drops.

With the Event Editor, the event system becomes transparent. You can see everything, filter to anything, assess health at a glance, and perform maintenance at scale. Creating a new event starts with a fuzzy search to check if it already exists. Weekly audits take five minutes: filter by category, scan behavior colors, delete orphans, done. New team members can open the Editor, browse categories, and understand the project's event architecture in minutes instead of days.

The difference between 200 events in the Project window and 200 events in the Event Editor is the difference between a pile of papers on a desk and a searchable, sortable, color-coded filing system. The information is the same. The accessibility is not.

That's what a purpose-built tool gives you. Not magic. Just the right information, presented the right way, with the right actions one click away.

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
