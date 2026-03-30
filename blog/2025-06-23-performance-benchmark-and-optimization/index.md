---
slug: performance-benchmark-and-optimization
title: "Show Me the Numbers: What 'High Performance' Actually Means for a Unity Event System"
authors: [tinygiants]
tags: [ges, unity, performance, benchmarks, optimization]
description: "Every event system plugin claims 'high performance.' Here are the actual benchmark numbers, comparison data, and the optimization strategies that keep them low at scale."
image: /img/home-page/game-event-system-preview.png
---

Go to the Unity Asset Store. Search for "event system." Read the feature lists. Every single one says some variation of "high performance" or "lightweight" or "zero overhead." It's right there between "easy to use" and "well documented," like a holy trinity of marketing adjectives that mean nothing without numbers.

What does "high performance" mean? 1ms per event raise? 0.1ms? 0.001ms? Those are three orders of magnitude apart. On a desktop machine running at 60fps, you have 16.6ms per frame. A 1ms event raise eats 6% of your budget. A 0.001ms event raise eats 0.006%. One of those matters. The other doesn't. But the marketing copy doesn't distinguish between them.

I've been guilty of this too. "GES is fast." Great. How fast? Under what conditions? With how many listeners? On what hardware? Let's fix that. Here are the actual numbers.

<!-- truncate -->

## Why Most Developers Don't Measure Event Overhead

Here's a dirty secret about event system performance: most developers never benchmark it. They assume event dispatch is "basically free" because it's "just calling some callbacks." And for small projects with 10 events and 5 listeners each, they're right — the overhead IS negligible.

The problem is that games grow. That prototype with 10 events becomes a production game with 200 events. Those 5 listeners become 50. That event you thought would fire "occasionally" turns out to fire every frame because the designer wired it to the player's position update.

By the time you notice the performance issue, it's death by a thousand cuts. No single event is slow. But 200 events firing at various frequencies with 10-50 listeners each add up to a meaningful chunk of your frame budget. And you can't optimize what you haven't measured.

## Where Event Overhead Actually Matters

Not every project needs to worry about event system performance. Here's where it genuinely matters:

**Mobile games.** ARM processors have smaller caches, weaker branch prediction, and less aggressive speculative execution than desktop CPUs. A dispatch loop that costs 0.02ms on an i7 might cost 0.06ms on a Snapdragon. Your frame budget at 60fps is the same 16.6ms, but the CPU is 3x slower at executing event-related code. Every millisecond counts.

**VR.** The headset needs a new frame every 11.1ms (90fps) or 8.3ms (120fps). A GC pause that takes 5ms on desktop creates visible judder in VR — the rendered frame is late, the headset displays a stale frame, and the user experiences it as physical discomfort. Nausea. Headache. In VR, zero-allocation code paths aren't a performance optimization. They're a medical requirement.

**Games with many entities.** An RTS with 500 units, each subscribing to 3-4 events, creates 1,500-2,000 listener subscriptions. A tower defense with 100 towers, each listening to enemy movement events, can create event raises with triple-digit listener counts. Linear scaling is mandatory here — if dispatch cost grows faster than O(n) with listener count, you're in trouble.

## The Hidden Costs Nobody Talks About

Event system overhead isn't just "calling the callbacks." There are hidden costs that most developers don't think about:

**Reflection.** UnityEvent uses reflection internally for persistent (Inspector-configured) listeners. `MethodInfo.Invoke()` is slow — it validates parameters, boxes value types, and dispatches through the reflection layer. Every. Single. Raise.

**Boxing.** Event systems that use `object`-typed parameters (like many string-keyed systems: `EventManager.Trigger("OnDamage", 42)`) box value types. Boxing an `int` allocates 24 bytes on the heap. Do that 60 times per second across 20 events and you're generating 28KB of garbage per second. Not huge, but it accumulates.

**GC allocation.** Any event system that allocates memory on the raise path creates GC pressure. On desktop, the garbage collector runs incrementally and you barely notice. On mobile, a GC pause at the wrong moment — right before VSync — drops a frame. A 5ms GC pause at 60fps means the player sees a visible stutter.

**Condition evaluation.** Event systems with filtering (only call the listener if a condition is true) need to evaluate predicates. If the predicate is a `Func&lt;T, bool&gt;`, that's a delegate invocation. Cheap, but not free — and it happens for every conditional listener on every raise.

