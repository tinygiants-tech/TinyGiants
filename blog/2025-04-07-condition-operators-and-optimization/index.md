---
slug: condition-operators-and-optimization
title: "10+ Operators Explained: Condition Tree Type Validation and Performance Tips"
authors: [tinygiants]
tags: [ges, unity, condition-tree, performance, advanced]
description: "A complete guide to all comparison operators in the visual condition tree, plus type validation, auto-conversion, and performance optimization strategies."
image: /img/home-page/game-event-system-preview.png
---

You're building a condition tree, everything looks great, and then — one of your comparison nodes turns red. The tooltip says "type mismatch." You stare at it for a moment. The source is a `float` and the target is an `int`. Should that work? Why is it complaining? And more importantly, how do you fix it without restructuring your entire condition?

If you've hit this, don't worry — it means the type validation system is doing its job. It's catching a potential problem at configuration time instead of letting it silently fail at runtime. But understanding why it happens and how the type system works will save you a lot of head-scratching.

This post is a complete reference for every comparison operator in the condition tree, plus the type validation system, auto-conversion behavior, and practical performance optimization strategies.

<!-- truncate -->

## Numeric Operators: The Big Six

For numeric types (`int`, `float`, `double`, `long`, `byte`, `short`, and their unsigned variants), the condition tree supports six comparison operators:

| Operator | Symbol | Description |
|----------|--------|-------------|
| Equal | `==` | Values are exactly equal |
| Not Equal | `!=` | Values are not equal |
| Greater Than | `>` | Left value is greater than right |
| Less Than | `<` | Left value is less than right |
| Greater Or Equal | `>=` | Left value is greater than or equal to right |
| Less Or Equal | `<=` | Left value is less than or equal to right |

These work exactly as you'd expect from C#. But there's an important nuance: **auto-conversion between compatible numeric types.**

### Numeric Auto-Conversion

The condition tree is smarter than a strict type checker. When you compare an `int` source against a `float` target (or vice versa), the system automatically handles the conversion. It follows C#'s implicit conversion rules:

- `int` can compare against `float`, `double`, `long`
- `float` can compare against `double`
- `byte` and `short` can compare against any larger numeric type

This means you won't get a type mismatch error when comparing `player.level` (an `int`) against a constant `10.5f` (a `float`). The system widens the `int` to `float` for the comparison, just like C# would.

Where you WILL get a mismatch is when comparing truly incompatible types — a numeric against a string, for instance, or a Vector3 against a float. Those can't be auto-converted, and the node will turn red to tell you.

### Float Equality: A Word of Caution

Using `==` and `!=` with floating-point numbers deserves a mention. In pure math, `0.1 + 0.2 == 0.3` is true. In floating-point arithmetic, it's often false due to precision errors. The condition tree uses standard C# equality for these comparisons, which means exact floating-point comparison.

For most game scenarios, this is fine — you're comparing against thresholds (`health < 0.5f`) rather than exact values. But if you find yourself needing `==` with floats, consider whether `<=` or `>=` with a small epsilon would be more appropriate. Or better yet, multiply by 100 and work with integers.

## String Operators: Five Flavors

For `string` types, the condition tree provides five operators:

| Operator | Description | Example |
|----------|-------------|---------|
| Equal | `==` | Exact string match |
| Not Equal | `!=` | Strings differ |
| StartsWith | | String begins with the target |
| EndsWith | | String ends with the target |
| Contains | | String includes the target as a substring |

All string comparisons are case-sensitive by default. This is intentional — in game development, tag names, layer names, and identifiers are case-sensitive, and accidentally matching "Player" with "player" would cause subtle bugs.

### Practical String Patterns

**Tag checking:**
- Source: Event Argument → `collision.gameObject.tag`
- Operator: `==`
- Target: Constant → `"Enemy"`

**Prefix-based filtering:**
- Source: Event Argument → `item.itemID`
- Operator: `StartsWith`
- Target: Constant → `"weapon_"`

This matches any item ID starting with "weapon_" — useful for item category checks when you use naming conventions in your IDs.

**Search/filter:**
- Source: Scene Type → `questManager.activeQuestName`
- Operator: `Contains`
- Target: Constant → `"dragon"`

Matches any active quest with "dragon" in its name. Handy for triggering dragon-themed ambient effects.

## The Collection Operator: In List

The `In List` operator checks whether the source value exists within a list of target values. It works with all supported types: numerics, strings, and enums.

```
Source: Event Argument → damageInfo.damageType
Operator: In List
Target: Constant List → ["Fire", "Lightning", "Acid"]
```

This is equivalent to writing:

```csharp
if (damageInfo.damageType == "Fire" ||
    damageInfo.damageType == "Lightning" ||
    damageInfo.damageType == "Acid")
```

But it's cleaner, more maintainable, and your designer can add or remove entries from the list without code changes. I use `In List` constantly — it's one of those operators that, once you have it, you wonder how you ever lived without it.

