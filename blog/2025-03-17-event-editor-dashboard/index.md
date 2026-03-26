---
slug: event-editor-dashboard
title: "Game Event Editor: The Ultimate Event Dashboard with Search, Filters, and Batch Ops"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tools, tutorial]
description: "Manage hundreds of events efficiently with the Game Event Editor's fuzzy search, category filters, batch operations, and color-coded status system."
image: /img/home-page/game-event-system-preview.png
---

Tell me if this sounds familiar: you're looking for an event called something like "OnEnemySpawned." You open the Project window. You navigate to the Events folder. There are 200 ScriptableObject assets in there, sorted alphabetically. You start scrolling. OnAudioFaded... OnButtonClicked... OnCameraShake... OnDamageBlocked... this is going to take a while. And once you find it, you need to check if it has any configured behaviors, which means selecting it and checking the Inspector, which means losing your place in the list.

This is the default Unity experience for managing ScriptableObject-based events. It works for 10 events. It's annoying at 50. It's unworkable at 200+.

<!-- truncate -->

The Game Event Editor replaces this entire workflow with a purpose-built window. Fuzzy search, category and type filters, color-coded behavior status, one-click navigation to behaviors and finders, pagination for large collections, and batch operations for bulk management. It's the central hub for everything event-related in your project.

Let's go through every feature.

![Editor Window Full](/img/game-event-system/visual-workflow/game-event-editor/editor-window-full.png)

## The Editor Window Overview

The Event Editor is a standalone editor window (not an Inspector panel). You open it from the System Dashboard, the menu (`Tools > TinyGiants > Event Editor`), or the Quick Access shortcuts. It's dockable, resizable, and persistent — it remembers your filter settings and pagination state between sessions.

The window is organized into three horizontal zones:

1. **Toolbar** — top bar with primary actions
2. **Event List** — the main content area showing your events
3. **Config Bar** — bottom bar with database switching and view settings

Let's break each one down.

## The Toolbar

![Editor Toolbar](/img/game-event-system/visual-workflow/game-event-editor/editor-toolbar.png)

The toolbar sits at the top of the window and provides access to primary actions:

### Database Switch

If your project uses multiple event databases (which I strongly recommend for larger projects — see the multi-database post), the database switch dropdown lets you toggle between them. Each database has its own set of events, categories, and configurations.

![Editor Database Switch](/img/game-event-system/visual-workflow/game-event-editor/editor-database-switch.png)

Switching databases updates the entire Event List immediately. All filters and search terms are preserved, so if you were filtering by "Combat" category, switching databases will show the "Combat" category in the new database (if it exists).

### Flow Graph Access

The Flow Graph button opens the visual event flow graph for the current database. This gives you a node-based view of how events connect to behaviors — a bird's-eye architectural view that complements the Event Editor's list-based management view.

### New Event

The New Event button is a shortcut to the Event Creator. If you need to add events while you're working in the Editor, you don't have to navigate away — just click New Event, create what you need, and the Editor refreshes automatically when you come back.

### Delete Mode

The Delete Mode toggle switches the Event List into batch deletion mode. More on this below in the Batch Operations section.

## Smart Filtering

The Event Editor's filtering system is where the real productivity gains live. With three independent filter axes that combine using AND logic, you can slice your event collection from any angle.

### Category Filter

The category dropdown shows all categories in the current database. Select a category and the list instantly filters to show only events in that category.

Categories are user-defined — you create them in the Event Creator or Event Editor. Good categories map to game systems: "Combat", "UI", "Audio", "Physics", "AI", "Inventory". The category filter makes it trivial to focus on one system's events.

There's also an "All" option that shows events from every category. I use category filtering constantly — when I'm working on the combat system, I filter to "Combat" and ignore everything else. When I'm doing UI work, I switch to "UI". It keeps the list focused and reduces cognitive load.

### Type Filter

The type filter narrows events by their parameter type:

- **All** — show everything
- **Void** — parameterless events only
- **Float** — `GameEvent<float>` only
- **Int** — `GameEvent<int>` only
- **String** — `GameEvent<string>` only
- **Custom** — events using custom types
- **Sender** — sender events only

This is incredibly useful when you know what type of event you're looking for but don't remember the exact name. "I need that float event that handles speed..." Filter to Float, scan the list, find it.

