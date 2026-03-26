---
slug: codegen-three-modes
title: "Code Generation Three Ways: Basic, Custom, and Sender — Eliminate All Boilerplate"
authors: [tinygiants]
tags: [ges, unity, codegen, tools, tutorial]
description: "Every time you add a new data type, you need concrete event classes for Inspector serialization. GES generates them automatically in three modes."
image: /img/home-page/game-event-system-preview.png
---

You just created a `WeaponInfo` struct. It holds damage, fire rate, ammo type, and a reference to the weapon prefab. Now you need a `GameEvent<WeaponInfo>` so the inventory system can broadcast weapon changes. But Unity's serialization system can't serialize an open generic — you need a concrete class like `GameEventWeaponInfo : GameEvent<WeaponInfo>`. And while you're at it, you probably need `GameEventListenerWeaponInfo` too, and maybe the sender variant.

That's 2-4 boilerplate files for one data type. Multiply by every custom type in your project. Now multiply by the maintenance burden when you rename a field or change a namespace. It adds up fast, and it's exactly the kind of tedious, error-prone work that should be automated.

GES automates it completely. Three code generation modes, a batch queue, and a cleanup tool. You tell it your type, it writes the classes, Unity compiles them, and you're done.

<!-- truncate -->

## Why Unity Needs Concrete Classes

Before we dive into the tool, let's understand the problem it solves. This context matters because it explains design decisions that might otherwise seem arbitrary.

Unity's serialization system — the one that powers the Inspector, ScriptableObjects, prefabs, and asset references — cannot serialize open generic types. `GameEvent<T>` is an open generic. Unity can't create an Inspector field for it, can't save it as an asset, and can't reference it in a prefab.

The workaround is to create a concrete (closed) generic class:

```csharp
[CreateAssetMenu]
public class GameEventWeaponInfo : GameEvent<WeaponInfo> { }
```

That's the entire class. No methods, no overrides, no logic. It exists solely to give Unity's serializer a concrete type to work with. The actual event functionality lives in the `GameEvent<T>` base class.

This is a Unity limitation, not a GES design choice. Every ScriptableObject-based event system in Unity has this constraint. GES just automates the boring part.

## Generated Code Architecture

Understanding where generated files live is important so you don't accidentally modify generated code or lose your custom types during updates.

### Core Package (Do Not Touch)

```
Assets/TinyGiants/GameEventSystem/
```

This is the GES core package. It contains the base classes, editor tools, and runtime code. **Never modify files here.** Package updates will overwrite them.

### User Data Directory (Your Territory)

```
Assets/TinyGiants/TinyGiantsData/GameEventSystem/CodeGen/
├── Basic/      (32 pre-generated primitive types)
└── Custom/     (your generated classes)
```

The `Basic/` directory ships with 32 pre-generated types covering Unity's most common data types. The `Custom/` directory is where your project-specific generated classes go.

### What Gets Generated

For each type, GES generates a set of classes that enable full Inspector support:

**For a single-parameter type like `WeaponInfo`:**
- `GameEventWeaponInfo` — the ScriptableObject event asset
- `GameEventListenerWeaponInfo` — the MonoBehaviour listener component
- `GameEventBehaviorWeaponInfo` — the behavior component for Inspector wiring

**For a sender type like `GameEvent<Player, DamageInfo>`:**
- `GameEventPlayerDamageInfo` — the ScriptableObject event asset
- `GameEventListenerPlayerDamageInfo` — the listener component
- `GameEventBehaviorPlayerDamageInfo` — the behavior component

Each generated file follows a consistent naming convention and includes the correct `using` statements, namespace declarations, and `CreateAssetMenu` attributes.

## Mode 1: Basic Types — 32 Pre-Generated Primitives

Out of the box, GES ships with generated classes for 32 common Unity types:

