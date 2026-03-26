---
slug: visual-condition-tree-intro
title: "Escape if-else Hell: Visual Condition Trees That Designers Can Actually Configure"
authors: [tinygiants]
tags: [ges, unity, condition-tree, visual-workflow, beginner]
description: "Stop scattering conditional logic across dozens of scripts. Build complex boolean conditions visually with AND/OR groups, comparison nodes, and zero code."
image: /img/home-page/game-event-system-preview.png
---

Your designer walks over to your desk. "Hey, can we make it so the fire effect only triggers on a critical hit when the player's HP is below 50%?" Simple enough request, right? You nod, open your IDE, and start digging. First you find the damage event handler — that's in `CombatManager.cs`. Then you realize the crit flag lives on `AttackResult`, but the HP check needs a reference to the player's `HealthComponent`, which isn't available in that context. So you add a dependency, wire up a new field, write the if-statement, test it, and push. Three files changed, one new dependency introduced, and 45 minutes gone — for what amounts to a two-line boolean expression.

Now imagine your designer wants to tweak that threshold to 40%. Or add a "and the enemy must be an undead type" clause. Every single change goes through you. Every. Single. One.

This is if-else hell, and if you've shipped more than one Unity project, you've lived in it. The logic itself is trivial — it's the plumbing that kills you.

<!-- truncate -->

## The Real Problem with Conditional Event Logic

Let's be honest about what's actually going on when you scatter conditional logic across your codebase. It's not that if-statements are hard to write. It's that they're hard to find, hard to modify safely, and completely invisible to anyone who isn't a programmer.

Here's a typical pattern I see in almost every Unity project:

```csharp
// In CombatEventHandler.cs
public void OnDamageDealt(DamageInfo info)
{
    if (info.isCritical && info.target.GetComponent<Health>().currentHP < info.target.GetComponent<Health>().maxHP * 0.5f)
    {
        // Trigger the fire effect
        fireEffectEvent.Raise(info);
    }
}
```

Looks innocent enough. But let's count the problems:

1. **The condition is buried in code.** Your designer can't see it, can't understand it, and definitely can't change it without your help.
2. **It's coupled to specific types.** If `DamageInfo` changes its structure, this breaks. If `Health` renames `currentHP` to `hitPoints`, this breaks.
3. **There's no reuse.** When the quest system also needs "HP below 50%" as a condition, you write it again. And again. And again.
4. **Testing is painful.** You can't test the condition in isolation — you have to trigger the entire damage pipeline just to verify one boolean check.
5. **It doesn't scale.** When you have 30 events with different conditions, you have 30 different code locations to maintain. Miss one during a refactor and you get silent bugs.

I've seen production projects with hundreds of these scattered conditional checks. The team knew they were fragile. They just didn't have a better option. Until now.

## Introducing the Visual Condition Tree

The Game Event System's Visual Condition Tree is exactly what it sounds like: a tree-structured, Inspector-configurable boolean expression builder. Instead of writing `if (a && (b || c))` in code, you build it visually in the Inspector using AND/OR group nodes and comparison leaf nodes.