### Fuzzy Search Bar

The search bar at the top accepts any text and filters the list using fuzzy matching. Type "plyrdmg" and it'll find "OnPlayerDamaged". Type "inv open" and it'll find "OnInventoryOpened".

The search applies on top of category and type filters. So if you've filtered to Category: "Combat" and Type: "Float", the search will only look within that already-filtered subset. This AND logic means you can progressively narrow down even very large event collections.

The search is real-time — results update as you type. There's no "Search" button to click. Just type and watch the list filter.

## The Event List

![Editor Event Row](/img/game-event-system/visual-workflow/game-event-editor/editor-event-row.png)

The Event List is the main content area. Each event is displayed as a row with multiple columns:

### Category

The event's category, displayed as a colored tag. The color is consistent throughout the GES toolchain, so you learn to associate "Combat = red, UI = blue, Audio = green" (or whatever your color scheme is) at a glance.

### Name

The event's human-readable name. This is the primary identifier you'll scan when looking for a specific event.

### Type Reference

A compact type indicator showing the event's parameter type. Void events show "—", typed events show the type name (e.g., "Float", "Int", "DamageInfo"), and sender events show the type with a sender icon.

### Behavior Button

This is one of the most useful columns. Each event has a behavior button that:

1. **Shows behavior status via color coding:**
   - **Green** — Inspector-configured behaviors exist. Someone has set up responses through the Behavior window.
   - **Blue** — Runtime code listeners are registered. Behaviors exist but were set up programmatically.
   - **Orange** — No configured behaviors. This event has no listeners.

2. **Clicks to open the Behavior window** for that specific event. One click and you're configuring responses.

The color coding is transformative for project health monitoring. A quick scan down the Behavior column tells you the state of your event system. A sea of green means your events are well-configured. Scattered orange means some events are orphaned. Blue indicates code-driven listeners, which are fine but less visible to designers.

### Finder Button

Each row also has a Finder button that launches the Event Finder for that specific event. One click to answer "who's using this event?" without leaving the Editor window.

### Delete Button

In normal mode, each row has a delete button for removing individual events. This opens a confirmation dialog to prevent accidental deletion. For bulk deletion, switch to Delete Mode (see below).

## View Modes

![Editor Config Bar](/img/game-event-system/visual-workflow/game-event-editor/editor-config-bar.png)

The Event Editor supports two view modes, configurable from the Config Bar:

### Page Mode

Page Mode divides your events into pages with configurable page size: 10, 25, 50, or 100 events per page. Navigation buttons at the bottom let you step through pages, and a page indicator shows your current position (e.g., "Page 3 of 12").

Page Mode is the default and works well for most projects. It keeps the window responsive even with thousands of events, because only the current page is rendered. The tradeoff is that you need to page through to see everything.

I use Page Mode with a page size of 25 for daily work. It's a comfortable amount of information to scan without feeling overwhelmed, and paging through 8-10 pages for a 200-event project is quick.

### Full Mode

Full Mode displays every event in a single scrollable list. No pages, no navigation — just scroll. This is useful when you want to see everything at once, especially with active filters that narrow the list to a manageable size.

I switch to Full Mode when I'm doing audits or reviews. Filter to a specific category, switch to Full Mode, and scroll through every event in that category to check behavior status and naming conventions.

Be aware that Full Mode with 500+ unfiltered events can make the window sluggish. The rendering overhead of hundreds of editor GUI rows is noticeable. Use filters to narrow the list first, or stick with Page Mode for large projects.

## Batch Operations

![Editor Batch Mode](/img/game-event-system/visual-workflow/game-event-editor/editor-batch-mode.png)

The Event Editor supports several batch operations for managing events in bulk:

### Drag Reorder

Events within a category can be reordered by dragging. This doesn't affect functionality — event order doesn't matter at runtime — but it helps with organization. Put related events next to each other, or order them by workflow (setup events first, gameplay events next, cleanup events last).

### Multi-Select Delete

![Editor Batch Delete](/img/game-event-system/visual-workflow/game-event-editor/editor-batch-delete.png)

When you enable Delete Mode from the toolbar, checkboxes appear next to every event. You can check individual events, use "Select All" to check everything visible (respecting current filters), or "Clear" to uncheck everything.

