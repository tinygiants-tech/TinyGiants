---
sidebar_label: 'Execute & Practices'

sidebar_position: 4
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# Execution Order & Best Practices

Understanding how GameEvent executes callbacks and manages event flow is crucial for building reliable, performant event-driven systems. This guide covers execution order, common patterns, pitfalls, and optimization strategies.

------

## 🎯 Execution Order

### Visual Timeline

When `myEvent.Raise()` is called, execution follows this precise order:

```text
myEvent.Raise() 🚀
      │
      ├── 1️⃣ Basic Listeners (FIFO Order)
      │      │
      │      ├─► OnUpdate() 📝
      │      │      ✓ Executed
      │      │
      │      └─► OnRender() 🎨
      │             ✓ Executed
      │
      ├── 2️⃣ Priority Listeners (High → Low)
      │      │
      │      ├─► [Priority 100] Critical() ⚡
      │      │      ✓ Executed First
      │      │
      │      ├─► [Priority 50] Normal() 📊
      │      │      ✓ Executed Second
      │      │
      │      └─► [Priority 0] LowPriority() 📌
      │             ✓ Executed Last
      │
      ├── 3️⃣ Conditional Listeners (Priority + Condition)
      │      │
      │      └─► [Priority 10] IfHealthLow() 💊
      │             │
      │             ├─► Condition Check: health < 20?
      │             │      ├─► ✅ True → Execute Listener
      │             │      └─► ❌ False → Skip Listener
      │             │
      │             └─► (Next conditional checked...)
      │
      ├── 4️⃣ Persistent Listeners (Cross-Scene)
      │      │
      │      └─► GlobalLogger() 📋
      │             ✓ Always Executes (DontDestroyOnLoad)
      │
      ├── 5️⃣ Trigger Events (Parallel - Fan Out) 🌟
      │      │
      │      ├─────► lightOnEvent.Raise() 💡
      │      │          (Executes independently)
      │      │
      │      ├─────► soundEvent.Raise() 🔊
      │      │          (Executes independently)
      │      │
      │      └─────► particleEvent.Raise() ✨
      │                 (Executes independently)
      │
      │      ⚠️ If one fails, others still execute
      │
      └── 6️⃣ Chain Events (Sequential - Strict Order) 🔗
             │
             └─► fadeOutEvent.Raise() 🌑
                    ✓ Success
                    │
                    ├─► ⏱️ Wait (duration/delay)
                    │
                    └─► loadSceneEvent.Raise() 🗺️
                           ✓ Success
                           │
                           ├─► ⏱️ Wait (duration/delay)
                           │
                           └─► fadeInEvent.Raise() 🌕
                                  ✓ Success
                                  
                                  🛑 If ANY step fails → Chain STOPS
```

------

### Execution Characteristics

| Stage                     | Pattern               | Timing                  | Failure Behavior        | Use Case                    |
| ------------------------- | --------------------- | ----------------------- | ----------------------- | --------------------------- |
| **Basic Listeners**       | Sequential            | Same frame, synchronous | Continue to next        | Standard callbacks          |
| **Priority Listeners**    | Sequential (sorted)   | Same frame, synchronous | Continue to next        | Ordered processing          |
| **Conditional Listeners** | Sequential (filtered) | Same frame, synchronous | Skip if false, continue | State-dependent logic       |
| **Persistent Listeners**  | Sequential            | Same frame, synchronous | Continue to next        | Cross-scene systems         |
| **Trigger Events**        | **Parallel**          | Same frame, independent | Others unaffected       | Side effects, notifications |
| **Chain Events**          | **Sequential**        | Multi-frame, blocking   | **Chain stops**         | Cutscenes, sequences        |

------

### Key Differences Explained

<Tabs> <TabItem value="listeners" label="Listeners (1-4)" default>

**Characteristics:**

- Execute **synchronously** in the current frame
- Run one after another in defined order
- Each listener is independent
- Failure in one listener doesn't stop others

**Example:**