| Category | Types |
|----------|-------|
| C# Primitives | `int`, `float`, `double`, `bool`, `string`, `long`, `byte`, `char` |
| Unity Structs | `Vector2`, `Vector3`, `Vector4`, `Quaternion`, `Color`, `Color32` |
| Unity Structs | `Rect`, `Bounds`, `Vector2Int`, `Vector3Int`, `RectInt`, `BoundsInt` |
| Unity Objects | `GameObject`, `Transform`, `Object`, `Component`, `Sprite`, `Texture2D` |
| Unity Objects | `AudioClip`, `Material`, `AnimationClip`, `ScriptableObject` |
| Collections | `List<int>`, `List<string>`, `int[]`, `string[]` |

These live in the `Basic/` directory and are ready to use immediately after importing GES. You don't need to generate them — they're already there.

**Important:** Don't modify the Basic types. They're regenerated during package updates. If you need a variant of a basic type (like a custom int event with additional metadata), create it in the Custom directory using Mode 2.

### Using a Basic Type

```csharp
// In your script
[SerializeField] private GameEventInt onScoreChanged;
[SerializeField] private GameEventVector3 onPositionUpdated;
[SerializeField] private GameEventBool onPauseToggled;

private void UpdateScore(int newScore)
{
    onScoreChanged.Raise(newScore);
}
```

In the Inspector, these show up as drag-and-drop fields. Create the event assets via `Assets > Create > TinyGiants > Game Event System > [Type]`.

## Mode 2: Custom Single Parameter — GameEvent\<T\>

When you need an event for your own data types — structs, classes, enums, or any type not in the basic set.

### Step-by-Step

1. Open the Code Generation tool: `Tools > TinyGiants > Game Event System > Code Generation`

![CodeGen Single](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

2. Select "Single Parameter" mode

3. Enter your type information:
   - **Type Name:** The fully qualified type name (e.g., `WeaponInfo` or `MyNamespace.WeaponInfo`)
   - **Using Statements:** Any additional `using` directives needed (GES adds the common Unity ones automatically)

4. Click "Generate"

5. Wait for Unity to compile the new scripts

That's it. Your `GameEventWeaponInfo` is now available as a ScriptableObject asset and an Inspector-serializable field.

### Example: Custom Struct

Let's say you have this in your project:

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

    public enum DamageType
    {
        Physical,
        Magical,
        Fire,
        Ice,
        Lightning
    }
}
```

In the Code Generation tool:
- **Type Name:** `RPG.Combat.DamageInfo`
- **Using Statements:** `RPG.Combat` (so the generated file can find `DamageInfo`)

The generated file looks something like:

```csharp
using UnityEngine;
using RPG.Combat;
using TinyGiants.GameEventSystem;

[CreateAssetMenu(
    fileName = "New DamageInfo Event",
    menuName = "TinyGiants/Game Event System/Custom/DamageInfo Event"
)]
public class GameEventDamageInfo : GameEvent<DamageInfo> { }
```

Now you can use it:

```csharp
[SerializeField] private GameEventDamageInfo onDamageDealt;

public void DealDamage(DamageInfo info)
{
    onDamageDealt.Raise(info);
}
```

### The Serializable Requirement

Your custom type must be serializable by Unity for the Inspector to display it correctly. This means:

- **Structs:** Add `[System.Serializable]` attribute
- **Classes:** Add `[System.Serializable]` attribute, must have a parameterless constructor
- **Enums:** Serializable by default
- **Interfaces:** Not serializable — use a concrete type or wrapper
- **MonoBehaviours/Components:** Use the component reference directly (already serializable)
- **ScriptableObjects:** Use the SO reference directly (already serializable)

If your type isn't serializable, the event will still work in code (you can `Raise()` and listen), but the Inspector won't be able to display the argument field on behavior components.

## Mode 3: Sender Events — GameEvent\<TSender, TArgs\>

Sender events carry two generic parameters: who sent the event and what data it carries. This is essential when listeners need context about the event source.

### Step-by-Step

1. Open the Code Generation tool

![CodeGen Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_sender.png)

2. Select "Sender" mode

3. Enter both type parameters:
   - **Sender Type:** The type of the sender (e.g., `GameObject`, `Enemy`, `Player`)
   - **Args Type:** The type of the event data (e.g., `int`, `DamageInfo`, `string`)
   - **Using Statements:** Additional directives for both types

4. Click "Generate"

### Example: Player Damage Source Tracking

```csharp
// After generating GameEvent<Enemy, DamageInfo>:

[SerializeField] private GameEventEnemyDamageInfo onEnemyDealtDamage;

// Raising:
public void AttackPlayer(DamageInfo info)
{
    onEnemyDealtDamage.Raise(this, info);
}

// Listening:
private void OnEnable()
{
    onEnemyDealtDamage.AddListener(HandleEnemyDamage);
}

private void HandleEnemyDamage(Enemy sender, DamageInfo args)
{
    Debug.Log($"{sender.name} dealt {args.amount} {args.type} damage");

    // React based on sender
    if (sender.IsBoss)
        ApplyScreenShake(args.knockbackForce * 2f);
    else
        ApplyScreenShake(args.knockbackForce);
}
```

### When to Use Sender vs. Single Parameter

**Use single parameter (`GameEvent<T>`)** when:
- The source doesn't matter (UI events, system notifications)
- There's only one possible source (singleton managers)
- You're broadcasting data, not a contextual message

**Use sender (`GameEvent<TSender, TArgs>`)** when:
- Multiple sources can raise the same event (enemies, pickups, traps)
- Listeners need to differentiate behavior by source
- You're implementing an observer pattern where the observable's identity matters
- Kill attribution, damage tracking, interaction source identification

## The Batch Queue

When setting up a new project or adding a major feature, you often need multiple types generated at once. The batch queue lets you queue up multiple generation requests and execute them all in one compilation cycle.

1. Add types to the queue one by one using the "Add to Queue" button
2. Review the queue in the tool window
3. Click "Generate All"
4. Unity compiles once with all new types

This is significantly faster than generating types one at a time, because each individual generation triggers a Unity recompilation. Batching 10 types into one queue means one recompile instead of ten.

![Hub Code Tools](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

## Auto-Compilation Pipeline Integration

When GES generates a file, it writes the `.cs` file to the `Custom/` directory and then triggers Unity's asset refresh. Unity's compilation pipeline picks up the new file, compiles it, and the type becomes available in the Inspector.

The typical flow:
1. You click "Generate" in the tool
2. GES writes the `.cs` file
3. Unity detects the file change and starts compilation
4. Compilation completes (usually 2-5 seconds)
5. The new type appears in Create menus and Inspector dropdowns

If compilation fails (usually because of a missing `using` statement or a typo in the type name), check the Console for compiler errors. Fix the issue in the generated file or delete it and regenerate with the correct settings.

### Namespace Considerations

If your type lives in a namespace (and it should, in any serious project), make sure to include that namespace in the "Using Statements" field. The generated code needs to resolve your type name.

Common mistake:

```
Type Name: DamageInfo
Using Statements: (empty)
// Generated code can't find DamageInfo because it's in RPG.Combat
```

Correct:

```
Type Name: DamageInfo
Using Statements: RPG.Combat
// Generated code includes "using RPG.Combat;" and finds the type
```

Or use the fully qualified name without an extra using:

```
Type Name: RPG.Combat.DamageInfo
Using Statements: (empty)
// Works because the full namespace is in the type name
```

## Code Cleanup: Removing Unused Generated Types

Over the course of development, types get renamed, removed, or replaced. The generated classes for those old types stick around in the `Custom/` directory, cluttering your project and potentially causing confusion.

The Code Cleanup tool scans your generated types and identifies which ones are no longer referenced anywhere in your project.

### Single Type Cleanup

![Cleaner Single](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_single.png)

1. Open `Tools > TinyGiants > Game Event System > Code Cleanup`
2. Select "Single Parameter" or "Sender" mode
3. The tool lists all generated types with usage indicators
4. Types with zero references are highlighted as candidates for removal
5. Select the types you want to remove
6. Click "Clean"

The tool deletes the generated `.cs` files and triggers recompilation. Any event assets of the deleted type become "missing script" references, so make sure you've already removed or replaced them before cleaning.

### Sender Type Cleanup

![Cleaner Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_sender.png)

Same workflow, but for sender event types. The tool identifies `GameEvent<TSender, TArgs>` generated classes separately from single-parameter ones, because they have different file structures.

## Clean All: The Nuclear Option

For major refactoring — switching from one data architecture to another, or cleaning up after a prototype phase — the "Clean All" button removes every generated type in the `Custom/` directory.

**Use this when:**
- You're starting a major refactor and want a clean slate
- You've changed your project's type architecture significantly
- Generated types have gotten out of sync with your actual types

**Don't use this when:**
- You just want to remove one or two unused types (use individual cleanup)
- You have event assets referencing these types that you haven't migrated yet

After a Clean All, you'll need to regenerate every custom type your project uses. The batch queue makes this manageable — queue up all your types and generate in one pass.

## Workflow: Adding a New Feature Type

Here's the complete workflow from "I need a new event type" to "it's working in the game":

### 1. Define Your Data Type

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

### 2. Generate the Event Class

Open Code Generation tool, enter:
- Type Name: `ItemPickupInfo`
- Using Statements: `MyGame.Inventory`
- Mode: Single Parameter
- Click Generate

### 3. Wait for Compilation

Watch the bottom-right corner of Unity for the compilation spinner. Once it finishes, your type is ready.

### 4. Create the Event Asset

`Assets > Create > TinyGiants > Game Event System > Custom > ItemPickupInfo Event`

Name it something descriptive: `OnItemPickedUp`.

### 5. Reference in Scripts

```csharp
[SerializeField] private GameEventItemPickupInfo onItemPickedUp;

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