**String operations.** String-keyed event systems pay for dictionary lookups and string hashing on every raise. String comparison isn't expensive in isolation, but it involves pointer chasing and potential cache misses that add up at scale.

## What "Zero Overhead" Should Mean

A well-designed event system should add no more overhead than a direct method call plus the actual listener execution. The dispatch itself — finding the listeners, iterating, invoking — should be negligible compared to the work the listeners do.

Here's the bar: if you replaced every event raise with direct method calls to the same listeners, the performance should be nearly identical. The event system's job is abstraction and decoupling, not computation. If the abstraction layer itself is the bottleneck, the abstraction is broken.

Native C# events (`event Action&lt;T&gt;`) meet this bar. They're essentially a multicast delegate — the dispatch is a pointer-chase through a linked list of function pointers. Blazing fast. Zero allocation. But they give you nothing else: no Inspector support, no priority ordering, no conditional filtering, no cross-scene persistence, no visual wiring, no monitoring.

Can you have the performance of C# events WITH the features of a full event system? That's the question. Let's look at the data.

## Test Methodology

All benchmarks were run on:

- **CPU:** Intel i7-12700K (desktop) and Snapdragon 865 (mobile baseline)
- **Unity:** 2022.3 LTS, IL2CPP backend, Release configuration
- **Measurement:** Unity Profiler deep profile + GES Runtime Monitor + custom `Stopwatch` instrumentation
- **Warmup:** 1,000 iterations before measurement to eliminate JIT and cache effects
- **Samples:** 10,000 iterations per measurement, reported as median (not mean — to exclude outlier GC/OS spikes)
- **GC Tracking:** `GC.GetTotalMemory()` before and after each raise batch

Why median instead of mean? Because event execution has occasional spikes from GC collection, OS scheduling, and cache misses. These inflate the mean but don't represent typical behavior. I report max values separately for spike analysis.

## Core Benchmark: Event Raise

The fundamental operation — raising an event with N listeners, where each listener is an empty handler (isolating dispatch cost from handler cost).

| Listeners | Desktop (median) | Mobile (median) | Desktop (max) | Mobile (max) | GC Alloc |
|-----------|-------------------|------------------|----------------|---------------|----------|
| 0 | ~0.001ms | ~0.003ms | ~0.01ms | ~0.02ms | 0 bytes |
| 1 | ~0.002ms | ~0.006ms | ~0.015ms | ~0.03ms | 0 bytes |
| 10 | ~0.02ms | ~0.05ms | ~0.08ms | ~0.15ms | 0 bytes |
| 100 | ~0.15ms | ~0.4ms | ~0.5ms | ~1.2ms | 0 bytes |
| 1,000 | ~1.5ms | ~4ms | ~3ms | ~8ms | 0 bytes |

Three things jump out:

**Linear scaling.** 10 listeners costs ~10x one listener. 100 listeners costs ~100x. No hidden overhead accumulates. This is critical — it means you can predict performance at any listener count by extrapolating from a single measurement.

**Zero GC allocation across the board.** Not "low allocation." Zero. No boxing, no string operations, no delegate creation, no LINQ enumerators. The raise path is completely allocation-free.

**The 0-listener case is essentially unmeasurable.** Raising an event with no subscribers costs ~0.001ms on desktop. Even at 10,000 raises per frame (absurd), that's 10ms. Events without listeners are nearly free.

## Core Benchmark: Condition Evaluation

For conditional listeners, the condition predicate is evaluated before the listener executes. How expensive is that?

| Condition Type | Desktop | Mobile |
|----------------|---------|--------|
| Simple field check (`() => isAlive`) | ~0.003ms | ~0.008ms |
| Comparison (`(int x) => x > 50`) | ~0.004ms | ~0.01ms |
| Compound (`() => isAlive && hp &lt; 50`) | ~0.005ms | ~0.012ms |
| Complex nested (3-4 boolean ops) | ~0.01ms | ~0.025ms |

Conditions are cheap. Even the most complex condition costs ~0.025ms on mobile. If the listener it gates costs 0.1ms and the condition is false 80% of the time, you save 0.08ms per raise at a cost of 0.025ms — a 3x net win. The cheaper the condition relative to the listener, the bigger the savings.

## Core Benchmark: Flow Node Execution