```csharp
healthEvent.AddListener(UpdateUI);           // Runs 1st
healthEvent.AddPriorityListener(SaveGame, 100); // Runs 2nd (higher priority)
healthEvent.AddConditionalListener(ShowWarning, 
    health => health < 20);                  // Runs 3rd (if condition true)

healthEvent.Raise(15f);
// Order: SaveGame() → UpdateUI() → ShowWarning() (if health < 20)
```

**Timeline:**

```
🖼️ Frame 1024
🚀 healthEvent.Raise(15.0f)
│
├─► 💾 SaveGame()          ⏱️ 0.1ms
├─► 🖥️ UpdateUI()          ⏱️ 0.3ms
└─► ⚠️ ShowWarning()       ⏱️ 0.2ms
│
📊 Total Cost: 0.6ms | ⚡ Status: Synchronous (Same Frame)
```

</TabItem> <TabItem value="triggers" label="Triggers (5)">

**Characteristics:**

- Execute in **parallel** (fan-out pattern)
- All triggers fire independently
- One trigger's failure doesn't affect others
- Still synchronous, but logically parallel

**Example:**

```csharp
// When boss dies, trigger multiple independent events
bossDefeatedEvent.AddTriggerEvent(stopBossMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(playVictoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(spawnLootEvent, priority: 50);
bossDefeatedEvent.AddTriggerEvent(showVictoryUIEvent, priority: 40);
bossDefeatedEvent.AddTriggerEvent(saveCheckpointEvent, priority: 10);

bossDefeatedEvent.Raise();
// All 5 events fire, sorted by priority, but independently
// If spawnLootEvent fails, others still execute
```

**Timeline:**

```
🖼️ Frame 2048
🚀 bossDefeatedEvent.Raise()
│
├─► 🚀 stopBossMusicEvent.Raise()     ✅ Success
├─► 🚀 playVictoryMusicEvent.Raise()  ✅ Success
├─► 🚀 spawnLootEvent.Raise()         ❌ Failed! (Exception Isolated)
├─► 🚀 showVictoryUIEvent.Raise()     ✅ Executed (Resilient)
└─► 🚀 saveCheckpointEvent.Raise()    ✅ Executed (Resilient)
│
📊 Result: 4/5 Success | 🛡️ Status: Fault-Tolerant (Isolated Failure)
```

</TabItem> <TabItem value="chains" label="Chains (6)">

**Characteristics:**

- Execute **sequentially** with blocking
- Strict order: A → B → C
- Supports delays between steps
- **Entire chain stops** if any step fails

**Example:**

```csharp
// Cutscene sequence
cutsceneStartEvent.AddChainEvent(fadeOutEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(hideUIEvent, delay: 0f, duration: 0.5f);
cutsceneStartEvent.AddChainEvent(playCutsceneEvent, delay: 0f, duration: 5f);
cutsceneStartEvent.AddChainEvent(fadeInEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(showUIEvent, delay: 0f, duration: 0f);

// Execute the chain
cutsceneStartEvent.Raise();
```

**Timeline:**

```
🖼️ T+0.0s | Frame 0
🚀 cutsceneStartEvent.Raise()
└─► 🎬 fadeOutEvent.Raise()             ✅ Initiated

        ┆  (Δ 1.0s Delay)
        ▼
🖼️ T+1.0s | Frame 60
└─► 🖥️ hideUIEvent.Raise()              ✅ Executed

        ┆  (Δ 0.5s Delay)
        ▼
🖼️ T+1.5s | Frame 90
└─► 🎞️ playCutsceneEvent.Raise()         ✅ Executed

        ┆  (Δ 5.0s Delay)
        ▼
🖼️ T+6.5s | Frame 390
└─► 🎬 fadeInEvent.Raise()              ✅ Executed

        ┆  (Δ 1.0s Delay)
        ▼
🖼️ T+7.5s | Frame 450
└─► 🖥️ showUIEvent.Raise()              ✅ Finalized

📊 Total Timeline: ~7.5s | 🎞️ Total Span: 450 Frames
```

**Failure Scenario:**

