---
slug: trigger-vs-chain-patterns
title: "Trigger vs Chain: Deep Comparison of Parallel and Sequential Execution Patterns"
authors: [tinygiants]
tags: [ges, unity, flow-graph, architecture, advanced]
description: "When should events fire simultaneously? When should they block and wait? Master the Trigger (fan-out) and Chain (sequential) patterns and learn to mix them."
image: /img/home-page/game-event-system-preview.png
---

Here's a scenario that trips up every team at least once: the player dies. You want a death sound and death particles to play immediately — simultaneously. But you also want the screen to fade to black, THEN load the respawn point, THEN teleport the player, THEN fade back in. The first part is parallel. The second part is strictly sequential. And they need to work together seamlessly.

If you try to handle this with a flat list of event subscriptions, you end up fighting timing issues. Coroutines calling coroutines, flags tracking whether the fade finished, race conditions when the respawn loads before the fade completes. It's fragile, hard to debug, and virtually impossible for anyone else on the team to follow.

The GES flow graph solves this with two distinct execution modes — Trigger and Chain — that you can mix freely in the same graph. Understanding when to use each one, and how to combine them, is the key to building robust event flows.

<!-- truncate -->

## Trigger Mode: Parallel Fan-Out

Trigger mode is the event system's equivalent of "fire and forget." When a source event fires, all connected trigger targets execute simultaneously and independently.

![Trigger Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-trigger.png)

### Characteristics

**Parallel execution:** All connected targets begin processing at the same time. There's no guaranteed order between them — if events A, B, and C are all trigger-connected to a source, they all fire within the same frame, but you shouldn't assume A fires before B.

**Independence:** Each target is independent of the others. If target B throws an exception, targets A and C still execute normally. One broken handler doesn't take down the whole flow.

**Fire-and-forget:** The source event doesn't wait for targets to complete. It fires, dispatches to all trigger connections, and moves on. If a target starts a coroutine that takes 5 seconds, the source doesn't know or care.

**Priority sorting:** While trigger targets are conceptually parallel, they do execute in a deterministic order within a single frame. You can assign priorities to connections, and higher-priority connections fire first. This is useful when you need "mostly parallel but sound should start before particles" type ordering without the overhead of full sequential chaining.

### When to Use Trigger Mode

Trigger mode is your default. Most event connections should be triggers. Use it when:

- Multiple systems need to respond to the same event independently
- The responses don't depend on each other's completion
- Order doesn't matter (or soft priority ordering is sufficient)
- You want fault tolerance — one broken handler shouldn't affect others

**Classic trigger patterns:**

```
OnPlayerLevelUp ──trigger──► UpdateLevelUI
                ──trigger──► PlayLevelUpSound
                ──trigger──► CheckAchievements
                ──trigger──► LogAnalytics
                ──trigger──► SpawnParticleEffect
```

Five systems, all responding to the same event, all independent. If the analytics service is down, the player still sees their level-up effects.

### Code API: AddTriggerEvent

When building trigger connections in code (rather than the visual editor), use `AddTriggerEvent`:

```csharp
// Basic trigger connection
sourceEvent.AddTriggerEvent(targetEvent);

// With priority (higher executes first)
sourceEvent.AddTriggerEvent(targetEvent, priority: 10);

// With a condition
sourceEvent.AddTriggerEvent(targetEvent, condition: () => gameManager.isActive);

// With an argument transformer (covered in detail in the next post)
sourceEvent.AddTriggerEvent(targetEvent, argumentTransformer: info => info.damage);

// Don't pass the argument to the target
sourceEvent.AddTriggerEvent(targetEvent, passArgument: false);
```

