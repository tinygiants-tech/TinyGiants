---
slug: advanced-logic-patterns
title: "Advanced Flow Patterns: Nested Groups, Condition Gates, and Complex Event Orchestration"
authors: [tinygiants]
tags: [ges, unity, flow-graph, advanced, best-practices]
description: "Real game logic is never linear. Learn how to build complex event flows with nested groups, per-node conditions, delays, async waits, and loops."
image: /img/home-page/game-event-system-preview.png
---

Let me paint a picture. You're building a boss fight. Phase 1: the boss has a shield, and when the shield breaks, trigger effects fire simultaneously — shield shatter particles, camera shake, music intensifies. Phase 2 kicks in when HP drops below 50%: the boss enters a rage state, plays a rage animation, then spawns adds, then buffs itself — that's a strict sequence. Phase 3 at 10% HP: a desperation attack that chains through a wind-up, screen flash, area damage, and recovery. Each phase has conditions, each step has timing, and the whole thing needs to be readable by your combat designer who doesn't write code.

This is what real game event flows look like. They're not linear pipelines or simple fan-outs. They're phased, conditional, time-sensitive, and branching. And the GES flow graph has features specifically designed for this level of complexity.

In the previous posts, we covered trigger/chain modes and argument transformers. Those are the foundation. This post is about the advanced features that handle the messy reality of production game logic.

<!-- truncate -->

## Nested Groups for Organizing Large Flows

When your flow graph has 30, 50, or 100+ nodes, flat organization doesn't work. You need hierarchy. The GES Node Editor supports nested groups — groups inside groups — to create logical organization at multiple levels.

### Why Nest Groups?

Consider a complete boss fight flow. At the top level, you have three phases. Each phase has its own set of events, conditions, and connections. Without nesting, you'd have one massive flat graph with color-coded groups, which works until it doesn't — when phases share events or when you need to visually separate the "Audio" events within Phase 2 from the "Gameplay" events within Phase 2.

With nested groups:

```
[Boss Fight] (outer group)
├── [Phase 1: Shield] (inner group)
│   ├── [Shield Effects] (nested inner group)
│   │   ├── OnShieldShatter
│   │   ├── OnSpawnShieldParticles
│   │   └── OnPlayShieldBreakSound
│   └── [Shield Gameplay] (nested inner group)
│       ├── OnDisableShield
│       └── OnEnableVulnerability
├── [Phase 2: Rage]
│   ├── [Rage Effects]
│   └── [Rage Gameplay]
└── [Phase 3: Desperation]
    ├── [Desperation Effects]
    └── [Desperation Gameplay]
```

Each level of nesting adds visual clarity. You can collapse inner groups you're not working on, expand the ones you are, and maintain a mental model of the flow at different zoom levels.

### Practical Tips for Group Organization

**Top-level groups = game features or sequences.** "Player Death Flow," "Boss Fight," "Tutorial Sequence," "Shop System."

**Second-level groups = phases or domains.** "Phase 1," "Phase 2" for phased encounters. Or "Audio," "Visual," "Gameplay" for domain separation within a feature.

**Third-level groups = implementation details.** Rarely needed, but useful for very complex sub-systems. Don't force a third level if two levels provide enough clarity.

**Color conventions across levels:** Use consistent colors. If blue always means "system events" in your project, use blue at every nesting level for system events. This creates instant recognition regardless of where you are in the graph.

## Per-Node Condition Gates

We covered condition trees in earlier posts as a way to gate event listeners. In the flow graph, you can also attach condition trees to individual nodes (connections). This means a specific step in your flow can be conditionally skipped based on runtime state.

![Node Config Condition](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-condition.png)

### How Per-Node Conditions Work

When a connection has a condition, the execution flow checks the condition before dispatching to the target node:

**For trigger connections:** If the condition is `false`, the target doesn't fire, but other trigger connections from the same source are unaffected. It's like a per-branch gate.

**For chain connections:** If the condition is `false`, the step is skipped and the chain continues to the next step. The chain doesn't halt — it just bypasses that one step. (This is different from a chain step that fails/throws, which DOES halt the chain.)

### Boss Phase Example