![Condition Tree Overview](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

Here's the core idea: every event listener in GES can have an optional condition tree attached to it. When the event fires, the condition tree evaluates first. If it returns `true`, the listener executes. If it returns `false`, the listener is skipped. No code needed for the condition itself — it's all configured in the Inspector.

This means your designer can open the Inspector, look at the condition tree, understand exactly what conditions gate this event, and modify them directly. No IDE. No pull request. No waiting for a programmer.

## AND/OR Groups: Boolean Logic Made Visual

The backbone of the condition tree is the group node. There are two types:

- **AND Group**: All child conditions must be `true` for the group to evaluate `true`. This is your classic `&&` operator.
- **OR Group**: At least one child condition must be `true`. This is your `||` operator.

The beautiful part? Groups can be nested inside other groups with unlimited depth. This means you can represent any boolean expression, no matter how complex:

```
AND
├── HP < 50%
├── OR
│   ├── isCritical == true
│   └── damageType == "Fire"
└── targetTag == "Enemy"
```

That tree reads as: "HP is below 50% AND (it's a critical hit OR the damage type is Fire) AND the target is tagged as Enemy." Try expressing that clearly in a single if-statement buried in a script somewhere. Now try explaining it to a designer who doesn't read C#.

With the visual tree, the logic structure is immediately apparent. The AND/OR hierarchy maps directly to how humans think about compound conditions — "this AND that" or "this OR that." No parentheses to keep track of, no operator precedence to remember.

![Condition Tree Example](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-example.png)

## Comparison Nodes: Source, Operator, Target

Each leaf node in the condition tree is a comparison node. It follows a simple three-part structure:

**Source** → **Operator** → **Target**

- **Source**: Where the left-hand value comes from (more on this in a moment)
- **Operator**: How to compare the two values (equals, greater than, contains, etc.)
- **Target**: Where the right-hand value comes from

Both the Source and Target sides support the same four data source types. This means you're not limited to "compare event data against a constant." You can compare two event arguments against each other, compare a scene object's property against a random value, or any other combination you need.

The operators available depend on the types being compared. Numeric types get `==`, `!=`, `>`, `<`, `>=`, `<=`. Strings get `==`, `!=`, `StartsWith`, `EndsWith`, `Contains`. Enums get `==`, `!=`, and `In List`. The system automatically determines which operators are valid based on the types you've selected, so you can't accidentally create a "greater than" comparison on a string.

## The Four Source Types

Every comparison node needs to pull its values from somewhere. The condition tree supports four source types, which cover pretty much every scenario I've encountered in real projects:

![Condition Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

### 1. Event Argument

This is the most common source type. It lets you access data from the event's payload — the argument that was passed when the event was raised. For a `GameEvent<DamageInfo>`, you can drill into `DamageInfo` to access `damage`, `isCritical`, `damageType`, `attacker`, and any other field or property.

The system supports deep property access up to 5 levels, so you can navigate through nested structures like `damageInfo.attacker.stats.critMultiplier` without writing a single line of code.

### 2. Scene Type

Need to check something about a specific object in the scene? Scene Type lets you drag-and-drop a GameObject or Component reference directly into the condition node. You can then access any public property or field on that object, including properties on its components.

This is incredibly useful for conditions like "only trigger if the door is unlocked" — you drag the door's `LockComponent` into the node and access its `isLocked` property.

### 3. Random

Sometimes you need probability-based conditions. The Random source type generates random values, either from a defined range (e.g., random float between 0 and 1) or by picking from a list of predefined values. This is perfect for "30% chance to trigger" type conditions without writing `Random.value < 0.3f` in code.

### 4. Constant

The simplest source type — a fixed value that you type directly into the Inspector. Use this for thresholds, expected values, or any hardcoded comparison target. Constants also support lists, which pairs with the `In List` operator for "is this value one of these options" checks.

## Quick Example: Configuring a Damage Condition

Let's walk through setting up that original request — "trigger the fire effect on a critical hit when the player's HP is below 50%" — using the visual condition tree.

**Step 1:** On your event listener component, enable the condition tree. This adds a foldout section in the Inspector.

**Step 2:** The root is an AND group by default. We need both conditions to be true, so AND is correct.

**Step 3:** Add the first comparison node:
- Source: **Event Argument** → select `isCritical` from the `DamageInfo` payload
- Operator: **==**
- Target: **Constant** → `true`

**Step 4:** Add the second comparison node:
- Source: **Scene Type** → drag the player's `Health` component → select `currentHPPercent`
- Operator: **&lt;**
- Target: **Constant** → `0.5`

That's it. Two comparison nodes inside an AND group. Your designer can see exactly what conditions are required, and they can tweak the threshold from 0.5 to 0.4 without touching code. They can even disable individual conditions temporarily for testing by toggling them off.

Here's what it would look like if you also wanted to add the "OR undead enemy" variant:

**Step 5:** Change the root to AND, and wrap the crit check and an undead check in an OR group:

```
AND
├── Scene Type: player.health.currentHPPercent < Constant: 0.5
└── OR
    ├── Event Argument: damageInfo.isCritical == Constant: true
    └── Event Argument: damageInfo.target.tag == Constant: "Undead"
```

No code. No compilation. Immediate iteration.

![Conditional Event Demo](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

## Collapsed vs Expanded View

When your condition trees get complex — and in real projects, they will — readability becomes critical. The condition tree Inspector supports two view modes:

**Expanded View** shows every node with all its configuration details visible. This is what you use when building or debugging a tree. You can see the source types, operators, target values, and the full nested group structure.

**Collapsed View** compresses each comparison node into a single-line summary. An AND group with three children might collapse to:

```
AND: [HP < 0.5] [isCritical == true] [tag == "Undead"]
```

This is perfect for quickly scanning what a condition does without being overwhelmed by configuration details. You can toggle between views with a single click, and you can collapse individual groups independently — so you might keep the top-level AND expanded while collapsing a deeply nested OR group you've already verified.

In practice, I find myself using expanded view when configuring and collapsed view when reviewing. It's a small feature, but it makes a huge difference when you're managing dozens of conditioned events across a project.

## Drag-and-Drop, Enable/Disable, and Reset

The condition tree isn't just a static configuration panel — it's a proper editing tool with workflow features that make iterating fast:

**Drag-and-Drop Reordering**: You can reorder nodes within a group by dragging them. This matters because AND/OR groups evaluate children in order, and the system uses short-circuit evaluation. If you have an expensive check (like a Scene Type property access that calls a method) and a cheap check (like a constant comparison), put the cheap one first. In an AND group, if the first child fails, the rest are skipped.

**Enable/Disable Individual Nodes**: Every node — both groups and comparison nodes — has a toggle to enable or disable it. A disabled node is skipped during evaluation. This is incredibly useful for testing: disable one condition to see how the event behaves without it, then re-enable it. No code changes, no commenting out lines, no risk of forgetting to uncomment.

**Reset**: Each node has a reset option that returns it to its default state. This is useful when you've been experimenting and want a clean slate without deleting and recreating the node.

**Add/Remove**: Standard add and remove controls let you build up your tree incrementally. You can add comparison nodes or nested groups to any existing group.

## When to Use Condition Trees vs Code

I want to be clear: condition trees don't replace all conditional logic in your game. They're designed specifically for event-level gating — "should this listener respond to this event?" For complex game logic that involves state machines, multi-step calculations, or algorithmic decisions, code is still the right tool.

Here's my rule of thumb:

**Use the visual condition tree when:**
- The condition gates an event listener's execution
- Designers need to see or tweak the conditions
- The condition combines simple comparisons (field checks, threshold comparisons, type checks)
- You want to iterate quickly without recompilation

**Use code when:**
- The logic involves complex calculations or algorithms
- The condition depends on state that accumulates over time
- Performance is critical and you need hand-optimized evaluation paths
- The logic is programmer-only and will never be modified by designers

In my experience, about 70-80% of event conditions in a typical game fall into the "visual tree" category. The remaining 20-30% are genuinely complex logic that belongs in code. The condition tree handles the common cases so your programmers can focus on the interesting ones.

## Real-World Examples: Before and After

Let me show a few more examples that illustrate the transformation from scattered code to visual conditions.

### Example 1: Loot Drop Condition

**Before (code):**

```csharp
// In LootDropHandler.cs
public void OnEnemyKilled(EnemyDeathInfo info)
{
    if (info.enemy.enemyType == EnemyType.Boss ||
        info.enemy.enemyType == EnemyType.Elite)
    {
        if (info.killer.GetComponent<PlayerStats>().luckModifier > 0.5f ||
            GameManager.Instance.currentDifficulty >= Difficulty.Hard)
        {
            DropRareLoot(info.enemy.lootTable);
        }
    }
}
```

**After (condition tree):**

```
AND
├── Event Argument: enemy.enemyType In List Constant: [Boss, Elite]
└── OR
    ├── Scene Type: playerStats.luckModifier > Constant: 0.5
    └── Scene Type: gameManager.currentDifficulty >= Constant: Hard
```

The logic is identical, but the visual version can be read and modified by anyone. The designer can add "MiniBoss" to the enemy type list or change the luck threshold without asking a programmer.

### Example 2: Tutorial Gate

**Before (code):**

```csharp
// In TutorialManager.cs
public void OnPlayerAction(PlayerActionInfo action)
{
    if (!tutorialComplete && currentStep == TutorialStep.Movement &&
        action.actionType == ActionType.Move && action.duration > 1.0f)
    {
        AdvanceTutorial();
    }
}
```

**After (condition tree):**

```
AND
├── Scene Type: tutorialManager.tutorialComplete == Constant: false
├── Scene Type: tutorialManager.currentStep == Constant: Movement
├── Event Argument: action.actionType == Constant: Move
└── Event Argument: action.duration > Constant: 1.0
```

Four clean, readable conditions. A designer can see at a glance what's required to advance the tutorial. They can disable the duration check to test the flow faster, or change the required step without code changes.

### Example 3: Achievement Trigger

**Before (code):**

```csharp
// In AchievementChecker.cs
public void OnScoreChanged(int newScore)
{
    if (newScore >= 10000 && !AchievementManager.HasAchievement("score_master"))
    {
        if (GameTimer.ElapsedTime < 300f) // Under 5 minutes
        {
            UnlockAchievement("speed_scorer");
        }
        UnlockAchievement("score_master");
    }
}
```

**After (two condition trees on two listeners):**

Score Master listener:
```
AND
├── Event Argument: newScore >= Constant: 10000
└── Scene Type: achievementManager.HasAchievement("score_master") == Constant: false
```

Speed Scorer listener:
```
AND
├── Event Argument: newScore >= Constant: 10000
├── Scene Type: achievementManager.HasAchievement("speed_scorer") == Constant: false
└── Scene Type: gameTimer.elapsedTime < Constant: 300
```

Two separate listeners, each with its own clear condition tree. The achievements are independently configurable, and a game designer can adjust thresholds (10000 points, 300 seconds) directly.

## Performance Under the Hood

You might wonder: doesn't all this visual configuration add overhead compared to a plain if-statement? The short answer is no — the condition tree compiles down to essentially the same thing.

At initialization time, the visual tree is compiled into a .NET Expression Tree, which is then compiled into a delegate. This is the same compilation pipeline that LINQ and ORM libraries use. The result is a native method call that directly accesses fields and properties — no reflection, no interpretation, no dictionary lookups. The compiled delegate runs at the same speed as hand-written C# code.

The one-time compilation cost is minimal (typically under 2ms for a moderately complex tree), and it happens during initialization, not during gameplay. Subsequent evaluations cost approximately 0.001ms — effectively free.

## What's Next

This post covered the concept and basic usage of the visual condition tree. In upcoming posts, we'll go deeper:

- **Data Sources Deep Dive**: How each of the four source types works in detail, including deep property access and bool method support
- **Operators and Performance**: Every available operator, type validation, and how to optimize condition tree evaluation

If you've been drowning in if-else conditions scattered across your event handlers, give the condition tree a try. Your designers will thank you. Your future self maintaining the project will thank you even more.

---

## Ready to Try It?

The Visual Condition Tree is included in the Game Event System plugin. Install it, add a condition tree to any event listener, and start building conditions visually. The demo scene `06-Conditional-Event` walks through a complete working example.

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
