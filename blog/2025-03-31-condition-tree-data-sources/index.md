---
slug: condition-tree-data-sources
title: "Condition Tree Data Sources: From Event Arguments to Scene Objects to Random Values"
authors: [tinygiants]
tags: [ges, unity, condition-tree, advanced, tutorial]
description: "The visual condition tree supports 4 data source types with deep property access up to 5 levels. Access event payloads, scene components, random values, and constants — all without code."
image: /img/home-page/game-event-system-preview.png
---

Here's a situation that comes up all the time: you've got a damage event that carries a `DamageInfo` payload, and you want to condition an Event Action on both the damage type from that payload AND the current state of a completely separate object in the scene — say, whether a specific buff is active on the player. In traditional code, that means your event handler needs references to both the event data and the buff system. Two dependencies, more coupling, more fragility.

The visual condition tree in GES solves this by letting each comparison node pull data from different source types independently. One side of your comparison can read from the event's payload while the other side reads from a scene object. No extra wiring. No new dependencies in code.

In the previous post, we covered the basics of condition trees — AND/OR groups, comparison node structure, and the general workflow. Today we're going deep on the four data source types that power every comparison node. This is where the condition tree goes from "neat Inspector trick" to "genuinely powerful tool."

<!-- truncate -->

## A Quick Refresher

Every comparison node in the condition tree follows the pattern: **Source** → **Operator** → **Target**. Both the Source and Target sides independently select a data source type. The four types are:

1. **Event Argument** — data from the event's payload
2. **Scene Type** — references to objects/components in the scene
3. **Random** — generated random values
4. **Constant** — fixed values you type in

