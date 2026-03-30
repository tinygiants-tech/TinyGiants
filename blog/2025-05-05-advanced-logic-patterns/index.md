---
slug: advanced-logic-patterns
title: "Beyond Linear: Why Real Game Logic Needs Conditional Branching, Nested Groups, and Async Coordination"
authors: [tinygiants]
tags: [ges, unity, flow-graph, advanced, best-practices]
description: "Tutorial logic is linear. Production logic has conditional branches, async waits, nested parallel groups inside sequential chains, and loops. Here's how to handle the mess without losing your mind."
image: /img/home-page/game-event-system-preview.png
---

Tutorial-level game logic is beautifully simple. "When the player presses Space, play the jump animation." One event, one response. You can hold the entire flow in your head. You write it in ten minutes and it works forever.

Then you start building a real game.

"Boss enters Phase 2 when HP drops below 50%. A roar animation plays while the music changes AND the arena turns red — those three are parallel. When the roar animation finishes — that's an async wait because the animation length varies — start the new attack pattern. But ONLY if the player hasn't triggered the mercy mechanic by dealing zero damage for 10 seconds. If they have, skip Phase 2 entirely and go straight to the dialogue sequence."

That's one paragraph of a design document. The gap between that paragraph and working code is where projects go to die.

<!-- truncate -->

## The Complexity Scaling Problem

Let me be specific about what makes production game logic hard. It's not any single feature — it's the COMBINATION of features that interact.

### Coroutine Spaghetti

The boss phase transition from the opening sounds manageable. Let's write it as a coroutine:

```csharp
IEnumerator BossPhaseTransition()
{
    if (bossHealth.currentHPPercent > 0.5f)
        yield break; // Not time for Phase 2 yet

    if (mercyMechanic.isTriggered)
    {
        // Skip to dialogue
        yield return StartCoroutine(PlayDialogueSequence());
        yield break;
    }

    // Parallel: roar + music + arena color
    StartCoroutine(PlayRoarAnimation());
    StartCoroutine(TransitionMusic());
    StartCoroutine(ChangeArenaColor());

    // Wait for roar to finish (but how?)
    while (!_roarAnimationComplete)
        yield return null;

    // Start new attack pattern
    bossAI.SetAttackPattern(Phase2Pattern);
}
```

Already there are problems. The three parallel coroutines (`PlayRoarAnimation`, `TransitionMusic`, `ChangeArenaColor`) are fire-and-forget — we started them but only wait for one of them. If `ChangeArenaColor` throws an exception, we don't know. We're polling a boolean (`_roarAnimationComplete`) to synchronize with the animation, which means the animation handler needs to set that bool, which means we have shared mutable state between the coroutine and the animation system.

Now add Phase 3. The boss enters desperation at 10% HP: charge-up animation (3 seconds), screen flash (twice with 0.2s gap), area damage, then exhaustion state for 5 seconds. But only if the boss isn't in the middle of a Phase 2 attack. And if the desperation attack kills the player, play a special cinematic.

```csharp
IEnumerator DesperationAttack()
{
    if (bossHealth.currentHPPercent > 0.1f)
        yield break;

    if (_isPerformingPhase2Attack)
    {
        // Queue it? Ignore it? Retry later?
        yield break;
    }

    _isPerformingDesperation = true;

    // Charge up
    yield return StartCoroutine(PlayChargeAnimation());
    yield return new WaitForSeconds(3.0f);

    // Screen flash x2
    for (int i = 0; i < 2; i++)
    {
        TriggerScreenFlash();
        yield return new WaitForSeconds(0.2f);
    }

    // Area damage
    DealAreaDamage();

    if (player.isDead)
    {
        yield return StartCoroutine(PlaySpecialDeathCinematic());
        _isPerformingDesperation = false;
        yield break;
    }

    // Exhaustion
    bossAI.SetState(BossState.Exhausted);
    yield return new WaitForSeconds(5.0f);
    bossAI.SetState(BossState.Active);

    _isPerformingDesperation = false;
}
```

Forty lines. Boolean flags for state tracking. Conditional branches inside the coroutine. A loop for the screen flash. Early exits. Shared mutable state. And this is ONE attack of ONE boss. A full boss fight with three phases, multiple attacks per phase, and transition sequences between phases can easily hit 200-300 lines of coroutine code.

Six months later, a designer says "make the charge-up 4 seconds instead of 3." A programmer opens this file, reads through 300 lines, finds the right `WaitForSeconds`, changes the number, hopes they didn't break the flow by misreading which coroutine they're in. This is write-only code.

### State Machine Explosion

"Just use a state machine." Fair point. State machines are the proper tool for managing sequential states with conditions. Let's try it.

