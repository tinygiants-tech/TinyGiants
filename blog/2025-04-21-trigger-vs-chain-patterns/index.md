---
slug: trigger-vs-chain-patterns
title: "Parallel vs Sequential: The Two Fundamental Patterns Every Event System Needs (And Most Don't Have)"
authors: [tinygiants]
tags: [ges, unity, flow-graph, architecture, patterns]
description: "Player dies: sound + particles play simultaneously, but fade must finish before respawn loads. Every game needs both parallel and sequential event execution. Most event systems only give you one."
image: /img/home-page/game-event-system-preview.png
---

Player dies. Death sound and death particles should start at the same instant — no reason to wait for one before starting the other. But the screen fade absolutely MUST finish before the respawn point loads. And the respawn MUST finish before the player teleports. And the teleport MUST finish before the screen fades back in.

That's parallel AND sequential execution in the same flow, triggered by a single event. And here's the uncomfortable truth: most event systems in Unity give you exactly one pattern. Fire an event, all listeners respond, done. Whether those responses should happen simultaneously or in strict sequence is your problem to solve.

So you solve it. With coroutines. And callbacks. And booleans named `_hasFadeFinished`. And before you know it, you've built an ad-hoc state machine scattered across six files that nobody, including you in three months, can follow.

<!-- truncate -->

## The Execution Pattern Problem

Let me walk through what "parallel and sequential in the same flow" actually looks like when you try to implement it with standard Unity tools. Because the devil is absolutely in the implementation details.

### The Parallel Part (Seems Easy)

Player dies. Three things should happen at once: play death sound, spawn death particles, disable player input. In a standard C# event system, this looks fine:

```csharp
public static event Action OnPlayerDeath;

// In AudioManager.cs
OnPlayerDeath += PlayDeathSound;

// In ParticleManager.cs
OnPlayerDeath += SpawnDeathParticles;

// In InputManager.cs
OnPlayerDeath += DisableInput;
```

All three handlers fire when the event is raised. They're "parallel" in the sense that they all execute within the same event dispatch. No coroutines needed. Straightforward.

But what if `PlayDeathSound` throws an exception? The delegate invocation list stops. `SpawnDeathParticles` and `DisableInput` never execute. One broken handler takes down the entire response chain. Your player dies silently, particles don't spawn, and input stays active. Fun.

"Just wrap each handler in a try-catch." Sure. Now you're writing boilerplate exception handling in every event subscription. Or you're building a custom event dispatcher that catches per-handler. Which means you're building infrastructure that should already exist.

And what about priority? Maybe you want input to disable FIRST, before the sound plays, because there's a tiny window where the player could press a button during the death sound setup. With flat delegate chains, execution order is... the order things subscribed. Which is load order. Which is non-deterministic.

### The Sequential Part (Here's Where It Falls Apart)

After the parallel effects, the sequential respawn flow needs to happen: fade screen to black, wait for fade to finish, load respawn checkpoint, wait for load to finish, teleport player, fade screen back in.

Option 1: Coroutine chain.

