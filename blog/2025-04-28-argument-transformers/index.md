---
slug: argument-transformers
title: "Argument Transformers: The Type Conversion Magic in Event Flows"
authors: [tinygiants]
tags: [ges, unity, flow-graph, advanced, tutorial]
description: "When your upstream event sends DamageInfo but your downstream event expects an int, Argument Transformers bridge the gap with zero friction."
image: /img/home-page/game-event-system-preview.png
---

You've built a clean event flow. Your `OnDamageDealt` event sends a `DamageInfo` object with damage amount, damage type, attacker reference, and crit flag. Now you want to connect it to `OnUpdateHealthBar`, which expects a plain `int` — the new health value. Type mismatch. The Node Editor won't let you connect them directly because the data shapes don't match.

You could create a middle-man event that listens to `OnDamageDealt`, extracts the damage value, calculates the new health, and raises `OnUpdateHealthBar`. But now you have an extra event that exists purely for plumbing. Multiply that by every type mismatch in your flow, and you've got a graph full of adapter events that add visual noise without adding value.

Argument Transformers solve this. They sit on a connection between two events and transform the source data into whatever the target expects. No intermediate events. No adapter scripts. Just a lambda or visual configuration that says "take this `DamageInfo` and turn it into this `int`."

<!-- truncate -->

## What Is an Argument Transformer?

An argument transformer is a function attached to an event flow connection (trigger or chain) that converts the source event's argument type into the target event's expected type. It runs after the source fires and before the target receives the data.

Think of it as a pipe fitting. The source pipe carries `DamageInfo`. The target pipe expects `int`. The transformer is the adapter that fits between them, extracting or computing the right value.

The transformer has access to:
- The source event's argument (the payload data)
- The source event's sender (the object that raised the event)

And it returns whatever type the target event expects.

## The Three Transformation Patterns

In practice, argument transformers fall into three categories. Understanding these patterns covers about 95% of use cases.

### Pattern 1: Complex to Void (Filter Gate)

Sometimes you want to connect a typed event to a void event — one that doesn't take any argument. The target event just needs to know "something happened," not the details.

```csharp
// Source: DamageInfoGameEvent — carries full damage data
// Target: GameEvent (void) — just a signal, no data needed

onDamageDealt.AddTriggerEvent(onPlayHitSound, passArgument: false);
```

The `passArgument: false` flag tells the connection to not pass any data to the target. The target fires as a void event. This is the simplest form of transformation — you're not converting the data, you're discarding it.

**When to use this:**
- Trigger sound effects or particle systems that don't need to know what caused them
- Increment counters that just need "something happened"
- Toggle states that react to any event occurrence

In the Node Editor, this is configured on the connection properties. You'll see a "Pass Argument" toggle that you can uncheck:

![Node Pass Arg](/img/game-event-system/flow-graph/game-event-node-connector/node-pass-arg.png)

### Pattern 2: Simple Type Transformation (Field Extraction)

This is the most common pattern. You have a complex source type and need to extract a single field or compute a simple value from it.

```csharp
// Source: DamageInfoGameEvent — carries damage, type, attacker, crit flag
// Target: Int32GameEvent — expects the damage amount

onDamageDealt.AddTriggerEvent(onApplyDamage,
    argumentTransformer: (DamageInfo info) => info.damage);
```

The transformer is a lambda that takes the source argument and returns the target type. Here, it extracts `info.damage` (an int) from the `DamageInfo` object.

You can do more than field extraction. Any computation is valid:

```csharp
// Extract and modify
onDamageDealt.AddTriggerEvent(onApplyDamage,
    argumentTransformer: (DamageInfo info) => info.isCritical ? info.damage * 2 : info.damage);

// Extract nested properties
onEnemyKilled.AddTriggerEvent(onAwardXP,
    argumentTransformer: (EnemyInfo enemy) => enemy.xpValue);

// Construct a new type
onDamageDealt.AddTriggerEvent(onShowDamageNumber,
    argumentTransformer: (DamageInfo info) => new DamageDisplay
    {
        amount = info.damage,
        position = info.hitPoint,
        isCrit = info.isCritical
    });
```

**When to use this:**
- Extracting a single field from a complex payload
- Converting between related types (DamageInfo → int, EnemyInfo → string)
- Computing derived values (raw damage → effective damage after armor)