The boss has three phases. Each phase has an entry transition, active behavior, and exit transition. Some phases have conditional skips. The transitions have parallel effects and sequential steps.

States: `Idle`, `Phase1Active`, `Phase1ToPhase2Transition`, `Phase2Entry`, `Phase2Active`, `Phase2Attack`, `Phase2ToPhase3Transition`, `Phase3Entry`, `Phase3Active`, `DesperationCharge`, `DesperationAttack`, `DesperationExhaust`, `MercyDialogue`, `BossDeath`, `SpecialDeathCinematic`.

Fifteen states. Each one is a class or a method. Each one has entry logic, update logic, exit logic, and transition conditions. The transition table connects them. Understanding the flow means reading all fifteen states and their transitions, then mentally reconstructing the graph.

And you STILL need coroutines for the timed sequences within states. The `DesperationCharge` state starts a 3-second timer. The `DesperationAttack` state loops a screen flash twice. You've combined two complexity models (state machine + coroutines) and neither one shows you the complete picture.

The fundamental issue: state machines are great for expressing "what state am I in and what transitions are available." They're terrible at expressing "in what order do these six things happen, with timing, conditions, and parallel branches." Those are two different concerns, and production game logic needs both.

### The Async Problem

"Wait for this animation to finish before proceeding."

Sounds simple. In practice, it's one of the most annoying coordination problems in game development.

Coroutine approach: yield return the animation coroutine. But what if the animation is driven by Animator, not a coroutine? Then you need an AnimationEvent callback, or you poll `animator.GetCurrentAnimatorStateInfo(0).normalizedTime`, or you use a StateMachineBehaviour that sets a flag.

Task approach: wrap the animation in a Task using `TaskCompletionSource`. Clean, but now you're mixing async/await with Unity's coroutine-based lifecycle. Some team members use coroutines, others use Tasks. Both work, neither is visible.

Event approach: the animation fires an event when it completes. The next step subscribes to that event. But now your sequential flow is split across two event subscriptions in two different places. The sequence "animate → wait → proceed" exists nowhere as a readable unit.

All three approaches share one problem: the relationship between "wait for X" and "then do Y" is invisible. It exists in callbacks, in yield returns, in task continuations. It's code-level plumbing that hides the actual intent.

### The Condition-Within-Sequence Problem

Here's a subtle one that catches teams off guard.

You have a five-step chain: A → B → C → D → E. Step C should only execute if a runtime condition is met (player has enough gold, boss is in the right phase, a cooldown has expired). But steps D and E should still run regardless.

In a coroutine:

```csharp
yield return DoStepA();
yield return DoStepB();
if (someCondition)
    yield return DoStepC();
yield return DoStepD();
yield return DoStepE();
```

Simple enough for one condition. But what about: step C only runs if condition X, step D only runs if condition Y, and the entire chain aborts if condition Z fails at any point?

```csharp
yield return DoStepA();
if (!conditionZ()) yield break;
yield return DoStepB();
if (!conditionZ()) yield break;
if (conditionX()) yield return DoStepC();
if (!conditionZ()) yield break;
if (conditionY()) yield return DoStepD();
if (!conditionZ()) yield break;
yield return DoStepE();
```

Now the actual flow logic is drowning in condition checks. And you need to understand which conditions are "skip this step" (continue the sequence) vs "abort the sequence" (stop everything). In a coroutine, both look like `if` statements. There's no semantic distinction.

### The Documentation Problem

A 50-line coroutine that orchestrates a boss fight is, by definition, write-only code. I don't care how clean your coding style is. A sequence of `yield return`, `StartCoroutine`, `WaitForSeconds`, conditional branches, loops, and shared boolean flags cannot be understood at a glance. It requires careful, line-by-line reading.

A designer asks "can we add a 0.5-second pause between the screen flash and the area damage?" The programmer opens the file, reads through the coroutine, locates the right spot, adds a `WaitForSeconds(0.5f)`, tests it. Total time: 15-30 minutes. Not because the change is hard, but because FINDING where to make the change requires reading and understanding the entire sequence.

In a visual flow graph, that same change takes 5 seconds. Click the connection between the flash node and the damage node. Set delay to 0.5. Done.

## GES's Advanced Flow Patterns

Everything in the previous section describes problems that arise from expressing complex game logic in code-only formats. GES's flow graph addresses each one with specific features designed for the patterns that actually appear in production games.

### Nested Groups: Organization at Scale

When your flow graph has 30+ nodes, flat organization fails. Nested groups provide hierarchy.

A boss fight flow at the top level has three groups: "Phase 1," "Phase 2," "Phase 3." Each phase group contains sub-groups: "Effects" (audio/visual) and "Gameplay" (state changes, spawns). Each sub-group contains the actual event nodes.