Once you've selected the events you want to remove, clicking "Delete Selected" removes them all in one operation. A confirmation dialog shows exactly which events will be deleted and warns about any that have active references.

This is essential for cleanup passes. When you're removing a deprecated system and need to delete 20 related events, multi-select delete is dramatically faster than doing it one by one.

**Tip:** Before batch deleting, use the Finder button on each candidate to check for references. Better yet, filter by behavior status — orange events (no listeners) are the safest deletion candidates.

### Select All / Clear

These toolbar buttons work with the current filtered view. If you've filtered to Category: "Combat" and Type: "Void", "Select All" only checks the combat void events. This makes it easy to target specific subsets for batch operations.

## The Config Bar

The Config Bar at the bottom of the window houses persistent settings:

### Database Switch

A secondary database switch (mirrors the toolbar one) for quick access. Some people prefer using the bottom bar for database switching because it's closer to the event list content.

### Page Size

A dropdown to set events per page: 10, 25, 50, 100. Smaller page sizes mean less scrolling per page but more page navigation. Larger sizes show more at once but require more scrolling.

My recommendation: 25 for daily work, 50 for focused review sessions, 100 or Full Mode for audits.

## Practical Workflow: Managing a Growing Project

Here's how I use the Event Editor across a project's lifecycle:

### Early Development (0-50 events)

Everything fits on one or two pages. I use Full Mode and don't bother with filters much. The main value at this stage is the behavior status colors — making sure events I've created also have configured responses.

### Mid Development (50-200 events)

Filters become essential. I filter by category when working on a specific system. The fuzzy search is my primary navigation tool — I know the event name (approximately), so I search for it. Page Mode with 25 per page keeps things manageable.

At this stage, I do a weekly audit: switch to Full Mode, scan all categories, look for orange (unconfigured) events. Either configure them or delete them. Don't let orphaned events accumulate.

### Late Development (200+ events)

Every feature of the Editor is in play. Multiple databases to separate core events from DLC events. Category filters to focus on one system at a time. Type filters to find specific event kinds. Fuzzy search for precise lookups.

Batch operations become important during optimization and cleanup passes. "Delete all unused debug events" is a 30-second operation with multi-select delete.

The behavior status colors become a project health dashboard. Green = configured, Blue = code-driven, Orange = needs attention. A pre-release audit pass should have zero unexpected orange events.

### Maintenance / Post-Launch

The Event Editor becomes the source of truth for your event architecture. New team members can open it, browse categories, and understand the event structure without reading code. The Finder integration means anyone can trace event usage without understanding the codebase deeply.

For hotfixes, the behavior column is invaluable. "Something is wrong with damage events" — open the Editor, filter to Combat/Float events, check behavior status, use Finder to trace references, spot the misconfiguration, fix it in the Behavior window. All without opening the IDE.

## Tips for Keeping the Editor Useful

**Maintain your categories.** The Editor is only as organized as your category structure. Regularly review categories and consolidate or split as needed. An "Uncategorized" category with 50 events is a red flag.

**Use descriptive names.** The fuzzy search works great when event names are descriptive. "OnPD" is unsearchable. "OnPlayerDamaged" finds instantly. Naming conventions are a team investment that pays off every day in the Editor.

**Review behavior colors regularly.** Make it a habit to scan the behavior column during daily standups or weekly reviews. Orange events are either unused (delete them) or missing configuration (fix them). Green and blue events are healthy.

**Use filters as documentation.** When someone asks "what events does the combat system use?", filter to the Combat category and show them the Editor. It's living documentation that's always up to date, unlike a wiki page that was last edited six months ago.

## Wrapping Up

The Game Event Editor is the command center for your event architecture. It takes the chaos of hundreds of ScriptableObject assets scattered across Project folders and turns it into a searchable, filterable, color-coded, batch-operable dashboard.

The combination of fuzzy search, category and type filters, behavior status indicators, and integrated Finder access means you can find, inspect, configure, and manage any event in seconds. And the batch operations mean cleanup and maintenance scale to any project size.

If you're using GES and haven't spent time in the Event Editor yet, open it today. You'll wonder how you ever managed events without it.

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
