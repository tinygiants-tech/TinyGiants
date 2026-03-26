---
slug: node-editor-introduction
title: "From Spaghetti to Flowcharts: Getting Started with the Visual Node Editor"
authors: [tinygiants]
tags: [ges, unity, flow-graph, visual-workflow, tutorial]
description: "Event chain logic that used to live only in a programmer's head can now be seen, edited, and debugged as a visual flow graph. Here's how to get started."
image: /img/home-page/game-event-system-preview.png
---

A new developer joins your team. They ask a simple question: "What happens after the player dies?" You pause. You know the answer — sort of. The death event triggers a sound effect, a particle system, a UI fade, a score update, a respawn timer, and an analytics call. But where does all that live? Across six different scripts, three different scenes, and a couple of ScriptableObject event assets that you wired up eight months ago. You spend the next two hours walking them through the chain while they take notes in a document that will be outdated by next sprint.

This is the visibility problem. Event-driven architecture is great for decoupling, but it pays for that decoupling with opacity. When everything communicates through events, the flow of execution becomes invisible. You can't open one file and see the full picture. You can't draw a line from "player dies" to "game over screen appears" without mental effort.

The GES Visual Node Editor exists to solve exactly this. It takes event relationships that used to exist only in code (or in your head) and makes them visible, editable, and debuggable as a flow graph.

<!-- truncate -->

## The Design Philosophy: Make Event Flows Visible

Before we get into features and buttons, I want to explain the thinking behind the Node Editor, because it shapes every design decision.

Most visual scripting systems try to replace code. They give you logic nodes, variable nodes, math nodes — essentially a visual programming language. That's not what the GES Node Editor is. It doesn't replace your game logic. Your game logic stays in C# where it belongs.

What the Node Editor visualizes is the **relationships between events**. When Event A fires, which other events should fire in response? In what order? With what conditions? With what data transformations? These questions define your game's event flow, and they're exactly what the Node Editor makes visible.

Think of it this way: your C# scripts are the individual instruments in an orchestra. The Node Editor is the conductor's score — it shows when each instrument plays, in what order, and how they relate to each other.

![Flow Graph Editor Overview](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-editor-overview.png)

## Two Fundamental Modes: Trigger and Chain

The Node Editor supports two execution modes that cover every event flow pattern I've encountered in game development:

### Trigger Mode (Parallel Fan-Out)

When a source event fires, all connected target events fire simultaneously. This is fire-and-forget — the source doesn't wait for targets to complete, and if one target fails, the others still execute.

![Flow Graph Trigger](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-trigger.png)

Use Trigger mode when multiple things should happen at the same time in response to one event:

- Player picks up a coin → play sound + show floating text + increment counter + spawn particles
- Enemy spawns → register in enemy manager + play spawn animation + alert nearby AI

The visual representation is a single source node with lines fanning out to multiple target nodes. It immediately communicates "all of these happen together."

![Overview Trigger](/img/game-event-system/intro/overview/flow-graph-trigger.png)

### Chain Mode (Sequential)

When a source event fires, connected target events execute one after another, in order, waiting for each step to complete before moving to the next. If a step fails, the chain halts.

![Flow Graph Chain](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-chain.png)

Use Chain mode when sequence and timing matter:

- Player dies → play death animation → fade screen to black → load respawn point → teleport player → fade screen in
- Boss enters phase 2 → play cinematic → change music → spawn minions → enable new attack patterns

The visual representation is a linear sequence of nodes connected in order. Reading left to right, you see exactly what happens and when.

![Overview Chain](/img/game-event-system/intro/overview/flow-graph-chain.png)

### Why Two Modes?

Because real game logic uses both patterns, often in the same flow. A player death might trigger parallel effects (sound + particles) and then chain sequential operations (fade → respawn → fade in). The Node Editor lets you mix both modes in a single graph, which we'll cover in depth in the next post.

## Opening the Editor and Canvas Navigation

To open the Node Editor, you have a couple of options:

1. **From the GES Dashboard:** Click the "Flow Graph" button on any event asset to open its flow graph in the Node Editor.
2. **From the menu:** Go to `Window > TinyGiants > Game Event System > Node Editor` to open an empty editor, then select a flow graph asset.
3. **Double-click:** Double-click any Flow Graph asset in the Project window.

Once the editor is open, you're looking at an infinite canvas. Here's how to navigate:

- **Pan:** Middle mouse button drag, or hold Alt + left mouse drag
- **Zoom:** Mouse scroll wheel. The editor supports zoom levels from a high-altitude overview down to close-up detail.
- **Frame All:** Press `F` to fit all nodes into the current view. Useful when you've gotten lost on a large canvas.
- **Frame Selection:** With nodes selected, press `F` to frame just those nodes.

