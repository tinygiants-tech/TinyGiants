---
slug: argument-transformers
title: "When Event Types Don't Match: The Data Transformation Problem in Event-Driven Architectures"
authors: [tinygiants]
tags: [ges, unity, flow-graph, advanced, data-flow]
description: "Your damage event carries DamageInfo. Your health bar needs a float. Your kill feed needs a string. Your VFX system needs a Vector3. One event, four consumers, four different types. Now what?"
image: /img/home-page/game-event-system-preview.png
---

You have a `DamageInfoGameEvent`. It carries a `DamageInfo` struct — damage amount, damage type, attacker reference, hit position, crit flag. It's a well-designed event payload that gives consumers everything they might need.

Now you want to connect it to four different systems. The health bar just needs the `float` damage number. The kill feed needs a formatted `string` like "Player dealt 47 Fire damage." The VFX system needs the `Vector3` hit position to spawn particles. The screen shake system just needs to know damage happened — it doesn't need any data at all.

One event. Four consumers. Four different expected types. In every event system I've used before GES, this is where things start to get ugly.

<!-- truncate -->

## The Type Mismatch Problem

This isn't a theoretical concern. Type mismatches between event producers and consumers show up in every non-trivial event-driven architecture. And the "solutions" most teams reach for all have significant downsides.

### Solution 1: Pass the Full Object Everywhere

The simplest approach: every consumer receives the full `DamageInfo` and extracts what it needs.

```csharp
// HealthBar.cs
void OnDamageReceived(DamageInfo info)
{
    currentHealth -= info.damage;
    UpdateBar(currentHealth / maxHealth);
}

// KillFeed.cs
void OnDamageReceived(DamageInfo info)
{
    feedText.text = $"{info.attacker.name} dealt {info.damage} {info.damageType} damage";
}

// VFXManager.cs
void OnDamageReceived(DamageInfo info)
{
    SpawnHitParticles(info.hitPosition);
}
```

This works. But now every consumer is coupled to `DamageInfo`. Your health bar — a generic UI component that should work with any number — depends on your combat system's data structure. Change `DamageInfo` (rename a field, reorganize the struct, split it into two structs), and every consumer needs to update. The promise of event-driven decoupling just evaporated.

This coupling is particularly painful during prototyping. Early in development, data structures change constantly. If your health bar, kill feed, VFX system, and screen shake all depend on `DamageInfo`, every change to your combat data model ripples through four unrelated systems.

### Solution 2: Create Intermediate Events

The "clean architecture" approach: create specialized events for each consumer type.

```csharp
// DamageInfoGameEvent — the source
// FloatGameEvent (OnDamageAmount) — carries just the number
// StringGameEvent (OnDamageNotification) — carries the formatted message
// Vector3GameEvent (OnDamagePosition) — carries the hit point
// GameEvent (OnDamageOccurred) — void, just a signal

// Some "converter" MonoBehaviour that bridges them:
void OnDamageDealt(DamageInfo info)
{
    onDamageAmount.Raise(info.damage);
    onDamageNotification.Raise($"{info.damage} {info.damageType} damage!");
    onDamagePosition.Raise(info.hitPosition);
    onDamageOccurred.Raise();
}
```

Now your health bar subscribes to `OnDamageAmount` (a clean `float` event), your VFX subscribes to `OnDamagePosition` (a clean `Vector3` event), and nobody depends on `DamageInfo` except the converter.

But you've just doubled your event count. For EVERY typed event that has multiple consumer types, you need a family of derived events plus a converter script. A project with 20 complex events might need 60-80 total events, most of which exist purely as plumbing. Your event inventory becomes cluttered with adapter events that add no semantic value.

In a visual flow graph, this is even worse. Your graph fills up with "middleman" nodes that exist solely to convert types. The actual event flow — the logic you care about — gets lost in a sea of conversion nodes.

### Solution 3: Transform in Every Listener

The pragmatic approach: each listener does its own transformation in its subscription handler.

```csharp
// HealthBar subscribes to the raw DamageInfo event but only uses one field
onDamageDealt.AddListener(info => UpdateBar(info.damage));

// KillFeed subscribes and formats
onDamageDealt.AddListener(info => ShowMessage($"{info.damage} damage!"));

// VFX subscribes and extracts position
onDamageDealt.AddListener(info => SpawnParticles(info.hitPosition));
```

