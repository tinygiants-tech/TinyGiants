---
slug: runtime-monitor-complete-guide
title: "Runtime Monitor: The Complete 8-Panel Guide to Event System Observability"
authors: [tinygiants]
tags: [ges, unity, debugging, tools, performance]
description: "Your event system shouldn't be a black box. The GES Runtime Monitor gives you real-time visibility into every event raise, listener, and performance metric."
image: /img/home-page/game-event-system-preview.png
---

"Why did the frame rate drop?" You open the Unity Profiler. You see a spike. It's in... some callback. You dig through the call stack. It leads to an event handler. Which event? Which listener? How many listeners does that event have? Is this the first time it spiked or has it been degrading gradually? The Profiler tells you *where* the time was spent, but not *why* your event system behaved that way.

This is the observability gap. Your event system is a black box — events fire, listeners react, and you have no visibility into the internal pipeline unless you instrument every single handler manually. That's tedious, error-prone, and the instrumentation code itself becomes maintenance burden.

The GES Runtime Monitor fills this gap. It's an editor window that gives you real-time visibility into every aspect of your event system: which events fired, when, how long their listeners took, what conditions were evaluated, which flows propagated, and where the bottlenecks are. Eight specialized panels, each focused on a different dimension of event system health.

<!-- truncate -->

## Opening the Monitor

The Runtime Monitor is an editor window. Open it via:

`Tools > TinyGiants > Game Event System > Runtime Monitor`

Or find it in the GES Hub:

![Hub Core Tools](/img/game-event-system/tools/runtime-monitor/hub-core-tools.png)

The monitor only collects data during Play Mode. When you're not playing, it shows the last session's data (if any) or a clean state. Data collection has minimal performance impact in the editor and zero impact in builds — the monitor is editor-only code stripped during compilation.

Dock it wherever you like. I keep it as a tab next to the Game view so I can see event activity while playing. Some people prefer it next to the Console for quick cross-referencing with debug logs.

## Tab 1: Dashboard — System Health at a Glance

The Dashboard is your starting point. It gives you a high-level overview of the entire event system's health in a single view.

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

### Metric Cards

The top row shows summary cards:

- **Total Events:** How many event assets exist in the project
- **Active Events:** How many have been raised at least once this session
- **Total Listeners:** Sum of all listener subscriptions across all events
- **Total Raises:** Cumulative number of event raises since Play Mode started

These numbers tell you the scale of your event system. A project with 200 events and 500 listeners is very different from one with 20 events and 50 listeners — different optimization strategies apply.

### Performance Bar

A color-coded bar showing overall event system performance:

- **Green:** All events processing under 1ms average. You're in great shape.
- **Yellow:** Some events averaging 1-10ms. Worth investigating but probably fine.
- **Red:** Events averaging over 10ms. Something needs attention.

The bar reflects the *worst-performing* event, not the average. One bad event turns the bar yellow or red even if everything else is fast. This is intentional — you want to know about outliers.

### Recent Activity

A scrolling list of the most recent event raises, showing:
- Event name
- Timestamp
- Listener count at time of raise
- Execution time

This gives you an at-a-glance view of what's happening right now. During gameplay, you'll see events scrolling by in real time — player input events, state changes, UI updates, whatever your game is doing.

### Quick Warnings

If the monitor detects potential issues, they appear here as summary badges:
- Number of events with high execution time
- Number of events with high listener counts
- Any detected recursive raises
- Memory allocation warnings

Click a warning to jump to the relevant detail tab.

## Tab 2: Performance — Execution Time Analysis

This is where you go when you need hard numbers.

![Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

### Per-Event Metrics

Each event in your project gets a row showing:

- **Event Name:** The ScriptableObject asset name
- **Raise Count:** How many times it's been raised this session
- **Listener Count:** Current number of active listeners
- **Avg Time:** Average execution time per raise (across all listeners)
- **Min Time:** Fastest raise
- **Max Time:** Slowest raise (spikes)
- **GC Alloc:** Garbage collection allocations per raise

### Color Coding

The execution time cells are color-coded:
- **Green (&lt;1ms):** Normal. Most events should be here.
- **Yellow (1-10ms):** Elevated. Check if the listener count is high or if individual listeners are doing expensive work.
- **Red (>10ms):** Critical. This event is a performance bottleneck. Investigate immediately.

### Sorting and Filtering

Click column headers to sort by that metric. Sort by "Max Time" to find spike culprits. Sort by "GC Alloc" to find allocation hotspots. Sort by "Raise Count" to identify high-frequency events that might benefit from conditional listeners.

### What the Numbers Mean

Event execution time includes:
1. Iterating through all listener layers (basic, priority, conditional, persistent)
2. Evaluating condition predicates for conditional listeners
3. Executing each listener's callback
4. Initiating trigger and chain event propagation

It does NOT include:
- The caller's code before/after `Raise()`
- Delayed/repeating event scheduling overhead (negligible)
- Visual editor rendering

If an event shows 5ms average with 50 listeners, that's ~0.1ms per listener. If it shows 5ms with 2 listeners, one of those listeners is doing something expensive — check the Details tab for per-listener breakdown.

## Tab 3: Recent Events — Chronological Event Log

A timestamped log of every event raise, in chronological order.

![Monitor Recent](/img/game-event-system/tools/runtime-monitor/monitor-recent.png)

### What Each Entry Shows

- **Timestamp:** When the event fired (game time, not wall clock)
- **Event Name:** Which event
- **Argument:** The data passed (for typed events), displayed as a string representation
- **Caller:** The script and method that called `Raise()` (captured via stack trace)
- **Listener Count:** How many listeners were active when it fired
- **Execution Time:** How long the raise took

### Stack Trace Integration

Click any entry to see the full call stack at the moment of the raise. This is invaluable for answering "who raised this event?" — especially when multiple systems can raise the same event.

The stack trace captures where `Raise()` was called, not where the event asset was created. So you'll see something like:

```
PlayerCombat.TakeDamage() at PlayerCombat.cs:47
  → GameEventInt.Raise(42)
```

This tells you the damage event was raised by the player combat system at line 47, with an argument of 42.

### Filtering

Filter by:
- Event name (search box)
- Time range (last N seconds)
- Minimum execution time (to find spikes)

The filter persists across frames, so you can set "show only `OnDamageDealt`" and watch it in real time as you play.

### Use Cases

**"Did this event actually fire?"** — Search for it in the log. If it's not there, it didn't fire. Check the raiser.

**"What argument was passed?"** — Click the entry and see the argument value.

**"Why did this fire twice?"** — Look at the timestamps and callers. Two different systems might be raising the same event, or one system is raising it in a loop.

**"What order did things happen?"** — The chronological list shows you the exact sequence of events across your entire system.

## Tab 4: Statistics — Usage Patterns Over Time

While the Recent tab shows individual events, the Statistics tab shows aggregate patterns.

![Monitor Statistics](/img/game-event-system/tools/runtime-monitor/monitor-statistics.png)

### Frequency Analysis

- **Events per second:** How many total event raises happen per second, updated in real time
- **Per-event frequency:** How often each specific event fires (raises per second, per minute)
- **Frequency distribution:** Histogram showing how many events fall into each frequency bucket

### Usage Patterns

- **Most active events:** Sorted by total raise count
- **Least active events:** Events that exist but have never fired (possible dead code)
- **Busiest moments:** Time periods with the highest event activity
- **Listener growth:** How listener counts have changed over the session

### Why This Matters

High-frequency events are your optimization targets. If `OnPositionUpdated` fires 60 times per second with 20 listeners, that's 1,200 listener executions per second for one event. Even at 0.01ms per listener, that's 12ms per second — noticeable on mobile.

The statistics tab makes these patterns visible without manual instrumentation. You might discover that an event you thought was rare actually fires every frame, or that an event you thought was critical has zero subscribers.

Never-fired events are also worth investigating. If `OnBossDied` has zero raises after a full play-through that includes boss fights, either the event isn't wired correctly or it's dead code.

## Tab 5: Warnings — Automatic Issue Detection

The Warnings tab is your event system's health check. It automatically detects common issues and flags them with severity levels.

![Monitor Warnings](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

### Warning Categories

**Performance Warnings:**
- Event with execution time > 10ms (Red)
- Event with execution time > 5ms (Yellow)
- Event raising more than 100 times per second without conditional listeners (Yellow)

**Listener Warnings:**
- Event with more than 50 listeners (Yellow)
- Event with more than 100 listeners (Red)
- Persistent listener on a non-DontDestroyOnLoad object (Yellow)

**Memory Warnings:**
- Event raise causing GC allocation (Yellow)
- High-frequency event with GC allocation (Red)

**Recursion Warnings:**
- Event raised while already being processed (Red)
- Circular trigger/chain dependency detected (Red)

### Actionable Information

Each warning includes:
- The event name
- The specific metric that triggered the warning
- A suggested action (e.g., "Consider adding conditional listeners to reduce execution count" or "Check for missing RemoveListener calls")

### Warning Suppression

Some warnings are expected in specific scenarios. For example, during a stress test, you intentionally create high listener counts. You can suppress individual warnings for the current session so they don't clutter the view.

Suppression doesn't disable detection — the warning still fires, it's just hidden. Clear suppressions to see everything again.

## Tab 6: Listeners — Active Subscription Breakdown

This tab shows every active listener subscription in the system, organized by event and listener type.

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

### Per-Event Breakdown

Expand any event to see its listeners grouped by type:

```
OnPlayerDamaged (12 listeners)
├── Basic (4)
│   ├── HealthSystem.HandleDamage
│   ├── HitFlash.ShowFlash
│   ├── CameraShake.OnDamage
│   └── SoundManager.PlayHitSound
├── Priority (3)
│   ├── [200] ArmorSystem.ReduceDamage
│   ├── [100] HealthSystem.ApplyDamage
│   └── [25]  HealthUI.RefreshBar
├── Conditional (2)
│   ├── [cond] BossModifier.ApplyBossMultiplier
│   └── [cond] CriticalHit.CheckCritical
├── Persistent (1)
│   └── AnalyticsManager.TrackDamage
├── Triggers (1)
│   └── → OnScreenShake (delay: 0s)
└── Chains (1)
    └── → OnDamageNumber (delay: 0.1s, duration: 0.5s)
```

### What You Can Learn

**Subscription audit:** Verify that the listeners you expect are actually subscribed. If your sound system isn't playing hit sounds, check here — is the listener registered?

**Priority verification:** Confirm that priority values are correct and the execution order makes sense. If the UI update (priority 25) appears before the data mutation (priority 100), something's wrong with your subscription code.

**Leak detection:** If a listener appears here for an object that should have been destroyed, you've found a subscription leak. The listener's target is stale.

**Conditional inspection:** See which conditional listeners are active and their associated conditions. Useful for verifying that your conditions are wired correctly.

**Flow connections:** See all trigger and chain connections for each event, including their delays and conditions.

## Tab 7: Automation — Trigger and Chain Flow Visualization

This tab visualizes the event-to-event connections — triggers and chains — in two view modes.

### Tree View

![Monitor Automation Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

The tree view shows each event as a root node with its outgoing connections as children:

```
OnBossDefeated
├── [trigger] → OnPlayVictoryMusic (delay: 0s)
├── [trigger] → OnShowVictoryUI (delay: 1s)
└── [chain] → OnSaveProgress (delay: 2s)
    └── [chain] → OnLoadNextLevel (delay: 0.5s)
```

This is great for understanding the propagation path of a specific event. "When the boss dies, what else happens?" Follow the tree.

### Flat View

![Monitor Automation Flat](/img/game-event-system/tools/runtime-monitor/monitor-automation-flat.png)

The flat view lists all connections as source → target pairs:

```
OnBossDefeated → OnPlayVictoryMusic [trigger, delay: 0s]
OnBossDefeated → OnShowVictoryUI [trigger, delay: 1s]
OnBossDefeated → OnSaveProgress [chain, delay: 2s]
OnSaveProgress → OnLoadNextLevel [chain, delay: 0.5s]
```

This is better for searching. "Does anything trigger `OnLoadNextLevel`?" Search for it in the target column.

### Runtime vs. Visual Connections

The automation tab shows both:
- Connections configured visually in the Node Editor (marked as "visual")
- Connections created programmatically at runtime (marked as "runtime")

This distinction helps you understand the full picture. If a flow isn't working, check whether the expected connection exists. If it shows up as "visual" but not as "runtime," the visual editor configuration is correct but something is preventing the runtime initialization. If it's not listed at all, the connection doesn't exist.

## Tab 8: Details — Deep Dive Into Individual Events

Click any event in any other tab, and the Details tab shows you everything about that specific event.

### Statistics Section

![Monitor Details Stats](/img/game-event-system/tools/runtime-monitor/monitor-details-stats.png)

- Total raises this session
- Average/min/max execution time
- Current listener count by type
- GC allocation per raise
- Frequency (raises per second over last 60 seconds)
- Last raise timestamp and argument

### Log Section

![Monitor Details Log](/img/game-event-system/tools/runtime-monitor/monitor-details-log.png)

A filtered version of the Recent tab, showing only raises of this specific event:

- Timestamp
- Argument value
- Caller (with stack trace)
- Execution time
- Per-listener breakdown (which listener took how long)

The per-listener breakdown is the key differentiator from the Performance tab. While Performance shows aggregate per-event times, Details shows per-listener times within a single event. If `OnPlayerDamaged` averages 3ms and has 10 listeners, the Details tab tells you that `ArmorSystem.ReduceDamage` takes 2.5ms and the other 9 listeners take 0.05ms each. Now you know exactly where to optimize.

### Listener History

Shows listener additions and removals over time:

```
[0.0s] + AddListener: HealthSystem.HandleDamage
[0.0s] + AddPriorityListener: ArmorSystem.ReduceDamage (200)
[0.0s] + AddPriorityListener: HealthUI.RefreshBar (25)
[15.3s] - RemoveListener: HealthSystem.HandleDamage
[15.3s] + AddListener: HealthSystem.HandleDamage
[45.0s] + AddConditionalListener: BossModifier.Apply (100)
```

This history helps debug "phantom listener" issues — listeners that appear and disappear unexpectedly due to object lifecycle events (scene loads, object pooling, etc.).

## Using the Monitor Effectively

### Workflow 1: Performance Profiling

1. Open the Performance tab
2. Play your game through a representative session
3. Sort by "Max Time" to find spikes
4. Click the worst offender to open Details
5. Check the per-listener breakdown
6. Optimize the slow listener(s)
7. Repeat

### Workflow 2: Bug Investigation

1. Reproduce the bug in Play Mode
2. Open the Recent tab
3. Search for the event you suspect is involved
4. Check: Did it fire? When? With what argument? Who raised it?
5. If it fired correctly, check the Listeners tab — are the right listeners subscribed?
6. If listeners are correct, the bug is in the listener logic, not the event system

### Workflow 3: Architecture Review

1. Open the Statistics tab
2. Identify never-fired events (dead code candidates)
3. Identify extremely high-frequency events (optimization candidates)
4. Open the Listeners tab
5. Check for events with very high listener counts (coupling indicator)
6. Check for events with zero listeners (possibly misconfigured)
7. Open the Automation tab
8. Verify that flow connections match your intended architecture

### Workflow 4: Regression Testing

1. Play through your test scenario
2. Open the Warnings tab
3. Any new warnings since last session?
4. Open the Performance tab
5. Any events that got slower since last session?
6. Compare with previous benchmarks (take screenshots for comparison)

## Performance Testing with the Stress Test Facility

GES includes a stress test example (Example 14) specifically designed for performance validation with the Runtime Monitor.

The stress test creates:
- Configurable number of events (10, 50, 100, 500+)
- Configurable listeners per event (1, 10, 50, 100+)
- Configurable raise frequency (per frame, per second, burst)
- Both simple and complex listener workloads

Run the stress test with the monitor open. Watch the Performance tab for execution time scaling. Watch the Warnings tab for threshold violations. Watch the Dashboard for overall system health under load.

This is how you answer the question "can my game handle 200 events with 50 listeners each?" — not with guesswork, but with measured data in your actual project.

### Interpreting Stress Test Results

**Linear scaling is good.** If 10 listeners take 0.1ms and 100 listeners take 1ms, the system scales linearly. This means you can predict performance at any listener count.

**Non-linear scaling is a red flag.** If 10 listeners take 0.1ms but 100 listeners take 5ms, there's a bottleneck — possibly cache misses, lock contention, or a listener doing O(n) work relative to listener count.

**GC allocation should stay at zero.** GES is designed for zero-allocation event raises. If the stress test shows GC allocation, something is off — likely a listener (not the event system itself) is allocating.

## Monitor Limitations

The Runtime Monitor is an editor tool. A few things to keep in mind:

**Editor-only:** The monitor code is stripped from builds. It cannot run in standalone players, mobile, or consoles. It's a development tool, not a runtime diagnostic.

**Observer effect:** The monitor adds a small amount of overhead when collecting data (timestamp capture, call stack recording). This overhead is negligible for normal development but could affect measurements in extreme stress tests. For accurate micro-benchmarking, use the Unity Profiler alongside the monitor.

**Session-scoped:** Data resets when you exit Play Mode. If you need persistent metrics, take screenshots or export the data manually.

**Per-event granularity:** The monitor tracks per-event metrics, not per-listener metrics (except in the Details tab). If you need per-listener profiling across all events simultaneously, use the Unity Profiler's instrumentation.

## Summary

The Runtime Monitor transforms your event system from a black box into an observable, debuggable, measurable infrastructure component. Eight panels, each serving a specific purpose:

| Tab | Question It Answers |
|-----|---------------------|
| Dashboard | "Is my event system healthy right now?" |
| Performance | "Which events are slow?" |
| Recent | "What just happened?" |
| Statistics | "What are the usage patterns?" |
| Warnings | "What should I worry about?" |
| Listeners | "Who is listening to what?" |
| Automation | "How are events connected?" |
| Details | "Tell me everything about this one event." |

Keep it open during development. Glance at the Dashboard regularly. When something feels off, you'll know exactly which tab to check and what to look for. Event-driven debugging shouldn't require printf-debugging every handler — the monitor gives you the visibility that event systems traditionally lack.

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
