---
sidebar_label: 'Listening Strategies'
sidebar_position: 2
---

# Listening Strategies

While raising events sends the signal, **Listening** is where the actual game logic happens.

The Game Event System provides a tiered listening architecture, allowing you to control not just *what* responds, but *when* and *under what conditions* it responds.

---

## 🚦 The Execution Pipeline

When an event is raised, listeners are executed in a strict, deterministic order. Understanding this pipeline is crucial for managing dependencies (e.g., ensuring Data updates before UI).

1.  **Basic Listeners** (Code)
2.  **Inspector Bindings** (Scene Visuals)
3.  **Priority Listeners** (Sorted Code)
4.  **Conditional Listeners** (Filtered Code)
5.  **Persistent Listeners** (Global/Cross-Scene)
6.  **Flow Graph** (Triggers & Chains)

---

## 1. Basic Listeners (Standard)

This is the most common way to bind logic. It behaves exactly like a standard C# Event or `UnityEvent`.

### Usage
Use this for standard, non-critical gameplay logic where execution order doesn't matter relative to other listeners.

```csharp
public class PlayerHealth : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<int> onTakeDamage;

    private void OnEnable()
    {
        // Subscribe
        onTakeDamage.AddListener(OnDamageReceived);
    }

    private void OnDisable()
    {
        // Unsubscribe (Critical to prevent memory leaks!)
        onTakeDamage.RemoveListener(OnDamageReceived);
    }

    private void OnDamageReceived(int amount)
    {
        Debug.Log($"Ouch! Took {amount} damage.");
    }
}
```

:::warning Anonymous Functions (Lambdas)
Avoid using Lambda expressions (e.g., AddListener(() => DoThing())) unless you are sure you don't need to unsubscribe. You **cannot** remove a specific lambda listener later because the anonymous instance is lost.
:::

------

## 2. Priority Listeners (Sorted)

When multiple scripts listen to the same event, the execution order is normally undefined. **Priority Listeners** solve this by allowing you to inject an integer weight.

### Execution Rule

- **Higher Number** = Executes **Earlier**.
- **Lower Number** = Executes **Later**.

### Usage

Perfect for separating **Data Logic** from **View Logic**.

```csharp
// 1. Data System (High Priority)
// Must run first to calculate the new health value.
onPlayerHit.AddPriorityListener(CalculateHealth, 100);

// 2. UI System (Low Priority)
// Runs later. Safe to read the now-updated health value.
onPlayerHit.AddPriorityListener(UpdateHealthBar, 0);
```

### Sender & Arguments Support

Priority listeners fully support generics and sender payloads.

```csharp
// Listen with priority, receiving both Sender and Args
onCombatEvent.AddPriorityListener(OnCombatLog, 10);

void OnCombatLog(GameObject sender, DamageInfo info) { ... }
```

------

## 3. Conditional Listeners (Predicates)

Sometimes you want to listen to an event, but only execute logic if specific criteria are met. Instead of writing if statements inside every callback, you can register a **Predicate**.

### Logic Flow

1. Event Raised.
2. System calls your **Condition Function**.
3. If returns true ➔ Execute Listener.
4. If returns false ➔ Skip Listener.

### Usage

Great for filtering noise from high-frequency events.

```csharp
// Only trigger 'Die' logic if health is actually zero
onHealthChanged.AddConditionalListener(
    OnDeath, 
    condition: (currentHealth) => currentHealth <= 0
);

// Only respond if the sender is the Player
onInteraction.AddConditionalListener(
    OpenMenu, 
    condition: (sender, args) => sender.CompareTag("Player")
);
```

------

## 4. Persistent Listeners (Global)

Standard listeners are destroyed when their GameObject is destroyed (e.g., loading a new scene). **Persistent Listeners** are registered to a global manager (DontDestroyOnLoad) and survive scene transitions.

### Usage