This keeps the event count low and avoids intermediate events. But now the transformation logic is scattered across every consumer. If you decide to change how damage is displayed (add crit indicators, change the format), you're hunting through every listener that touches `DamageInfo`.

More importantly, this approach is invisible. There's no single place that documents "here's how DamageInfo flows to each consumer and what each one extracts." The transformations exist only inside anonymous lambdas sprinkled across the codebase.

### What Data Engineering Already Figured Out

If you've worked with data pipelines, you know this problem has a name: **ETL (Extract, Transform, Load)**. Data comes in one shape, needs to go out in a different shape, and there's a transformation step in between.

Data engineering solved this decades ago. ETL tools, map/reduce frameworks, stream processing pipelines — they all have explicit transformation stages between data producers and consumers. The transformation is a first-class concept, visible in the pipeline definition, configurable without touching the producer or consumer.

Event-driven game architectures need the same concept. Not "pass everything and let consumers figure it out." Not "create intermediate events for every type combination." A transformation layer that sits on the CONNECTION between events, visible and configurable.

## GES's Argument Transformer System

GES's argument transformers sit on individual connections between event nodes. They intercept the source event's data, transform it, and pass the result to the target event. No intermediate events. No consumer-side extraction. The transformation lives where it logically belongs: on the connection between the two events.

### Pattern 1: Complex-to-Void (Discard the Data)

The simplest transformation: the target doesn't need any data at all. The screen shake system just needs to know "damage happened" — it shakes the same amount regardless of damage details.

```csharp
onDamageDealt.AddTriggerEvent(onScreenShake, passArgument: false);
```

The `passArgument: false` flag tells the connection to discard the source data entirely. The target fires as a void event.

In the Node Editor, this is a toggle on the connection properties:

![Pass Argument Toggle](/img/game-event-system/flow-graph/game-event-node-connector/node-pass-arg.png)

When to use this:
- Triggering sound effects or particles that don't vary based on the source data
- Incrementing counters that just need "something happened"
- Toggling states that respond to any occurrence of an event

This pattern eliminates the need for parallel void events like `OnDamageOccurred` that exist solely as type-stripped versions of `OnDamageDealt`. One event, one connection with `passArgument: false`, done.

### Pattern 2: Field Extraction (The Common Case)

The most frequent pattern. Your source event carries a complex type, and your target needs one specific field from it.

```csharp
// DamageInfo → float (damage amount)
onDamageDealt.AddTriggerEvent(onUpdateHealthBar,
    argumentTransformer: (DamageInfo info) => info.damage);

// DamageInfo → Vector3 (hit position for VFX)
onDamageDealt.AddTriggerEvent(onSpawnHitParticles,
    argumentTransformer: (DamageInfo info) => info.hitPosition);

// EnemyDeathInfo → int (XP value)
onEnemyKilled.AddTriggerEvent(onAwardXP,
    argumentTransformer: (EnemyDeathInfo info) => info.enemy.xpValue);
```

The transformer is a lambda that takes the source type and returns the target type. It can be a simple field access (`info.damage`), a nested property access (`info.enemy.xpValue`), or a computation:

```csharp
// Compute effective damage after armor
onDamageDealt.AddTriggerEvent(onApplyDamage,
    argumentTransformer: (DamageInfo info) => info.isCritical ? info.damage * 2 : info.damage);

// Convert to display string
onDamageDealt.AddTriggerEvent(onShowDamageNumber,
    argumentTransformer: (DamageInfo info) =>
        $"{(info.isCritical ? "CRIT " : "")}{info.damage} {info.damageType}");
```

The key insight: the health bar now depends on `float`, not `DamageInfo`. The VFX system depends on `Vector3`, not `DamageInfo`. The coupling between your combat data structure and your UI/VFX systems is broken. The transformer handles the bridge, and it lives on the connection — visible in the flow graph, editable without touching either the producer or the consumer.

### Pattern 3: Sender + Args Transformation

Sometimes the target needs data from both the event's payload AND the object that raised the event. The transformer can receive both:

```csharp
// Build a kill feed message from the killer (sender) and the death info (argument)
onEnemyKilled.AddTriggerEvent(onShowKillFeedMessage,
    argumentTransformer: (GameObject killer, EnemyDeathInfo info) =>
        $"{killer.name} eliminated {info.enemy.displayName}!");

// Compute damage with attacker stats
onPlayerAttack.AddTriggerEvent(onCalculateDamage,
    argumentTransformer: (GameObject attacker, AttackInfo attack) => new DamageInfo
    {
        damage = attack.baseDamage + attacker.GetComponent<Stats>().bonusDamage,
        attacker = attacker,
        damageType = attack.element
    });
```

