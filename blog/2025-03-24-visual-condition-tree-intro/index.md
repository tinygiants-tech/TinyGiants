---
slug: visual-condition-tree-intro
title: "Escape if-else Hell: Visual Condition Trees That Designers Can Actually Configure"
authors: [tinygiants]
tags: [ges, unity, condition-tree, visual-workflow, beginner]
description: "Stop scattering conditional logic across dozens of scripts. Build complex boolean conditions visually with AND/OR groups, comparison nodes, and zero code."
image: /img/home-page/game-event-system-preview.png
---

Every game is basically a giant pile of conditions. "Only deal fire damage if the enemy isn't immune." "Only trigger the trap if the player has no shield." "Show the quest marker if the player is level 5+ AND has talked to the NPC." When you're prototyping, you throw an if-statement into a callback and move on. It takes thirty seconds. It works. You feel productive.

Then you ship the prototype into production. And those thirty-second if-statements start breeding. One becomes five. Five becomes fifty. Fifty becomes "where the hell is the condition that controls the loot drop for the second boss?"

Welcome to if-else hell. Population: every Unity project that lasted more than three months.

<!-- truncate -->

## Why if-else Doesn't Scale in Games

Let me paint a picture that's probably uncomfortably familiar. You've got a combat system. Damage events fire when something takes a hit. You want to add a condition: "only play the stagger animation if the damage exceeds 30% of the target's max health." Easy. You open `CombatEventHandler.cs`, add the check:

```csharp
public void OnDamageReceived(DamageInfo info)
{
    float threshold = info.target.GetComponent<Health>().maxHP * 0.3f;
    if (info.damage > threshold)
    {
        PlayStaggerAnimation(info.target);
    }
}
```

Done. Ship it. Move on to the next task.

Two weeks later, the designer stops by. "Can we also check if the target isn't blocking? And if they're not already staggered? Oh, and we want bosses to be immune to stagger entirely."

```csharp
public void OnDamageReceived(DamageInfo info)
{
    float threshold = info.target.GetComponent<Health>().maxHP * 0.3f;
    var combat = info.target.GetComponent<CombatState>();
    var enemyData = info.target.GetComponent<EnemyData>();

    if (info.damage > threshold &&
        !combat.isBlocking &&
        !combat.isStaggered &&
        enemyData.rank != EnemyRank.Boss)
    {
        PlayStaggerAnimation(info.target);
    }
}
```

Three new dependencies. One method that used to need a `DamageInfo` now reaches into `Health`, `CombatState`, and `EnemyData`. If any of those components get refactored, this breaks. If the designer wants to change the 0.3 threshold to 0.25 — guess who gets to open their IDE and recompile?

And this is **one condition** on **one event**. A real game has dozens. A big game has hundreds. Every single one is a tiny bomb waiting for a refactor to set it off.

### The "Just Expose a Bool" Trap

When this problem gets bad enough, teams try to solve it with serialized fields. "Let's just put a threshold float on the component! The designer can change it in the Inspector!"

```csharp
[SerializeField] private float staggerThreshold = 0.3f;
[SerializeField] private bool ignoreBosses = true;
[SerializeField] private bool requireNotBlocking = true;
```

This works for simple cases. But what about conditions with AND/OR logic? What about conditions that need data from the event AND data from a scene object? You'd need to expose a dozen fields and add a bunch of boolean logic to interpret them. You end up building a half-baked condition editor that's specific to one feature, not reusable, and annoying to maintain.

And even then — the designer can change values, but they can't change the *structure* of the condition. They can't say "actually, instead of requiring the target to NOT be blocking, I want an OR: either they're not blocking OR the damage type is 'Piercing'." That structural change always requires a programmer.

### The Iteration Tax

Here's the part that really stings. Your designer says: "Can we change the stagger threshold from 30% to 25%?" That's a number change. One literal in the code. But the workflow is:

1. Designer asks programmer
2. Programmer opens IDE
3. Programmer finds the right file (hopefully they remember which one)
4. Programmer changes the number
5. Wait for recompilation
6. Test
7. Commit and push

For a **number change**. This is a workflow problem, not a coding problem. The logic isn't hard. The plumbing is what kills you.

### What Other Industries Figured Out

This isn't a new problem. Other fields solved it years ago.

Database admins don't write raw SQL for every query — they use visual query builders. Marketing teams don't code their email automation rules — they use drag-and-drop condition builders. Even in game dev, Unreal Engine's Blueprint system lets you build conditional logic visually. Level designers can set up "Branch" nodes that check conditions without writing a line of C++.

Unity doesn't have anything like this built in. You either write C# for every condition, or you build custom editor tools for each feature. Most teams just eat the cost and write the if-statements.

But what if there was a general-purpose visual condition builder that worked with any event, any data type, and could be configured entirely in the editor?

## GES's Visual Condition Tree: Building Boolean Logic Without Code