```csharp
🖼️ T+0.0s | Frame 0
🚀 cutsceneStartEvent.Raise()           ✅ Initiated

        ┆  (Δ 1.0s)
        ▼
🖼️ T+1.0s | Frame 60
🚀 fadeOutEvent.Raise()                 ✅ Executed

        ┆  (Δ 0.5s)
        ▼
🖼️ T+1.5s | Frame 90
🚀 hideUIEvent.Raise()                  ✅ Executed

        ┆  (Δ 5.0s)
        ▼
🖼️ T+6.5s | Frame 390
🚀 playCutsceneEvent.Raise()            ❌ CRITICAL FAILURE!
                                        
        🛑 [ CIRCUIT BREAKER ACTIVE ]
        ⚠️ Logical chain halted to prevent state desync.

        ⏩ fadeInEvent.Raise()          🚫 NEVER EXECUTED
        ⏩ showUIEvent.Raise()          🚫 NEVER EXECUTED
```

</TabItem> </Tabs>

------

## 💡 Best Practices

### 1. Listener Management

#### Always Unsubscribe

Memory leaks are the #1 issue with event systems. Always clean up listeners.

<Tabs> <TabItem value="bad" label="❌ Bad">

```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void Start()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    // Object destroyed but listener remains in memory!
    // This causes memory leaks and potential crashes
}
```

</TabItem> <TabItem value="good" label="✅ Good">

```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void OnEnable()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    void OnDisable()
    {
        // Always unsubscribe to prevent memory leaks
        onPlayerDeath.RemoveListener(HandleDeath);
    }
    
    void HandleDeath()
    {
        Debug.Log("Player died!");
    }
}
```

</TabItem> </Tabs>

------

#### Use OnEnable/OnDisable Pattern

The OnEnable/OnDisable pattern is the recommended approach for Unity.

```csharp
public class HealthUI : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<float> healthChangedEvent;
    
    void OnEnable()
    {
        // Subscribe when active
        healthChangedEvent.AddListener(OnHealthChanged);
    }
    
    void OnDisable()
    {
        // Unsubscribe when inactive
        healthChangedEvent.RemoveListener(OnHealthChanged);
    }
    
    void OnHealthChanged(float newHealth)
    {
        // Update UI
    }
}
```

**Benefits:**

- Automatic cleanup when object is disabled/destroyed
- Listeners only active when needed
- Prevents duplicate subscriptions
- Works with object pooling

------

### 2. Schedule Management

#### Store Handles for Cancellation

Always store `ScheduleHandle` if you need to cancel later.

<Tabs> <TabItem value="bad" label="❌ Bad">

```csharp
public class PoisonEffect : MonoBehaviour
{
    void ApplyPoison()
    {
        // Can't cancel this later!
        poisonEvent.RaiseRepeating(damagePerTick, 1f, repeatCount: 10);
    }
    
    void CurePoison()
    {
        // No way to stop the poison!
        // It will keep ticking for all 10 times
    }
}
```

</TabItem> <TabItem value="good" label="✅ Good">

```csharp
public class PoisonEffect : MonoBehaviour
{
    private ScheduleHandle _poisonHandle;
    
    void ApplyPoison()
    {
        // Store the handle
        _poisonHandle = poisonEvent.RaiseRepeating(
            damagePerTick, 
            1f, 
            repeatCount: 10
        );
    }
    
    void CurePoison()
    {
        // Can cancel the poison effect
        if (poisonEvent.CancelRepeating(_poisonHandle))
        {
            Debug.Log("Poison cured!");
        }
    }
    
    void OnDisable()
    {
        // Clean up on disable
        poisonEvent.CancelRepeating(_poisonHandle);
    }
}
```

</TabItem> </Tabs>

------

#### Multiple Schedules Pattern

When managing multiple schedules, use a collection.