### Pattern 3: Sender + Args Transformation

Sometimes you need data from both the event's argument AND its sender to construct the target value. The transformer can receive both:

```csharp
// Source: ItemInfoGameEvent with sender being the player who picked it up
// Target: StringGameEvent — expects a notification message

onItemPickup.AddTriggerEvent(onShowNotification,
    argumentTransformer: (GameObject sender, ItemInfo item) =>
        $"{sender.name} picked up {item.itemName}!");
```

The two-parameter transformer form gives you access to the sender object (the `GameObject` or component that raised the event) alongside the argument. This is powerful for creating context-rich transformations without requiring the source event to pack everything into its argument type.

```csharp
// Combine sender and argument data for a complex transformation
onPlayerAttack.AddTriggerEvent(onCalculateDamage,
    argumentTransformer: (GameObject attacker, AttackInfo attack) => new DamageInfo
    {
        damage = attack.baseDamage + attacker.GetComponent<Stats>().bonusDamage,
        attacker = attacker,
        damageType = attack.damageType,
        isCritical = Random.value < attacker.GetComponent<Stats>().critChance
    });
```

**When to use this:**
- The target needs information about WHO raised the event, not just WHAT happened
- Building notification messages that include the actor's name
- Computing values that depend on both the event data and the sender's state

## Visual Configuration in the Node Editor

While the code API uses lambdas, the Node Editor provides a visual interface for configuring argument transformers. When you select a connection between two nodes, the connection inspector shows the transformation options.

![Node Config Window](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-window.png)

The visual transformer configuration supports:

**Field Selection:** A dropdown that mirrors the deep property access system from condition trees. You can navigate into the source type's properties to select which field to extract. This covers the "simple extraction" pattern without writing code.

**Pass Argument Toggle:** A checkbox that enables/disables argument passing entirely (Pattern 1).

![Node Trigger Config](/img/game-event-system/flow-graph/game-event-node-behavior/node-config-trigger.png)

**Custom Transformer:** For transformations that can't be expressed as simple field extraction (computations, type construction, sender access), you can reference a MonoBehaviour method that performs the transformation. This method is called at runtime with the source data and returns the target type.

```csharp
// Referenced by the visual transformer configuration
public class DamageTransformers : MonoBehaviour
{
    public int ExtractDamage(DamageInfo info)
    {
        return info.isCritical ? info.damage * 2 : info.damage;
    }

    public string BuildNotification(DamageInfo info)
    {
        return $"{info.damage} {info.damageType} damage!";
    }
}
```

The Node Editor lets you drag this component into the transformer field and select the method from a dropdown. The system validates that the method's parameter type matches the source event and its return type matches the target event.

![Argument Transform](/img/game-event-system/flow-graph/game-event-node-behavior/node-transform.png)

## Common Transformation Patterns

Here's a collection of transformer patterns I've found useful across multiple projects. Think of these as recipes.

### The Extractor

Pull one field out of a complex type.

```csharp
// DamageInfo → int (damage amount)
argumentTransformer: (DamageInfo info) => info.damage

// PlayerState → float (health percentage)
argumentTransformer: (PlayerState state) => state.currentHP / state.maxHP

// CollisionInfo → Vector3 (contact point)
argumentTransformer: (CollisionInfo col) => col.contactPoint
```

### The Formatter

Convert data to a display-ready string.

```csharp
// int → string (score display)
argumentTransformer: (int score) => $"Score: {score:N0}"

// DamageInfo → string (floating damage text)
argumentTransformer: (DamageInfo info) => info.isCritical ? $"CRIT {info.damage}!" : info.damage.ToString()

// ItemInfo → string (pickup notification)
argumentTransformer: (ItemInfo item) => $"Acquired: {item.displayName} x{item.quantity}"
```

### The Calculator

Compute a derived value.

```csharp
// DamageInfo → int (effective damage after armor)
argumentTransformer: (DamageInfo info) =>
    Mathf.Max(0, info.damage - targetArmor.value)

// SpawnRequest → Vector3 (randomized spawn position)
argumentTransformer: (SpawnRequest req) =>
    req.basePosition + Random.insideUnitSphere * req.spawnRadius

// WaveInfo → int (enemy count scaled by difficulty)
argumentTransformer: (WaveInfo wave) =>
    Mathf.RoundToInt(wave.baseEnemyCount * difficultyMultiplier)
```

