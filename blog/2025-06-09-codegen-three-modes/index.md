---
slug: codegen-three-modes
title: "The Boilerplate Tax: Why Unity's Serialization System Forces You to Write Duplicate Code (And How to Stop)"
authors: [tinygiants]
tags: [ges, unity, codegen, tools, serialization]
description: "Unity can't serialize open generics. That means a concrete class for every event type. That means boilerplate hell. Here's what GES does about it."
image: /img/home-page/game-event-system-preview.png
---

Let me tell you about the most boring afternoon of my Unity career.

I had 15 custom data types in my RPG project. Structs for damage info, inventory slots, quest progress, weapon stats, dialogue choices — you know, the stuff every game needs. And I needed events for all of them. ScriptableObject-based events, the kind you wire up in the Inspector and drag-drop between systems.

So I sat down and wrote 45 nearly identical C# files. Fifteen event classes. Fifteen UnityEvent wrappers. Fifteen binding fields. Each one was three lines of actual code wrapped in the same boilerplate: namespace declaration, using statements, `[CreateAssetMenu]` attribute, class definition inheriting from a generic base. Copy, paste, change the type name, repeat. For three hours.

Then I made a typo in one of them. `GameEventWeponInfo` instead of `GameEventWeaponInfo`. It took me 20 minutes to find because the compiler error pointed to a completely different file that referenced the misspelled class. Good times.

<!-- truncate -->

## The Root Cause: Unity Can't Serialize Open Generics

Here's the fundamental problem. Unity's serialization system — the engine that powers the Inspector, ScriptableObjects, prefabs, and every asset reference in your project — cannot handle open generic types. Period.

You can't do this:

```csharp
// This DOES NOT work in Unity's Inspector
[SerializeField] private GameEvent<float> onHealthChanged;
```

Unity sees `GameEvent&lt;T&gt;` and goes "I don't know what T is, I can't serialize this, I'm not drawing an Inspector field for it." It doesn't matter that you specified `float` right there. The serializer needs a concrete, closed type at compile time.

The workaround is to create a concrete class:

```csharp
// This works. Unity can serialize this.
public class SingleGameEvent : GameEvent<float> { }
```

That's the entire class. No methods, no overrides, no logic. It exists solely to satisfy Unity's serializer. The real functionality lives in the `GameEvent&lt;T&gt;` base class. Your concrete class is just a type tag.

And you need one of these for EVERY type you want to use as an event argument.

## The Math Gets Ugly Fast

Let's count the boilerplate for a typical mid-sized project.

For each custom type, you need:
1. **The event class** — `GameEventDamageInfo : GameEvent&lt;DamageInfo&gt;`
2. **The behavior binding** — so the visual wiring system can serialize it in the Inspector

That's 2 files per type. For a project with 15 custom types, that's 30 boilerplate files. Files where the only difference is the type name.

But wait, it gets worse. Some events need a sender — you want to know WHO raised the event, not just what data it carries. `GameEvent&lt;TSender, TArgs&gt;` needs its own concrete class. If even 5 of your 15 types need sender variants, you're up to 40 files.

Now multiply by the maintenance burden. You rename `DamageInfo` to `CombatDamageInfo` because your naming convention evolved. You need to update every generated class, every reference, every `CreateAssetMenu` attribute. Miss one and you get a cryptic serialization error that takes 20 minutes to debug.

## The Community's Workarounds (And Why They're Fragile)

Unity developers are resourceful. We've been dealing with this for years, and we've cobbled together various solutions:

**T4 Templates:** Text Template Transformation Toolkit. You write a template with placeholder tokens, and a pre-processor generates the C# files. It works, but T4 support in Unity is spotty. Some IDEs handle it, others don't. The templates themselves are hard to debug — when something goes wrong, the error messages point to generated code, not the template.

**Code Snippets:** Your IDE can expand `gevt` + Tab into a full event class scaffold. Faster than typing manually, but you still have one file per type, and snippets can't enforce naming conventions or validate that the target type actually exists and is serializable.

**Custom Editor Scripts:** You write an Editor window that takes a type name and generates the file. This is actually pretty close to the right answer — but now you're maintaining a code generator alongside your actual code. When the base class signature changes, you update the generator, then regenerate everything, then hope nothing broke.

**Copy-Paste:** The most common approach. We all know it. We all hate it. We all do it anyway because it's "just three files" and we'll "clean it up later."

## What Other Languages Do

This problem isn't unique to Unity, but most modern languages have solved it:

**Rust** has derive macros. `#[derive(Serialize)]` and the compiler generates the serialization code at compile time. No boilerplate files, no manual maintenance.

**Go** has code generation as a first-class concept. `go generate` runs custom generators that produce type-safe code. The generated files are checked into version control and regenerated when needed.

**C# itself** has source generators — Roslyn analyzers that emit code at compile time. They're powerful and elegant. But Unity's support for source generators is still limited and quirky, especially with Assembly Definitions and the various compilation passes Unity uses.

The fundamental question is this: **if the boilerplate is 100% predictable — if you can describe exactly what needs to be generated from just the type name — why is a human writing it?**