The list target can come from either a Constant List or a Random List (which randomly selects one item from the list for comparison — a different semantic from In List, but useful in its own way).

## Enum Support: Type-Safe Dropdowns

Enums get special treatment in the condition tree, and for good reason — they're everywhere in game code. Damage types, item categories, AI states, game phases, input actions... enums are the backbone of game state representation.

When the condition tree detects that a property is an enum type, two things happen:

1. **Constant values become dropdowns.** Instead of typing a string or number, you select the enum value from a dropdown list that shows all defined values. No typos, no magic numbers.

2. **Available operators are filtered.** Enums support `==`, `!=`, and `In List`. You can't do `>` or `<` on an enum (even though they have underlying integer values) because ordinal comparison on enums is almost always a logic error.

```csharp
public enum GamePhase
{
    MainMenu,
    Loading,
    Gameplay,
    Paused,
    GameOver
}
```

In the condition tree:
- Source: Scene Type → `gameManager.currentPhase`
- Operator: `In List`
- Target: Constant List → dropdown selection: [Gameplay, Paused]

This checks "is the game currently in Gameplay or Paused phase?" Clean, readable, and impossible to misspell.

![Condition Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

## The Type Validation System

Now let's talk about that red node. The condition tree has a built-in type validation system that checks every comparison node for type compatibility at configuration time. This is one of those features that saves you from runtime surprises.

### How Validation Works

When you configure a comparison node, the system:

1. Resolves the source value's type (following deep property access)
2. Resolves the target value's type
3. Checks whether the selected operator is valid for those types
4. Checks whether the types are compatible with each other

If any check fails, the node displays a red warning with a description of the problem.

### Common Validation Errors

**"Type mismatch: cannot compare String to Int32"**
You're trying to use a numeric operator on a string, or vice versa. Check that both sides resolve to compatible types.

**"Operator not available for type Boolean"**
Bools only support `==` and `!=`. If you selected `>` or `Contains`, switch to an appropriate operator.

**"Source type could not be resolved"**
The deep property path is broken — usually because you selected a property that no longer exists (maybe the class was refactored). Re-navigate the property path.

**"Scene reference is null"**
You're using a Scene Type source but haven't assigned the GameObject/Component reference. Drag an object into the field.

### Validation at Edit Time vs Runtime

The visual validation in the Inspector catches configuration errors. But there's also runtime validation — when the condition tree compiles to an Expression Tree at initialization, it performs a final type check. If something slipped through (rare, but possible with dynamic types or reflection edge cases), you'll get a clear error in the console at initialization rather than a cryptic null reference during gameplay.

![Condition Tree Example](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-example.png)

## Performance: Expression Tree Compilation

This is the section performance-conscious developers have been waiting for. Let's talk numbers.

### How It Works Under the Hood

When a condition tree is first evaluated (typically during scene initialization or when the Event Action is first enabled), the visual tree structure is compiled into a .NET Expression Tree. This is the same technology that LINQ providers and ORMs use — it's a well-established, highly optimized compilation pathway.

The compilation process:

1. Walk the visual tree structure (AND/OR groups, comparison nodes)
2. Generate Expression Tree nodes for each comparison
3. Combine them with AndAlso/OrElse expressions (which give you short-circuit evaluation for free)
4. Compile the Expression Tree into a delegate
5. Cache the delegate for all future evaluations

### The Numbers

**Compilation time (one-time cost):** Varies with tree complexity, but typically 0.1–2ms for a moderately complex tree (5-10 comparison nodes). This happens once, at initialization.

**Evaluation time (per-event):** Approximately **0.001ms** (1 microsecond) for a typical tree. This is essentially the same as hand-written C# code, because after compilation, that's effectively what it is — a compiled delegate that directly accesses fields and properties without reflection.

For context, Unity's `Update()` call overhead is roughly 0.001ms per MonoBehaviour. So evaluating a condition tree is approximately the same cost as Unity calling an empty Update method. In other words: negligible.

![Runtime Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

### No Reflection at Runtime

This is worth emphasizing: **the condition tree does not use reflection at runtime.** The visual configuration in the Inspector uses reflection during the editor phase to discover types, properties, and methods. But once the Expression Tree is compiled, all property accesses are direct, compiled calls. There's no `GetComponent` happening per evaluation. There's no `PropertyInfo.GetValue` being called. It's compiled IL code running at native C# speed.

## Optimization Strategies

Even though individual evaluations are fast, there are patterns that can make your condition trees even more efficient, especially when you have many of them evaluating on high-frequency events.

### Strategy 1: Put Cheap Checks First (Short-Circuit Evaluation)

AND/OR groups use short-circuit evaluation, just like C#'s `&&` and `||` operators:

- **AND groups** stop evaluating as soon as any child returns `false`
- **OR groups** stop evaluating as soon as any child returns `true`

This means the order of children within a group matters. Put the cheapest (and most likely to short-circuit) conditions first.

```
AND
├── Constant comparison (essentially free)    ← First: instant
├── Event Argument field access (very cheap)  ← Second: one field read
└── Scene Type method call (more expensive)   ← Last: might involve computation
```

If the constant comparison fails, the method call never executes. This is the same optimization you'd do in code with `if (cheapCheck && expensiveCheck)`, but here you do it by drag-and-drop reordering.

### Strategy 2: Minimize Deep Property Access Depth

Each level of deep property access adds a small amount of overhead (one additional property getter call). Going 5 levels deep means 5 chained property accesses. For most cases this is trivial, but if you have a condition tree on a per-frame event with 20 nodes each going 5 levels deep, you might want to flatten some paths.

Consider adding convenience properties to your data classes:

```csharp
public class DamageInfo
{
    public GameObject attacker;

    // Direct access saves 3 levels of navigation
    public float AttackerX => attacker.transform.position.x;
}
```

Now the condition node only needs 1 level (`damageInfo.AttackerX`) instead of 4 (`damageInfo.attacker.transform.position.x`).

### Strategy 3: Use Bool Methods for Complex Checks

If a condition involves multiple steps of logic that don't map cleanly to comparison nodes, wrap them in a bool method on a Scene Type component:

```csharp
public class CombatValidator : MonoBehaviour
{
    public bool IsValidDamageTarget()
    {
        return !isDead && !isInvulnerable && !isPhasing && gameObject.activeInHierarchy;
    }
}
```

One bool method call in a condition node replaces four separate comparison nodes. It evaluates faster (one method call vs four comparisons) and it's easier to read in the condition tree.

### Strategy 4: Condition Trees on High-Frequency Events

For events that fire very frequently (every frame or multiple times per frame), keep condition trees simple. A tree with 2-3 nodes evaluating at 60 FPS adds about 0.06ms per frame — imperceptible. A tree with 30 nodes evaluating at 60 FPS adds about 0.03ms per frame — still fine, honestly. But if you have 100 Event Actions each with 30-node condition trees on a per-frame event... consider whether some of that logic should be in code.

The general guideline: for events that fire less than once per frame (game events, state changes, user actions), condition tree complexity doesn't matter. For per-frame events, keep trees under 10-15 nodes.

## When to Use Bool Methods vs Visual Tree Nodes

This question comes up a lot, so here's a clear framework:

**Use visual tree nodes when:**
- The condition is a simple comparison (value vs threshold)
- A designer might need to tweak the values
- The condition is part of a larger AND/OR structure
- You want visibility into what's being checked

**Use Bool methods when:**
- The check involves complex calculations (distances, raycasts, multi-step logic)
- The logic is purely technical and designers don't need to understand it
- You want to encapsulate multiple checks into one semantic unit
- Performance matters and you want maximum control

**Mix them in the same tree:**
```
AND
├── Scene Type: combatValidator.IsValidTarget() == Constant: true  ← Bool method
├── Event Argument: damageInfo.damage > Constant: 10              ← Visual comparison
└── Random: 0.0-1.0 < Scene Type: player.stats.critChance         ← Mixed sources
```

This gives you the best of both worlds: complex technical checks are encapsulated in methods, simple tweakable values are visual comparisons, and the overall structure is visible in the Inspector.

## Complete Operator Reference Table

Here's every operator, the types it works with, and what it does:

| Operator | Types | Behavior |
|----------|-------|----------|
| `==` | All | Equality check. Numeric types auto-convert. |
| `!=` | All | Inequality check. |
| `>` | Numeric | Greater than. Auto-converts between numeric types. |
| `<` | Numeric | Less than. |
| `>=` | Numeric | Greater than or equal. |
| `<=` | Numeric | Less than or equal. |
| `StartsWith` | String | True if source string begins with target. Case-sensitive. |
| `EndsWith` | String | True if source string ends with target. Case-sensitive. |
| `Contains` | String | True if source string includes target as substring. Case-sensitive. |
| `In List` | All | True if source value exists in target list. Works with numerics, strings, and enums. |

## Putting It All Together

Let me walk through a real-world condition tree that uses multiple operator types, source types, and optimization strategies:

**Scenario:** A special loot drop should occur when:
- The killed enemy is a boss OR elite type
- The player's luck stat contributes to a probability check
- The current game difficulty is not "Easy"

```
AND
├── Event Argument: enemy.enemyRank In List Constant: [Boss, Elite]      ← Enum In List
├── Random: 0-100 < Scene Type: player.stats.luckModifiedDropChance      ← Random vs Scene Type
└── Scene Type: gameSettings.difficulty != Constant: Easy                 ← Enum != with Scene Type
```

Optimization applied: the `In List` check is first because it's the most likely to fail (most enemies aren't bosses or elites), short-circuiting the random roll and settings check.

This tree is readable by a designer, configurable without code, and evaluates in about 0.001ms. That's the condition tree doing what it was built to do.

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