### The Constructor

Build a new object from parts of the source.

```csharp
// DamageInfo → FloatingTextData
argumentTransformer: (DamageInfo info) => new FloatingTextData
{
    text = info.damage.ToString(),
    position = info.hitPoint + Vector3.up * 0.5f,
    color = info.isCritical ? Color.yellow : Color.white,
    scale = info.isCritical ? 1.5f : 1.0f
}

// QuestEvent → NotificationData
argumentTransformer: (QuestEvent evt) => new NotificationData
{
    title = evt.questName,
    description = evt.isComplete ? "Quest Complete!" : "New Objective",
    icon = evt.questIcon,
    duration = 3.0f
}
```

### The Gate (Void Passthrough)

Ignore the argument entirely. Sometimes you just need to know an event happened.

```csharp
// Any typed event → void event
onDamageDealt.AddTriggerEvent(onRefreshUI, passArgument: false);
onEnemyKilled.AddTriggerEvent(onPlayVictoryStinger, passArgument: false);
onLevelComplete.AddTriggerEvent(onSaveProgress, passArgument: false);
```

## Type Safety and Validation

Argument transformers are type-checked at configuration time in the Node Editor and at compile time in code. If you define a transformer that takes `DamageInfo` but the source event sends `string`, you'll get a compile error (in code) or a visual warning (in the editor).

The Node Editor is particularly helpful here. When you create a connection between two events with mismatched types, the editor:

1. Flags the connection with a warning icon
2. Opens the transformer configuration panel
3. Suggests field extractions based on the source type's properties that match the target type

For example, connecting a `GameEvent<DamageInfo>` to a `GameEvent<int>`, the editor sees that `DamageInfo` has an `int damage` field and suggests it as a transformer. One click and you're configured.

## Performance Considerations

Argument transformers run once per event dispatch per connection. The performance characteristics:

- **Lambda transformers** (code API): Essentially zero overhead. A compiled delegate call is as fast as a regular method call.
- **Field extraction** (visual config): Also essentially zero. The extraction path is compiled into an Expression Tree at initialization, same as condition trees.
- **MonoBehaviour method references** (visual custom transformer): One virtual method call overhead. Negligible for game-frequency events, but worth considering for per-frame events with many connections.

In practice, I've never seen transformer overhead show up in a profiler. The transformation is typically a few field accesses or a simple computation — microseconds at most.

## Putting It Together: A Real Flow

Let's build a complete flow that uses argument transformers to connect events with different types:

**Scenario:** Enemy death triggers multiple systems with different data needs.

```csharp
// Events with different argument types
[GameEventDropdown, SerializeField]
EnemyDeathInfoGameEvent onEnemyDeath;          // Full death data
[GameEventDropdown, SerializeField]
Int32GameEvent onAwardXP;                      // XP amount
[GameEventDropdown, SerializeField]
LootTableGameEvent onDropLoot;                 // Loot table reference
[GameEventDropdown, SerializeField]
StringGameEvent onShowKillNotification;        // Display text
[GameEventDropdown, SerializeField]
GameEvent onIncrementKillCount;                // Void — just count it
[GameEventDropdown, SerializeField]
Vector3GameEvent onSpawnDeathEffect;           // Effect position

void SetupEnemyDeathFlow()
{
    // Extract XP value from death info
    onEnemyDeath.AddTriggerEvent(onAwardXP,
        argumentTransformer: (EnemyDeathInfo info) => info.enemy.xpValue);

    // Extract loot table reference
    onEnemyDeath.AddTriggerEvent(onDropLoot,
        argumentTransformer: (EnemyDeathInfo info) => info.enemy.lootTable);

    // Build notification string using sender + args
    onEnemyDeath.AddTriggerEvent(onShowKillNotification,
        argumentTransformer: (GameObject killer, EnemyDeathInfo info) =>
            $"{killer.name} killed {info.enemy.displayName}!");

    // Void — just increment, don't need the data
    onEnemyDeath.AddTriggerEvent(onIncrementKillCount, passArgument: false);

    // Extract death position for particle effect
    onEnemyDeath.AddTriggerEvent(onSpawnDeathEffect,
        argumentTransformer: (EnemyDeathInfo info) => info.deathPosition);
}
```