```csharp
// Phase 2 condition: only trigger when HP < 50%
onBossDamaged.AddChainEvent(onStartRagePhase,
    condition: () => bossHealth.currentHPPercent < 0.5f);

// Phase 3 condition: only trigger when HP < 10%
onBossDamaged.AddChainEvent(onStartDesperationPhase,
    condition: () => bossHealth.currentHPPercent < 0.1f);
```

In the Node Editor, you configure this by clicking on the connection and adding a condition tree in the connection inspector. The condition tree supports the full AND/OR group structure, comparison operators, and all four data source types — the same system you'd use on a standalone event listener.

The visual representation is powerful: the connection line shows a small condition icon, and during runtime debugging, you can see connections flash green (condition passed) or red (condition failed). This makes it immediately obvious why a particular node didn't fire.

### Condition vs Code Guard

A common question: when should I use a per-node condition vs a code check at the start of the handler?

**Use per-node conditions when:**
- The condition is about game state that a designer might want to tweak
- The condition fits naturally into the visual tree model (simple comparisons)
- You want visibility in the flow graph about which connections are gated

**Use code guards when:**
- The check is deeply technical (thread safety, resource availability)
- The logic is too complex for the visual tree
- The condition affects the handler's behavior, not whether it runs

## Delay and Duration Between Steps

Chain mode steps can have two timing parameters: delay and duration. Together, they give you precise control over the pacing of sequential flows.

![Node Config Chain](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-chain.png)

### Delay: Wait Before Starting

The delay is a pause (in seconds) before the step begins. After the previous step completes, the chain waits for the delay period, then fires this step.

```csharp
onStartCutscene.AddChainEvent(onShowDialogue, delay: 1.5f);
```

"Wait 1.5 seconds after the cutscene starts, then show dialogue."

**Use delay for:**
- Pacing between steps ("let the explosion settle before showing the result")
- Staggered effects ("spawn enemy 1, wait 0.3s, spawn enemy 2, wait 0.3s...")
- Dramatic timing ("hold on the empty screen for 2 seconds before the title appears")

### Duration: How Long This Step Takes

The duration tells the chain how long to consider this step "in progress" before moving to the next one. This is independent of the actual execution — the event fires immediately, but the chain waits for the duration before proceeding.

```csharp
onFadeToBlack.AddChainEvent(onLoadNextLevel, duration: 1.0f);
```

"Fire the fade event, then wait 1.0 seconds (the fade duration) before starting the level load."

**Use duration for:**
- Animation timings ("this animation takes 2 seconds to complete")
- Transition effects ("the fade takes 1 second")
- Cooldown periods ("wait 5 seconds before the next phase")

### Combining Delay and Duration

```csharp
// Wait 0.5s, then start the explosion (which takes 2.0s to finish)
onTriggerExplosion.AddChainEvent(onPlayExplosion, delay: 0.5f, duration: 2.0f);

// After the explosion finishes, immediately show results
onPlayExplosion.AddChainEvent(onShowResults);
```

Total time from trigger to results: 0.5s (delay) + 2.0s (duration) = 2.5 seconds. The visual flow in the Node Editor shows these timing values on the connection, making the overall sequence timing visible at a glance.

## waitForCompletion: Async Integration

For chain steps that involve asynchronous operations — coroutine-based animations, async scene loads, network calls — the timing isn't fixed. You don't know in advance how long a scene load will take. That's where `waitForCompletion` comes in.

```csharp
onFadeComplete.AddChainEvent(onLoadNextScene, waitForCompletion: true);
```

When `waitForCompletion` is `true`, the chain pauses after firing this step and waits for the handler to signal completion. The handler signals completion by finishing its coroutine:

```csharp
// Handler for onLoadNextScene
public IEnumerator HandleLoadNextScene(string sceneName)
{
    AsyncOperation loadOp = SceneManager.LoadSceneAsync(sceneName);
    while (!loadOp.isDone)
    {
        // Update loading progress UI
        loadingBar.value = loadOp.progress;
        yield return null;
    }
    // Coroutine completes → chain continues to next step
}
```