```
[Valthar Boss Fight]
├── [Phase 1: Shield]
│   ├── [Shield Effects] → shield break particles, sound, camera shake
│   └── [Shield Gameplay] → disable shield, enable vulnerability
├── [Phase 2: Rage]
│   ├── [Rage Effects] → rage roar, music change, arena tint
│   └── [Rage Gameplay] → spawn adds, buff stats, new attack pattern
└── [Phase 3: Desperation]
    ├── [Desperation Effects] → charge VFX, screen flash, area VFX
    └── [Desperation Gameplay] → area damage, exhaustion, special death
```

You can collapse groups you're not working on. Expand the one you are. Navigate the flow at different zoom levels — high-altitude overview shows the three phases as colored blocks, mid-level shows the sub-groups, close-up shows individual nodes and connections.

Color conventions help enormously. Blue for system events, green for gameplay, orange for UI, purple for audio — consistent across all nesting levels. Zoom out and the graph is a color-coded map. Zoom in and the details appear.

### Per-Node Conditions: The Two-Layer System

This is the feature that directly addresses the "skip vs abort" problem from the coroutine section. GES has two distinct types of conditions, and understanding the difference is critical.

![Node Condition Config](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-condition.png)

**Node conditions** (configured in the NodeBehavior Window) control the FLOW:
- If a node condition evaluates to `false` on a chain connection, the ENTIRE remaining branch stops. Subsequent steps don't execute.
- This is your "abort the sequence" mechanism. If the mercy mechanic is active, abort the phase transition entirely.

**Event conditions** (configured in the Behavior Window) control the SIDE EFFECTS:
- If an event condition evaluates to `false`, the event's actions (gameplay responses) don't execute. But the FLOW continues to the next step.
- This is your "skip this step" mechanism. If the player doesn't have enough gold, skip the purchase animation but continue to the next step in the shop sequence.

In the five-step chain example: steps C and D get event conditions (skip if their condition is false, but the chain continues). The chain itself gets a node condition for the abort case (if condition Z fails, stop everything).

In the Node Editor, both condition types are visible. During runtime debugging, you can see which layer blocked which node. A red flash on a node condition means the branch was aborted. A dimmed side-effect indicator means the step was skipped but the flow continued. No more guessing which `if` statement in a coroutine caused the behavior.

### Delay and Duration: Visible Timing

Every chain step can have a delay (wait before starting) and a duration (how long this step "takes" before the chain proceeds).

![Chain Config](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-chain.png)

```csharp
// Wait 0.5s before starting the charge-up animation
onStartDesperation.AddChainEvent(onChargeUp, delay: 0.5f);

// The charge-up takes 3.0 seconds before the chain continues
onChargeUp.AddChainEvent(onScreenFlash, duration: 3.0f);
```

These timing values appear directly on the connection in the Node Editor. A designer reads the graph left to right and sees: "0.5s pause, then charge-up for 3s, then flash." The timing is VISIBLE. No digging through coroutine code to find the `WaitForSeconds` calls.

Combining delay and duration: "wait 0.5s, then this step runs for 2.0s, then the next step starts." Total time from previous step: 2.5 seconds. The math is right there on the graph.

### waitForCompletion: Async Without the Mess

For chain steps that involve genuinely asynchronous operations — scene loads, network calls, animation completions — you can't predict the duration in advance. `waitForCompletion` tells the chain to pause until the handler signals it's done.

```csharp
onFadeComplete.AddChainEvent(onLoadScene, waitForCompletion: true);
```

The handler returns an `IEnumerator` (coroutine), and the chain waits for that coroutine to finish:

```csharp
public IEnumerator HandleLoadScene(string sceneName)
{
    AsyncOperation loadOp = SceneManager.LoadSceneAsync(sceneName);
    while (!loadOp.isDone)
    {
        loadingBar.value = loadOp.progress;
        yield return null;
    }
    // Coroutine completes → chain automatically continues
}
```

No boolean flags. No polling. No event-based callbacks to reconnect the sequence. The chain pauses, the async operation runs, the chain resumes when it's done. And in the flow graph, you can see the `waitForCompletion` indicator on the connection, so you know this step has variable timing.

If both `waitForCompletion` and a `duration` are set on the same step, the chain waits for whichever takes LONGER. A 2.0s minimum duration with an async operation that takes 5.0s? Chain waits 5.0s. An async operation that completes in 0.3s with a 2.0s minimum? Chain waits 2.0s. Safety net built in.

### Loop Execution: Repetition Without Code Loops

Some steps need to repeat. Spawn 5 enemies one at a time. Flash the screen 3 times. Pulse a warning indicator. Instead of creating 5 separate spawn nodes or writing a for-loop in a coroutine, you configure a loop on a single node.

