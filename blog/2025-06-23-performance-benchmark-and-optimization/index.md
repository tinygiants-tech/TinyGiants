---
slug: performance-benchmark-and-optimization
title: "Performance Tested: GES Under 500+ Events and 10,000+ Listeners — Benchmarks and Optimization"
authors: [tinygiants]
tags: [ges, unity, performance, advanced, best-practices]
description: "Hard numbers, not marketing claims. See real benchmark data for GES event raises, condition evaluations, and flow execution — plus optimization strategies for scale."
image: /img/home-page/game-event-system-preview.png
---

Every event system on the Asset Store says "high performance." It's right there in the marketing bullet points, nestled between "easy to use" and "well documented." But what does that actually mean? High compared to what? Under what conditions? With how many listeners? Does "high performance" mean 0.001ms per raise or 1ms? Those are three orders of magnitude apart, and the difference matters when you're targeting 60fps on mobile with 200 events firing per frame.

This post is the benchmark data I wanted to see before choosing an event system. Real numbers, tested in controlled conditions, with methodology you can reproduce. Plus the optimization strategies that keep those numbers low at scale.

No marketing spin. If GES is slow at something, I'll tell you where and why.

<!-- truncate -->

## Test Environment and Methodology

All benchmarks were run on:

- **CPU:** Intel i7-12700K (desktop) and Snapdragon 865 (mobile baseline)
- **Unity:** 2022.3 LTS, IL2CPP backend, Release configuration
- **GES Version:** Latest stable release
- **Measurement:** Unity Profiler deep profile + GES Runtime Monitor + custom `Stopwatch` instrumentation
- **Warmup:** 1000 iterations before measurement to eliminate JIT and cache effects
- **Samples:** 10,000 iterations per measurement, reported as median (not mean, to exclude outlier spikes)
- **GC Tracking:** `GC.GetTotalMemory()` before and after each raise batch

Why median instead of mean? Because event execution time has occasional spikes (GC collection, OS scheduling, cache misses) that inflate the mean but don't represent typical behavior. The median gives you the "normal" case. Max values are reported separately for spike analysis.

## Core Benchmark Data

### Event Raise — No Listeners

The absolute baseline: raising an event with zero subscribers.

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Median | ~0.001ms | ~0.003ms |
| Max | ~0.01ms | ~0.02ms |
| GC Alloc | 0 bytes | 0 bytes |

This is the overhead of the event system itself — checking the listener list, finding it empty, and returning. It's effectively unmeasurable. Even at 10,000 raises per frame, this adds 10ms on desktop and 30ms on mobile — and you wouldn't have 10,000 raises per frame.

### Event Raise — 1 Listener (Empty Handler)

One subscriber with a no-op handler, isolating dispatch overhead from handler execution.

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Median | ~0.002ms | ~0.006ms |
| Max | ~0.015ms | ~0.03ms |
| GC Alloc | 0 bytes | 0 bytes |

The listener dispatch overhead is roughly 0.001ms per listener on desktop. This is the cost of the delegate invocation, not the handler's own work.

### Event Raise — 10 Listeners

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Median | ~0.02ms | ~0.05ms |
| Max | ~0.08ms | ~0.15ms |
| GC Alloc | 0 bytes | 0 bytes |

Linear scaling from the 1-listener case. 10 listeners = ~10x the cost. This is healthy — it means no hidden overhead accumulates with listener count.

### Event Raise — 100 Listeners

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Median | ~0.15ms | ~0.4ms |
| Max | ~0.5ms | ~1.2ms |
| GC Alloc | 0 bytes | 0 bytes |

Still linear. 100 listeners on mobile costs about 0.4ms. At 60fps, your frame budget is 16.6ms. A single event with 100 listeners consuming 0.4ms is 2.4% of your frame budget — significant but manageable if it's not happening every frame.

### Event Raise — 1,000 Listeners

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Median | ~1.5ms | ~4ms |
| Max | ~3ms | ~8ms |
| GC Alloc | 0 bytes | 0 bytes |