![Condition Tree Overview](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

Let's break each one down with real examples.

## Source Type 1: Event Argument

This is the source type you'll use most often. When an event fires, it carries data — the argument. For a `GameEvent<DamageInfo>`, the argument is the `DamageInfo` instance. The Event Argument source type lets you reach into that payload and pull out any field or property.

### Basic Property Access

When you select Event Argument as your source type, the Inspector presents a dropdown of available fields and properties on the event's argument type. For a `DamageInfo` with this structure:

```csharp
[System.Serializable]
public class DamageInfo
{
    public float damage;
    public bool isCritical;
    public DamageType damageType;
    public GameObject attacker;
    public GameObject target;
    public Vector3 hitPoint;
}
```

You'd see `damage`, `isCritical`, `damageType`, `attacker`, `target`, and `hitPoint` in the dropdown. Select one, and the condition node knows to extract that value at runtime when the event fires.

### Deep Property Access (Up to 5 Levels)

Here's where it gets powerful. You're not limited to top-level fields. The system supports drilling down up to 5 levels into nested structures. So if your `DamageInfo` has an `attacker` field of type `GameObject`, you can navigate through:

```
damageInfo → attacker → transform → position → x
```

That's 4 levels deep, and it gives you the attacker's X position as a float — all configured visually in the Inspector. No code. No helper methods. No intermediate variables.

This deep access works through fields, properties, and even components. When the system encounters a `GameObject`, it automatically exposes `transform`, `name`, `tag`, `layer`, and any component accessible via `GetComponent`. When it encounters a `Component`, it exposes all public fields and properties of that component type.

In practice, 5 levels is more than enough for nearly any real scenario. I've rarely needed more than 3 in production projects, but it's nice to know the headroom is there.

### Single Parameter Events

For events that carry a single primitive value — like `GameEvent<int>` or `GameEvent<float>` — the Event Argument source type gives you the value directly. There's no property navigation because the argument itself IS the value. You'd set up a comparison like:

- Source: **Event Argument** (the int value)
- Operator: **>**
- Target: **Constant** → `100`

This checks "is the event's integer argument greater than 100?"

### Sender Access

GES events can optionally include a sender reference — the object that raised the event. The Event Argument source type lets you access the sender as well, not just the payload argument. This is useful for conditions like "only respond if the sender is tagged as Player" or "only respond if the sender's health is above zero."

When an Event Action in the Behavior Window is configured to receive the sender, the Event Argument source type shows both the argument properties and the sender properties in separate sections. You can mix and match — compare the sender's tag against a constant, or compare the argument's damage value against the sender's attack power.

## Source Type 2: Scene Type

Event Argument covers data that flows through the event. But what about data that exists independently in the scene? That's where Scene Type comes in.

Scene Type lets you drag-and-drop any `GameObject` or `Component` reference directly into the condition node's Inspector field. Once you've assigned a reference, you can navigate its properties using the same deep access system — up to 5 levels deep.

### Common Use Cases

**Checking a scene object's state:**
- Is the door's `LockComponent.isLocked` equal to `false`?
- Is the player's `HealthComponent.currentHPPercent` less than `0.5`?
- Is the game's `TimeManager.isNightTime` equal to `true`?

**Comparing against another object:**
- Is the event argument's `damage` greater than the target's `Defense.armorValue`?

That last one is particularly powerful: Source is Event Argument (`damageInfo.damage`), Target is Scene Type (`enemyDefense.armorValue`). Two completely different data sources, compared in one visual node.

### Bool Method Support

Scene Type has a special capability that the other source types don't: it can call zero-parameter methods that return `bool`. This opens up a lot of flexibility. If your component has methods like:

```csharp
public class EnemyAI : MonoBehaviour
{
    public bool IsAggressive() => currentState == AIState.Aggressive;
    public bool HasLineOfSight() => Physics.Raycast(/* ... */);
    public bool IsWithinRange() => Vector3.Distance(/* ... */) < attackRange;
}
```

You can call any of these directly from a condition node. Select the `EnemyAI` component as your Scene Type reference, and the system will show `IsAggressive()`, `HasLineOfSight()`, and `IsWithinRange()` alongside the regular properties.

This is intentionally limited to zero-parameter bool methods. The constraint keeps things simple and predictable — you're not building a general-purpose method invocation system, you're checking boolean conditions. If your method needs parameters, that's a sign the logic should probably live in code rather than the visual tree.

### When to Use Scene Type vs Event Argument

A useful mental model: **Event Argument** is for data that varies per event invocation (what happened), while **Scene Type** is for data that represents the current state of the world (what IS). The damage amount varies every time the event fires — that's Event Argument. Whether the player has a shield buff active doesn't depend on the event — that's Scene Type.

![Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

## Source Type 3: Random

Probability-based conditions are everywhere in games. Critical hit chances, loot drop rates, random encounter triggers, dialogue variation — all of these need some element of randomness in their conditions.

The Random source type generates a random value each time the condition tree is evaluated. It supports two modes:

### Range-Based Random

You specify a min and max value, and the system generates a random value within that range. The generated type matches what you need — float for float ranges, int for int ranges.

![Random Value](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-random-value.png)

The classic use case is a probability check:

- Source: **Random** → range 0.0 to 1.0
- Operator: **&lt;**
- Target: **Constant** → `0.3`

This gives you a 30% chance of the condition passing. Your designer can adjust that probability by changing the constant value. No code changes, no recompilation.

You can get more creative with ranges too. Say you want damage to only trigger a special effect when a random roll between 1 and 100 exceeds the target's luck stat:

- Source: **Random** → range 1 to 100
- Operator: **>**
- Target: **Scene Type** → `enemy.stats.luck`

Randomness meets scene data. Pretty expressive for zero lines of code.

### List-Based Random

Instead of a range, you provide a list of specific values, and the system picks one at random. This is useful for categorical random selection:

![Random List](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-random-list.png)

- Source: **Random** → list: ["Fire", "Ice", "Lightning"]
- Operator: **==**
- Target: **Event Argument** → `damageInfo.damageType`

This randomly picks one of three damage types and checks if the event's damage type matches. It's a quirky pattern, but I've seen it used for things like "randomly select which element is weak this round."

## Source Type 4: Constant

The simplest source type, and probably the second most used after Event Argument. A Constant is just a fixed value you type directly into the Inspector.

![Constant Value](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-constant-value.png)

Constants support all the types you'd expect: `int`, `float`, `double`, `string`, `bool`, and `enum`. The Inspector automatically provides the right input field based on the type context — a text field for strings, a number field for numerics, a toggle for bools, and a dropdown for enums.

### Constant Lists

Constants can also be lists, which pairs with the `In List` operator. This is perfect for "is this value one of these options?" checks:

![Constant List](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-constant-list.png)

- Source: **Event Argument** → `damageInfo.damageType`
- Operator: **In List**
- Target: **Constant List** → ["Fire", "Lightning", "Acid"]

This checks whether the damage type is any of the three elemental types. Without the `In List` operator, you'd need three separate comparison nodes in an OR group. The list version is cleaner and more maintainable — especially when the list grows.

### Enum Support

When the condition tree detects that a property is an enum type, the Constant source type automatically provides a dropdown with all enum values. No string-based comparisons, no magic numbers — just select the enum value from a dropdown.

```csharp
public enum DamageType
{
    Physical,
    Fire,
    Ice,
    Lightning,
    Acid,
    Holy
}
```

With this enum, your Constant dropdown would show: Physical, Fire, Ice, Lightning, Acid, Holy. Select one, and the comparison uses the actual enum value — type-safe, refactor-friendly, and designer-readable.

The `In List` operator works with enums too. You can build a constant list of enum values, each selected from the dropdown.

## Deep Property Access in Detail

I want to spend a moment on deep property access because it's one of those features that seems simple on the surface but has nuances worth understanding.

When you select a source type (Event Argument or Scene Type) and choose a property, the system checks the property's type and offers to go deeper. If the property is a primitive (`int`, `float`, `string`, `bool`), it stops — that's your value. If the property is a complex type (a class, struct, or Unity type), it offers another level of navigation.

### How the Navigation Works

Let's say you're navigating from a `DamageInfo`:

**Level 0:** `DamageInfo` — shows fields: `damage`, `isCritical`, `damageType`, `attacker`, `target`, `hitPoint`

**Level 1:** Select `attacker` (type: `GameObject`) — shows: `transform`, `name`, `tag`, `layer`, and available components

**Level 2:** Select `transform` (type: `Transform`) — shows: `position`, `rotation`, `localPosition`, `localScale`, `parent`, `childCount`, etc.

**Level 3:** Select `position` (type: `Vector3`) — shows: `x`, `y`, `z`, `magnitude`, `normalized`, `sqrMagnitude`

**Level 4:** Select `x` (type: `float`) — this is a primitive, navigation stops. Your final value is a `float`.

Each level is a dropdown in the Inspector, so the full path is visible and each step is independently configurable. Want to switch from `position.x` to `position.y`? Just change the last dropdown. Want to switch from `attacker.transform.position` to `target.transform.position`? Change the Level 1 dropdown.

### Practical Depth Limits

Five levels is the maximum, and in practice you'll rarely need all five. Here's a rough guide:

- **1 level** (most common): `damageInfo.damage`, `damageInfo.isCritical`
- **2 levels** (common): `damageInfo.attacker.tag`, `player.health.currentHP`
- **3 levels** (occasional): `damageInfo.attacker.transform.position`
- **4 levels** (rare): `damageInfo.attacker.transform.position.x`
- **5 levels** (very rare): edge cases with deeply nested data structures

If you find yourself regularly hitting 5 levels, it might be a sign that your data structures could benefit from some flattening, or that the condition logic is complex enough to warrant a custom code solution.

## Combining Source Types: Real-World Patterns

The real power of the condition tree shows up when you mix and match source types in a single tree. Here are some patterns I've found useful in production:

### Pattern 1: Event Data vs Scene State

```
AND
├── Event Argument: damageInfo.damage > Scene Type: boss.phase2Threshold
└── Event Argument: damageInfo.isCritical == Constant: true
```

"Trigger phase 2 when a critical hit exceeds the boss's threshold." The threshold is configured on the boss prefab, so different bosses have different thresholds. No code changes per boss.

### Pattern 2: Probability Gated by State

```
AND
├── Random: 0.0-1.0 < Scene Type: player.stats.critChance
└── Event Argument: attackResult.didHit == Constant: true
```

"If the attack hit, roll against the player's crit chance." The crit chance comes from the player's stats component, and the random roll happens per event evaluation. A designer can buff the crit chance by adjusting the stat value on the player object — the condition tree automatically uses the new value.

### Pattern 3: Multi-Source Validation

```
AND
├── Event Argument: itemPickup.itemType In List Constant: ["Weapon", "Armor", "Accessory"]
├── Scene Type: player.inventory.slotsFree > Constant: 0
└── Scene Type: gameManager.isInCombat == Constant: false
```

"Only pick up equipment items when the player has inventory space and isn't in combat." Three different sources: event data, player state, and game state. All visual, all designer-configurable.

## Performance Considerations

A reasonable question: if the condition tree is evaluating all these property accesses and deep navigation at runtime, isn't that slow?

Short answer: no. The condition tree compiles to an Expression Tree at initialization time. This means the first evaluation has a one-time compilation cost, but subsequent evaluations are essentially the same speed as hand-written C# code. The compiled expression directly accesses fields and properties without reflection — the visual configuration is just the authoring layer, not the runtime execution path.

For detailed performance numbers and optimization strategies, check out the next post in this series on operators and performance.

## Wrapping Up

The four data source types give the condition tree its flexibility:

- **Event Argument** for data flowing through the event system
- **Scene Type** for the current state of the world
- **Random** for probability and variation
- **Constant** for fixed comparison values

Mixed together with AND/OR groups, these cover the vast majority of conditions you'll need in a real game project. The deep property access (up to 5 levels) means you can reach into complex data structures without writing accessor methods, and the bool method support on Scene Types handles the cases where a simple property check isn't enough.

Next up: we'll cover every comparison operator in detail, plus type validation and performance optimization strategies.

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