The chain won't move to the next step until the coroutine finishes. This is how you integrate Unity's async patterns (coroutines, AsyncOperations) into the sequential event flow.

### Mixing waitForCompletion with Duration

If a step has both `waitForCompletion: true` and a `duration`, the chain waits for whichever takes LONGER. This is a safety mechanism — if your async operation completes in 0.5s but you set a 2.0s duration (for visual pacing), the chain waits the full 2.0s. If the async operation takes 5.0s but you set a 2.0s duration, the chain waits the full 5.0s.

## Loop Execution on Nodes

Some flow patterns require repetition. The GES flow graph supports loop configuration on individual nodes, allowing a step to execute multiple times before the flow continues.

![Node Config General](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-general.png)

### Fixed Loop Count

```csharp
// Pulse the screen flash 3 times
onStartWarning.AddChainEvent(onScreenFlash, loopCount: 3, loopDelay: 0.3f);
```

The `onScreenFlash` event fires 3 times, with 0.3 seconds between each firing. After all 3 iterations complete, the chain continues to the next step.

**Use fixed loops for:**
- Repeated visual effects (pulse, blink, shake)
- Multi-shot patterns ("fire 5 projectiles in sequence")
- Retry logic ("attempt connection 3 times")

### Loop with Delay

Each loop iteration can have a delay between repetitions. This creates rhythmic patterns:

```csharp
// Spawn 5 enemies, one every 0.5 seconds
onStartWave.AddChainEvent(onSpawnEnemy, loopCount: 5, loopDelay: 0.5f);
```

The visual result: 5 enemies spawn over 2.5 seconds (5 * 0.5s), then the chain continues.

## Complete Case Study: Boss Fight Event Orchestration

Let's put everything together into a real boss fight flow. This is the kind of complex event orchestration that would be a nightmare to build and maintain in scattered code, but becomes manageable and visible in the flow graph.

### The Boss: Valthar the Undying

**Phase 1 (100%-50% HP): Shield Phase**
- Boss has an energy shield
- When shield breaks: parallel effects (shatter particles + sound + camera shake)
- Transition: play phase transition cinematic

**Phase 2 (50%-10% HP): Rage Phase**
- Boss enters rage mode
- Sequential: rage animation → spawn 3 adds (looped) → buff boss stats → change music
- Periodic rage slam attack (triggered by timer event, gated by phase condition)

**Phase 3 (&lt;10% HP): Desperation**
- Sequential desperation attack: charge up → screen flash → area damage → exhaustion
- If desperation attack kills player: play special death cinematic (condition gated)
- If boss reaches 0 HP during desperation: special death sequence

### The Flow Graph Structure

```
[Valthar Boss Fight] (top-level group, dark red)
│
├── [Phase 1: Shield] (group, blue)
│   ├── OnShieldDamaged ──trigger──► OnShieldHitEffect
│   ├── OnShieldBroken ──trigger──► OnShieldShatterParticles
│   │                   ──trigger──► OnPlayShieldBreakSound
│   │                   ──trigger──► OnCameraShake
│   │                   ──chain───► OnPlayPhaseTransitionCinematic
│   │                                └──chain──► OnStartPhase2 (condition: HP < 50%)
│   │
│   └── [Shield Effects] (nested group, purple)
│       └── (visual/audio nodes)
│
├── [Phase 2: Rage] (group, orange)
│   ├── OnStartPhase2 ──chain──► OnPlayRageAnimation (duration: 2.0s)
│   │                  ──chain──► OnSpawnAdd (loop: 3, loopDelay: 0.5s)
│   │                  ──chain──► OnBuffBossStats
│   │                  ──chain──► OnChangeMusic
│   │
│   ├── OnRageSlamTimer ──trigger──► OnRageSlam (condition: currentPhase == 2)
│   │                    ──trigger──► OnRageSlamEffect
│   │
│   └── OnBossDamaged ──chain──► OnStartPhase3 (condition: HP < 10%)
│
├── [Phase 3: Desperation] (group, red)
│   ├── OnStartPhase3 ──chain──► OnDesperationChargeUp (duration: 3.0s)
│   │                  ──chain──► OnScreenFlash (loop: 2, loopDelay: 0.2s)
│   │                  ──chain──► OnAreaDamage
│   │                  ──chain──► OnBossExhaustion (duration: 5.0s)
│   │
│   ├── OnPlayerKilled ──chain──► OnSpecialDeathCinematic
│   │                              (condition: currentPhase == 3)
│   │
│   └── OnBossDefeated ──chain──► OnPlayBossDeathAnimation (duration: 3.0s)
│                       ──chain──► OnDropLoot (waitForCompletion: true)
│                       ──chain──► OnPlayVictoryMusic
│                       ──chain──► OnShowVictoryScreen
```