## What Code Generation Should Look Like

A good code generator for this problem should:

1. **Handle the common cases automatically** — primitives, Unity types, stuff every project uses
2. **Handle custom types on demand** — you define a struct, you get event support for it
3. **Handle sender variants** — dual-generic types without doubling the manual work
4. **Integrate with the creation workflow** — don't make me go to a separate tool just to generate boilerplate
5. **Stay out of the way** — generated code lives in its own directory, doesn't conflict with updates, doesn't require manual maintenance

GES's code generation does all of this through three modes.

## Mode 1: Basic Types — 32 Pre-Generated, Ready to Go

Out of the box, GES ships with 32 pre-generated event types covering the types you'll use in almost every project:

| Category | Types |
|----------|-------|
| C# Primitives | `int`, `float`, `double`, `bool`, `string`, `long`, `byte`, `char` |
| Unity Structs | `Vector2`, `Vector3`, `Vector4`, `Quaternion`, `Color`, `Color32` |
| Unity Structs | `Rect`, `Bounds`, `Vector2Int`, `Vector3Int`, `RectInt`, `BoundsInt` |
| Unity Objects | `GameObject`, `Transform`, `Object`, `Component`, `Sprite`, `Texture2D` |
| Unity Objects | `AudioClip`, `Material`, `AnimationClip`, `ScriptableObject` |
| Collections | `List&lt;int&gt;`, `List&lt;string&gt;`, `int[]`, `string[]` |

These live in `Assets/TinyGiants/TinyGiantsData/GameEventSystem/CodeGen/Basic/` and they cover 70-80% of what a typical project needs. You never touch them. You never think about them. They just work.

```csharp
// All of these work immediately after importing GES
[GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;
[GameEventDropdown, SerializeField] private Vector3GameEvent onPositionUpdated;
[GameEventDropdown, SerializeField] private BooleanGameEvent onPauseToggled;
[GameEventDropdown, SerializeField] private StringGameEvent onPlayerNameChanged;

private void UpdateScore(int newScore)
{
    onScoreChanged.Raise(newScore);
}
```

The `[GameEventDropdown]` attribute is GES-specific — it turns the Inspector field into a searchable dropdown that lists all compatible events from your active databases. No manual asset dragging, no "which event was it again?" Just type a few letters and pick from the filtered list.

The Basic types are immutable — GES regenerates them during package updates. Don't modify them. If you need a custom variant of a basic type, use Mode 2.

## Mode 2: Custom Single Parameter — Your Types, Auto-Generated

This is where the magic happens for your project-specific types.

Let's say you have this struct in your RPG:

```csharp
namespace RPG.Combat
{
    [System.Serializable]
    public struct DamageInfo
    {
        public int amount;
        public DamageType type;
        public float knockbackForce;
        public Vector3 hitPoint;
    }
}
```

You need a `DamageInfoGameEvent` so your combat system can broadcast damage. In the old world, you'd create the file manually. In GES, the **Creator Window** handles it.

### The Primary Path: Creator Window

The normal workflow is dead simple:

1. Open the **Editor Window** (`Tools > TinyGiants > Game Event System > Editor Window`)
2. Click **"+ New Event"**
3. The **Creator Window** opens — pick your type, name the event, configure settings
4. Click Create

That's it. The Creator auto-generates the concrete class code as part of the event creation process. You didn't open a separate tool. You didn't think about code generation. You just created an event and the boilerplate handled itself.

After Unity compiles the new scripts (2-5 seconds), your type is ready:

```csharp
[GameEventDropdown, SerializeField] private DamageInfoGameEvent onDamageDealt;

public void DealDamage(DamageInfo info)
{
    onDamageDealt.Raise(info);
}
```

### The Maintenance Path: CodeGen Tool

Sometimes you need to regenerate code outside of the Creator workflow. Maybe you modified a custom type's struct layout, or you need to manually add a type that wasn't created through the Creator, or you're resolving merge conflicts after a VCS merge.

For these cases, there's a dedicated Code Generation tool in the System Dashboard:

![CodeGen Single](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

Enter the type name, add any necessary `using` statements, and hit Generate. It's a maintenance tool — you won't use it often, but when you need it, it's there.

The generated file lands in `Assets/TinyGiants/TinyGiantsData/GameEventSystem/CodeGen/Custom/`, separate from the immutable Basic types. Your custom types survive package updates.

### The Serializable Requirement

One thing to remember: your custom type must be serializable by Unity for the Inspector to display it. That means:

- **Structs:** Need `[System.Serializable]`
- **Classes:** Need `[System.Serializable]` and a parameterless constructor
- **Enums:** Serializable by default — just generate and go
- **MonoBehaviours/ScriptableObjects:** Already serializable, use the reference directly

If your type isn't serializable, the event still works in code (`Raise()` and listeners function fine), but the Inspector won't display the argument field on behavior components.

## Mode 3: Sender Events — When "What" Isn't Enough

Sometimes you need to know WHO raised an event, not just what data it carries.

Player takes damage. You need to know the damage amount (the data) AND which enemy dealt it (the sender). That's `GameEvent&lt;Enemy, DamageInfo&gt;` — a dual-generic type that needs its own concrete class.

![CodeGen Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_sender.png)

Sender events can be created through the Creator Window (select sender mode, configure both type parameters) or through the CodeGen tool for maintenance scenarios.

After generation, the usage is natural:

```csharp
[GameEventDropdown, SerializeField] private EnemyDamageInfoGameEvent onEnemyDealtDamage;

// Raising (the enemy passes itself as sender):
public void AttackPlayer(DamageInfo info)
{
    onEnemyDealtDamage.Raise(this, info);
}

// Listening (you get both sender and data):
private void HandleEnemyDamage(Enemy sender, DamageInfo args)
{
    Debug.Log($"{sender.name} dealt {args.amount} {args.type} damage");

    if (sender.IsBoss)
        ApplyScreenShake(args.knockbackForce * 2f);
    else
        ApplyScreenShake(args.knockbackForce);
}
```

Without code generation, sender events DOUBLE the boilerplate problem. Two generic parameters means more permutations, more files, more opportunities for copy-paste errors. With code generation, it's the same one-click process.

### When to Use Sender vs. Single Parameter

**Single parameter** when the source doesn't matter: UI events, system notifications, singleton manager broadcasts, state changes.

**Sender** when listeners need context about who raised it: damage attribution (which enemy?), interaction source (which NPC?), kill tracking (who killed whom?), any pattern where multiple objects can raise the same event and listeners differentiate by source.

## What Actually Gets Generated

For transparency, here's what the code generator produces. For a single-parameter type like `WeaponInfo`:

- `WeaponInfoGameEvent` — the ScriptableObject event asset class
- `WeaponInfoGameEventBehavior` — the behavior component partial class for visual receiver wiring

For a sender type like `GameEvent&lt;Player, DamageInfo&gt;`:

- `PlayerDamageInfoGameEvent` — the ScriptableObject event asset class
- `PlayerDamageInfoGameEventBehavior` — the behavior component partial class

Each file follows consistent naming conventions, includes the correct `using` statements, namespace declarations, and `CreateAssetMenu` attributes. It's exactly the code you'd write by hand — just without the hand-writing.

## Batch Operations and the Queue

When you're regenerating types after a major refactor or manually adding multiple types through the CodeGen tool, the batch queue lets you queue everything up and generate in one pass.

![Hub Code Tools](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

Why batch? Because each individual generation triggers a Unity recompilation. If you generate 10 types one at a time, that's 10 recompiles — each taking 3-10 seconds depending on your project size. Batch them into one queue and you get one recompile. On a large project, that's the difference between 90 seconds and 10 seconds.

Add types to the queue, review them, click "Generate All." One compilation cycle, all types ready.

## Code Cleanup: Killing Dead Types

Projects evolve. Types get renamed, removed, or replaced. The generated classes for those old types stick around in the `Custom/` directory like digital barnacles, cluttering your project.

The Code Cleanup tool scans your generated types and identifies which ones are no longer referenced anywhere.

### Single Type Cleanup

![Cleaner Single](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_single.png)

Open the cleanup tool, and it lists all generated types with usage indicators. Types with zero references are highlighted as removal candidates. Select the dead ones, click Clean, and they're gone.

### Sender Type Cleanup

![Cleaner Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_sender.png)

Same workflow for sender types. The tool handles single-parameter and sender types separately because they have different file structures.

**A warning:** cleaning a type deletes its `.cs` files. Any event assets of that type become "missing script" references. Make sure you've already removed or replaced those assets before cleaning.

## The Complete Workflow: Two Minutes, Not Two Hours

Here's the end-to-end experience for adding a new event type:

**1. Define your data type** (you're doing this anyway):

```csharp
namespace MyGame.Inventory
{
    [System.Serializable]
    public struct ItemPickupInfo
    {
        public string itemId;
        public int quantity;
        public ItemRarity rarity;
        public Vector3 pickupPosition;
    }
}
```

**2. Create the event via the Creator Window:**

Open the Editor Window, click "+ New Event," configure the type, click Create. The Creator auto-generates the concrete class.

**3. Wait for compilation** (2-5 seconds).

**4. Use it:**

```csharp
[GameEventDropdown, SerializeField] private ItemPickupInfoGameEvent onItemPickedUp;

public void PickupItem(Item item, int quantity)
{
    var info = new ItemPickupInfo
    {
        itemId = item.id,
        quantity = quantity,
        rarity = item.rarity,
        pickupPosition = transform.position
    };

    onItemPickedUp.Raise(info);
}
```

**5. Wire up listeners** — either in code or visually via the Behavior Window.

Total time: about two minutes, most of which is waiting for Unity to compile. Compare that to the three hours I spent writing 45 files by hand. Compare it to the 20 minutes debugging a typo in a copy-pasted class name.

The boilerplate tax is real. Every Unity developer who's built a typed event system has paid it. The question is whether you keep paying it manually or let a tool handle the predictable, mechanical, error-prone part so you can focus on the part that actually requires a human brain — designing the events that make your game work.

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
