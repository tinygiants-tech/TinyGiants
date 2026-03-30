---
slug: condition-tree-data-sources
title: "Condition Tree Data Sources: From Event Arguments to Scene Objects to Random Values"
authors: [tinygiants]
tags: [ges, unity, condition-tree, advanced, tutorial]
description: "The visual condition tree supports 4 data source types with deep property access up to 5 levels. Access event payloads, scene components, random values, and constants — all without code."
image: /img/home-page/game-event-system-preview.png
---

Here's a condition that sounds simple: "Only trigger the healing effect if the incoming damage is greater than 50 AND the target's shield is broken AND it's nighttime in the game world."

Three checks. Three completely different data sources. The damage amount comes from the event payload. The shield state lives on a component attached to the target. The time-of-day is a property on some global manager sitting in the scene. In a traditional setup, your event handler needs references to all three, and suddenly a "simple" condition has dragged three unrelated systems into the same method.

This is the hidden complexity that makes game conditions so much harder than they look on paper. The logic itself is trivial — three comparisons joined by AND. The *data plumbing* is the nightmare.

<!-- truncate -->

## Simple Conditions Are Easy. Real Conditions Are Not.

Let's start with what's actually easy. If all your condition data comes from the event itself, life is great:

```csharp
public void OnDamageReceived(DamageInfo info)
{
    if (info.damage > 50)
    {
        // Do something
    }
}
```

One source of data. One comparison. The event carries the damage amount, you check it, done. This is "intro to programming" territory.

But real game conditions are almost never this clean. Here's what actual conditions look like in production:

**"Apply poison only if damage type is Acid AND the target doesn't have poison immunity AND a random roll under 40% succeeds"**

Three different kinds of data:
- **Event data** (damage type from the event payload)
- **Scene state** (whether a specific component on the target has immunity)
- **Randomness** (a probability roll)

**"Show the dialogue option only if the player is level 10+, has completed the 'Dragon Slayer' quest, AND the NPC's disposition is above 50"**

Again, three sources:
- **Scene state** (player level, from a PlayerStats component)
- **Scene state** (quest completion flag, from a QuestManager)
- **Scene state** (NPC disposition, from an NPCRelationship component)

None of this data comes from the event. It all lives on different objects scattered across the scene.

**"Drop a rare item if the killed enemy is a Boss type AND (the player's luck stat exceeds a random roll between 1-100 OR the difficulty is set to Hard)"**

Now we're mixing:
- **Event data** (enemy type from the kill event)
- **Scene state** (player luck stat)
- **Randomness** (the random roll)
- **Constants** (the Hard difficulty value for comparison)

Four different data sources in one condition. In code, this means your event handler needs to know about the event payload, the player stats system, Unity's random API, and the difficulty settings. Four dependencies for one boolean expression.

### The Coupling Problem

Every data source you access from an event handler is a dependency. Dependencies create coupling. Coupling makes code fragile. This is Computer Science 101, but it's remarkable how quickly we forget it when we're "just adding a quick condition."

```csharp
public void OnEnemyKilled(EnemyDeathInfo info)
{
    // Dependency 1: Event payload
    if (info.enemy.enemyType == EnemyType.Boss)
    {
        // Dependency 2: Player stats (scene reference)
        var luck = playerStatsRef.GetComponent<PlayerStats>().luckModifier;

        // Dependency 3: Random API
        var roll = Random.Range(1, 101);

        // Dependency 4: Game settings (scene reference)
        var difficulty = GameSettings.Instance.currentDifficulty;

        if (luck > roll || difficulty >= Difficulty.Hard)
        {
            DropRareLoot(info.enemy.lootTable);
        }
    }
}
```

This handler now depends on `EnemyDeathInfo`, `PlayerStats`, `UnityEngine.Random`, and `GameSettings`. If any of those APIs change, this code breaks. If you want to test this condition in isolation, you need to mock all four systems. If the designer wants to add a fifth check — "and it's not a tutorial level" — you add a fifth dependency.

And this is **one condition on one event**. Scale this across a whole game.

### The Deep Property Access Problem

There's another layer of complexity that trips people up: most of the data you need isn't on the surface. You don't just need `enemy.health`. You need `enemy.stats.defense.current`. You don't just need `player.inventory`. You need `player.inventory.equippedWeapon.elementType`.