### 6. Wire Up Listeners

Either in code:

```csharp
private void OnEnable()
{
    onItemPickedUp.AddListener(HandleItemPickup);
}

private void HandleItemPickup(ItemPickupInfo info)
{
    inventoryUI.ShowPickupNotification(info.itemId, info.quantity);

    if (info.rarity >= ItemRarity.Legendary)
        PlayLegendaryPickupEffect(info.pickupPosition);
}
```

Or via the Inspector using the generated Behavior component.

Total time: about 2 minutes, most of which is waiting for compilation. Compare that to hand-writing the boilerplate classes, dealing with typos, making sure the `CreateAssetMenu` attribute is correct, and keeping the naming consistent.

## Tips and Common Issues

### Generated Types After Package Update

When you update the GES package, the Basic types might be regenerated. Your Custom types are untouched — they live in a separate directory that GES never writes to during updates. This is by design.

### Type Name Conflicts

If you have two types with the same name in different namespaces (e.g., `Combat.DamageInfo` and `Magic.DamageInfo`), the generated class names would conflict. Use the fully qualified name in the type field:

```
Type Name: Combat.DamageInfo → generates GameEventCombatDamageInfo
Type Name: Magic.DamageInfo → generates GameEventMagicDamageInfo
```

The generated class name includes the namespace components to avoid conflicts.

### Nested Types

Types nested inside other classes (e.g., `Player.Stats`) may need special handling depending on the nesting depth. Generally, it's cleaner to extract nested types to their own files for event compatibility.

### Enum Events

Enums work as event arguments out of the box after generation:

```csharp
public enum GameState { Menu, Playing, Paused, GameOver }

// Generate GameEventGameState, then:
[SerializeField] private GameEventGameState onGameStateChanged;

onGameStateChanged.Raise(GameState.Playing);
```

This is one of the most common use cases — state machines broadcasting their current state via typed events.

## Summary

The code generation system eliminates the boilerplate tax that Unity's serialization system imposes on generic types. Three modes cover the full spectrum of event types:

- **Basic:** 32 pre-generated primitives, ready out of the box
- **Custom Single:** Your project-specific types with `GameEvent<T>`
- **Sender:** Dual-generic types with `GameEvent<TSender, TArgs>`

The batch queue handles bulk generation efficiently, the cleanup tools keep your project tidy, and the whole system integrates with Unity's compilation pipeline seamlessly. Two minutes from "I need a new event type" to "it's working in the Inspector."

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
