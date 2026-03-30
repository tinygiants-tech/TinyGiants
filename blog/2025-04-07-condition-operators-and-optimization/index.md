---
slug: condition-operators-and-optimization
title: "10+ Operators Explained: Condition Tree Type Validation and Performance Tips"
authors: [tinygiants]
tags: [ges, unity, condition-tree, performance, advanced]
description: "A complete guide to all comparison operators in the visual condition tree, plus type validation, auto-conversion, and performance optimization strategies."
image: /img/home-page/game-event-system-preview.png
---

Visual logic builders are one of those ideas that sound great until you accidentally compare a string to an integer. Or check whether a float "contains" a substring. Or set up a condition that works perfectly when you configure it, then silently returns `false` for three weeks because the data types don't actually match and nothing told you.

If you've used visual scripting tools in Unity — whether it's the built-in Visual Scripting, third-party node graphs, or custom inspector tools — you've probably run into this. The tool gives you flexibility to wire anything to anything, and that flexibility becomes a footgun the moment you connect incompatible types. The condition "works" in the editor. It just doesn't work at runtime. And there's no error, no warning, no red underline. Just a boolean that's always `false` and a bug report that says "the ability stopped triggering and we don't know why."

This is the type safety problem in visual logic, and it's arguably worse than the same problem in code. At least in C# the compiler yells at you.

<!-- truncate -->

## Why Type Safety Matters More in Visual Tools Than in Code

In code, you have a safety net. The C# compiler catches type mismatches at compile time. Try to compare a `string` to an `int` and you get a red squiggle before you even save the file. Try to call `Contains()` on a `float` and the IDE tells you that method doesn't exist. The compiler is your first line of defense, and it catches an enormous category of bugs before they ever reach runtime.

Visual tools don't have a compiler. Or rather, most of them don't. You drag a connection, set a value, pick an operator, and the tool says "sure, looks good." It doesn't check whether the types on both sides of your comparison are compatible. It doesn't verify that the operator you chose makes sense for those types. It just trusts you.

This trust is misplaced.

### The Operator Diversity Problem

Different data types need fundamentally different operations. Think about it:

**Numeric types** (int, float, double) need six comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`. These are your bread and butter for threshold checks — "is damage above 50?", "is health below 25%?", "has the timer exceeded 300 seconds?"

**Strings** need a completely different set: `==`, `!=`, `StartsWith`, `EndsWith`, `Contains`. You're pattern matching, not doing arithmetic comparisons. "Does the item ID start with 'weapon_'?", "Does the quest name contain 'dragon'?"

**Enums** need equality checks and membership tests: `==`, `!=`, `In List`. You're checking categories — "is the damage type Fire?", "is the enemy rank one of Boss, Elite, or MiniBoss?"

**Booleans** really only need `==` and `!=`. Anything else is nonsensical.

A visual tool that shows you all operators for all types is inviting you to create invalid comparisons. "Greater than" on a string? What does that even mean? "Contains" on an integer? The tool lets you set it up. It just won't do what you expect at runtime.

And here's the real killer: these bugs are the hardest kind to find. The condition evaluates. It returns a result. It just returns the *wrong* result. There's no exception, no error log, no crash. The event action simply doesn't fire, and you spend an hour checking your event wiring, your listeners, your action configuration — everything *except* the type mismatch in a comparison node that looked fine when you set it up.

### The Performance Elephant in the Room

There's another problem with most visual condition systems: they use reflection at runtime.

The visual tool needs to access properties on arbitrary types. At edit time, it uses reflection to discover what fields and properties are available — that's fine, the editor isn't performance-sensitive. But many visual tools continue using reflection at runtime too. Every time the condition evaluates, it's calling `PropertyInfo.GetValue()` or `FieldInfo.GetValue()` to read the data, then boxing value types, then doing a loosely-typed comparison.

Reflection is slow. Not "your game will freeze" slow, but "death by a thousand cuts" slow. One reflection call costs roughly 5-10x more than a direct property access. If you have 20 condition nodes evaluating on a frequent event, and each node does 2-3 reflection calls... it adds up.

The worst part? You won't notice it in a simple test scene. You'll notice it when your game has 200 active event listeners, each with condition trees, running on a mid-range mobile device. That's when the frame budget gets tight and every microsecond matters.

### What You Actually Need

A proper visual condition system needs three things:

1. **Edit-time type validation**: When you configure a comparison, the tool should immediately tell you if the types are incompatible. Before you leave the Inspector. Before you hit Play. Red outline, warning message, "hey, you're comparing a string to a float and that's not going to work."

2. **Type-appropriate operators**: The tool should only show operators that make sense for the selected types. If the source is a string, don't show `>` and `<`. If the source is a bool, don't show `Contains`. Eliminate the category of "valid-looking but semantically wrong" configurations.

3. **Zero-reflection runtime**: The visual configuration should compile down to native code. No reflection calls during gameplay. No boxing. No string-based property lookups. The visual tree is the authoring layer; the runtime should be compiled IL that runs at the same speed as hand-written C#.

## GES's Operator System: Right Operators for the Right Types

The Visual Condition Tree in GES organizes its operators by type, showing only what's valid for the types you've selected. Here's the complete breakdown.

### Numeric Operators (6)

For `int`, `float`, `double`, `long`, `byte`, `short`, and their unsigned variants:

| Operator | Symbol | Description |
|----------|--------|-------------|
| Equal | `==` | Values are exactly equal |
| Not Equal | `!=` | Values are not equal |
| Greater Than | `>` | Left value exceeds right |
| Less Than | `<` | Left value is below right |
| Greater Or Equal | `>=` | Left value is at least right |
| Less Or Equal | `<=` | Left value is at most right |

These are the workhorses. Threshold checks, range validation, stat comparisons — 90% of game conditions use numeric operators.

**Numeric Auto-Conversion**: The system automatically handles compatible numeric type mismatches following C#'s implicit conversion rules. Comparing an `int` source against a `float` target? The `int` widens to `float`, just like C# does implicitly. Comparing `byte` against `double`? Widened automatically. You won't get a type mismatch for cross-numeric comparisons — only for genuinely incompatible types like numeric vs. string.

**Float equality caveat**: `==` and `!=` on floats use standard C# equality, which means floating-point precision issues apply. `0.1 + 0.2 == 0.3` can be `false` due to IEEE 754 rounding. For game conditions this usually doesn't matter — you're comparing against thresholds (`health < 0.5f`), not checking exact values. But if you need exact float equality, consider multiplying by a factor and working with integers, or use `<=`/`>=` with a small buffer.

### String Operators (5)

For `string` types:

| Operator | Description | Example Use |
|----------|-------------|-------------|
| Equal (`==`) | Exact match | Tag checking: `tag == "Enemy"` |
| Not Equal (`!=`) | Strings differ | Exclusion: `name != "Tutorial"` |
| StartsWith | Begins with target | Category: `itemID StartsWith "weapon_"` |
| EndsWith | Ends with target | File type: `path EndsWith ".json"` |
| Contains | Includes target as substring | Search: `questName Contains "dragon"` |

All string comparisons are case-sensitive. This is intentional — in Unity, tag names, layer names, and identifiers are case-sensitive. Accidentally matching "Player" with "player" would create subtle bugs that are hard to track down.

### Enum Operators (3)

For any `enum` type:

| Operator | Description |
|----------|-------------|
| Equal (`==`) | Exact enum value match |
| Not Equal (`!=`) | Different enum value |
| In List | Value exists in a set of enum values |

Enums get special treatment. When the system detects an enum type, Constant values become dropdown selectors showing all defined values — no typing, no typos, no magic numbers. And the operator list is filtered to only `==`, `!=`, and `In List`. You can't do `>` on an enum even though enums have underlying integer values, because ordinal comparison on enums is almost always a logic error.

`In List` with enums is particularly powerful. Instead of writing three comparison nodes in an OR group to check "is enemy type Boss OR Elite OR MiniBoss", you write one node:

```
Event Argument: enemy.rank In List Constant: [Boss, Elite, MiniBoss]
```

Each value in the list is selected from a dropdown. Clean, readable, and the designer can add or remove entries without structural changes to the tree.

### The Collection Operator: In List

`In List` deserves its own section because it works across all types, not just enums. It checks whether the source value exists within a target list.

Works with numerics (is this damage value one of [10, 25, 50, 100]?), strings (is this tag one of ["Enemy", "Obstacle", "Hazard"]?), and enums. The target list can be a Constant List (fixed values) or a Random List (picks one value randomly — a different semantic, but occasionally useful).

![Condition Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

## Real-Time Type Validation: Catching Mistakes at Configuration Time

This is where GES's condition tree distinguishes itself from "just wire anything to anything" visual tools. Every comparison node is validated in real-time as you configure it.

### How Validation Works

When you set up a comparison node, the system:

1. Resolves the source value's type by following the complete property path
2. Resolves the target value's type the same way
3. Checks whether the selected operator is valid for those types
4. Checks whether the types on both sides are compatible with each other

If any check fails, the node immediately shows a red outline and a warning message describing the problem.

### What Validation Catches

**Type mismatches**: "Cannot compare String to Int32." You're trying to check a string against a number. Either the property path is wrong, or you need to change the comparison.

**Invalid operators**: "Operator not available for type Boolean." You selected `>` on a bool. Switch to `==` or `!=`.

**Broken property paths**: "Source type could not be resolved." The deep property path points to something that no longer exists — probably a renamed field after a refactor. Re-navigate the path in the dropdowns.

**Missing references**: "Scene reference is null." You're using Scene Type but haven't dragged a GameObject or Component into the field.

The key insight: all of this happens in the editor, while you're configuring the tree. Not at runtime. Not during a playtest. Not in a QA report three weeks later. You see the red outline immediately, fix it, and move on.

### Edit-Time vs Runtime Validation

The Inspector validation catches configuration errors. But there's a second layer: when the condition tree compiles to an Expression Tree at initialization, it performs a final type check. If something slipped through (rare, but possible with edge cases involving dynamic types), you get a clear console error at scene load — not a cryptic null reference during gameplay.

Two layers of validation. One in the editor, one at initialization. Runtime bugs from type mismatches are effectively eliminated.

![Condition Tree Example](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-example.png)

## Expression Tree Compilation: Visual Logic at Native Speed

Now let's talk performance. This is the section for developers who hear "visual condition builder" and immediately think "so, reflection every frame?"

No. Not even close.

### How Compilation Works

When a condition tree is first evaluated — typically during scene initialization or when the Event Action is first enabled — the visual tree structure is compiled into a .NET Expression Tree. This is the same technology that LINQ providers and Entity Framework use internally. It's a mature, heavily optimized compilation pipeline.

The process:

1. Walk the visual tree structure (AND/OR groups, comparison nodes)
2. Generate Expression Tree nodes for each comparison
3. Combine them with `AndAlso`/`OrElse` expressions (which provide short-circuit evaluation automatically)
4. Compile the Expression Tree into a delegate
5. Cache the delegate for all future evaluations

After step 5, the visual tree is irrelevant to runtime performance. Every subsequent evaluation calls the cached delegate — compiled IL that directly accesses fields and properties. No reflection. No `PropertyInfo.GetValue()`. No boxing of value types. No dictionary lookups. Just native property access at the same speed as code you'd write by hand.

### The Numbers

**Compilation (one-time cost):** 0.1-2ms for a typical tree with 5-10 comparison nodes. Happens once at initialization — invisible to the player.

**Evaluation (per-event):** Approximately **0.001ms** (1 microsecond) for a typical tree. For perspective, Unity's own `Update()` call overhead is roughly 0.001ms per MonoBehaviour. Evaluating a condition tree costs about the same as Unity calling an empty `Update` method.

Even complex trees with 20+ nodes and deep property access stay well under 0.01ms per evaluation. At 60 FPS, that's 0.6ms per second — a rounding error in your frame budget.

![Performance Monitor](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

### What "No Reflection at Runtime" Actually Means

Let me be specific about this because it matters.

**At edit time (Inspector configuration):** Yes, reflection is used. The system discovers types, fields, properties, and methods to populate the dropdowns. This is fine — the editor isn't performance-sensitive.

**At initialization (first evaluation):** The Expression Tree compiler generates IL code. This involves one-time reflection to build the expression. Cost: a few milliseconds.

**At runtime (every subsequent evaluation):** Zero reflection. The compiled delegate is a standard .NET method that reads fields and calls properties through direct access. It's the same IL the C# compiler would generate for equivalent hand-written code.

This is the fundamental difference between "visual tool that interprets at runtime" and "visual tool that compiles to native code." GES does the latter.

## Optimization Strategies

Even though individual evaluations are fast, there are patterns that make condition trees even more efficient — especially valuable when you have many trees evaluating on high-frequency events.

### Strategy 1: Cheap Checks First (Short-Circuit Evaluation)

AND/OR groups use short-circuit evaluation, just like C#'s `&&` and `||`:

- **AND groups** stop evaluating as soon as any child returns `false`
- **OR groups** stop evaluating as soon as any child returns `true`

Node order within a group matters. Put the cheapest and most likely-to-short-circuit conditions first.

```
AND
├── Constant comparison (essentially free)      ← First: instant
├── Event Argument field access (very cheap)    ← Second: one field read
└── Scene Type method call (more expensive)     ← Last: might involve computation
```

If the constant comparison fails, the method call never executes. This is the same optimization you'd do in code with `if (cheapCheck && expensiveCheck)`, but here you do it by drag-and-drop reordering in the Inspector.

For OR groups, it's the inverse: put the condition most likely to be `true` first. If a 90% probability check passes, the remaining nodes are skipped.

### Strategy 2: Minimize Deep Property Depth on Hot Paths

Each level of deep property access adds one compiled property getter call. Going 5 levels deep means 5 chained calls. For most conditions this is trivial, but on a per-frame event with 30 nodes each going 4-5 levels deep, those calls add up.

If a deep path shows up frequently in your condition trees, consider flattening it:

```csharp
public class DamageInfo
{
    public GameObject attacker;