![Trigger Demo](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

## Chain Mode: Sequential Blocking

Chain mode is for when order matters and each step must complete before the next begins.

![Chain Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-chain.png)

### Characteristics

**Sequential execution:** Steps execute one after another, in the exact order defined by the chain. Step 2 doesn't start until Step 1 completes.

**Strict ordering:** Unlike trigger connections where priority provides soft ordering, chain connections enforce hard ordering. There's no ambiguity — Step 1, then Step 2, then Step 3. Period.

**Delay and duration:** Each chain step can have an optional delay before it starts and a duration that determines when it's "complete." This is how you create timed sequences — wait 0.5 seconds, then fade, then wait for the fade to finish, then load.

**Chain halts on failure:** If a step in a chain fails (throws an exception or its condition evaluates to false), the chain stops. Subsequent steps don't execute. This is intentional — in a sequential flow, later steps often depend on earlier steps succeeding. If the screen fade fails, you don't want to teleport the player to a half-loaded scene.

### When to Use Chain Mode

Chain mode is for sequences where timing and order are critical:

- Cinematics and cutscenes (camera moves, then dialogue plays, then UI appears)
- State transitions (save state → unload scene → load new scene → initialize)
- Multi-step animations (wind up → attack → follow through → recover)
- Tutorial sequences (show tooltip → wait for input → hide tooltip → show next)

**Classic chain pattern:**

```
OnPlayerDeath ──chain──► PlayDeathAnimation
              ──chain──► FadeScreenToBlack
              ──chain──► LoadRespawnPoint
              ──chain──► TeleportPlayer
              ──chain──► FadeScreenIn
              ──chain──► EnablePlayerInput
```

Six steps, strictly ordered. The player sees a clean death → fade → respawn → fade in sequence. If the respawn point fails to load, the player isn't teleported to nowhere.

### Code API: AddChainEvent

```csharp
// Basic chain connection
sourceEvent.AddChainEvent(targetEvent);

// With delay (wait 0.5 seconds before this step)
sourceEvent.AddChainEvent(targetEvent, delay: 0.5f);

// With duration (this step takes 1.0 seconds to "complete" before the next step starts)
sourceEvent.AddChainEvent(targetEvent, duration: 1.0f);

// With both
sourceEvent.AddChainEvent(targetEvent, delay: 0.3f, duration: 2.0f);

// With a condition (skip this step if condition is false, but continue the chain)
sourceEvent.AddChainEvent(targetEvent, condition: () => showCutscenes);

// Wait for the target event's handler to complete (for coroutine-based handlers)
sourceEvent.AddChainEvent(targetEvent, waitForCompletion: true);
```

![Chain Demo](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

## Connection Types and Visual Indicators

In the Node Editor, trigger and chain connections are visually distinct so you can immediately identify the execution pattern:

![Node Connection](/img/game-event-system/flow-graph/game-event-node-connector/node-connection.png)

- **Trigger connections** use one visual style (typically a lighter color and a straight or gently curved line)
- **Chain connections** use a different style (typically a bolder color with numbered indicators showing execution order)

Node status indicators also help during runtime debugging:

![Node Status](/img/game-event-system/flow-graph/game-event-node-connector/node-status.png)

- **Idle:** Node hasn't fired recently
- **Active:** Node is currently executing (relevant for chain steps with duration)
- **Completed:** Node has finished executing (shows briefly, then returns to idle)
- **Skipped:** Node's condition was false, so it was skipped
- **Error:** Node's handler threw an exception

When creating connections, the editor shows compatibility information:

![Node Compatible](/img/game-event-system/flow-graph/game-event-node-connector/node-compatible.png)

Ports light up to show valid connection targets, and incompatible ports are dimmed. This prevents you from creating connections that would fail at runtime.

## Hybrid Mode: Mixing Trigger and Chain

Real game logic almost always needs both parallel and sequential patterns. The Node Editor lets you freely mix trigger and chain connections in the same graph, from the same source node.

![Hybrid Pattern](/img/game-event-system/intro/overview/flow-graph-mix.png)

### The Player Death Sequence: A Complete Example

Let's build the player death flow we described in the opening. Here's the full event setup:

**Events:**
- `OnPlayerDeath` — the triggering event
- `OnPlayDeathSound` — play the death sound effect
- `OnSpawnDeathParticles` — spawn particle effects at death location
- `OnDisablePlayerInput` — prevent input during death sequence
- `OnFadeToBlack` — fade the screen to black
- `OnLoadRespawn` — load the respawn point
- `OnTeleportPlayer` — move the player to the respawn location
- `OnFadeIn` — fade the screen back in
- `OnEnablePlayerInput` — re-enable player input
- `OnResetPlayerState` — reset health, buffs, etc.

**Connections from `OnPlayerDeath`:**

Trigger connections (parallel, immediate):
- → `OnPlayDeathSound` (trigger, priority: 10)
- → `OnSpawnDeathParticles` (trigger, priority: 5)
- → `OnDisablePlayerInput` (trigger, priority: 20) — highest priority so input disables first

Chain connections (sequential):
- → `OnFadeToBlack` (chain, delay: 1.0s — wait for death animation)
- → `OnLoadRespawn` (chain, waitForCompletion: true — wait for scene load)
- → `OnTeleportPlayer` (chain)
- → `OnResetPlayerState` (chain)
- → `OnFadeIn` (chain, duration: 1.0s)
- → `OnEnablePlayerInput` (chain)

**What happens at runtime:**

Frame 0: `OnPlayerDeath` fires.
- Immediately (trigger): death sound plays, particles spawn, input is disabled. All three happen in the same frame.
- Simultaneously, the chain starts. But the first chain step has a 1.0s delay...

Frame 0 → 1.0s later: `OnFadeToBlack` fires. Screen begins fading.
- Chain waits for fade to complete (say, 0.5s).

1.5s: `OnLoadRespawn` fires. Chain waits for scene load to complete (async, variable time).

Load complete: `OnTeleportPlayer` fires. Player moves instantly.

Next frame: `OnResetPlayerState` fires. Health restored, buffs cleared.

Next frame: `OnFadeIn` fires. Screen fades in over 1.0s.

After fade: `OnEnablePlayerInput` fires. Player can move again.

In the Node Editor, this looks like a fan-out of three trigger lines (sound, particles, input) plus a sequential chain flowing through the fade → load → teleport → reset → fade → input sequence. The visual layout makes the parallel/sequential split immediately obvious.

Here's what the code equivalent would look like:

```csharp
// Setting up the player death flow in code
void SetupDeathFlow()
{
    // Parallel effects (Trigger)
    onPlayerDeath.AddTriggerEvent(onDisablePlayerInput, priority: 20);
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);
    onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5);

    // Sequential respawn flow (Chain)
    onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
    onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
    onLoadRespawn.AddChainEvent(onTeleportPlayer);
    onTeleportPlayer.AddChainEvent(onResetPlayerState);
    onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
    onFadeIn.AddChainEvent(onEnablePlayerInput);
}
```

Notice how the code version is harder to read than the visual graph. You have to mentally trace the chain from `onPlayerDeath` through each `AddChainEvent` call. In the Node Editor, you just follow the lines.

## Decision Framework: Trigger vs Chain

Here's my decision framework, distilled from real projects:

### Use Trigger When:

- **Effects are independent.** Sound, particles, UI updates, analytics — they don't need each other.
- **Failure should be isolated.** If analytics logging crashes, gameplay shouldn't stop.
- **Timing is "now."** Everything should happen this frame (or as soon as possible).
- **Order is flexible.** You don't care whether sound plays before or after particles.

### Use Chain When:

- **Sequence matters.** Fade must finish before teleport. Load must finish before initialization.
- **Steps depend on previous results.** The teleport destination comes from the load step.
- **Timing is deliberate.** You want specific delays between steps.
- **Failure should stop the flow.** If scene load fails, don't try to teleport.

### Use Both When:

- **Some things are parallel, some are sequential.** This is the most common real-world case. Death effects are parallel; the respawn sequence is sequential.
- **You want immediate feedback with delayed consequences.** Sound and particles give instant feedback (trigger), while the actual gameplay state change follows a deliberate sequence (chain).

## Removal and Cleanup

When you need to remove connections at runtime (for example, when changing game phases or cleaning up event flows), both patterns support clean removal:

```csharp
// Remove a specific trigger connection
sourceEvent.RemoveTriggerEvent(targetEvent);

// Remove a specific chain connection
sourceEvent.RemoveChainEvent(targetEvent);

// Remove all connections from a source
sourceEvent.RemoveAllTriggerEvents();
sourceEvent.RemoveAllChainEvents();

// Remove everything
sourceEvent.RemoveAllConnections();
```

In the Node Editor, you just right-click a connection line and select "Delete Connection," or select a node and press Delete to remove it and all its connections.

A few cleanup best practices:

**Clean up in OnDisable/OnDestroy.** If you set up connections in `Start()` or `OnEnable()`, remove them in `OnDisable()` or `OnDestroy()`. Dangling connections to destroyed objects will cause null reference errors.

```csharp
void OnEnable()
{
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound);
    onPlayerDeath.AddChainEvent(onFadeToBlack);
}

void OnDisable()
{
    onPlayerDeath.RemoveTriggerEvent(onPlayDeathSound);
    onPlayerDeath.RemoveChainEvent(onFadeToBlack);
}
```

**Use the flow graph for scene-level connections.** If a connection should exist for the lifetime of a scene, configure it in the Node Editor rather than code. The flow graph handles setup and teardown automatically with the scene lifecycle.

**Code connections for dynamic flows.** If connections change based on gameplay state (e.g., different event chains in different boss phases), manage them in code where you have full control over when they're added and removed.

## Common Pitfalls

After helping teams adopt trigger and chain patterns, I've seen the same mistakes come up repeatedly:

**Pitfall 1: Using chain when trigger is sufficient.** If steps don't actually depend on each other's completion, use trigger. Chain adds unnecessary ordering constraints and makes the flow slower (each step waits for the previous one).

**Pitfall 2: Long chains without error handling.** A 10-step chain where step 3 fails means steps 4-10 never execute. Make sure critical cleanup (like re-enabling player input) isn't buried at the end of a chain that might fail midway. Consider using a trigger connection for critical cleanup alongside the chain.

**Pitfall 3: Forgetting about waitForCompletion.** If a chain step starts a coroutine (like a fade animation) but you don't set `waitForCompletion: true`, the chain immediately moves to the next step without waiting. The fade and the next step overlap, which is rarely what you want.

**Pitfall 4: Circular chains.** Event A chains to B, B chains to C, C chains to A. This creates an infinite loop. The Node Editor prevents this visually, but be careful when setting up chains in code.

## What's Next

Now that you understand when and how to use trigger and chain modes, the next posts in this series cover:

- **Argument Transformers** — how to connect events with mismatched data types, which unlocks the full power of mixed-type flows
- **Advanced Logic Patterns** — condition gates per node, delays, async waits, loops, and complex orchestration patterns

Trigger and Chain are the foundation. Everything else builds on top.

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