The canvas uses a grid background that scales with zoom level, making it easy to align nodes visually. The grid is purely cosmetic — there's no snap-to-grid constraint unless you want it.

## Creating Nodes and Making Connections

### Adding Nodes

Right-click on an empty area of the canvas to open the context menu. Select "Add Node" and you'll see a list of all available event assets in your project. Select one, and a new node appears at your click position.

Each node represents one event in your project. The node displays:
- The event's name
- The event's argument type (if any)
- Input/output ports for connections
- A status indicator (more on this in the debugging section)

### Making Connections

To connect two nodes, click and drag from an output port to an input port. A line appears, representing the event flow relationship. The line's style indicates the connection type:

- **Trigger connections** appear in one color, indicating parallel execution
- **Chain connections** appear in a different color, indicating sequential execution

You select the connection type when creating it, and you can change it later via the connection's context menu.

### Connection Rules

Not every connection is valid. The editor enforces rules:

- **Type compatibility:** If Event A sends `DamageInfo` and Event B expects `int`, you need an argument transformer (covered in a later post). The editor will warn you about type mismatches.
- **No circular dependencies:** Chain connections can't form loops (they'd execute forever). The editor prevents circular chain connections.
- **Multiple outputs, controlled inputs:** A node can have multiple outgoing connections (one event can trigger many others) and multiple incoming connections (many events can trigger this one).

![Flow Graph Example](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-editor-example.png)

## The Group System

Large event flows can have dozens or hundreds of nodes. Without organization, the graph becomes as hard to read as the code it replaced. The group system solves this.

### Creating Groups

Select one or more nodes, right-click, and choose "Create Group." A colored rectangle appears around the selected nodes with a title field at the top. Type a descriptive name — "Player Death Flow," "Audio Events," "UI Updates," etc.

### Color Coding

Each group can have a custom color. I recommend establishing a color convention for your team:

- **Blue** for system/core events
- **Green** for gameplay events
- **Orange** for UI events
- **Red** for debug/test events
- **Purple** for audio events

This turns your graph into a color-coded map where you can instantly identify which domain each cluster of events belongs to.

![Flow Graph Groups](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-groups.png)

### Group Behavior

Groups are organizational only — they don't affect execution. Nodes inside a group behave identically to nodes outside a group. You can move groups (which moves all contained nodes together), resize them, and nest nodes freely in and out.

## Toolbar Overview

The Node Editor toolbar provides quick access to common operations:

![Flow Graph Toolbar](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-toolbar.png)

From left to right:

- **Save:** Save the current flow graph. The editor also auto-saves when you close it or enter Play Mode.
- **Frame All:** Zoom to fit all nodes in view.
- **Minimap Toggle:** Show/hide a minimap in the corner for navigation on large graphs.
- **Snap to Grid:** Toggle grid snapping for precise node alignment.
- **Search:** Find nodes by event name. Essential for large graphs where you can't visually locate a specific event.
- **Debug Toggle:** Enable/disable runtime debug visualization (covered below).

## Context Menus

The editor uses context menus extensively. There are four types, depending on where you right-click:

### Canvas Context Menu (Right-click on empty space)

- Add Node
- Paste (if nodes are in clipboard)
- Create Group (from selection)
- Frame All

### Node Context Menu (Right-click on a node)

- Delete Node
- Disconnect All
- Duplicate
- Add to Group
- Set Color
- Open Event Asset (jumps to the ScriptableObject in the Inspector)

### Multi-Node Context Menu (Right-click with multiple nodes selected)

- Delete Selected
- Create Group from Selection
- Align Horizontally / Vertically (auto-arrange for clean layouts)
- Copy

### Group Context Menu (Right-click on a group header)

- Rename Group
- Change Color
- Remove Group (keeps nodes, removes the group rectangle)
- Delete Group and Contents

### Connection Context Menu (Right-click on a connection line)

- Change Type (Trigger ↔ Chain)
- Configure (opens connection settings — argument transformer, condition, etc.)
- Delete Connection

## Keyboard Shortcuts Reference