One source event, five target events, five different types. Each connection has a transformer that extracts or constructs exactly what the target needs. In the Node Editor, this is a single source node with five outgoing connections, each with a configured transformer. Clean, visible, and maintainable.

Without argument transformers, you'd need either:
- A single monolithic handler that calls five different systems directly (tight coupling)
- Five intermediate events that convert the data (graph clutter)
- Five separate listener scripts that each subscribe to the death event and extract what they need (scattered logic)

Argument transformers give you the best of all worlds: decoupled events with different types, connected seamlessly through explicit, visible transformations.

## Design Guidelines: When to Transform vs When to Restructure

Argument transformers are powerful, but they're not always the right answer. Here are guidelines I've developed after using them extensively.

### Transform When the Data Exists but the Shape Is Wrong

This is the sweet spot. The source event has all the information the target needs — it's just packaged differently. Extracting `damage` from `DamageInfo`, building a notification string from structured data, pulling a position vector from a complex event payload. The transformation is simple, obvious, and stable.

### Restructure When the Transformation Is Complex

If your transformer lambda grows beyond 3-4 lines, that's a code smell. A transformer that computes effective damage after armor, resistance, buffs, debuffs, and environmental modifiers isn't a "transformation" — it's game logic masquerading as a data adapter. That logic belongs in a proper method or service, not in a lambda on an event connection.

```csharp
// Too complex for a transformer — this is game logic
argumentTransformer: (DamageInfo info) =>
{
    var armor = target.GetComponent<Defense>().armor;
    var resistance = target.GetComponent<Defense>().GetResistance(info.damageType);
    var buffMultiplier = BuffManager.GetDamageMultiplier(info.attacker);
    var envModifier = EnvironmentManager.GetDamageModifier(info.hitPoint);
    return Mathf.Max(1, (int)((info.damage - armor) * resistance * buffMultiplier * envModifier));
}

// Better: use a dedicated event with its own handler
onDamageDealt.AddTriggerEvent(onCalculateEffectiveDamage);
// The handler for onCalculateEffectiveDamage does the complex calculation
```

### Avoid Chains of Transformers

If Event A transforms to Event B, which transforms to Event C, which transforms to Event D — you have a data pipeline, not an event flow. Each transformation adds a layer of indirection. Two hops is fine. Three is suspicious. Four means you should probably redesign your event types.

### Document Non-Obvious Transformations

In the code API, a comment above a transformer lambda goes a long way:

```csharp
// Convert player's equipped weapon to its base damage for the damage calculation system
onPlayerAttack.AddTriggerEvent(onCalculateBaseDamage,
    argumentTransformer: (WeaponInfo weapon) => weapon.stats.baseDamage + weapon.enchantmentBonus);
```

In the visual editor, the field extraction path serves as implicit documentation — seeing `weapon → stats → baseDamage` in the dropdown chain makes the transformation self-evident.

## Transformer Lifecycle and Cleanup

Transformers follow the same lifecycle as their parent connection. When you remove a trigger or chain event, the associated transformer is cleaned up automatically:

```csharp
// Adding with transformer
onDamageDealt.AddTriggerEvent(onApplyDamage,
    argumentTransformer: (DamageInfo info) => info.damage);

// Removing — transformer is cleaned up automatically
onDamageDealt.RemoveTriggerEvent(onApplyDamage);
```

If you're using the visual editor, deleting a connection removes its transformer configuration. No dangling references, no leaked delegates.

One subtlety worth knowing: transformer delegates can capture references from their enclosing scope (closures). If your transformer lambda captures a reference to a MonoBehaviour that gets destroyed, the transformer will throw a null reference when it executes. This is the same issue you'd have with any C# delegate that captures references — it's not specific to GES, but it's worth being aware of.

The fix is the same as always: clean up your event connections in `OnDisable` or `OnDestroy` so transformers don't outlive their captured references.

## What's Next

Argument transformers complete the core toolkit for the flow graph system. You now know how to:
- Build parallel and sequential flows (Trigger and Chain)
- Gate connections with visual conditions
- Bridge type mismatches between events

The next post covers advanced logic patterns — nested groups, delays, async waits, loops, and complex orchestration — which pull all of these features together into production-ready event flows.

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