Trigger and chain events — event-to-event propagation:

| Flow Type | Desktop | Mobile |
|-----------|---------|--------|
| Trigger (immediate) | ~0.005ms | ~0.015ms |
| Trigger (delayed) | ~0.008ms | ~0.02ms |
| Chain (immediate) | ~0.01ms | ~0.03ms |
| Chain (delayed, with duration) | ~0.05ms | ~0.12ms |

Delayed flows include coroutine setup overhead — a one-time cost when the flow starts, not a per-frame cost during the delay. After setup, the coroutine waits on Unity's internal timer with no per-frame overhead.

## Comparison: GES vs. Native C# Events

```csharp
// Native C# event
public event Action<int> OnDamage;
OnDamage?.Invoke(42);
```

| Metric | C# event | GES | Difference |
|--------|----------|-----|------------|
| 10 listeners, raise time | ~0.015ms | ~0.02ms | GES ~30% slower |
| GC Alloc | 0 bytes | 0 bytes | Identical |
| Type safety | Compile-time | Compile-time | Identical |
| Inspector support | None | Full | -- |
| Priority ordering | None | Built-in | -- |
| Conditional filtering | None | Built-in | -- |
| Cross-scene persistence | Manual | Built-in | -- |
| Runtime monitoring | None | Built-in | -- |

GES is ~30% slower than raw C# events for dispatch. In absolute terms, that's ~0.005ms difference with 10 listeners. You will never, ever notice this in any real game. What you WILL notice is the difference between having Inspector support and not having it, between having priority ordering and manually managing execution order, between having a Runtime Monitor and adding `Debug.Log` to every handler.

The 0.005ms buys you an entire event management infrastructure. That's the best trade in Unity development.

## Comparison: GES vs. UnityEvent

```csharp
// UnityEvent
[SerializeField] private UnityEvent<int> onDamage;
onDamage.Invoke(42);
```

| Metric | UnityEvent | GES | Difference |
|--------|------------|-----|------------|
| 10 listeners, raise time | ~0.05ms | ~0.02ms | GES ~2.5x faster |
| GC Alloc | 24+ bytes | 0 bytes | GES zero alloc |
| Type safety | Runtime only | Compile-time | -- |
| Inspector support | Basic | Full (searchable dropdown) | -- |

Wait — GES is FASTER than UnityEvent? Yes. Here's why.

![Zero Reflection](/img/game-event-system/feature/zero-reflect.png)

UnityEvent uses `MethodInfo.Invoke()` for persistent (Inspector-configured) listeners. That's reflection. Every invocation validates parameters, boxes value types, and dispatches through the reflection layer. It allocates memory every time.

GES uses **Expression Tree compilation**. When an event is first accessed (or when the editor recompiles), GES compiles the listener binding into a cached delegate using Expression Trees. That delegate is a direct method call — no reflection, no validation, no boxing, no allocation. The compilation costs ~1-5ms per event (invisible during asset loading). After that, every invocation is as fast as calling a regular method, because that's literally what's happening.

The 2.5x speed advantage comes entirely from eliminating reflection. And the zero GC allocation comes from eliminating boxing. Expression Trees give you both.

## Comparison: GES vs. String-Based Event Systems

```csharp
// String-based (common pattern)
EventManager.Trigger("OnDamage", 42);
```

| Metric | String-based | GES | Difference |
|--------|--------------|-----|------------|
| 10 listeners, raise time | ~0.08ms | ~0.02ms | GES ~4x faster |
| GC Alloc | 48+ bytes | 0 bytes | GES zero alloc |
| Type safety | None | Compile-time | -- |
| Rename safety | None | Full | -- |

String-based systems are the worst of all worlds: dictionary lookups, string hashing, boxing of value types, and zero compile-time checking. Rename an event and your code silently breaks at runtime instead of failing at compile time. GES is 4x faster with zero allocation and full type safety.

## Why Zero GC Matters More Than You Think

Let me put the GC allocation issue in concrete terms.

On desktop (Mono/.NET), a garbage collection cycle for Gen 0 takes ~1-2ms. Annoying but survivable. The incremental GC in newer Unity versions spreads this across frames.