### What Makes This Work

**Nested groups** keep the three phases visually separated. A designer can collapse Phase 1 and Phase 3 while working on Phase 2.

**Per-node conditions** gate the phase transitions. `OnStartPhase2` only fires when HP drops below 50%. The condition is visible on the connection in the editor.

**Mixed trigger/chain** handles the parallel effects (shield break sounds + particles happen simultaneously) alongside sequential logic (rage animation must finish before adds spawn).

**Loop execution** on `OnSpawnAdd` spawns three adds with timing, without needing three separate spawn events.

**Duration** on animations ensures the chain waits for visual elements to complete before proceeding.

**waitForCompletion** on `OnDropLoot` ensures loot is fully spawned before the victory screen appears.

### The Code Setup

Here's what the code version looks like for Phase 2:

```csharp
void SetupPhase2Flow()
{
    // Phase 2 entry: sequential rage sequence
    onStartPhase2.AddChainEvent(onPlayRageAnimation, duration: 2.0f);
    onPlayRageAnimation.AddChainEvent(onSpawnAdd, loopCount: 3, loopDelay: 0.5f);
    onSpawnAdd.AddChainEvent(onBuffBossStats);
    onBuffBossStats.AddChainEvent(onChangeMusic);

    // Rage slam: triggered by timer, gated by phase
    onRageSlamTimer.AddTriggerEvent(onRageSlam,
        condition: () => currentPhase == BossPhase.Rage);
    onRageSlamTimer.AddTriggerEvent(onRageSlamEffect,
        condition: () => currentPhase == BossPhase.Rage);

    // Phase 3 transition
    onBossDamaged.AddChainEvent(onStartPhase3,
        condition: () => bossHealth.currentHPPercent < 0.1f);
}
```

Functional, but the visual graph version is immediately more readable. A combat designer can open the Node Editor, see the entire Phase 2 flow, understand the conditions and timing, and suggest changes ("can we make the rage animation 3 seconds instead of 2?") without reading a single line of code.

## Pattern Gallery

Beyond boss fights, here are three reusable patterns for common scenarios:

### The Broadcaster Pattern

One event triggers many independent systems. Pure fan-out, all triggers, no chains.

![Pattern Broadcaster](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-broadcaster.png)

```
OnPlayerLevelUp ──trigger──► UpdateUI
                ──trigger──► PlaySound
                ──trigger──► SpawnParticles
                ──trigger──► CheckAchievements
                ──trigger──► LogAnalytics
                ──trigger──► SaveProgress
                ──trigger──► NotifyServer
```

**When to use:** System-wide notifications where every consumer is independent. Analytics events, state change broadcasts, global notifications.

**Key characteristic:** If any target fails, the others are unaffected. This is your most resilient pattern.

### The Cinematic Pattern

A strict sequence of events with precise timing. Pure chain, no triggers.

![Pattern Cinematic](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-cinematic.png)

```
OnStartCutscene ──chain(delay: 0.5s)──► DisablePlayerInput
                ──chain──► MoveCamera (waitForCompletion)
                ──chain(delay: 1.0s)──► ShowDialogue (waitForCompletion)
                ──chain──► PlayAnimation (duration: 3.0s)
                ──chain(delay: 0.5s)──► FadeToBlack (duration: 1.0s)
                ──chain──► LoadNextScene (waitForCompletion)
                ──chain──► FadeIn (duration: 1.0s)
                ──chain──► EnablePlayerInput
```

**When to use:** Cutscenes, tutorials, scripted sequences, onboarding flows. Anything where precise timing and strict ordering are essential.