```csharp
public class BuffManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<string> buffTickEvent;
    
    private Dictionary<string, ScheduleHandle> _activeBuffs = new();
    
    public void ApplyBuff(string buffName, float interval, int duration)
    {
        // Cancel existing buff if any
        if (_activeBuffs.TryGetValue(buffName, out var existingHandle))
        {
            buffTickEvent.CancelRepeating(existingHandle);
        }
        
        // Apply new buff
        var handle = buffTickEvent.RaiseRepeating(
            buffName, 
            interval, 
            repeatCount: duration
        );
        
        _activeBuffs[buffName] = handle;
    }
    
    public void RemoveBuff(string buffName)
    {
        if (_activeBuffs.TryGetValue(buffName, out var handle))
        {
            buffTickEvent.CancelRepeating(handle);
            _activeBuffs.Remove(buffName);
        }
    }
    
    void OnDisable()
    {
        // Cancel all buffs
        foreach (var handle in _activeBuffs.Values)
        {
            buffTickEvent.CancelRepeating(handle);
        }
        _activeBuffs.Clear();
    }
}
```

------

### 3. Trigger and Chain Management

#### Use Handles for Safe Removal

Always use handles to avoid removing other systems' triggers/chains.

<Tabs> <TabItem value="bad" label="❌ Risky">

```csharp
public class DoorSystem : MonoBehaviour
{
    void SetupDoor()
    {
        doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // DANGER: Removes ALL triggers to lightOnEvent
        // Even those registered by other systems!
        doorOpenEvent.RemoveTriggerEvent(lightOnEvent);
    }
}
```

</TabItem> <TabItem value="good" label="✅ Safe">

```csharp
public class DoorSystem : MonoBehaviour
{
    private TriggerHandle _lightTriggerHandle;
    
    void SetupDoor()
    {
        // Store the handle
        _lightTriggerHandle = doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // Only removes YOUR specific trigger
        doorOpenEvent.RemoveTriggerEvent(_lightTriggerHandle);
    }
}
```

</TabItem> </Tabs>

------

#### Organizing Multiple Triggers/Chains

Use a structured approach for complex systems.

```csharp
public class CutsceneManager : MonoBehaviour
{
    // Store all handles for cleanup
    private readonly List<ChainHandle> _cutsceneChains = new();
    private readonly List<TriggerHandle> _cutsceneTriggers = new();
    
    void SetupCutscene()
    {
        // Build cutscene sequence
        var chain1 = startEvent.AddChainEvent(fadeOutEvent, duration: 1f);
        var chain2 = startEvent.AddChainEvent(playVideoEvent, duration: 5f);
        var chain3 = startEvent.AddChainEvent(fadeInEvent, duration: 1f);
        
        _cutsceneChains.Add(chain1);
        _cutsceneChains.Add(chain2);
        _cutsceneChains.Add(chain3);
        
        // Add parallel triggers for effects
        var trigger1 = startEvent.AddTriggerEvent(stopGameplayMusicEvent);
        var trigger2 = startEvent.AddTriggerEvent(hideCrosshairEvent);
        
        _cutsceneTriggers.Add(trigger1);
        _cutsceneTriggers.Add(trigger2);
    }
    
    void SkipCutscene()
    {
        // Clean up all chains
        foreach (var chain in _cutsceneChains)
        {
            startEvent.RemoveChainEvent(chain);
        }
        _cutsceneChains.Clear();
        
        // Clean up all triggers
        foreach (var trigger in _cutsceneTriggers)
        {
            startEvent.RemoveTriggerEvent(trigger);
        }
        _cutsceneTriggers.Clear();
    }
}
```

------

### 4. Priority Usage

#### Guidelines for Priority Values

Use a consistent priority scale across your project.

```csharp
// Define priority constants
public static class EventPriority
{
    public const int CRITICAL = 1000;    // Absolutely must run first
    public const int HIGH = 100;         // Important systems
    public const int NORMAL = 0;         // Default priority
    public const int LOW = -100;         // Can run later
    public const int CLEANUP = -1000;    // Final cleanup tasks
}

// Usage
healthEvent.AddPriorityListener(SavePlayerData, EventPriority.CRITICAL);
healthEvent.AddPriorityListener(UpdateHealthBar, EventPriority.HIGH);
healthEvent.AddPriorityListener(PlayDamageSound, EventPriority.NORMAL);
healthEvent.AddPriorityListener(UpdateStatistics, EventPriority.LOW);
```

------

#### Priority Anti-Patterns

<Tabs> <TabItem value="bad" label="❌ Avoid">