```csharp
IEnumerator DeathSequence()
{
    yield return StartCoroutine(FadeToBlack());
    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();
    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

This works. Until you need to add a step. Want to play a respawn animation after teleporting? You edit the coroutine, insert a new `yield return` line, and hope you put it in the right place. Want to skip the fade on certain death types (instant respawn in multiplayer)? Now you need conditionals inside the coroutine. Want to add an optional "Continue?" screen between fade and respawn? Conditional coroutine branching.

Three changes and your clean coroutine looks like this:

```csharp
IEnumerator DeathSequence(DeathInfo info)
{
    if (!info.isInstantRespawn)
    {
        yield return StartCoroutine(FadeToBlack());
    }

    if (info.showContinueScreen)
    {
        yield return StartCoroutine(ShowContinuePrompt());
        if (!_playerChoseContinue)
        {
            yield return StartCoroutine(ShowGameOverScreen());
            yield break;
        }
    }

    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();

    if (info.playRespawnAnimation)
    {
        yield return StartCoroutine(PlayRespawnAnimation());
    }

    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

Still manageable? Maybe. But this coroutine now lives in one file. The AudioManager, ParticleManager, and InputManager know nothing about it. The parallel effects and the sequential flow are disconnected. And this is for a relatively simple death sequence.

### The Real Complexity: Hybrid Flows

Now let's talk about what actually ships in production games.

**Cutscene system:** Camera starts moving (async, variable duration). While the camera moves, ambient music fades out (parallel with camera). When camera arrives, dialogue starts (sequential after camera). While dialogue plays, character animations play (parallel with dialogue). When dialogue finishes, UI prompts appear (sequential after dialogue). Player makes a choice. Based on the choice, one of three different sequences plays.

**Combo attack system:** Button press triggers wind-up animation. On animation event, hitbox activates (sequential). On hit, damage applies AND hit particles spawn AND screen shake triggers AND combo counter increments (parallel). After hit recovery, if the combo timer hasn't expired AND the player pressed the next button, chain into the next attack (conditional sequential). Otherwise, return to idle.

**Boss phase transition:** HP drops below threshold. Roar animation plays WHILE music changes AND arena lighting shifts (parallel). When roar finishes (async wait), attack pattern switches. New minions spawn one at a time with staggered timing (sequential loop). When all minions are spawned, the boss becomes vulnerable.

Try expressing any of these as coroutines. You'll end up with nested IEnumerators, boolean flags, phase enums, WaitForSeconds scattered everywhere, and callbacks from animation events feeding back into the coroutine flow. The logic is correct, but it's write-only code. Nobody can read it six months later. Nobody can modify it safely without understanding the entire coroutine chain.

### The State Machine Escape Hatch (That Doesn't Actually Escape)

"Just use a state machine." I hear this a lot. And state machines ARE the right abstraction for sequential logic. The problem is complexity explosion.

Three phases, each with two conditions? Six states minimum. Add conditional branches within each phase? Double it. Add parallel effects that need to run alongside sequential state transitions? Now each state needs to manage its own set of parallel operations, AND handle transitions, AND evaluate conditions.

A boss fight with three phases, conditional transitions, parallel effects per phase, and staggered spawns easily requires 15-20 states. Each state is a class (or a method in a switch statement). The transition table is a separate data structure. Understanding the flow means reading all 15-20 states and mentally reconstructing the graph.

You've replaced invisible coroutine spaghetti with well-structured but equally opaque state machine spaghetti. The individual states are clean. The overall flow is still invisible.

## GES's Answer: Two Explicit Patterns You Can Mix

GES introduces two fundamental execution patterns — Trigger and Chain — as first-class concepts in both the visual editor and the code API. They're not clever abstractions layered on top of Unity's event system. They're the two atomic building blocks that every event flow is composed of.

### Trigger: Parallel Fan-Out (Orange)

When a source event fires, all Trigger-connected targets fire simultaneously and independently.

![Trigger Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-trigger.png)

**Parallel execution.** All targets begin processing in the same frame. There's no guaranteed order between them (unless you assign priorities — more on that in a moment).

**Fault-tolerant.** If target B throws an exception, targets A and C still execute. One broken handler doesn't take down the whole flow. This is the default behavior you WISH C# events had.

**Fire-and-forget.** The source doesn't wait for any target to complete. If a target starts a coroutine that takes 5 seconds, the source doesn't know or care.

**Priority-sorted.** While conceptually parallel, trigger targets execute in a deterministic order within a frame. You can assign priorities: `priority: 20` executes before `priority: 10`. This handles the "mostly parallel, but disable input before playing the death sound" case without needing a full sequential chain.

```csharp
// All fire simultaneously when onPlayerDeath is raised
onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);    // First
onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);  // Second
onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5); // Third
```

In the Node Editor, trigger connections are orange lines fanning out from a source node. Visual shorthand: "all of these happen together."

![Trigger Demo Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### Chain: Sequential Blocking (Green)

When a source event fires, Chain-connected targets execute one after another, in strict order. Each step waits for the previous step to complete before starting.

![Chain Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-chain.png)

**Strict ordering.** Step 1, then step 2, then step 3. No ambiguity. No race conditions. The visual layout reads left to right, top to bottom — exactly the execution order.

**Delay and duration.** Each chain step can have a delay (pause before starting) and a duration (how long this step "takes" before the chain proceeds). This replaces `WaitForSeconds` scattered through coroutines with explicit, visible timing on each connection.

**Async waiting.** Chain steps can use `waitForCompletion` to pause the chain until the handler's coroutine finishes. Scene loads, animations, network calls — the chain waits for them gracefully.

**Conditional halting.** Chain connections support a two-layer condition system. **Node conditions** (in the NodeBehavior Window) stop the ENTIRE branch if false — subsequent steps don't execute. **Event conditions** (in the Behavior Window) only stop the side effects (Event Actions) for that specific step — the flow itself continues to the next step. This distinction matters: sometimes you want "skip this step but keep going" and sometimes you want "abort the entire sequence."

```csharp
// Each step waits for the previous to complete
onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
onLoadRespawn.AddChainEvent(onTeleportPlayer);
onTeleportPlayer.AddChainEvent(onResetPlayerState);
onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
onFadeIn.AddChainEvent(onEnableInput);
```

In the Node Editor, chain connections are green lines flowing in sequence. Visual shorthand: "these happen in this order."

![Chain Demo Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### Mixing Them: The Hybrid Boss Pattern

Real game logic is never purely parallel or purely sequential. It's both. And the whole point of having two explicit patterns is that you can mix them freely in the same flow, from the same source node.

![Hybrid Flow](/img/game-event-system/intro/overview/flow-graph-mix.png)

The player death flow from the opening becomes:

```
OnPlayerDeath ──trigger──► OnPlayDeathSound       (parallel, immediate)
              ──trigger──► OnSpawnDeathParticles   (parallel, immediate)
              ──trigger──► OnDisableInput          (parallel, immediate, priority: 20)
              ──chain───► OnFadeToBlack            (sequential, delay: 1.0s)
                          └──chain──► OnLoadRespawn (waitForCompletion)
                                     └──chain──► OnTeleportPlayer
                                                 └──chain──► OnResetState
                                                             └──chain──► OnFadeIn (duration: 1.0s)
                                                                         └──chain──► OnEnableInput
```

Three orange trigger lines fan out — parallel effects fire immediately. A green chain line starts the sequential respawn flow. The parallel and sequential parts run concurrently: the death sound plays WHILE the chain is waiting for its 1.0s delay before starting the fade.

In code:

```csharp
void SetupDeathFlow()
{
    // Parallel effects (Trigger)
    onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);
    onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5);

    // Sequential respawn (Chain)
    onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
    onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
    onLoadRespawn.AddChainEvent(onTeleportPlayer);
    onTeleportPlayer.AddChainEvent(onResetPlayerState);
    onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
    onFadeIn.AddChainEvent(onEnableInput);
}
```

But the visual graph version is where this really clicks. Open the Node Editor and you see the entire flow: the parallel fan-out on the left, the sequential chain flowing right. Orange and green. Instant comprehension.

### Connection Types and Compatibility

When you drag a connection between two nodes in the editor, the system shows you compatibility information through color-coded indicators:

![Node Connection](/img/game-event-system/flow-graph/game-event-node-connector/node-connection.png)

- **Green indicator:** Types match perfectly. Source sends `int`, target expects `int`. Direct connection.
- **Yellow indicator:** Types are compatible with transformation. Source sends `DamageInfo`, target expects `int`. An argument transformer can bridge the gap (covered in the next post).
- **Orange indicator:** Connection is possible but requires configuration. The types are unrelated but you can use a void passthrough or custom transformer.
- **Red indicator:** Connection is invalid. Typically means a circular dependency in chain mode.

The editor also shows node status during runtime debugging:

![Node Status](/img/game-event-system/flow-graph/game-event-node-connector/node-status.png)

Active nodes pulse. Completed nodes flash. Skipped nodes (condition was false) show a red flash. Errored nodes show a persistent red highlight. You can watch the entire trigger/chain flow execute and immediately see where something went wrong.

### The Two-Layer Condition System

This deserves special attention because it's the most nuanced part of the trigger/chain design, and getting it wrong leads to subtle bugs.

**Node conditions** (configured in the NodeBehavior Window) control the FLOW. If a node condition evaluates to `false`:
- On a **trigger** connection: that specific target doesn't fire, but other triggers from the same source are unaffected.
- On a **chain** connection: the ENTIRE remaining sequence stops. Steps after the failed condition never execute.

**Event conditions** (configured in the Behavior Window) control the SIDE EFFECTS. If an event condition evaluates to `false`:
- The event's actions (what I call side effects — the actual gameplay responses) don't execute.
- But the FLOW continues. The next step in a chain still fires. The trigger dispatch still proceeds.

Why does this distinction exist? Because sometimes you want "skip playing the sound but keep going with the respawn sequence" (event condition on the sound step). And sometimes you want "if the player has a revive token, ABORT the entire death sequence" (node condition on the first chain step).

In the Node Editor, both condition types are visible on their respective nodes and connections. During runtime debugging, you can see which layer blocked execution. This visibility alone prevents hours of debugging "why did the chain stop?" questions.

## Game Patterns That Need Both

Let me give you more concrete examples, because the trigger/chain split applies to far more than just player death.

**Cutscene sequences:** Camera movement and ambient audio fade happen in parallel (trigger). When camera arrives at destination, dialogue starts (chain, waitForCompletion on camera). Character animations play in parallel with dialogue (trigger from the dialogue start event). When dialogue ends, choice UI appears (chain). After player chooses, one of several chain sequences continues.

**Combo attacks:** Button press triggers wind-up animation AND haptic feedback AND UI combo indicator (all triggers). On animation completion (chain, waitForCompletion), hitbox activates. On hit detection, damage calculation AND hit VFX AND screen shake AND combo counter increment all trigger simultaneously. After hit recovery duration (chain with duration), combo window opens for the next input.

**Boss phase transitions:** HP threshold crossed triggers alarm sound AND warning UI AND camera zoom (parallel triggers). Then sequentially: boss invulnerability activates (chain), phase transition animation plays (chain, waitForCompletion), new attack pattern loads (chain), boss vulnerability returns (chain). If it's the final phase, a special dialogue chain plays after the transition.

Each of these is a mix of parallel fan-outs and sequential chains. Each is painful to express in coroutines. Each becomes obvious in a visual flow graph with orange and green connections.

## The Decision Framework

After using trigger and chain patterns across multiple projects, here's the heuristic that works for me:

**Default to Trigger.** If you're not sure whether something should be trigger or chain, start with trigger. Most event connections are "this system should respond to this event, independently." Sound, particles, UI updates, analytics, state tracking — all triggers.

**Upgrade to Chain when order is load-bearing.** If step B would break or produce wrong results when step A hasn't finished, that's a chain. Fade must finish before teleport. Load must finish before initialization. Animation must finish before hitbox activates.

**Use both when you have immediate feedback + delayed consequences.** The instant sensory response (sound, particles, visual effects) is trigger. The careful state mutation (scene load, player teleport, data save) is chain. Players feel the response immediately while the game state updates safely in sequence.

**Use the two-layer condition system when you need "skip" vs "abort."** Event conditions for "skip this step's effects but continue the flow." Node conditions for "abort the entire branch."

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