The Node Editor supports keyboard shortcuts for common operations. Here's the full list:

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected nodes/connections |
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+V` | Paste nodes |
| `Ctrl+D` | Duplicate selected nodes |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all nodes |
| `F` | Frame selection (or frame all if nothing selected) |
| `Space` | Open search/add node dialog |
| `Ctrl+S` | Save flow graph |
| `Ctrl+G` | Group selected nodes |

These follow Unity's standard shortcut conventions where possible, so they should feel familiar.

## Runtime Debugging: See Your Flow Execute

This is the feature that consistently gets the biggest reaction from developers when they see it for the first time: **runtime debug visualization.**

When you enter Play Mode with the Node Editor open and debug mode enabled, the graph comes alive:

- **Active nodes pulse** with a highlight when their event fires
- **Connection lines animate** to show data flowing from source to target
- **Execution timing** appears as small labels on connections showing how long each step took
- **Failed conditions** show a red flash on nodes that were skipped due to condition tree evaluation
- **Chain progress** highlights the currently executing step in a chain sequence

This means you can literally watch your event flow execute in real time. "What happens when the player dies?" Open the graph, die, and watch. The death event node lights up, lines animate to the connected nodes, and you see exactly which nodes fire, in what order, and how long each takes.

For debugging, this is transformative. Instead of littering your code with `Debug.Log("OnPlayerDeath fired")` and `Debug.Log("Playing death sound")` and then reading through console spam, you just watch the graph. Broken connections, missing conditions, wrong execution order — they're all immediately visible.

### Performance of Debug Visualization

The debug visualization adds overhead since it needs to track event dispatches and update the UI. In my testing, it's roughly 0.5-1ms per frame of additional cost when debug mode is active. This is acceptable for development but not for shipping. Debug mode is automatically disabled in builds, so there's zero runtime cost in your released game.

## Building Your First Flow Graph: A Walkthrough

Let's put it all together with a concrete example. We'll build a simple "Player Picks Up Health Pack" flow:

**Step 1:** Open the Node Editor and create a new Flow Graph asset (right-click in Project > Create > TinyGiants > GES > Flow Graph).

**Step 2:** Add nodes for each event involved:
- `OnHealthPackPickup` (the trigger — when the player touches a health pack)
- `OnPlaySound` (play the pickup sound)
- `OnSpawnParticles` (spawn healing particles)
- `OnAddHealth` (add HP to the player)
- `OnUpdateHealthUI` (refresh the health bar)
- `OnDestroyPickup` (remove the health pack from the scene)

**Step 3:** Connect them:
- `OnHealthPackPickup` → Trigger → `OnPlaySound` (parallel with the rest)
- `OnHealthPackPickup` → Trigger → `OnSpawnParticles` (parallel)
- `OnHealthPackPickup` → Chain → `OnAddHealth` (sequential — health must update first)
- `OnAddHealth` → Chain → `OnUpdateHealthUI` (sequential — UI updates after health changes)
- `OnHealthPackPickup` → Trigger → `OnDestroyPickup` (parallel — remove immediately)

**Step 4:** Group the audio/visual nodes together (select `OnPlaySound` + `OnSpawnParticles`, create group "Feedback Effects," color it purple). Group the health nodes together (`OnAddHealth` + `OnUpdateHealthUI`, create group "Health Update," color it green).

**Step 5:** Enter Play Mode, enable debug view, walk into a health pack, and watch the flow execute.

The result is a visual document that any team member can open and immediately understand. No code reading. No tracing through scripts. The flow is right there.

## Tips for Getting Started

After using the Node Editor on several projects, here are the things I wish I'd known from day one:

**Start small.** Don't try to graph your entire game's event system on day one. Pick one flow — player death, item pickup, level completion — and graph just that.

**Name your events clearly.** The node displays the event's name. If your events are named `Event_37` or `gameEvent`, the graph will be unreadable. Use descriptive names: `OnPlayerDeath`, `OnCoinCollected`, `OnBossPhaseChange`.

**Use groups early.** It's tempting to skip organization when you only have 5 nodes. But graphs grow fast, and retroactively organizing 50 nodes is tedious. Group as you go.

**Keep the graph in sync with your code.** The flow graph is a visualization layer, not a replacement for your event architecture. If you add a new event subscription in code, add the corresponding node to the graph. If you remove one, remove the node.

**Use debug mode during development.** Get in the habit of having the Node Editor open during play testing. You'll catch timing issues, missing connections, and wrong execution orders faster than any other debugging method.

## What's Next

This post covered the basics: what the Node Editor is, how to navigate it, and how to build simple flows. In upcoming posts, we'll dive into:

- **Trigger vs Chain deep comparison** — when to use each, how to mix them, and real production patterns
- **Argument Transformers** — how to connect events with different data types
- **Advanced patterns** — nested groups, condition gates per node, delays, async waits, and complex orchestration

The Node Editor is where GES goes from "nice event system" to "visual event architecture tool." If you've been using GES purely through code or Inspector bindings, opening the Node Editor for the first time is going to change how you think about event flows.

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