```csharp
// Don't use random or inconsistent priorities
healthEvent.AddPriorityListener(SystemA, 523);
healthEvent.AddPriorityListener(SystemB, 891);
healthEvent.AddPriorityListener(SystemC, 7);

// Don't overuse priority when order doesn't matter
uiClickEvent.AddPriorityListener(PlaySound, 50);
uiClickEvent.AddPriorityListener(PlayParticle, 49);
// These don't need priority, use basic listeners!
```

</TabItem> <TabItem value="good" label="✅ Best Practice">

```csharp
// Use priorities only when order matters
saveGameEvent.AddPriorityListener(ValidateData, 100);   // Must validate first
saveGameEvent.AddPriorityListener(SerializeData, 50);   // Then serialize
saveGameEvent.AddPriorityListener(WriteToFile, 0);      // Finally write

// Use basic listeners when order doesn't matter
buttonClickEvent.AddListener(PlaySound);
buttonClickEvent.AddListener(ShowFeedback);
buttonClickEvent.AddListener(LogAnalytics);
```

</TabItem> </Tabs>

------

### 5. Conditional Listeners

#### Effective Condition Design

Keep conditions simple and fast.

<Tabs> <TabItem value="bad" label="❌ Expensive">

```csharp
// Don't do expensive operations in conditions
enemySpawnEvent.AddConditionalListener(
    SpawnBoss,
    () => {
        // Bad: Complex calculations in condition
        var enemies = FindObjectsOfType<Enemy>();
        var totalHealth = enemies.Sum(e => e.Health);
        var averageLevel = enemies.Average(e => e.Level);
        return totalHealth < 100 && averageLevel > 5;
    }
);
```

</TabItem> <TabItem value="good" label="✅ Efficient">

```csharp
// Cache state, make conditions simple checks
private bool _shouldSpawnBoss = false;

void UpdateGameState()
{
    // Update cached state occasionally, not every frame
    _shouldSpawnBoss = enemyManager.TotalHealth < 100 
                    && enemyManager.AverageLevel > 5;
}

void Setup()
{
    // Simple, fast condition check
    enemySpawnEvent.AddConditionalListener(
        SpawnBoss,
        () => _shouldSpawnBoss
    );
}
```

</TabItem> </Tabs>

------

## ⚠️ Common Pitfalls

### 1. Memory Leaks

**Problem:** Not unsubscribing listeners when objects are destroyed.

**Symptoms:**

- Increasing memory usage over time
- Errors about destroyed objects
- Callbacks executing on null references

**Solution:**

```csharp
// Always use OnEnable/OnDisable pattern
void OnEnable() => myEvent.AddListener(OnCallback);
void OnDisable() => myEvent.RemoveListener(OnCallback);
```

------

### 2. Lost Schedule Handles

**Problem:** Creating schedules without storing handles.

**Symptoms:**

- Cannot cancel repeating events
- Events continue after object is destroyed
- Resource waste from unneeded executions

**Solution:**

```csharp
private ScheduleHandle _handle;

void StartTimer()
{
    _handle = timerEvent.RaiseRepeating(1f);
}

void StopTimer()
{
    timerEvent.CancelRepeating(_handle);
}
```

------

### 3. Broad Removal Impact

**Problem:** Using target-based removal instead of handle-based removal.

**Symptoms:**

- Other systems' triggers/chains get removed unexpectedly
- Hard-to-debug issues where events stop firing
- Cross-system coupling and fragility

**Solution:**

```csharp
// Store handles, remove precisely
private TriggerHandle _myTrigger;

void Setup()
{
    _myTrigger = eventA.AddTriggerEvent(eventB);
}

void Cleanup()
{
    eventA.RemoveTriggerEvent(_myTrigger);  // Safe!
}
```

------

### 4. Recursive Event Raises

**Problem:** Event listener raises the same event, causing infinite loop.

**Symptoms:**

- Stack overflow exceptions
- Unity freezes
- Exponential execution growth

**Example:**