On mobile (IL2CPP on ARM), a GC cycle can take **8-15ms**. At 60fps, your frame budget is 16.6ms. A 15ms GC pause means the frame takes 31.6ms — nearly two frames. The player sees a stutter. In a fast-paced game, that stutter can feel like lag or broken controls.

On VR (Quest, PSVR2), a missed frame triggers the headset's reprojection system. Instead of rendering a new frame, it warps the previous frame to approximate head movement. Players perceive this as a "swimming" or "smearing" effect. Multiple missed frames cause nausea.

An event system that allocates 24 bytes per raise doesn't seem like much. But if you have 50 events firing at various frequencies, that's thousands of small allocations per second. Each one is a drop in the GC bucket. When the bucket overflows, the GC runs, and the frame stutters.

GES achieves zero allocation on the raise path through five techniques:

1. **No boxing** — typed generics, no `object` parameters
2. **No string operations** — no string keys, no ToString(), no concatenation
3. **Delegate caching** — Expression Tree compiled delegates are compiled once and cached
4. **List reuse** — internal listener lists are pre-allocated and reused, not recreated
5. **No LINQ** — internal iteration uses for-loops (LINQ allocates enumerators)

The only allocation paths are `RaiseDelayed`/`RaiseRepeating` (coroutine creation, one-time per schedule, ~80 bytes) and Runtime Monitor data collection (editor-only, stripped from builds). Neither is a per-frame cost.

## Production Validation: Real Project, Real Numbers

Benchmarks with empty handlers are useful for understanding dispatch overhead, but what about a real game?

**Project profile:**
- 3D action RPG targeting mobile (Android/iOS)
- 280 event assets across 8 databases
- Average 45 listeners per active event during combat
- 30fps target on mid-range devices

**Production metrics (10-minute combat session, measured via Runtime Monitor):**

| Metric | Value |
|--------|-------|
| Total events raised | ~42,000 |
| Events per second (average) | ~70 |
| Events per second (peak, boss fight) | ~220 |
| Average raise time (all events) | 0.03ms |
| Max raise time (worst event) | 0.8ms |
| Total event system time per frame (average) | 0.4ms |
| Total event system time per frame (peak) | 2.1ms |
| GC allocation from events | 0 bytes |
| Frame budget used by events (average) | 1.2% |
| Frame budget used by events (peak) | 6.3% |