![Node General Config](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-general.png)

```csharp
// Flash screen 3 times with 0.2s between flashes
onStartWarning.AddChainEvent(onScreenFlash, loopCount: 3, loopDelay: 0.2f);

// Spawn 5 enemies, one every 0.8 seconds
onWaveStart.AddChainEvent(onSpawnEnemy, loopCount: 5, loopDelay: 0.8f);
```

The event fires `loopCount` times with `loopDelay` seconds between each firing. After all iterations complete, the chain continues to the next step. In the graph, the node shows its loop count, so you can see at a glance "this step repeats 3 times."

This replaces for-loops inside coroutines with visible, configurable repetition on individual nodes. Change the count from 3 to 5? Click the node, change the number. No code editing.

## Pattern Gallery: Three Reusable Architectures

Let me show you three patterns that cover the vast majority of complex event flows in games. Think of them as templates you can adapt.

### The Broadcaster Pattern

Pure parallel fan-out. One event, many independent consumers.

![Broadcaster Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-broadcaster.png)

```
OnPlayerLevelUp ──trigger──► UpdateLevelUI
                ──trigger──► PlayLevelUpSound
                ──trigger──► SpawnParticleEffect
                ──trigger──► CheckAchievements
                ──trigger──► LogAnalytics
                ──trigger──► SaveProgress
                ──trigger──► SyncToServer
```

Seven consumers, all independent. If the analytics server is down, the player still sees their level-up effects. If the achievement check throws an exception, saving still happens.

When to use: system-wide notifications, state change broadcasts, any scenario where consumers are independent and failure should be isolated.

The key characteristic is resilience. Trigger mode's fault tolerance means one broken consumer can't cascade-fail to the others. In a traditional delegate chain, one unhandled exception stops the entire invocation list. In a broadcaster pattern with trigger connections, each consumer is isolated.

### The Cinematic Pattern

Pure sequential chain with precise timing. Every step waits for the previous one.

![Cinematic Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-cinematic.png)

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

Eight steps, strictly ordered. Delays provide pacing. Durations handle fixed-time operations. `waitForCompletion` handles variable-time operations. The entire sequence is deterministic and reproducible.

When to use: cutscenes, tutorials, onboarding flows, scripted sequences, any scenario where precise timing and strict ordering matter.

The key characteristic is readability. A designer can read this graph left to right and understand the complete cutscene timing without reading a single line of code. "0.5s pause, disable input, camera moves (wait for it), 1s pause, dialogue (wait for it), 3s animation, 0.5s pause, 1s fade out, load scene (wait for it), 1s fade in, enable input." That's the cutscene, right there in the graph.

### The Hybrid Pattern

The most common real-world pattern. Parallel effects combined with sequential state changes, plus conditions and async waits.

![Hybrid Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-hybrid.png)

```
OnBossPhaseChange ──trigger──► PlayRoarSound
                  ──trigger──► ShakeCamera
                  ──trigger──► FlashArenaLights
                  ──chain───► PlayRoarAnimation (waitForCompletion)
                              └──chain──► SpawnAdd (loop: 3, delay: 0.5s)
                                         └──chain──► BuffBossStats
                                                     └──chain──► ChangeMusic
                                                                 └──chain──► EnableNewAttacks
```

The instant sensory feedback (sound, camera, lights) triggers in parallel — players feel the response immediately. The gameplay state changes (animation wait, staggered spawns, stat buffs, music transition, attack pattern switch) chain sequentially — each step depends on the previous one completing.

When to use: most gameplay events. Any scenario where you want immediate audiovisual feedback combined with carefully ordered state mutations.

The key characteristic is the parallel/sequential split. Sensory feedback is parallel because it's independent and should feel instant. State changes are sequential because ordering matters and failures should halt the chain.

## The Real Pitch

Here's what all of this comes down to.

A 50-line coroutine and a 15-state state machine can both implement a boss fight correctly. The code works. It ships. Players experience it.

But six months later, when a designer asks "can we change the Phase 2 transition timing?" — the coroutine takes 30 minutes to safely modify. The state machine takes 45 minutes because you need to trace transitions across multiple states.

The flow graph takes 10 seconds. Click the connection, change the number. You can SEE the flow. You can SEE the conditions. You can SEE the timing. You can WATCH it execute in real time during play testing.

That's not a minor quality-of-life improvement. That's the difference between a team that can iterate on game feel quickly and a team that's afraid to touch the boss fight code because "it works and we don't fully understand it."

Complex game logic is inevitable. The question is whether that complexity is visible or invisible, editable or fragile, debuggable or opaque. The flow graph doesn't eliminate the complexity. It makes it manageable.

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