The two-parameter form gives you the sender (typically the `GameObject` or component that raised the event) alongside the argument. This is powerful for building context-rich transformations without requiring the source event to pack everything into its payload.

Without this, you'd need to either: include the sender reference inside the event payload (bloating your data structures) or have the consumer look up context at receive time (adding coupling and latency).

## Visual Configuration in the Node Editor

The code API uses lambdas, which is great for programmers. But the Node Editor provides visual configuration for argument transformers that designers and non-programmers can use.

![Node Config Window](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-window.png)

When you select a connection between two events with mismatched types, the connection inspector shows transformation options.

**Field Selection** is the visual equivalent of field extraction. A dropdown mirrors the source type's property hierarchy. Click into `DamageInfo`, see its fields (`damage`, `damageType`, `hitPosition`, `isCritical`, `attacker`), select one. If the field type matches the target event's type, the transformer is configured. One click. No code.

This works with nested properties too. If `DamageInfo` has an `attacker` field of type `CharacterStats`, and `CharacterStats` has a `level` field of type `int`, and your target event expects `int`, you can navigate `DamageInfo → attacker → level` through the dropdown chain.

![Node Trigger Config](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-trigger.png)

**Pass Argument Toggle** handles the void passthrough case. Uncheck the box, and the connection discards the source data.

**Custom Transformer Reference** covers computations that can't be expressed as simple field extraction. You reference a MonoBehaviour method that performs the transformation:

```csharp
public class DamageTransformers : MonoBehaviour
{
    public int EffectiveDamage(DamageInfo info)
    {
        return info.isCritical ? info.damage * 2 : info.damage;
    }

    public string KillFeedMessage(EnemyDeathInfo info)
    {
        return $"{info.enemy.displayName} defeated! +{info.enemy.xpValue} XP";
    }
}
```

Drag this component into the transformer field, select the method from a dropdown. The system validates parameter and return types at configuration time — if the method signature doesn't match the source/target event types, the editor tells you immediately.

![Argument Transform Visual](/img/game-event-system/flow-graph/game-event-node-behavior/node-transform.png)

## Why This Matters for Architecture

Argument transformers aren't just a convenience feature. They fundamentally change how you design event payloads.

**Without transformers:** Every event payload must be the lowest common denominator. You either make events carry massive "god objects" that every consumer understands, or you create dozens of specialized events for each consumer type. Both approaches compromise your architecture.

**With transformers:** Event payloads can be semantically rich and specific to their domain. `DamageInfo` carries everything relevant to damage — because it should. The combat system owns that data structure. Other systems don't need to know about it. The transformer on each connection extracts exactly what each consumer needs.

This is true decoupling. The producer defines its data in terms of its own domain. The consumer defines its interface in terms of its own domain. The transformer bridges the two, and it's visible on the connection in the flow graph. Change `DamageInfo`? Update the transformers on its outgoing connections. The consumers never know.

Compare this to the data pipeline world. A database stores data in its normalized schema. A dashboard displays data in a denormalized format. An ETL process transforms between the two. Nobody thinks the database should store data in dashboard format, or that the dashboard should understand database schemas. The transformation layer is a natural, expected part of the architecture.

Event-driven game systems should work the same way. And now they can.

## Design Guidelines

After using transformers across several projects, these guidelines have served me well:

**Keep transformers simple.** If your transformer lambda exceeds 3-4 lines, the logic probably belongs in a dedicated handler, not on a connection. A transformer should be extraction, formatting, or simple computation — not game logic.

**Avoid chains of transformers.** Event A transforms to B, B transforms to C, C transforms to D. If you're doing this, your event types are probably wrong. Redesign the intermediate events to carry the right data.

**Use the visual editor for simple extractions.** Field selection is one click and requires no code. Use it for straightforward field access. Use code transformers for computations.

**Document non-obvious transformers.** If a code-based transformer does something non-trivial (applies a multiplier, combines fields, does a lookup), add a comment. The visual editor is self-documenting (you can see the field path), but code lambdas aren't.

**Prefer transformers over intermediate events.** If you find yourself creating an event that exists solely to convert another event's data type, replace it with a transformer on the original connection. Fewer events = cleaner graph = less cognitive overhead.

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