![Stress Test Performance](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

The event system uses 1.2% of the frame budget on average. During the most intense moment — a boss fight phase transition with 220 events per second — it peaks at 6.3%. The other 93.7% goes to rendering, physics, animation, and game logic.

For context:
- Rendering: 40-60% of frame budget
- Physics: 10-20%
- Animation: 5-15%
- Game logic: 10-25%
- **Event system: 1-2%**

Optimizing the event system from 1.2% to 0.8% saves 0.4% of your frame budget. Optimizing one expensive shader saves 5%. Optimizing one physics query saves 2%. The event system is almost never your bottleneck.

![Demo Monitor](/img/game-event-system/examples/14-runtime-monitor/demo-14-monitor.png)

### GC Validation

The zero-allocation claim was validated by running the combat session with deep profiling and `GC.GetTotalMemory()` monitoring. Event raises contributed zero bytes to GC pressure. The only event-related allocations were initial delegate compilation at scene load (one-time) and Runtime Monitor data collection (editor-only, stripped from builds).

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

## Scaling Strategies for When It Does Matter

The event system is rarely your bottleneck. But "rarely" isn't "never." VR games, massive multiplayer, per-frame events — some scenarios push the limits. Here are the strategies.

### Strategy 1: Database Partitioning

Organize events into domain-specific databases:

```
Events/
+-- Core/          (lifecycle, scene management)
+-- Combat/        (damage, abilities, effects)
+-- UI/            (menu, HUD, popups)
+-- Audio/         (music, SFX, ambient)
+-- AI/            (behavior, pathfinding)
```

This doesn't affect runtime performance (an event is an event regardless of folder), but it dramatically improves development scalability — finding events, auditing listeners, and reviewing flow graphs all get faster with clear organization.

### Strategy 2: Conditional Listeners for Short-Circuiting

If 80% of `OnDamageDealt` raises are irrelevant to a particular listener (it only cares about critical hits), use a conditional listener:

```csharp
// Without conditional: listener runs every time, wastes CPU on non-crits
onDamageDealt.AddListener(HandleCriticalHit);

// With conditional: listener only runs when condition is true
onDamageDealt.AddConditionalListener(
    HandleCriticalHit,
    (int damage) => damage > criticalThreshold,
    priority: 50
);
```

The condition costs ~0.005ms. If `HandleCriticalHit` costs 0.1ms and 80% of raises are non-critical, you save 0.08ms per non-critical raise at a cost of 0.005ms. That's a 16x return on investment.

OR short-circuit evaluation means compound conditions bail out early — if the first clause is false, the rest aren't evaluated.

### Strategy 3: SetInspectorListenersActive for Batch Operations

When processing events in bulk — spawning 100 enemies, loading inventory, initializing a level — the visual feedback (particle effects, sound effects, UI animations) attached to Inspector listeners is unnecessary overhead:

```csharp
// Mute visual feedback during batch spawn
onEnemySpawned.SetInspectorListenersActive(false);

for (int i = 0; i < 100; i++)
{
    SpawnEnemy(enemyData[i]);
    onEnemySpawned.Raise(enemyData[i]);
}

// Restore visual feedback
onEnemySpawned.SetInspectorListenersActive(true);
```

Code listeners still execute normally — only the Inspector-bound visual responses are muted. You get the data propagation without 100 spawn particle effects firing simultaneously.

### Strategy 4: Listener Count Management

The single most impactful optimization: keep listener counts under control.

**Use granular events.** Instead of one `OnEnemyStateChanged` with 50 listeners each checking what state changed, use `OnEnemyDied`, `OnEnemySpawned`, `OnEnemyDamaged`. Fewer listeners per event, no wasted checks.

**Unsubscribe when inactive.** Off-screen objects don't need position updates:

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

**Audit with the Runtime Monitor.** The Listeners tab shows you exactly how many listeners each event has. If `OnUpdate` has 200 listeners, something is architecturally wrong.

![Monitor Statistics](/img/game-event-system/tools/runtime-monitor/monitor-statistics.png)

### Strategy 5: Know When NOT to Use Events

Events are for decoupled, multi-subscriber communication. They're not for everything.

If two systems need per-frame, point-to-point communication and nothing else ever listens, a direct reference is simpler and faster. Events add value through decoupling and multi-subscription. If you have neither — one sender, one receiver, every frame — a direct method call or a shared reference is the right tool.

Events shine when: multiple systems react to the same occurrence, systems are in different scenes or assemblies, you want to add/remove behavior without modifying the sender, or you need visual wiring in the Inspector.

Events are overkill when: it's a tight, known, 1-to-1 communication at high frequency.

## Reproducing These Benchmarks

GES includes a stress test example (Example 14) designed specifically for performance validation:

1. Open the example scene
2. Configure listener count, event count, and raise frequency
3. Open the Runtime Monitor to the Performance tab
4. Enter Play Mode
5. Run for 60 seconds to get stable averages

![Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

Your numbers will vary by hardware, but the relationships should hold: linear scaling with listener count, zero GC allocation, conditions cheaper than listener execution.

If your numbers are significantly worse than expected, check:
- **Build configuration:** IL2CPP Release is 3-5x faster than Mono Debug for delegate dispatch
- **Deep profiling:** Adds substantial overhead to every method call — disable for benchmarks
- **Listener work:** Empty handlers isolate dispatch cost. Real handlers add their own cost.

## The Bottom Line

Hard numbers:

- **Event raise with 10 listeners:** ~0.02ms, zero GC
- **Condition evaluation:** ~0.003-0.01ms per condition
- **280 events in production:** 1.2% of frame budget average, 6.3% peak
- **vs. C# events:** ~30% slower dispatch, vastly more features
- **vs. UnityEvent:** ~2.5x faster, zero GC (UnityEvent uses reflection)
- **vs. string-based:** ~4x faster, zero GC, compile-time type safety

"High performance" means the event system takes 1-2% of your frame budget in a real production game with 280 events. It means zero GC allocation on the raise path. It means linear scaling with listener count. It means you can measure all of this yourself with the built-in Runtime Monitor and stress test tools.

The next time an event system tells you it's "high performance," ask for the numbers. And when you test GES, check the numbers yourself. The Runtime Monitor is right there — it'll show you exactly what's happening, how long it takes, and where to optimize if you need to. Measure first, optimize second, and spend your performance budget where it actually matters.

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