Ideal for Global Managers like **AudioManagers**, **Analytics**, or **SaveSystems** that persist throughout the game.

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onLevelStart;

    void Awake()
    {
        DontDestroyOnLoad(this);
        
        // This listener will keep working even after scene changes
        onLevelStart.AddPersistentListener(PlayLevelMusic);
    }
    
    // Note: You must still manually remove it if this object is actually destroyed
    void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(PlayLevelMusic);
    }
}
```

:::danger Target Safety
If the target object of a Persistent Listener is destroyed (e.g., a normal enemy), the system will detect the null reference and skip execution, printing a warning. Always unregister persistent listeners in OnDestroy.
:::

------

## 🧹 Safety & Maintenance

### Removing Listeners

Always pair your Add calls with Remove calls. The API provides symmetrical removal methods for every listener type:

- RemoveListener(action)
- RemovePriorityListener(action)
- RemoveConditionalListener(action)
- RemovePersistentListener(action)

### The Nuclear Option (RemoveAllListeners)

In rare cases (e.g., pooling reset or game shutdown), you might want to wipe an event clean.

```csharp
// Clears Basic, Priority, and Conditional listeners.
// DOES NOT clear Persistent listeners (for safety).
myEvent.RemoveAllListeners();
```

------

## 🧩 Summary: Which strategy to use?

| Requirement                                | Strategy        | Why?                                              |
| ------------------------------------------ | --------------- | ------------------------------------------------- |
| **"Just tell me when it happens."**        | **Basic**       | Lowest overhead, standard behavior.               |
| **"I need to run BEFORE the UI updates."** | **Priority**    | Guarantees execution order (High priority first). |
| **"Only run if Health < 0."**              | **Conditional** | clean code, filters logic at the source.          |
| **"Keep listening in the next scene."**    | **Persistent**  | Survives scene loading/unloading.                 |

---

## 📜 API Summary

| Method Signature                                             | Returns | Description                                                  |
| :----------------------------------------------------------- | :------ | :----------------------------------------------------------- |
| **Basic Listeners**                                          |         |                                                              |
| `AddListener(UnityAction call)`                              | `void`  | Adds a basic void listener.                                  |
| `AddListener(UnityAction<T> call)`                           | `void`  | Adds a basic listener with one argument.                     |
| `AddListener(UnityAction<TSender, TArgs> call)`              | `void`  | Adds a basic listener with sender and argument.              |
| `RemoveListener(UnityAction call)`                           | `void`  | Removes a basic void listener.                               |
| `RemoveListener(UnityAction<T> call)`                        | `void`  | Removes a basic listener with one argument.                  |
| `RemoveListener(UnityAction<TSender, TArgs> call)`           | `void`  | Removes a basic listener with sender and argument.           |
| **Priority Listeners**                                       |         |                                                              |
| `AddPriorityListener(UnityAction call, int priority)`        | `void`  | Adds a void listener with execution priority.                |
| `AddPriorityListener(UnityAction<T> call, int priority)`     | `void`  | Adds a typed listener with execution priority.               |
| `AddPriorityListener(UnityAction<TSender, TArgs> call, int priority)` | `void`  | Adds a sender listener with execution priority.              |
| `RemovePriorityListener(UnityAction call)`                   | `void`  | Removes a void priority listener.                            |
| `RemovePriorityListener(UnityAction<T> call)`                | `void`  | Removes a typed priority listener.                           |
| `RemovePriorityListener(UnityAction<TSender, TArgs> call)`   | `void`  | Removes a sender priority listener.                          |
| **Conditional Listeners**                                    |         |                                                              |
| `AddConditionalListener(UnityAction call, Func<bool> condition, int priority)` | `void`  | Adds a void listener guarded by a condition.                 |
| `AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority)` | `void`  | Adds a typed listener guarded by a condition.                |
| `AddConditionalListener(UnityAction<TSender, TArgs> call, Func<TSender, TArgs, bool> condition, int priority)` | `void`  | Adds a sender listener guarded by a condition.               |
| `RemoveConditionalListener(UnityAction call)`                | `void`  | Removes a void conditional listener.                         |
| `RemoveConditionalListener(UnityAction<T> call)`             | `void`  | Removes a typed conditional listener.                        |
| `RemoveConditionalListener(UnityAction<TSender, TArgs> call)` | `void`  | Removes a sender conditional listener.                       |
| **Persistent Listeners**                                     |         |                                                              |
| `AddPersistentListener(UnityAction call, int priority)`      | `void`  | Adds a global void listener (DontDestroyOnLoad).             |
| `AddPersistentListener(UnityAction<T> call, int priority)`   | `void`  | Adds a global typed listener.                                |
| `AddPersistentListener(UnityAction<TSender, TArgs> call, int priority)` | `void`  | Adds a global sender listener.                               |
| `RemovePersistentListener(UnityAction call)`                 | `void`  | Removes a global void listener.                              |
| `RemovePersistentListener(UnityAction<T> call)`              | `void`  | Removes a global typed listener.                             |
| `RemovePersistentListener(UnityAction<TSender, TArgs> call)` | `void`  | Removes a global sender listener.                            |
| **Global Cleanup**                                           |         |                                                              |
| `RemoveAllListeners()`                                       | `void`  | Clears **Basic**, **Priority**, and **Conditional** listeners. <br/>*(Note: Does NOT clear Persistent listeners for safety).* |
