---
slug: unity-generic-serialization
title: "Unity's Generic Serialization Problem: How GameEvent<T> Elegantly Solves the Inspector Gap"
authors: [tinygiants]
tags: [ges, unity, architecture, codegen, tutorial]
description: "Unity's Inspector can't serialize generic types. GES solves this with automatic code generation and three event architectures that just work."
image: /img/home-page/game-event-system-preview.png
---

You've just built a beautiful generic event system. `GameEvent<T>` — clean, type-safe, elegant. You create a `GameEvent<int>` for score changes. You try to drag it into the Inspector. Nothing. The field doesn't show up. Unity stares back at you with a blank Inspector panel like you just asked it to solve a differential equation.

Welcome to Unity's longest-running architectural headache: the serialization system doesn't understand generics. It's been this way since... well, since forever. And if you've ever tried to build a type-safe, data-driven event system in Unity, you've hit this wall face-first.

The Game Event System (GES) doesn't just work around this limitation — it eliminates it entirely with a code generation pipeline that turns a 30-minute boilerplate nightmare into a 10-second automated process.

<!-- truncate -->

## Why Unity Can't Serialize Generics

Let's understand the actual technical limitation before we solve it. Unity's serialization system — the engine that powers the Inspector, prefab saving, scene serialization, and asset storage — was designed before C# generics were common in game development. It operates on concrete types with known memory layouts.

When Unity encounters a field like this:

```csharp
[SerializeField] private GameEvent<int> scoreChanged;
```

It can't serialize it. The serializer doesn't know how to handle the generic type parameter `T`. It doesn't know the memory layout, it can't create the Inspector drawer, and it can't store the reference in the scene file. The field simply doesn't appear in the Inspector.

This means that if you want a type-safe event system where events carry data — which is, you know, the entire point — you have to create a concrete subclass for every single type:

```csharp
// You have to write this for EVERY type you want to use
[CreateAssetMenu]
public class IntGameEvent : GameEvent<int> { }

[CreateAssetMenu]
public class FloatGameEvent : GameEvent<float> { }

[CreateAssetMenu]
public class StringGameEvent : GameEvent<string> { }

[CreateAssetMenu]
public class Vector3GameEvent : GameEvent<Vector3> { }

// And the corresponding listeners...
public class IntGameEventListener : GameEventListener<int> { }
public class FloatGameEventListener : GameEventListener<float> { }
public class StringGameEventListener : GameEventListener<string> { }
public class Vector3GameEventListener : GameEventListener<Vector3> { }

// And the UnityEvent wrappers for each...
[Serializable]
public class IntUnityEvent : UnityEvent<int> { }
[Serializable]
public class FloatUnityEvent : UnityEvent<float> { }
// ... you get the idea
```

For a single type, you need at minimum three boilerplate classes: the event, the listener, and the UnityEvent wrapper. For a real project with 15-20 custom types? That's 45-60 nearly identical files, each differing only in the type parameter. One typo in any of them, and you've got a subtle bug.

## Common Community Workarounds (And Their Problems)

The Unity community has developed several approaches to deal with this. Let's be honest about each one.

### Approach 1: Just Write the Boilerplate

The brute-force method. Create every concrete class by hand. It works, but:

- It's tedious and error-prone
- Adding a new type means creating 3+ files every time
- Refactoring the base class means touching every derived class
- Nobody does this consistently, so types end up scattered across the project in inconsistent patterns

### Approach 2: Lose Type Safety with `object`

Some systems avoid the generic problem entirely by using `object`:

```csharp
public class GenericEvent : ScriptableObject
{
    public void Raise(object data) { /* ... */ }
}

// Usage
scoreEvent.Raise(42);           // Boxed int
scoreEvent.Raise("oops");       // Wrong type, compiles fine, breaks at runtime
scoreEvent.Raise(new Enemy());  // Also compiles. Also wrong.
```