At 1,000 listeners, you're starting to see real costs. 4ms on mobile for a single event raise is 24% of your frame budget. If this event fires every frame, you have a problem. If it fires once when a boss phase changes, it's perfectly fine.

The takeaway: listener count matters more than event count. 100 events with 10 listeners each cost 2ms total. 1 event with 1,000 listeners costs 4ms total on mobile. Distribute your listeners.

### Condition Evaluation

| Condition Type | Desktop | Mobile |
|----------------|---------|--------|
| Simple field check (`() => isAlive`) | ~0.003ms | ~0.008ms |
| Comparison (`(int x) => x > 50`) | ~0.004ms | ~0.01ms |
| Compound (`() => isAlive && hp < 50`) | ~0.005ms | ~0.012ms |
| Complex nested | ~0.01ms | ~0.025ms |

Conditions are cheap. Even "complex nested" conditions (3-4 boolean operations with field reads) cost ~0.025ms on mobile. For most use cases, the cost of evaluating a condition is far less than the cost of executing the listener it gates. That's the whole point — a cheap check preventing expensive work.

### Flow Node Execution

| Flow Type | Desktop | Mobile |
|-----------|---------|--------|
| Trigger (immediate) | ~0.005ms | ~0.015ms |
| Trigger (delayed) | ~0.008ms | ~0.02ms |
| Chain (immediate) | ~0.01ms | ~0.03ms |
| Chain (delayed, with duration) | ~0.05ms | ~0.12ms |

Flow nodes include coroutine setup overhead for delayed execution, which is why they're more expensive than raw listener dispatch. The ~0.05ms for a chain with delay/duration includes creating and starting the coroutine — this is a one-time cost per chain step, not a per-frame cost.

### Monitor Window Overhead

| Scenario | Overhead |
|----------|----------|
| Monitor closed | 0ms (no code path) |
| Monitor open, 10 events | ~0.1ms per frame |
| Monitor open, 100 events | ~0.3ms per frame |
| Monitor open, 500 events | ~0.8ms per frame |

The monitor is editor-only. It's completely stripped from builds. In the editor, its overhead is proportional to the number of events being tracked, but it's all editor UI rendering cost — it doesn't affect event execution time in builds.

![Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

## Comparison with Native Approaches

How does GES compare to the event mechanisms Unity developers commonly use?

### C# Event/Delegate

```csharp
public event Action<int> OnDamage;
OnDamage?.Invoke(42);
```

| Metric | C# event | GES |
|--------|----------|-----|
| 10 listeners, raise time | ~0.015ms | ~0.02ms |
| GC Alloc | 0 bytes | 0 bytes |
| Type safety | Compile-time | Compile-time |
| Inspector support | None | Full |
| Priority ordering | None | Built-in |
| Cross-scene | Manual | Built-in |

GES is ~30% slower than raw C# events for the dispatch itself. That's the cost of the priority pipeline, condition evaluation, and flow propagation checks. In absolute terms, it's ~0.005ms difference with 10 listeners. You will never notice this in any real game.

What you GET for that 0.005ms: Inspector support, priority ordering, conditional filtering, cross-scene persistence, flow graph propagation, runtime monitoring. That's a lot of value for essentially free.

### UnityEvent

```csharp
[SerializeField] private UnityEvent<int> onDamage;
onDamage.Invoke(42);
```

| Metric | UnityEvent | GES |
|--------|------------|-----|
| 10 listeners, raise time | ~0.05ms | ~0.02ms |
| GC Alloc | 24+ bytes | 0 bytes |
| Type safety | Runtime only | Compile-time |
| Inspector support | Basic | Full |
| Priority ordering | None | Built-in |

GES is actually faster than UnityEvent. `UnityEvent.Invoke()` uses reflection internally for persistent (Inspector-configured) calls, which is slower and allocates memory. GES uses Expression Trees compiled to delegates — zero reflection at runtime.

![Zero Reflection](/img/game-event-system/feature/zero-reflect.png)

This is one of the key architectural decisions in GES. Expression Trees are compiled once (at edit time or first access) into cached delegates. Subsequent invocations are as fast as calling a regular method — because that's literally what's happening.

### ScriptableObject Event (Vanilla)

The basic "ScriptableObject event" pattern (like the one in Ryan Hipple's GDC talk) without GES:

| Metric | SO Event (basic) | GES |
|--------|-------------------|-----|
| 10 listeners, raise time | ~0.02ms | ~0.02ms |
| GC Alloc | 0 bytes | 0 bytes |
| Features | Raise + Listen | Full pipeline |

Performance is identical because the basic pattern is essentially what GES does at its core. GES adds the priority/conditional/persistent layers, flow graph, and monitoring on top. Those features have ~zero cost when not used (no conditional listeners = no condition evaluation, no triggers = no trigger check).

### String-Based Event Systems

```csharp
EventManager.Trigger("OnDamage", 42);
```

| Metric | String-based | GES |
|--------|--------------|-----|
| 10 listeners, raise time | ~0.08ms | ~0.02ms |
| GC Alloc | 48+ bytes | 0 bytes |
| Type safety | None | Compile-time |
| Rename safety | None | Full |

String-based systems are the slowest option. Dictionary lookups, string hashing, boxing of value types, and lack of compile-time checking. GES is 4x faster with zero allocation and full type safety.

## Why Zero GC Allocation Matters

On desktop, garbage collection is a minor inconvenience — a few milliseconds of pause every few seconds. On mobile and VR, it's a frame rate killer.

**Mobile:** ARM processors have smaller caches and less aggressive prefetching. A GC pause that takes 2ms on desktop can take 8-15ms on mobile. At 60fps, a 15ms GC pause means a dropped frame. At 30fps, it means the frame takes 50% longer than it should.

**VR:** GC pauses cause visible judder — the rendered frame is late, and the headset can't maintain its target refresh rate. Users experience this as physical discomfort (nausea, headache). In VR development, zero-allocation code paths aren't a nice-to-have; they're a medical requirement.

GES achieves zero GC allocation on the raise path through:

1. **No boxing:** Typed events use generic methods that don't box value types
2. **No string operations:** No string keys, no ToString() calls, no string concatenation
3. **Delegate caching:** Expression Tree compiled delegates are cached, not recreated
4. **List reuse:** Internal listener lists are pre-allocated and reused, not recreated
5. **No LINQ:** Internal iteration uses for-loops, not LINQ (which allocates enumerators)

The only path that *can* allocate is scheduling (`RaiseDelayed`/`RaiseRepeating`), which creates a coroutine. But that's a one-time allocation at schedule time, not a per-frame cost, and the handle management is allocation-free after creation.

## Expression Tree Compilation Benefit

Let's quantify the reflection vs. Expression Tree difference because it's one of GES's key technical differentiators.

UnityEvent uses `MethodInfo.Invoke()` for persistent (Inspector-configured) calls:

```
MethodInfo.Invoke():
  - Parameter validation: ~0.002ms
  - Boxing arguments: ~0.001ms (+ GC alloc)
  - Reflection dispatch: ~0.01ms
  - Total: ~0.013ms per call, + 24 bytes GC
```

GES uses compiled Expression Trees:

```
Compiled delegate call:
  - Direct method call: ~0.001ms
  - No boxing, no validation
  - Total: ~0.001ms per call, 0 bytes GC
```

That's a 13x speed improvement with zero allocation. At 10 Inspector-configured listeners, it's the difference between 0.13ms and 0.01ms per raise. At 100 listeners, it's 1.3ms vs 0.1ms. The benefit scales linearly with listener count.

The compilation itself happens once — when the event is first accessed or when the editor recompiles. It takes ~1-5ms per event, which is invisible during asset loading. After compilation, the cached delegate is used for every subsequent invocation.

## Scaling Strategies for Large Projects

When your project has hundreds of events and thousands of listeners, there are specific strategies to keep performance optimal.

### Strategy 1: Database Partitioning

GES organizes events into databases (folders). If you have 500 events, split them into logical databases:

```
Events/
├── Core/          (20 events: lifecycle, scene management)
├── Combat/        (80 events: damage, abilities, effects)
├── UI/            (60 events: menu, HUD, popups)
├── Audio/         (40 events: music, SFX, ambient)
├── AI/            (50 events: behavior, pathfinding, perception)
└── Progression/   (30 events: XP, achievements, unlocks)
```

Database partitioning doesn't affect runtime performance (events are events regardless of folder), but it dramatically affects development scalability. Finding events, auditing listeners, and reviewing flow graphs are all faster when events are organized by domain.

### Strategy 2: Listener Count Management

The single most impactful optimization is controlling listener count per event.

**Audit regularly:** Use the Runtime Monitor's Listeners tab to check for events with unexpectedly high listener counts. If `OnUpdate` has 200 listeners, something is wrong.

**Use granular events:** Instead of one `OnEnemyStateChanged` with 50 listeners, use `OnEnemyDied`, `OnEnemySpawned`, `OnEnemyDamaged`, etc. Each has fewer listeners, and listeners that don't care about spawning don't waste time checking if the state change is a spawn.

**Unsubscribe when inactive:** If a listener's parent object is off-screen, consider unsubscribing. The `OnBecameVisible`/`OnBecameInvisible` callbacks are a natural place for this:

```csharp
private void OnBecameVisible()
{
    onPositionUpdate.AddListener(UpdateVisuals);
}

private void OnBecameInvisible()
{
    onPositionUpdate.RemoveListener(UpdateVisuals);
}
```

### Strategy 3: Conditional Listener Short-Circuiting

If 80% of `OnDamageDealt` raises are irrelevant to a particular listener (e.g., it only cares about critical hits), use a conditional listener:

```csharp
// Without conditional: listener runs 100% of the time
onDamageDealt.AddListener(HandleCriticalHit); // wastes time on non-crits

// With conditional: listener runs ~20% of the time
onDamageDealt.AddConditionalListener(
    HandleCriticalHit,
    (int damage) => damage > criticalThreshold,
    priority: 50
);
```

The condition evaluation costs ~0.005ms. If `HandleCriticalHit` costs 0.1ms, and 80% of raises are non-critical, the conditional saves 0.08ms per non-critical raise at a cost of 0.005ms — a 16x return on investment.

### Strategy 4: SetInspectorListenersActive for Batch Operations

When processing events in bulk (initializing 100 enemies, loading inventory, etc.), Inspector-bound visual effects are unnecessary overhead:

```csharp
// Mute visual feedback during batch
onEnemySpawned.SetInspectorListenersActive(false);

for (int i = 0; i < 100; i++)
{
    SpawnEnemy(enemyData[i]);
    onEnemySpawned.Raise(enemyData[i]);
}

onEnemySpawned.SetInspectorListenersActive(true);
```

This skips particle effects, sound effects, and UI animations that would fire 100 times during the batch. Code listeners still execute normally — only the Inspector-bound responses are muted.

### Strategy 5: High-Frequency Event Optimization

Events that fire every frame (position updates, input polling, physics results) deserve special attention:

1. **Minimize listeners:** Only systems that truly need per-frame data should subscribe
2. **Use conditional listeners:** Filter at the event level, not inside each handler
3. **Consider direct references for critical paths:** If two systems need per-frame communication and nothing else listens, a direct reference might be more appropriate than an event. Events shine for decoupled, multi-subscriber patterns — not for dedicated point-to-point communication at 60Hz.

![Monitor Statistics](/img/game-event-system/tools/runtime-monitor/monitor-statistics.png)

## Production Validation

Numbers from a real project help ground these benchmarks in practical context.

**Project profile:**
- 3D action RPG, mobile target (Android/iOS)
- 280 event assets across 8 databases
- Average 45 listeners per active event during combat
- 30fps target on mid-range devices

**Production metrics (measured via Runtime Monitor during a 10-minute combat session):**

| Metric | Value |
|--------|-------|
| Total events raised | ~42,000 |
| Events per second (average) | ~70 |
| Events per second (peak, during boss fight) | ~220 |
| Average raise time (all events) | 0.03ms |
| Max raise time (worst event) | 0.8ms |
| Total event system time per frame (average) | 0.4ms |
| Total event system time per frame (peak) | 2.1ms |
| GC allocation from events | 0 bytes |
| Frame budget used by events (average) | 1.2% |
| Frame budget used by events (peak) | 6.3% |

The event system consumes 1.2% of the frame budget on average. Even during the most intense moment (boss fight phase transition with 220 events per second), it stays under 7%. The rest of the frame budget goes to rendering, physics, animation, and game logic.

![Stress Test](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

![Demo Monitor](/img/game-event-system/examples/14-runtime-monitor/demo-14-monitor.png)

### GC Allocation Validation

The zero-allocation claim was validated by running the combat session with deep profiling and monitoring `GC.GetTotalMemory()`. Event raises contributed zero bytes to GC pressure. The only event-related allocations were:

- Initial delegate compilation (one-time, at scene load)
- `RaiseDelayed`/`RaiseRepeating` coroutine creation (one-time per schedule, ~80 bytes each)
- Runtime Monitor data collection (editor-only, stripped from build)

In the production build (IL2CPP, stripped), none of these exist as per-frame costs.

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

## The Real Performance Question

The question isn't "is GES fast enough?" — it demonstrably is, for any reasonable workload. The real question is "where should I spend my optimization budget?"

Event system overhead: 1-2% of frame budget.
Rendering: 40-60% of frame budget.
Physics: 10-20% of frame budget.
Animation: 5-15% of frame budget.
Game logic: 10-25% of frame budget.

Optimizing the event system from 1.2% to 0.8% saves 0.4% of your frame budget. Optimizing one expensive shader saves 5%. Optimizing one physics query saves 2%. The event system is almost never your bottleneck.

That said, there are edge cases where event system performance matters:

- **VR:** Every millisecond counts. The 6.3% peak might matter here.
- **Massive multiplayer:** 1000+ entities each raising events creates scale pressure.
- **Per-frame events:** Events that fire every frame bypass the "infrequent" assumption.

For these cases, the optimization strategies above (listener management, conditional filtering, batch muting) are your tools. And the Runtime Monitor tells you exactly which events to target.

## Benchmark Reproduction

Want to run these benchmarks yourself? Use the GES stress test example (Example 14):

1. Open the example scene
2. Configure listener count, event count, and raise frequency
3. Open the Runtime Monitor to the Performance tab
4. Enter Play Mode
5. Run for 60 seconds to get stable averages
6. Compare with the numbers in this post

Your results will vary based on hardware, but the *relationships* should be consistent — linear scaling with listener count, zero GC allocation, condition evaluation being cheaper than listener execution.

If your numbers are significantly worse than expected, check:
- Are you in Debug or Development build? IL2CPP Release is 3-5x faster for delegate dispatch.
- Is the Profiler deep profiling enabled? Deep profiling adds substantial overhead to every method call.
- Are your listeners doing actual work? The benchmarks above use empty handlers to isolate dispatch cost.

## Summary

Hard numbers:
- Event raise with 10 listeners: ~0.02ms, zero GC
- Condition evaluation: ~0.005ms per condition
- 280 events in production: 1.2% of frame budget average
- GES vs. C# events: ~30% slower dispatch, vastly more features
- GES vs. UnityEvent: ~2.5x faster, zero GC (vs. UnityEvent's reflection-based allocation)
- GES vs. string-based: ~4x faster, zero GC, compile-time type safety

The event system is almost never your performance bottleneck. But when you need to optimize, the Runtime Monitor shows you exactly where, and the strategies in this post show you how. Measure first, optimize second, and spend your budget where it matters.

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