```csharp
// ❌ DANGER: Infinite recursion!
void Setup()
{
    healthEvent.AddListener(OnHealthChanged);
}

void OnHealthChanged(float health)
{
    // This triggers OnHealthChanged again!
    healthEvent.Raise(health - 1);  // ← INFINITE LOOP
}
```

**Solution:**

```csharp
// ✅ Use a flag to prevent recursion
private bool _isProcessingHealthChange = false;

void OnHealthChanged(float health)
{
    if (_isProcessingHealthChange) return;  // Prevent recursion
    
    _isProcessingHealthChange = true;
    
    // Safe to raise here now
    if (health <= 0)
    {
        deathEvent.Raise();
    }
    
    _isProcessingHealthChange = false;
}
```

------

## 🚀 Performance Optimization

### 1. Minimize Listener Count

Even though the code has been highly optimized, there will still be some overhead for each listener. Consolidate when possible.

<Tabs> <TabItem value="bad" label="❌ Inefficient">

```csharp
// Multiple listeners for related operations
healthEvent.AddListener(UpdateHealthBar);
healthEvent.AddListener(UpdateHealthText);
healthEvent.AddListener(UpdateHealthIcon);
healthEvent.AddListener(UpdateHealthColor);
```

</TabItem> <TabItem value="good" label="✅ Optimized">

```csharp
// Single listener handles all UI updates
healthEvent.AddListener(UpdateHealthUI);

void UpdateHealthUI(float health)
{
    // Batch all UI updates together
    healthBar.value = health / maxHealth;
    healthText.text = $"{health:F0}";
    healthIcon.sprite = GetHealthIcon(health);
    healthColor.color = GetHealthColor(health);
}
```

</TabItem> </Tabs>

------

### 2. Avoid Heavy Operations in Listeners

Keep listeners lightweight. Move heavy work to coroutines/async.

<Tabs> <TabItem value="bad" label="❌ Blocking">

```csharp
void OnDataLoaded(string data)
{
    // Bad: Blocks execution for all subsequent listeners
    var parsed = JsonUtility.FromJson<LargeData>(data);
    ProcessComplexData(parsed);  // Takes 50ms
    SaveToDatabase(parsed);      // Takes 100ms
}
```

</TabItem> <TabItem value="good" label="✅ Async">

```csharp
void OnDataLoaded(string data)
{
    // Good: Start async processing, don't block
    StartCoroutine(ProcessDataAsync(data));
}

IEnumerator ProcessDataAsync(string data)
{
    // Parse
    var parsed = JsonUtility.FromJson<LargeData>(data);
    yield return null;
    
    // Process
    ProcessComplexData(parsed);
    yield return null;
    
    // Save
    SaveToDatabase(parsed);
}
```

</TabItem> </Tabs>

------

### 3. Cache Delegate Allocations

Avoid creating new delegate allocations every frame.

<Tabs> <TabItem value="bad" label="❌ Allocations">

```csharp
void OnEnable()
{
    // Creates new delegate allocation every time
    updateEvent.AddListener(() => UpdateHealth());
}
```

</TabItem> <TabItem value="good" label="✅ Cached">

```csharp
void OnEnable()
{
    // Reuses same method reference, no allocation
    updateEvent.AddListener(UpdateHealth);
}

void UpdateHealth()
{
    // Implementation
}
```

</TabItem> </Tabs>

------

## 📊 Summary Checklist

Use this checklist when working with `GameEvent`:

### Listener Management

- Always unsubscribe in OnDisable
- Use OnEnable/OnDisable pattern
- Cache delegate references when possible
- Keep listeners lightweight

### Schedule Management

- Store ScheduleHandle when you need cancellation
- Cancel schedules in OnDisable
- Use collections for multiple schedules
- Clean up on object destruction

### Trigger/Chain Management

- Use handles for safe removal
- Store handles in collections for cleanup
- Choose triggers for parallel, chains for sequential
- Remember to call ExecuteChainEvents() for chains

### Performance

- Consolidate related listeners
- Move heavy work to coroutines/async
- Use simple, fast conditions
- Avoid recursive event raises

### Priority & Conditions

- Use consistent priority scale
- Only use priority when order matters
- Keep conditions simple and cached
- Document priority dependencies