**Key characteristic:** Every step waits for the previous one. The sequence is deterministic and reproducible.

### The Hybrid Pattern

The most common real-world pattern. Parallel effects combined with sequential state changes.

![Pattern Hybrid](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-hybrid.png)

```
OnDoorOpen ──trigger──► PlayDoorSound
           ──trigger──► PlayDoorAnimation
           ──trigger──► SpawnDustParticles
           ──chain───► UpdateNavMesh (waitForCompletion)
           ──chain───► EnableTriggerZone
           ──chain───► NotifyAI
```

**When to use:** Most gameplay events. The immediate feedback (sound, visual) happens in parallel, while the gameplay consequences (navmesh update, AI notification) happen sequentially because they depend on each other.

**Key characteristic:** Instant sensory feedback + ordered state mutation. Players feel the response immediately while the game state updates safely in sequence.

## Debugging Complex Flows

When a complex flow isn't behaving as expected, the Node Editor's runtime debug view is your best friend. Here's a debugging workflow:

1. **Open the Node Editor** with your flow graph and enable debug mode.
2. **Enter Play Mode** and trigger the flow.
3. **Watch the execution.** Active nodes pulse, connections animate, and you can see exactly which path the execution takes.
4. **Look for red flashes** on connections — these indicate conditions that evaluated to `false`, causing steps to be skipped.
5. **Check timing** on chain connections. The displayed execution time tells you if a step is taking longer than expected.
6. **Look for dead nodes** — nodes that never light up. These indicate broken connections or conditions that never pass.

For the boss fight example, debugging Phase 2 would look like: trigger the boss to 50% HP, watch `OnStartPhase2` light up, see the chain progress through rage animation → spawn (3 pulses with delays) → buff → music change. If the spawn loop only pulses twice, you know the loop count is wrong. If the music change never lights up, you know the chain is breaking at the buff step. Visual debugging that would take 30 minutes of log reading takes 30 seconds of watching.

## Performance Considerations for Complex Flows

Complex flows with many nodes, conditions, and transformers have a few performance characteristics worth knowing:

**Initialization cost:** Each condition tree compiles an Expression Tree on first use. A flow with 50 conditioned connections has 50 one-time compilation costs, totaling maybe 50-100ms at scene start. This happens once and is negligible.

**Per-event evaluation:** Each condition tree evaluates in roughly 0.001ms. Each argument transformer is a compiled delegate call. Even a complex flow with 20 trigger connections, each with conditions and transformers, adds about 0.02ms per event dispatch. You won't see this in a profiler.

**Chain overhead:** Chains use Unity's coroutine system for timing (delays, durations, waitForCompletion). Coroutines have minimal overhead, but if you have hundreds of active chains simultaneously, the coroutine scheduling can become noticeable. In practice, you rarely have more than a handful of active chains at any given time.

**Memory:** Each flow graph connection allocates a small amount of memory for its compiled expressions and transformer delegates. A flow with 100 connections might use 50-100KB. Trivial for modern hardware.

The bottom line: the performance characteristics of the flow graph system are designed so you never have to think about them during normal game development. Only in extreme cases (thousands of connections, per-frame events with hundreds of conditioned targets) would you need to optimize.

## Wrapping Up

This post covered the advanced features that turn the GES flow graph from a simple visual event connector into a complete event orchestration system:

- **Nested groups** for organizing large, complex flows
- **Per-node conditions** for gating individual connections
- **Delay and duration** for precise timing control
- **waitForCompletion** for async integration
- **Loop execution** for repeated steps
- **Real-world patterns** — Broadcaster, Cinematic, Hybrid

The boss fight case study demonstrated how all these features work together to handle genuinely complex game logic. The key insight is that you're not replacing code — you're making the event flow visible, configurable, and debuggable. The actual game logic (what happens when the boss takes damage, how adds are spawned, what the desperation attack does) still lives in C# scripts. The flow graph orchestrates when and in what order those scripts execute.

If you're building any game with event-driven architecture — which is most games — this level of event orchestration will save you significant development and debugging time. Start with simple flows, learn the patterns, and gradually adopt the advanced features as your needs grow.

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