    // Flatten 4-level access to 1 level
    public float AttackerX => attacker.transform.position.x;
    public string AttackerTag => attacker.tag;
}
```

Now condition nodes need 1 level instead of 4. Less work per evaluation, and the condition tree is easier to read too.

### Strategy 3: Bool Methods for Complex Checks

When a condition involves multi-step logic that doesn't map cleanly to comparison nodes, wrap it in a bool method:

```csharp
public class CombatValidator : MonoBehaviour
{
    public bool IsValidDamageTarget()
    {
        return !isDead && !isInvulnerable && !isPhasing
               && gameObject.activeInHierarchy;
    }
}
```

One bool method call in a condition node replaces four separate comparison nodes. It evaluates faster (one call vs. four comparisons) and it's more readable in the tree. The trade-off: the internal logic isn't visible to designers. Use bool methods for technical checks that designers don't need to tweak, and visual nodes for values they do.

**Mix them in the same tree:**

```
AND
├── Scene Type: combatValidator.IsValidTarget() == Constant: true   ← Technical check
├── Event Argument: damageInfo.damage > Constant: 10                ← Designer-tweakable
└── Random: 0.0-1.0 < Scene Type: player.stats.critChance           ← Mixed sources
```

Best of both worlds.

### Strategy 4: Know Your Event Frequency

For events that fire less than once per frame — game events, state changes, player actions, UI triggers — condition tree complexity doesn't matter. A 20-node tree evaluating on a "player died" event is free in practice because the event fires once.

For per-frame events (if you're using them), keep trees simple. A 3-node tree at 60 FPS adds about 0.06ms per second. Even a 15-node tree adds about 0.015ms per frame. Still negligible on most platforms, but if you have 100 listeners each with 15-node trees on a per-frame event, you're looking at 1.5ms per frame — which starts to matter on mobile.

General rule: for occasional events, build whatever tree you need. For per-frame events, keep it under 10-15 nodes and put cheap checks first.

### Strategy 5: Use In List Instead of OR Groups

This is a micro-optimization, but it matters for readability too.

**Slower and harder to read:**
```
OR
├── Event Argument: enemy.rank == Constant: Boss
├── Event Argument: enemy.rank == Constant: Elite
└── Event Argument: enemy.rank == Constant: MiniBoss
```

**Faster and cleaner:**
```
Event Argument: enemy.rank In List Constant: [Boss, Elite, MiniBoss]
```

One node instead of three. One evaluation instead of up to three. And adding a fourth value means adding to the list, not restructuring the tree.

## When to Use Visual Nodes vs Bool Methods vs Code

This decision comes up constantly in practice, so here's a framework:

**Use visual comparison nodes when:**
- The condition is a simple comparison (value vs. threshold, type check, flag check)
- A designer might need to see or change the values
- The condition is part of a larger AND/OR structure
- You want the check to be visible and discoverable in the Behavior Window

**Use bool methods (via Scene Type) when:**
- The check involves calculations (distances, raycasts, multi-step logic)
- The logic is purely technical — designers don't need to understand the internals
- You want to encapsulate multiple checks into one semantic unit
- You need maximum control over the implementation

**Use code (skip the condition tree entirely) when:**
- The condition involves complex algorithms or state machines
- Performance is critical on an extremely hot path
- The logic accumulates state over multiple frames
- The condition is programmer-only and will never be modified by non-programmers

In practice, most game conditions fall into the first two categories. The condition tree handles the visual comparisons, bool methods handle the complex-but-encapsulated checks, and together they cover 80%+ of real-world conditions without touching the event handler code.

## Complete Operator Reference

For quick reference, here's every operator, the types it supports, and its behavior:

| Operator | Types | Behavior |
|----------|-------|----------|
| `==` | All | Equality. Numeric types auto-convert. |
| `!=` | All | Inequality. |
| `>` | Numeric | Greater than. Auto-converts between numeric types. |
| `<` | Numeric | Less than. |
| `>=` | Numeric | Greater than or equal. |
| `<=` | Numeric | Less than or equal. |
| `StartsWith` | String | Source begins with target. Case-sensitive. |
| `EndsWith` | String | Source ends with target. Case-sensitive. |
| `Contains` | String | Source includes target as substring. Case-sensitive. |
| `In List` | All | Source exists in target list. Works with numerics, strings, enums. |

## Putting It Together

Here's a real-world condition tree that uses multiple operator types, source types, and optimization strategies:

**Scenario:** Special loot drops when a boss or elite enemy is killed, gated by the player's luck stat and difficulty setting.

```
AND
├── Event Argument: enemy.enemyRank In List Constant: [Boss, Elite]       ← Enum In List (cheapest, most likely to fail — first)
├── Random: 0-100 < Scene Type: player.stats.luckModifiedDropChance       ← Random vs Scene Type
└── Scene Type: gameSettings.difficulty != Constant: Easy                  ← Enum != with Scene Type
```

The `In List` check is first because most enemies aren't bosses or elites — it short-circuits the random roll and settings check for the common case. The tree is readable by a designer ("drop loot for bosses/elites, gated by luck and not on easy mode"), configurable without code, and evaluates in about 0.001ms.

That's type safety, appropriate operators, edit-time validation, and compiled performance — all working together so your visual conditions are as reliable and fast as hand-written C#, but editable by anyone on the team.

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