The Game Event System includes a Visual Condition Tree — a no-code boolean logic builder that lives inside the Behavior Window. Instead of writing if-else chains in C#, you build condition trees visually using AND/OR groups and comparison nodes.

![Condition Tree Overview](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

Here's how it works at a high level: every Event Action in the Behavior Window can have an optional condition tree. When the event fires, the tree evaluates first. If it returns `true`, the action executes. If `false`, it's skipped. The entire condition is configured visually — no code, no recompilation, no asking a programmer to change a number.

Your designer can open the Behavior Window, see the exact conditions gating each event response, and modify them directly. Change a threshold? Click the number and type a new one. Add a new check? Right-click and add a comparison node. Restructure the logic from AND to OR? One click on the group header.

### AND/OR Groups: The Backbone

The condition tree uses two types of group nodes:

- **AND Group**: All children must be `true`. Classic `&&` logic.
- **OR Group**: At least one child must be `true`. Classic `||` logic.

Groups nest inside other groups with unlimited depth. This means you can represent any boolean expression, no matter how gnarly:

```
AND
├── HP < 50%
├── OR
│   ├── isCritical == true
│   └── damageType == "Fire"
└── targetTag == "Enemy"
```

That reads: "HP below 50% AND (critical hit OR fire damage) AND target is an Enemy." Try expressing that cleanly in a single if-statement. Now try explaining it to a designer who doesn't write C#.

With the visual tree, the structure is obvious. The AND/OR hierarchy maps to how humans naturally think about compound conditions — "this AND that" or "this OR that." No parentheses to track, no operator precedence to remember, no nesting mistakes.

![Condition Tree Example](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-example.png)

### Comparison Nodes: Source, Operator, Target

Each leaf node in the tree is a comparison that follows a simple three-part structure:

**Source** → **Operator** → **Target**

- **Source**: Where the left-hand value comes from
- **Operator**: How to compare (equals, greater than, contains, etc.)
- **Target**: Where the right-hand value comes from

Both sides independently support four data source types, so you're not limited to "compare event data against a constant." You can compare two scene objects against each other, compare a random value against an event argument — whatever the game needs.

The available operators depend on the types being compared. Numeric types get `==`, `!=`, `>`, `<`, `>=`, `<=`. Strings get `==`, `!=`, `StartsWith`, `EndsWith`, `Contains`. Enums get `==`, `!=`, and `In List`. The system automatically determines which operators are valid based on your types, so you can't accidentally create a "greater than" comparison on a string.

### The Four Source Types at a Glance

Every comparison node pulls values from one of four source types:

![Condition Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

**1. Event Argument** — Data from the event's payload. For an `Int32GameEvent`, that's the integer value itself. For a `SingleGameEvent`, it's the float. For custom types, you can drill into nested properties up to 5 levels deep. This is the source type you'll use most often.

**2. Scene Type** — References to objects or components already in your scene. Drag a GameObject or Component into the field, then navigate its public properties. Perfect for "check the player's health" or "is the door unlocked" conditions that don't depend on event data.

**3. Random** — Generated random values, either from a range (like 0.0 to 1.0 for probability checks) or picked from a predefined list. "30% chance to trigger" becomes a comparison node with Random as the source and a Constant as the target. No `Random.value` calls in code.

**4. Constant** — Fixed values typed directly into the Inspector. Thresholds, expected values, enum selections. Constants also support lists for "is this value one of these options" checks using the `In List` operator.

### Expression Tree Compilation: Zero Runtime Overhead

Here's what makes this practical for real games rather than just a cool editor toy. The visual condition tree doesn't interpret the tree at runtime. At initialization, the entire tree compiles down to a .NET Expression Tree, which becomes a native delegate — essentially the same compiled code you'd get from writing the if-statement by hand.

No reflection during gameplay. No dictionary lookups. No interpretation overhead. The one-time compilation cost is typically under 2ms, and subsequent evaluations run at approximately 0.001ms — effectively the same speed as hand-written C#.

### Collapsed vs Expanded: Managing Complex Trees

Real-world condition trees can get complex. The Behavior Window supports two view modes to keep things manageable:

**Expanded View** shows every node with full configuration details — source types, operators, values, the complete nested group structure. Use this when building or debugging.

**Collapsed View** compresses each comparison into a single-line summary. A tree with six conditions becomes six clean lines instead of a wall of dropdowns. You can collapse individual groups independently, keeping top-level logic visible while hiding already-verified sub-groups.

### Drag Reorder, Enable/Disable, Reset

The condition tree isn't a static config panel. It's a proper editing tool:

**Drag-and-Drop Reordering**: Reorder nodes within groups. This matters because AND/OR groups use short-circuit evaluation — put cheap checks first so expensive ones get skipped when possible.

**Enable/Disable Individual Nodes**: Toggle any node on or off. Disabled nodes are skipped during evaluation. This is incredibly useful for testing — disable one condition to see how the event behaves without it. No code changes, no commenting out lines, no risk of forgetting to uncomment.

**Reset**: Return any node to defaults when you've been experimenting and want a clean slate.

### Quick Example: The Designer's Original Request

Let's set up "trigger the fire effect on a critical hit when the player's HP is below 50%."

**Step 1:** Open the Behavior Window for your damage event. Enable the condition tree on the fire effect's Event Action.

**Step 2:** The root is an AND group by default. We need both conditions true — AND is correct.

**Step 3:** First comparison node:
- Source: **Event Argument** → `isCritical` from the `DamageInfo` payload
- Operator: **==**
- Target: **Constant** → `true`

**Step 4:** Second comparison node:
- Source: **Scene Type** → drag the player's `Health` component → select `currentHPPercent`
- Operator: **&lt;**
- Target: **Constant** → `0.5`

Done. The designer can now see both conditions in the Behavior Window. They can change 0.5 to 0.4 without touching code. They can add an OR group for "or if the enemy is undead type" by right-clicking and adding nodes:

```
AND
├── Scene Type: player.health.currentHPPercent < Constant: 0.5
└── OR
    ├── Event Argument: damageInfo.isCritical == Constant: true
    └── Event Argument: damageInfo.target.tag == Constant: "Undead"
```

No code. No compilation. No waiting for a programmer.

![Conditional Event Demo](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

## Before and After: Real Patterns

Let me show a few more transformations from scattered code to visual conditions.

### Loot Drop Condition

**Before:**

```csharp
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

**After:**

```
AND
├── Event Argument: enemy.enemyType In List Constant: [Boss, Elite]
└── OR
    ├── Scene Type: playerStats.luckModifier > Constant: 0.5
    └── Scene Type: gameManager.currentDifficulty >= Constant: Hard
```

Same logic. But the designer can add "MiniBoss" to the enemy type list or tweak the luck threshold without asking anyone.

### Tutorial Gate

**Before:**

```csharp
public void OnPlayerAction(PlayerActionInfo action)
{
    if (!tutorialComplete && currentStep == TutorialStep.Movement &&
        action.actionType == ActionType.Move && action.duration > 1.0f)
    {
        AdvanceTutorial();
    }
}
```

**After:**

```
AND
├── Scene Type: tutorialManager.tutorialComplete == Constant: false
├── Scene Type: tutorialManager.currentStep == Constant: Movement
├── Event Argument: action.actionType == Constant: Move
└── Event Argument: action.duration > Constant: 1.0
```

Four clean, readable checks. A designer can disable the duration check for faster testing, or change the required step — no code.

### Achievement Trigger

**Before:**

```csharp
public void OnScoreChanged(int newScore)
{
    if (newScore >= 10000 && !AchievementManager.HasAchievement("score_master"))
    {
        if (GameTimer.ElapsedTime < 300f)
        {
            UnlockAchievement("speed_scorer");
        }
        UnlockAchievement("score_master");
    }
}
```

**After (two Event Actions, each with its own condition tree):**

Score Master:
```
AND
├── Event Argument: newScore >= Constant: 10000
└── Scene Type: achievementManager.HasAchievement("score_master") == Constant: false
```

Speed Scorer:
```
AND
├── Event Argument: newScore >= Constant: 10000
├── Scene Type: achievementManager.HasAchievement("speed_scorer") == Constant: false
└── Scene Type: gameTimer.elapsedTime < Constant: 300
```

Each achievement is independently configurable. The designer adjusts thresholds directly.

## When Visual Trees Make Sense (and When They Don't)

I don't want to oversell this. Condition trees are not a replacement for all conditional logic. They're specifically designed for event-level gating — "should this Event Action run when this event fires?"

**Use the visual condition tree when:**
- The condition gates an Event Action's execution
- Designers need to see or modify the conditions
- The logic is comparisons and boolean operators (not algorithms)
- You want fast iteration without recompilation

**Use code when:**
- The logic involves complex calculations (pathfinding, physics queries, multi-step algorithms)
- The condition depends on state accumulated over time
- It's purely a programmer concern that designers never touch
- You need maximum performance control on a hot path

In my experience, roughly 70-80% of event conditions in a typical game are the "visual tree" kind — threshold checks, type comparisons, state flags, probability rolls. The remaining 20-30% are genuinely complex logic that belongs in code. The condition tree handles the common cases so your programmers can focus on the interesting ones.

## What's Next

This post covered the concept and practical usage of the visual condition tree. In upcoming posts, we'll go deeper into:

- **Data Sources**: How each of the four source types works in detail — deep property access, bool methods, enum handling
- **Operators and Optimization**: Every comparison operator, the type validation system, and how to squeeze maximum performance out of condition evaluation

If you've been drowning in scattered if-else conditions across your event handlers, give the condition tree a try. The demo scene `06-Conditional-Event` has a complete working example. Your designers will thank you. Your future self maintaining the project will thank you even more.

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