In code, this is straightforward — chain property accesses and move on. But in a visual tool? Most visual scripting systems can't handle nested property navigation. They give you the top-level fields and call it a day. If you need something three levels deep, you're back to writing code.

### The Enum Problem

Game logic is absolutely stuffed with enums. `DamageType`, `ItemRarity`, `EnemyRank`, `QuestState`, `WeatherType`, `ArmorSlot` — enums are how we represent discrete categories, and conditions are constantly checking against them.

In code, enum comparisons are clean:

```csharp
if (info.damageType == DamageType.Fire) { ... }
```

But in visual tools that don't have proper enum support, you end up doing string comparisons:

```
source: "damageType" equals target: "Fire"
```

String matching against enums is fragile, typo-prone, and loses all the benefits of type safety. Rename an enum value and your visual conditions silently break. No compiler warning, no red squiggle — just a condition that never evaluates to `true` and a bug that takes an hour to track down.

## GES's Four Data Source Types

The Visual Condition Tree in GES solves the multi-source problem by giving each comparison node four independent data source types. Each side of a comparison — Source and Target — independently selects where its data comes from. You can mix and match freely: event data on one side, scene state on the other. Random value vs. a constant. Two scene objects compared against each other.

![Condition Tree Overview](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

Let's dig into each one.

### Source Type 1: Event Argument

This is the source type you'll use most. When an event fires, it carries data — the argument. For a `SingleGameEvent`, that's a float. For an `Int32GameEvent`, that's an integer. For custom event types, the argument is whatever struct or class you defined.

The Event Argument source type lets you reach into that payload and pull out any field or property.

Say you have a `DamageInfo` payload:

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

Select Event Argument as your source, and a dropdown shows `damage`, `isCritical`, `damageType`, `attacker`, `target`, `hitPoint`. Pick one, and the comparison node knows to extract that value at runtime.

But here's where it gets powerful — you're not limited to top-level fields.

**Deep property access goes up to 5 levels.** If `DamageInfo` has an `attacker` field of type `GameObject`, you can navigate through:

```
damageInfo → attacker → transform → position → x
```

Four levels deep. That gives you the attacker's X position as a float — configured visually, no code, no helper methods, no intermediate variables.

When the system encounters a `GameObject`, it automatically exposes `transform`, `name`, `tag`, `layer`, and any accessible component. When it encounters a `Component`, it exposes all public fields and properties. You keep drilling until you hit a primitive (`int`, `float`, `string`, `bool`), at which point that's your comparison value.

Five levels is the maximum, but honestly? I've rarely needed more than 3 in production. The headroom is there for edge cases with deeply nested data structures, but if you're regularly hitting level 5, your data model might benefit from some flattening.

For events with simple payloads — `Int32GameEvent`, `SingleGameEvent`, `BoolGameEvent` — there's no property navigation because the argument itself IS the value. A comparison like "is the event's integer argument greater than 100?" is one dropdown selection.

Events can also include a sender reference. When configured, the Event Argument source shows both payload properties and sender properties in separate sections, so you can compare `sender.tag` against a constant or `argument.damage` against `sender.attackPower`.

### Source Type 2: Scene Type

Event Argument covers data flowing through the event. Scene Type covers data that already exists in the scene, independent of any event.

You drag-and-drop a `GameObject` or `Component` reference directly into the Inspector field. Then navigate its properties using the same deep access system — up to 5 levels.

Common patterns:

- **Is the door unlocked?** Drag the door's `LockComponent`, access `isLocked`, compare against `false`.
- **Is the player's HP below half?** Drag the player's `Health` component, access `currentHPPercent`, compare against `0.5`.
- **Is it nighttime?** Drag the `TimeManager`, access `isNightTime`, compare against `true`.
- **Cross-source comparison:** Source is Event Argument (`damageInfo.damage`), Target is Scene Type (`enemyDefense.armorValue`). Two completely different data sources, compared in one node.

That last pattern is the real power move. You're comparing dynamic event data against live scene state without writing a single line of coupling code.

**Bool Method Support**

Scene Type has a trick the other source types don't: it can call zero-parameter methods that return `bool`. If your component has:

```csharp
public class EnemyAI : MonoBehaviour
{
    public bool IsAggressive() => currentState == AIState.Aggressive;
    public bool HasLineOfSight() => Physics.Raycast(/* ... */);
    public bool IsWithinRange() => Vector3.Distance(/* ... */) < attackRange;
}
```

These show up alongside regular properties when you select the `EnemyAI` component. You can call `IsAggressive()` directly from a condition node.

This is intentionally limited to zero-parameter bool methods. The constraint keeps things predictable — you're checking conditions, not building a general-purpose method invocation system. If your method needs parameters, that's a sign the logic should live in code.

**A useful mental model:** Event Argument is for "what happened" (data that varies per event). Scene Type is for "what IS" (the current state of the world). The damage amount varies per hit — Event Argument. Whether the player has a shield buff — Scene Type.

![Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

### Source Type 3: Random

Probability is everywhere in games. Crit chances, loot drop rates, random encounters, dialogue variation, AI decision-making. All of these need some element of randomness in their conditions.

The Random source generates a fresh random value each time the condition tree evaluates. Two modes:

**Range-Based Random**

Specify a min and max. The system generates a value within that range, matching the type you need — float for float ranges, int for int ranges.

![Random Value](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-random-value.png)

The classic use case is a probability check:

- Source: **Random** → range 0.0 to 1.0
- Operator: **&lt;**
- Target: **Constant** → `0.3`

30% chance of passing. Designer changes the constant to tweak the probability. No `Random.value` calls scattered through your codebase.

You can get creative with ranges too. "Only trigger the effect when a random 1-100 roll beats the target's luck stat":

- Source: **Random** → range 1 to 100
- Operator: **>**
- Target: **Scene Type** → `enemy.stats.luck`

Randomness meets live scene data, configured visually.

**List-Based Random**

Instead of a range, provide a list of specific values. The system picks one at random each evaluation.

![Random List](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-random-list.png)

- Source: **Random** → list: ["Fire", "Ice", "Lightning"]
- Operator: **==**
- Target: **Event Argument** → `damageInfo.damageType`

Randomly picks an element type and checks if the incoming damage matches. Useful for "randomly determine which element is vulnerable this round" patterns.

### Source Type 4: Constant

The simplest source type, and the second most used. A Constant is a fixed value you type directly into the Inspector.

![Constant Value](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-constant-value.png)

Constants support `int`, `float`, `double`, `string`, `bool`, and `enum`. The Inspector automatically provides the right input field — number field for numerics, text field for strings, toggle for bools, dropdown for enums.

**Constant Lists**

Constants can also be lists, paired with the `In List` operator:

![Constant List](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-constant-list.png)

- Source: **Event Argument** → `damageInfo.damageType`
- Operator: **In List**
- Target: **Constant List** → [Fire, Lightning, Acid]

"Is the damage type one of these three?" Without `In List`, you'd need three comparison nodes in an OR group. The list version is cleaner, easier to maintain, and scales better when the list grows.

**Enum Dropdown Integration**

When the condition tree detects an enum type, Constants automatically present a dropdown with all defined values. No string matching, no magic numbers:

```csharp
public enum DamageType
{
    Physical, Fire, Ice, Lightning, Acid, Holy
}
```

The dropdown shows all six values. Select one. Type-safe, refactor-friendly, designer-readable. The `In List` operator works with enum dropdowns too — build a list by selecting values from dropdowns.

This is the answer to the enum problem I mentioned earlier. No fragile string comparisons. If someone renames an enum value, the serialized reference updates automatically (or shows as missing, which you can fix in the Inspector instead of hunting through code).

## Deep Property Navigation in Practice

I want to spend some time on deep property access because it's one of those features that seems straightforward but has nuances worth understanding when you're actually building condition trees.

When you select a source (Event Argument or Scene Type) and choose a property, the system checks the property's return type. Primitive types (`int`, `float`, `string`, `bool`) stop navigation — that's your value. Complex types (classes, structs, Unity types) offer another level.

### How Navigation Looks

Starting from a `DamageInfo`:

**Level 0:** `DamageInfo` — shows: `damage`, `isCritical`, `damageType`, `attacker`, `target`, `hitPoint`

**Level 1:** Select `attacker` (GameObject) — shows: `transform`, `name`, `tag`, `layer`, plus accessible components

**Level 2:** Select `transform` (Transform) — shows: `position`, `rotation`, `localPosition`, `localScale`, `parent`, `childCount`, etc.

**Level 3:** Select `position` (Vector3) — shows: `x`, `y`, `z`, `magnitude`, `normalized`, `sqrMagnitude`

**Level 4:** Select `x` (float) — primitive, navigation stops. Final value is a `float`.

Each level is a separate dropdown in the Inspector, so the full path is visible. Want to switch from `position.x` to `position.y`? Change the last dropdown. Want `target.transform.position` instead of `attacker.transform.position`? Change the Level 1 dropdown. You don't rebuild the whole path for small changes.

### Practical Depth Guide

- **1 level** (most common): `damageInfo.damage`, `damageInfo.isCritical`
- **2 levels** (common): `damageInfo.attacker.tag`, `player.health.currentHP`
- **3 levels** (occasional): `damageInfo.attacker.transform.position`
- **4 levels** (rare): `damageInfo.attacker.transform.position.x`
- **5 levels** (very rare): deeply nested custom data structures

If you're consistently hitting 5 levels, consider adding convenience properties:

```csharp
public class DamageInfo
{
    public GameObject attacker;
    // Flatten deep access for common checks
    public float AttackerX => attacker.transform.position.x;
}
```

Now the condition node needs 1 level instead of 4.

## Mixing Source Types: Real-World Patterns

The condition tree's real power shows up when you combine source types in a single tree. Here are patterns I've found useful in production:

### Pattern 1: Event Data vs Scene State

```
AND
├── Event Argument: damageInfo.damage > Scene Type: boss.phase2Threshold
└── Event Argument: damageInfo.isCritical == Constant: true
```

"Trigger phase 2 when a critical hit exceeds the boss's threshold." Different bosses have different thresholds configured on their prefabs. Zero code changes per boss variant.

### Pattern 2: Probability Gated by Live Stats

```
AND
├── Random: 0.0-1.0 < Scene Type: player.stats.critChance
└── Event Argument: attackResult.didHit == Constant: true
```

"If the attack hit, roll against the player's current crit chance." The designer buffs the crit stat on the player object; the condition tree automatically uses the new value.

### Pattern 3: Multi-Source Validation

```
AND
├── Event Argument: itemPickup.itemType In List Constant: [Weapon, Armor, Accessory]
├── Scene Type: player.inventory.slotsFree > Constant: 0
└── Scene Type: gameManager.isInCombat == Constant: false
```

"Only pick up equipment items when the player has inventory space and isn't in combat." Three data sources — event payload, player state, game state — all visual, all designer-configurable.

### Pattern 4: Nested OR with Mixed Sources

```
AND
├── Event Argument: damage > Constant: 20
└── OR
    ├── Scene Type: target.armorComponent.isBroken == Constant: true
    ├── Event Argument: damageType == Constant: Piercing
    └── Random: 0.0-1.0 < Constant: 0.15
```

"Damage above 20, AND either the armor is broken OR it's piercing damage OR a 15% random chance." Event data, scene state, and randomness all in one tree. A designer can read this. A designer can modify this. No programmer needed.

## Performance Note

A reasonable concern: if the condition tree is navigating properties 5 levels deep and accessing scene objects at runtime, isn't that slow?

Short answer: no. The visual tree compiles to a .NET Expression Tree at initialization. After compilation, property accesses are direct compiled calls — no reflection, no `PropertyInfo.GetValue`, no boxing. The visual configuration is the authoring layer; the runtime execution is compiled IL running at native C# speed.

We'll cover exact performance numbers and optimization strategies in detail in the next post.

## Wrapping Up

The multi-source data problem is real. Real game conditions need data from event payloads, scene objects, random generators, and fixed constants — often in the same boolean expression. Traditional code handles this by accumulating dependencies in event handlers until they become fragile, tightly-coupled messes.

The four data source types give the condition tree the flexibility to handle all of this visually:

- **Event Argument** for data flowing through the event
- **Scene Type** for the current state of the world
- **Random** for probability and variation
- **Constant** for fixed thresholds and expected values

Combined with deep property navigation (5 levels), bool method support, and proper enum dropdowns, these sources cover the vast majority of real-world game conditions without writing accessor methods, without creating new dependencies in code, and without asking a designer to wait for a recompile.

Next up: every comparison operator explained, plus type validation and performance optimization strategies.

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