You've "solved" the serialization problem by throwing away type safety. Now every event call is a potential runtime error. You're back to JavaScript-style "hope the types match" development.

### Approach 3: T4 Templates or Custom Editor Scripts

Some developers write T4 templates or custom editor tools to generate the boilerplate. This is actually on the right track, but most implementations are fragile, poorly maintained, and require developers to understand the template syntax to modify anything.

### Approach 4: Use `[Serializable]` Structs Everywhere

You can create concrete types by wrapping everything in serializable structs. This adds yet another layer of boilerplate and makes the code harder to read for no real benefit.

None of these solutions give you what you actually want: type-safe, Inspector-friendly, generic events with zero boilerplate maintenance.

## The Three GES Event Architectures

Before we dive into the code generation system, let's understand what GES actually provides. There are three distinct event types, each designed for a specific communication pattern.

### Type 1: Void Events — `GameEvent`

The simplest form. An event with no data. "Something happened" — that's all you need to know.

![Event Creator - Parameterless](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

```csharp
// Creating a void event
// Just create the ScriptableObject asset — no code needed

// Raising it
[SerializeField] private GameEvent onLevelComplete;

public void CompleteLevel()
{
    onLevelComplete.Raise();
}

// Listening (via Inspector-bound GameEventListener, or in code)
onLevelComplete.RegisterListener(listener);
```

Use cases: game start, game over, pause, unpause, level complete, checkpoint reached — any signal where the fact that it happened is the entire message.

### Type 2: Single Parameter Events — `GameEvent<T>`

An event that carries one piece of typed data. "Something happened, and here's the relevant information."

![Event Creator - Single Parameter](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

```csharp
// GES generates concrete types for you. For example:
// IntGameEvent : GameEvent<int>

// Raising with data
[SerializeField] private IntGameEvent onScoreChanged;

public void AddScore(int points)
{
    currentScore += points;
    onScoreChanged.Raise(currentScore);
}

// Listening
// The listener automatically receives the int parameter
// and passes it to your response method
```

Use cases: score changes (`int`), health updates (`float`), item pickup (`ItemData`), damage events (`DamageInfo`), position updates (`Vector3`).

### Type 3: Sender Events — `GameEvent<TSender, TArgs>`

An event that carries both the sender identity and event data. "This specific thing happened to this specific object, and here are the details."

![Event Creator - Sender](/img/game-event-system/visual-workflow/game-event-creator/creator-sender.png)

```csharp
// GES generates: GameObjectFloatGameEvent : GameEvent<GameObject, float>

// Raising with sender and data
[SerializeField] private GameObjectFloatGameEvent onDamageTaken;

public void TakeDamage(float amount)
{
    currentHealth -= amount;
    onDamageTaken.Raise(gameObject, amount);
}

// Listeners receive both the sender (which enemy?) and the data (how much?)
// This enables conditional responses: "only react if the sender is the boss"
```

Use cases: combat events (who hit whom for how much), interaction events (which NPC said what), physics events (which object collided with what force). The sender parameter is crucial when multiple instances share the same event type and you need to distinguish between them.

## The Code Generation System: 10 Seconds to Zero Boilerplate

Here's where GES turns the generic serialization problem from a recurring headache into a non-issue.

![Code Generation Tool](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

The code generation tool lives in the GES editor window. Here's the workflow:

**Step 1:** Open the Code Generation tool in the GES dashboard.

**Step 2:** Select the event architecture (Single Parameter or Sender).

**Step 3:** Specify your type. For built-in types, just select from the dropdown. For custom types, enter the full type name and namespace.

**Step 4:** Click Generate. Done.

The tool generates all necessary concrete classes — the event ScriptableObject, the listener component, the UnityEvent wrapper, and the custom property drawers. Everything is properly namespaced, properly attributed with `[CreateAssetMenu]`, and immediately usable in the Inspector.

### What Gets Generated

For a `GameEvent<int>`, the code generator produces:

```csharp
// Auto-generated by GES Code Generator
// IntGameEvent.cs
[CreateAssetMenu(
    fileName = "New Int Game Event",
    menuName = "GES/Events/Int Event")]
public class IntGameEvent : GameEvent<int> { }

// IntGameEventListener.cs
public class IntGameEventListener : GameEventListener<int> { }

// IntUnityEvent.cs
[Serializable]
public class IntUnityEvent : UnityEvent<int> { }
```

Clean, minimal, correct. No typos. No missed attributes. No inconsistencies.

### Custom Types: The Real Power

The code generator isn't limited to primitives. Got a custom struct?

```csharp
namespace MyGame.Combat
{
    [Serializable]
    public struct DamageInfo
    {
        public float amount;
        public DamageType type;
        public GameObject source;
        public Vector3 hitPoint;
    }
}
```

Feed `MyGame.Combat.DamageInfo` to the code generator. It produces:

```csharp
// Auto-generated
[CreateAssetMenu(
    fileName = "New DamageInfo Game Event",
    menuName = "GES/Events/DamageInfo Event")]
public class DamageInfoGameEvent : GameEvent<DamageInfo> { }

public class DamageInfoGameEventListener : GameEventListener<DamageInfo> { }

[Serializable]
public class DamageInfoUnityEvent : UnityEvent<DamageInfo> { }
```

From "I have a custom struct" to "I have a fully Inspector-compatible, type-safe event" in about 10 seconds. No manual boilerplate. No room for error.

### Sender Events: Double Type Parameters, Zero Extra Work

Sender events have two generic parameters, which means even more boilerplate in a manual system. The code generator handles this identically:

```csharp
// Input: Sender = GameObject, Args = DamageInfo
// Output:
[CreateAssetMenu(
    fileName = "New GameObject DamageInfo Sender Event",
    menuName = "GES/Events/Sender/GameObject-DamageInfo Event")]
public class GameObjectDamageInfoGameEvent : GameEvent<GameObject, DamageInfo> { }

public class GameObjectDamageInfoGameEventListener
    : GameEventListener<GameObject, DamageInfo> { }
```

## 32 Pre-Generated Basic Types

GES ships with concrete implementations for 32 common types out of the box. You don't need to generate anything for standard use cases:

![Basic Types Example](/img/game-event-system/examples/02-basic-types-event/demo-02-editor.png)

The pre-generated set covers:

- **Primitives:** `int`, `float`, `bool`, `string`, `byte`, `double`, `long`
- **Unity types:** `Vector2`, `Vector3`, `Vector4`, `Quaternion`, `Color`, `Color32`
- **References:** `GameObject`, `Transform`, `Component`, `Object`
- **Structs:** `Rect`, `Bounds`, `Ray`, `RaycastHit`, `Collision`, `ContactPoint`
- **Collections:** `int[]`, `float[]`, `string[]`, `List<int>`, `List<string>`
- **And more...**

For most projects, you'll find that the pre-generated types cover 70-80% of your needs. The code generator fills in the rest.

## Complete Walkthrough: Custom Struct to Working Event

Let's walk through the entire process, start to finish, for a realistic use case.

**Scenario:** You're building an inventory system. When an item is picked up, you need to broadcast which item it was, how many were collected, and whether the inventory is now full.

### Step 1: Define Your Data Struct

```csharp
namespace MyGame.Inventory
{
    [Serializable]
    public struct ItemPickupData
    {
        public string itemId;
        public int quantity;
        public bool inventoryFull;
        public Sprite itemIcon; // For UI display
    }
}
```

### Step 2: Generate the Event Type

Open GES Code Generation tool. Select "Single Parameter." Enter `MyGame.Inventory.ItemPickupData`. Click Generate.

Three files appear in your project. No manual editing required.

### Step 3: Create the Event Asset

Right-click in your Project window. Create > GES > Events > ItemPickupData Event. Name it `OnItemPickedUp`. Done — you now have a ScriptableObject asset that represents the "item picked up" event.

### Step 4: Wire Up the Sender

```csharp
using MyGame.Inventory;
using UnityEngine;

public class ItemCollectible : MonoBehaviour
{
    [SerializeField] private ItemPickupDataGameEvent onItemPickedUp;
    [SerializeField] private string itemId;
    [SerializeField] private int quantity = 1;
    [SerializeField] private Sprite icon;

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            var inventory = other.GetComponent<PlayerInventory>();
            bool added = inventory.TryAddItem(itemId, quantity);

            if (added)
            {
                onItemPickedUp.Raise(new ItemPickupData
                {
                    itemId = this.itemId,
                    quantity = this.quantity,
                    inventoryFull = inventory.IsFull,
                    itemIcon = this.icon
                });

                Destroy(gameObject);
            }
        }
    }
}
```

Drag the `OnItemPickedUp` event asset into the `onItemPickedUp` field in the Inspector. Done.

### Step 5: Wire Up Receivers

On your UI canvas, add an `ItemPickupDataGameEventListener` component. Reference the same `OnItemPickedUp` event asset. In the response, call your UI method that shows the pickup notification:

```csharp
public class PickupNotificationUI : MonoBehaviour
{
    [SerializeField] private Image itemIconDisplay;
    [SerializeField] private TMP_Text itemNameText;
    [SerializeField] private TMP_Text quantityText;
    [SerializeField] private GameObject inventoryFullWarning;

    // This method is called by the GameEventListener via Inspector binding
    public void ShowPickupNotification(ItemPickupData data)
    {
        itemIconDisplay.sprite = data.itemIcon;
        itemNameText.text = data.itemId;
        quantityText.text = $"x{data.quantity}";
        inventoryFullWarning.SetActive(data.inventoryFull);

        // Show notification animation...
    }
}
```

On your audio manager, add another listener for the same event. On your analytics system, another. Each responds independently. None know about each other.

### Step 6: Enjoy Type Safety

Try to raise the event with the wrong type? Compiler error. Try to pass a `float` where `ItemPickupData` is expected? Compiler error. Rename the struct fields? The compiler catches every call site.

```csharp
// This won't compile — type safety catches the mistake immediately
onItemPickedUp.Raise(42);  // Error: cannot convert int to ItemPickupData
onItemPickedUp.Raise("item_sword");  // Error: cannot convert string to ItemPickupData
```

That's the entire flow: define your data, generate the event type, create the asset, wire up senders and receivers. Type-safe from end to end, Inspector-friendly at every step, and zero hand-written boilerplate.

## When to Use Which Event Type

Here's a practical decision guide:

| Scenario | Event Type | Example |
|----------|-----------|---------|
| Pure signal, no data needed | `GameEvent` (void) | Game paused, level complete |
| One piece of data to broadcast | `GameEvent<T>` | Score changed (int), health updated (float) |
| Need to know who sent it | `GameEvent<TSender, TArgs>` | Enemy damaged (which enemy, how much) |
| Multiple pieces of related data | `GameEvent<T>` with custom struct | Item picked up (ItemPickupData) |
| System-wide notification | `GameEvent` (void) | Scene transition started |
| Per-instance tracking | `GameEvent<TSender, TArgs>` | NPC dialogue (which NPC, what line) |

The general rule: start with void events. When you need data, use single parameter with a custom struct. Use sender events only when you genuinely need to identify the source at the listener level.

## Wrapping Up

Unity's generic serialization limitation is real, annoying, and isn't going away anytime soon. But it doesn't have to be your problem. The combination of a well-designed generic base class, automatic code generation, and a rich library of pre-generated types means you get full type safety, full Inspector integration, and zero boilerplate maintenance.

The 10 seconds you spend in the code generator saves hours of manual class creation, eliminates copy-paste errors, and ensures every event type in your project follows the same consistent pattern. That's not a marginal improvement — it's a fundamental shift in how productive you can be with event-driven architecture in Unity.

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
