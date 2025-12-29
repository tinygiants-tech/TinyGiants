---
sidebar_label: '13 Runtime API'
sidebar_position: 14
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 13 Runtime API: Code-First Workflow

<!-- <VideoGif src="/video/game-event-system/13-runtime-api.mp4" /> -->

## 📋 Overview

Previous demos (01-11) demonstrated the **Visual Workflow**—binding listeners in Inspector, configuring conditions in Behavior windows, and building flow graphs visually. This approach is perfect for designers and rapid prototyping. However, programmers often prefer **full control in code** for complex systems, dynamic behavior, or when visual tools become limiting.

**Demo 13 proves a critical architectural principle:** Every feature you've seen in the visual workflow has a **complete, type-safe C# API**. This demo revisits all 11 previous scenarios, removing all Inspector bindings and Graph configurations, replacing them with runtime code.

:::tip 💡 What You'll Learn
- How to register/remove listeners programmatically (`AddListener`, `RemoveListener`)
- Dynamic priority control (`AddPriorityListener`)
- Runtime condition registration (`AddConditionalListener`)
- Scheduling APIs (`RaiseDelayed`, `RaiseRepeating`, `Cancel`)
- Building Flow Graphs in code (`AddTriggerEvent`, `AddChainEvent`)
- Persistent listener management (`AddPersistentListener`)
- Lifecycle management (`OnEnable`, `OnDisable`, cleanup patterns)

:::

---

## 🎬 Demo Structure
```
📁 Assets/TinyGiants/GameEventSystem/Demo/13_RuntimeAPI/
│
├── 📁 01_VoidEvent             ➔ 🔘 [ Code-based void event binding ]
├── 📁 02_BasicTypesEvent       ➔ 🔢 [ Generic event registration ]
├── 📁 03_CustomTypeEvent       ➔ 💎 [ Custom class binding ]
├── 📁 04_CustomSenderTypeEvent ➔ 👥 [ Dual-generic listeners ]
│
├── 📁 05_PriorityEvent         ➔ 🥇 [ Priority management in code ]
├── 📁 06_ConditionalEvent      ➔ 🛡️ [ Predicate-based filtering ]
├── 📁 07_DelayedEvent          ➔ ⏱️ [ Scheduling & cancellation ]
├── 📁 08_RepeatingEvent        ➔ 🔄 [ Loop management & callbacks ]
│
├── 📁 09_PersistentEvent       ➔ 🛡️ [ Cross-scene listener survival ]
├── 📁 10_TriggerEvent          ➔ 🕸️ [ Parallel graph construction ]
└── 📁 11_ChainEvent            ➔ ⛓️ [ Sequential pipeline building ]
```

**Key Difference from 01-11:**
- **Scene Setup:** Identical (same turrets, targets, UI buttons)
- **Visual Configuration:** ❌ REMOVED (no Behavior window configs, no Flow Graphs)
- **Code Implementation:** All logic moved to `OnEnable`/`OnDisable`/lifecycle methods

---

## 🔄 Visual vs Code Paradigm Shift

| Feature                | Visual Workflow (01-11)                 | Code Workflow (Demo 13)                                      |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------ |
| **Listener Binding**   | Drag & drop in Behavior window          | `event.AddListener(Method)` in `OnEnable`                    |
| **Conditional Logic**  | Condition Tree in Inspector             | `event.AddConditionalListener(Method, Predicate)`            |
| **Execution Priority** | Drag to reorder in Behavior window      | `event.AddPriorityListener(Method, priority)`                |
| **Delay/Repeat**       | Delay nodes in Behavior window          | `event.RaiseDelayed(seconds)`, `event.RaiseRepeating(interval, count)` |
| **Flow Graphs**        | Visual connections in Flow Graph window | `event.AddTriggerEvent(target, ...)`, `event.AddChainEvent(target, ...)` |
| **Cleanup**            | Automatic when GameObject destroyed     | **Manual** in `OnDisable`/`OnDestroy`                        |

:::warning ⚠️ Critical Lifecycle Rule

**Manual registration = Manual cleanup**. Every `AddListener` in `OnEnable` MUST have corresponding `RemoveListener` in `OnDisable`. Failure to cleanup causes:

- Memory leaks
- Duplicate listener execution
- Listeners executing on destroyed objects (NullReferenceException)

:::

---

## 📚 API Scenarios

### 01 Void Event: Basic Registration

**Visual → Code Translation:**
- ❌ Inspector: Drag `OnEventReceived` into Behavior window
- ✅ Code: Call `AddListener` in `OnEnable`

**RuntimeAPI_VoidEventRaiser.cs:**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventRaiser : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;  // ← Still uses asset reference

    public void RaiseBasicEvent()
    {
        if (voidEvent) voidEvent.Raise();  // ← Identical to visual workflow
    }
}
```

**RuntimeAPI_VoidEventReceiver.cs:**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventReceiver : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;

    [SerializeField] private Rigidbody targetRigidbody;

    // ✅ REGISTER: When enabled
    private void OnEnable()
    {
        voidEvent.AddListener(OnEventReceived);  // ← Replaces Inspector binding
    }

    // ✅ CLEANUP: When disabled
    private void OnDisable()
    {
        voidEvent.RemoveListener(OnEventReceived);  // ← MANDATORY cleanup
    }
    
    // Listener method (same as visual workflow)
    public void OnEventReceived()
    {
        // Apply physics...
        targetRigidbody.AddForce(Vector3.up * 5f, ForceMode.Impulse);
    }
}
```

**Key Points:**
- 🎯 **Event Asset:** Still referenced via `[GameEventDropdown]`
- 🔗 **Registration:** `AddListener(MethodName)` in `OnEnable`
- 🧹 **Cleanup:** `RemoveListener(MethodName)` in `OnDisable`
- ⚡ **Signature:** Method must match event type (`void` for `GameEvent`)

---

### 02 Basic Types: Generic Registration

**Demonstrates:** Type inference for generic events

**RuntimeAPI_BasicTypesEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<string> messageEvent;
[GameEventDropdown] public GameEvent<Vector3> movementEvent;
[GameEventDropdown] public GameEvent<GameObject> spawnEvent;
[GameEventDropdown] public GameEvent<Material> changeMaterialEvent;

public void RaiseString()
{
    messageEvent.Raise("Hello World");  // ← Type inferred from event
}

public void RaiseVector3()
{
    movementEvent.Raise(new Vector3(0, 2, 0));
}
```

**RuntimeAPI_BasicTypesEventReceiver.cs:**
```csharp
private void OnEnable()
{
    // Compiler infers <string>, <Vector3>, etc. from method signatures
    messageEvent.AddListener(OnMessageReceived);     // void(string)
    movementEvent.AddListener(OnMoveReceived);       // void(Vector3)
    spawnEvent.AddListener(OnSpawnReceived);         // void(GameObject)
    changeMaterialEvent.AddListener(OnMaterialReceived);  // void(Material)
}

private void OnDisable()
{
    messageEvent.RemoveListener(OnMessageReceived);
    movementEvent.RemoveListener(OnMoveReceived);
    spawnEvent.RemoveListener(OnSpawnReceived);
    changeMaterialEvent.RemoveListener(OnMaterialReceived);
}

public void OnMessageReceived(string msg) { /* ... */ }
public void OnMoveReceived(Vector3 pos) { /* ... */ }
public void OnSpawnReceived(GameObject prefab) { /* ... */ }
public void OnMaterialReceived(Material mat) { /* ... */ }
```

**Key Points:**
- ✅ **Type Safety:** Compiler enforces signature match
- ✅ **Auto-Inference:** No manual type specification needed
- ⚠️ **Mismatch Error:** `void(int)` cannot bind to `GameEvent<string>`

---

### 03 Custom Type: Complex Data Binding

**Demonstrates:** Auto-generated generic classes

**RuntimeAPI_CustomTypeEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<DamageInfo> physicalDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> fireDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> criticalStrikeEvent;

public void DealPhysicalDamage()
{
    DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, hitPoint, "Player01");
    physicalDamageEvent.Raise(info);  // ← Custom class as argument
}
```

**RuntimeAPI_CustomTypeEventReceiver.cs:**
```csharp
private void OnEnable()
{
    // Bind multiple events to same handler
    physicalDamageEvent.AddListener(OnDamageReceived);
    fireDamageEvent.AddListener(OnDamageReceived);
    criticalStrikeEvent.AddListener(OnDamageReceived);
}

private void OnDisable()
{
    physicalDamageEvent.RemoveListener(OnDamageReceived);
    fireDamageEvent.RemoveListener(OnDamageReceived);
    criticalStrikeEvent.RemoveListener(OnDamageReceived);
}

public void OnDamageReceived(DamageInfo info)
{
    // Parse custom class fields
    float damage = info.amount;
    DamageType type = info.type;
    bool isCrit = info.isCritical;
    
    // Apply logic based on data...
}
```

**Key Points:**
- 📦 **Auto-Generated:** `GameEvent<DamageInfo>` class created by plugin
- 🔗 **Multiple Bindings:** Same method can listen to multiple events
- ⚡ **Data Access:** Full access to custom class properties

---

### 04 Custom Sender: Dual-Generic Listeners

**Demonstrates:** Accessing event source context

**RuntimeAPI_CustomSenderTypeEventRaiser.cs:**
```csharp
// Physical sender: GameObject
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> turretEvent;

// Logical sender: Custom class
[GameEventDropdown] public GameEvent<PlayerStats, DamageInfo> systemEvent;

public void RaiseTurretDamage()
{
    DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPoint, "Turret");
    turretEvent.Raise(this.gameObject, info);  // ← Pass sender as first arg
}

public void RaiseSystemDamage()
{
    PlayerStats admin = new PlayerStats("DragonSlayer_99", 99, 1);
    DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPoint, "Admin");
    systemEvent.Raise(admin, info);  // ← Custom class as sender
}
```

**RuntimeAPI_CustomSenderTypeEventReceiver.cs:**
```csharp
private void OnEnable()
{
    turretEvent.AddListener(OnTurretAttackReceived);      // (GameObject, DamageInfo)
    systemEvent.AddListener(OnSystemAttackReceived);      // (PlayerStats, DamageInfo)
}

private void OnDisable()
{
    turretEvent.RemoveListener(OnTurretAttackReceived);
    systemEvent.RemoveListener(OnSystemAttackReceived);
}

// Signature: void(GameObject, DamageInfo)
public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
{
    Vector3 attackerPos = sender.transform.position;  // ← Access sender GameObject
    // React to physical attacker...
}

// Signature: void(PlayerStats, DamageInfo)
public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
{
    string attackerName = sender.playerName;  // ← Access sender data
    int factionId = sender.factionId;
    // React to logical attacker...
}
```

**Key Points:**
- 🎯 **Context Awareness:** Listeners know WHO triggered the event
- 🔀 **Flexible Senders:** GameObject OR custom class
- ⚡ **Signature Match:** Method params MUST match event generics

---

### 05 Priority: Execution Order Control

**Visual → Code Translation:**
- ❌ Inspector: Drag to reorder listeners in Behavior window
- ✅ Code: Specify `priority` parameter (higher = earlier)

**RuntimeAPI_PriorityEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> orderedHitEvent;
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> chaoticHitEvent;

private void OnEnable()
{
    // ✅ ORDERED: High priority executes FIRST
    orderedHitEvent.AddPriorityListener(ActivateBuff, priority: 100);  // Runs 1st
    orderedHitEvent.AddPriorityListener(ResolveHit, priority: 50);     // Runs 2nd
    
    // ❌ CHAOTIC: Wrong order intentionally
    chaoticHitEvent.AddPriorityListener(ResolveHit, priority: 80);     // Runs 1st (too early!)
    chaoticHitEvent.AddPriorityListener(ActivateBuff, priority: 40);   // Runs 2nd (too late!)
}

private void OnDisable()
{
    // MUST remove priority listeners specifically
    orderedHitEvent.RemovePriorityListener(ActivateBuff);
    orderedHitEvent.RemovePriorityListener(ResolveHit);
    
    chaoticHitEvent.RemovePriorityListener(ResolveHit);
    chaoticHitEvent.RemovePriorityListener(ActivateBuff);
}

public void ActivateBuff(GameObject sender, DamageInfo args)
{
    _isBuffActive = true;  // ← Must run BEFORE ResolveHit
}

public void ResolveHit(GameObject sender, DamageInfo args)
{
    float damage = _isBuffActive ? args.amount * 5f : args.amount;  // ← Checks buff state
}
```

**Key Points:**
- 🔢 **Priority Values:** Higher numbers = earlier execution
- ⚠️ **Order Matters:** `ActivateBuff(100) → ResolveHit(50)` = CRIT HIT
- ❌ **Wrong Order:** `ResolveHit(80) → ActivateBuff(40)` = Normal hit
- 🧹 **Cleanup:** Use `RemovePriorityListener` (not `RemoveListener`)

---

### 06 Conditional: Predicate-Based Filtering

**Visual → Code Translation:**
- ❌ Inspector: Visual Condition Tree in Behavior window
- ✅ Code: Predicate function passed to `AddConditionalListener`

**RuntimeAPI_ConditionalEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent<AccessCard> requestAccessEvent;

private void OnEnable()
{
    // Register with condition function
    // OpenVault ONLY called if CanOpen returns true
    requestAccessEvent.AddConditionalListener(OpenVault, CanOpen);
}

private void OnDisable()
{
    requestAccessEvent.RemoveConditionalListener(OpenVault);
}

// ✅ CONDITION FUNCTION (Predicate)
// Replaces visual Condition Tree
public bool CanOpen(AccessCard card)
{
    return securityGrid.IsPowerOn && (
        card.securityLevel >= 4 || 
        departments.Contains(card.department) ||
        (card.securityLevel >= 1 && Random.Range(0, 100) > 70)
    );
}

// ✅ ACTION (Only executes if condition passed)
public void OpenVault(AccessCard card)
{
    // Assumes all conditions met
    Debug.Log($"ACCESS GRANTED to {card.holderName}");
    StartCoroutine(OpenDoorSequence());
}
```

**Key Points:**
- ✅ **Predicate Function:** Returns `bool`, takes event args
- 🔒 **Gate Keeper:** Action ONLY runs if predicate returns `true`
- 🧹 **Cleanup:** Use `RemoveConditionalListener` (not `RemoveListener`)
- ⚡ **Evaluation:** Predicate runs BEFORE action method

---

### 07 Delayed: Scheduling & Cancellation

**Visual → Code Translation:**
- ❌ Behavior: "Action Delay = 5.0s" in Inspector
- ✅ Code: `event.RaiseDelayed(5f)` returns `ScheduleHandle`

**RuntimeAPI_DelayedEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent explodeEvent;

private ScheduleHandle _handle;  // ← Track the scheduled task

public void ArmBomb()
{
    // Schedule event 5 seconds later
    _handle = explodeEvent.RaiseDelayed(5f);  // ← Returns handle
    
    Debug.Log("Bomb armed! 5 seconds to defuse...");
}

public void CutRedWire() => ProcessCut("Red");
public void CutGreenWire() => ProcessCut("Green");

private void ProcessCut(string color)
{
    if (color == _safeWireColor)
    {
        // Cancel the scheduled explosion
        explodeEvent.CancelDelayed(_handle);  // ← Use handle to cancel
        Debug.Log("DEFUSED! Event cancelled.");
    }
    else
    {
        Debug.LogWarning("Wrong wire! Clock still ticking...");
    }
}
```

**Key Points:**
- ⏱️ **Scheduling:** `RaiseDelayed(seconds)` queues event
- 📍 **Handle:** Store return value to cancel later
- 🛑 **Cancellation:** `CancelDelayed(handle)` removes from queue
- ⚠️ **Timing:** Event executes AFTER delay if not cancelled

---

### 08 Repeating: Loop Management & Callbacks

**Visual → Code Translation:**
- ❌ Behavior: "Repeat Interval = 1.0s, Repeat Count = 5" in Inspector
- ✅ Code: `event.RaiseRepeating(interval, count)` with callbacks

**RuntimeAPI_RepeatingEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent finitePulseEvent;

private ScheduleHandle _handle;

public void ActivateBeacon()
{
    // Start loop: 1s interval, 5 times
    _handle = finitePulseEvent.RaiseRepeating(interval: 1.0f, count: 5);
    
    // ✅ HOOK: Triggered every iteration
    _handle.OnStep += (currentCount) => 
    {
        Debug.Log($"Pulse #{currentCount} emitted");
    };
    
    // ✅ HOOK: Triggered when loop finishes naturally
    _handle.OnCompleted += () => 
    {
        Debug.Log("Beacon sequence completed");
        UpdateUI("IDLE");
    };
    
    // ✅ HOOK: Triggered when cancelled manually
    _handle.OnCancelled += () => 
    {
        Debug.Log("Beacon interrupted");
        UpdateUI("ABORTED");
    };
}

public void StopSignal()
{
    if (_handle != null)
    {
        finitePulseEvent.CancelRepeating(_handle);  // ← Stops loop
    }
}
```

**Key Points:**
- 🔁 **Finite Loop:** `RaiseRepeating(1.0f, 5)` = 5 pulses at 1s intervals
- ∞ **Infinite Loop:** `RaiseRepeating(1.0f, -1)` = endless until cancelled
- 📡 **Callbacks:** `OnStep`, `OnCompleted`, `OnCancelled` events
- 🛑 **Manual Stop:** `CancelRepeating(handle)` for infinite loops

---

### 09 Persistent: Cross-Scene Listener Survival

**Visual → Code Translation:**
- ❌ Inspector: Check "Persistent Event" in Behavior window
- ✅ Code: `AddPersistentListener` in `Awake` + `DontDestroyOnLoad`

**RuntimeAPI_PersistentEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent fireAEvent;  // Persistent
[GameEventDropdown] public GameEvent fireBEvent;  // Standard

private void Awake()
{
    DontDestroyOnLoad(gameObject);  // ← Survive scene loads
    
    // ✅ PERSISTENT LISTENER (Survives scene reload)
    fireAEvent.AddPersistentListener(OnFireCommandA);
}

private void OnDestroy()
{
    // MUST remove persistent listeners manually
    fireAEvent.RemovePersistentListener(OnFireCommandA);
}

private void OnEnable()
{
    // ❌ STANDARD LISTENER (Dies with scene)
    fireBEvent.AddListener(OnFireCommandB);
}

private void OnDisable()
{
    fireBEvent.RemoveListener(OnFireCommandB);
}

public void OnFireCommandA() 
{ 
    Debug.Log("Persistent listener survived scene reload"); 
}

public void OnFireCommandB() 
{ 
    Debug.Log("Standard listener (will break after reload)"); 
}
```

**Key Points:**
- 🧬 **Singleton Pattern:** `DontDestroyOnLoad` + persistent listener
- ✅ **Survives Reload:** `AddPersistentListener` binds to global registry
- ❌ **Standard Dies:** `AddListener` bindings destroyed with scene
- 🧹 **Cleanup:** Use `OnDestroy` for persistent, `OnDisable` for standard

---

### 10 Trigger Event: Building Parallel Graphs in Code

**Visual → Code Translation:**
- ❌ Flow Graph: Visual nodes and connections
- ✅ Code: `AddTriggerEvent(target, ...)` in `OnEnable`

**RuntimeAPI_TriggerEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onCommand;      // Root
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onActiveBuff;   // Branch A
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onTurretFire;   // Branch B
[GameEventDropdown] public GameEvent<DamageInfo> onHoloData;                 // Branch C (type conversion)
[GameEventDropdown] public GameEvent onGlobalAlarm;                          // Branch D (void)

private TriggerHandle _buffAHandle;
private TriggerHandle _fireAHandle;
private TriggerHandle _holoHandle;
private TriggerHandle _alarmHandle;

private void OnEnable()
{
    // ✅ BUILD PARALLEL GRAPH IN CODE
    
    // Branch A: Buff (Priority 100, Conditional)
    _buffAHandle = onCommand.AddTriggerEvent(
        targetEvent: onActiveBuff,
        delay: 0f,
        condition: (sender, args) => sender == turretA,  // ← Only Turret A
        passArgument: true,
        priority: 100  // ← High priority
    );
    
    // Branch B: Fire (Priority 50, Conditional)
    _fireAHandle = onCommand.AddTriggerEvent(
        targetEvent: onTurretFire,
        delay: 0f,
        condition: (sender, args) => sender == turretA,
        passArgument: true,
        priority: 50  // ← Lower priority (runs after buff)
    );
    
    // Branch C: Holo Data (Type conversion, Delayed)
    _holoHandle = onCommand.AddTriggerEvent(
        targetEvent: onHoloData,  // ← GameEvent<DamageInfo> (no sender)
        delay: 1f,  // ← 1 second delay
        passArgument: true
    );
    
    // Branch D: Global Alarm (Void conversion)
    _alarmHandle = onCommand.AddTriggerEvent(
        targetEvent: onGlobalAlarm  // ← GameEvent (void, no args)
    );
    
    // ✅ HOOK: Callback when trigger fires
    _buffAHandle.OnTriggered += () => Debug.Log("Buff triggered via code graph");
}

private void OnDisable()
{
    // ✅ CLEANUP: MANDATORY for dynamic triggers
    onCommand.RemoveTriggerEvent(_buffAHandle);
    onCommand.RemoveTriggerEvent(_fireAHandle);
    onCommand.RemoveTriggerEvent(_holoHandle);
    onCommand.RemoveTriggerEvent(_alarmHandle);
}
```

**Graph Visualization (Code-Defined):**
```
📡 Root: onCommand.Raise(sender, info)
│
├─ 🔱 [ Branch: Unit A ] ➔ 🛡️ Guard: `Sender == Turret_A`
│  ├─ 💎 [Prio: 100] ➔ 🛡️ onActiveBuff()      ✅ High-Priority Sync
│  └─ ⚡ [Prio: 50 ] ➔ 🔥 onTurretFire()      ✅ Sequential Action
│
├─ 🔱 [ Branch: Analytics ] ➔ 🔢 Signature: `<DamageInfo>`
│  └─ ⏱️ [ Delay: 1.0s ] ➔ 📽️ onHoloData()    ✅ Delayed Data Relay
│
└─ 🔱 [ Branch: Global ] ➔ 🔘 Signature: `<void>`
   └─ 🚀 [ Instant ] ➔ 🚨 onGlobalAlarm()     ✅ Immediate Signal
```

**Key Points:**
- 🌳 **Parallel Execution:** All branches evaluate simultaneously
- 🔢 **Priority:** Controls execution order within passing branches
- ✅ **Conditions:** Predicate functions filter by sender/args
- 🔄 **Type Conversion:** Automatic argument adaptation
- 📡 **Callbacks:** `OnTriggered` event per handle
- 🧹 **Cleanup:** `RemoveTriggerEvent(handle)` REQUIRED

---

### 11 Chain Event: Building Sequential Pipelines in Code

**Visual → Code Translation:**
- ❌ Flow Graph: Linear node sequence
- ✅ Code: `AddChainEvent(target, ...)` in `OnEnable`

**RuntimeAPI_ChainEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnStartSequenceEvent;  // Root
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnSystemCheckEvent;    // Step 1
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnChargeEvent;         // Step 2
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnFireEvent;           // Step 3
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnCoolDownEvent;       // Step 4
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnArchiveEvent;        // Step 5

private ChainHandle _checkHandle;
private ChainHandle _chargeHandle;
private ChainHandle _fireHandle;
private ChainHandle _cooldownHandle;
private ChainHandle _archiveHandle;

private void OnEnable()
{
    // ✅ BUILD SEQUENTIAL CHAIN IN CODE
    
    // Step 1: System Check (Conditional gate)
    _checkHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnSystemCheckEvent,
        delay: 0f,
        duration: 0f,
        condition: (sender, args) => chainEventReceiver.IsSafetyCheckPassed,  // ← Gate
        passArgument: true,
        waitForCompletion: false
    );
    
    // Step 2: Charge (1 second duration)
    _chargeHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnChargeEvent,
        delay: 0f,
        duration: 1f,  // ← Chain pauses here for 1s
        passArgument: true
    );
    
    // Step 3: Fire (Instant)
    _fireHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnFireEvent,
        passArgument: true
    );
    
    // Step 4: Cool Down (0.5s delay + 1s duration + wait for completion)
    _cooldownHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnCoolDownEvent,
        delay: 0.5f,  // ← Pre-delay
        duration: 1f,  // ← Duration after action
        passArgument: true,
        waitForCompletion: true  // ← Waits for receiver coroutines
    );
    
    // Step 5: Archive (Arguments blocked)
    _archiveHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnArchiveEvent,
        passArgument: false  // ← Downstream receives null/default
    );
}

private void OnDisable()
{
    // ✅ CLEANUP: MANDATORY for dynamic chains
    OnStartSequenceEvent.RemoveChainEvent(_checkHandle);
    OnStartSequenceEvent.RemoveChainEvent(_chargeHandle);
    OnStartSequenceEvent.RemoveChainEvent(_fireHandle);
    OnStartSequenceEvent.RemoveChainEvent(_cooldownHandle);
    OnStartSequenceEvent.RemoveChainEvent(_archiveHandle);
    
    // Alternative: OnStartSequenceEvent.RemoveAllChainEvents();
}
```

**Pipeline Visualization (Code-Defined):**
```
🚀 [ ROOT ] OnStartSequenceEvent
│
├─ 🛡️ [ GUARD ] ➔ Safety Check
│  └─► ⚙️ OnSystemCheckEvent             ✅ Condition Passed
│
├─ ⏱️ [ FLOOR ] ➔ Duration: 1.0s
│  └─► ⚡ OnChargeEvent                  ✅ Minimum Pacing Met
│
├─ 🚀 [ INSTANT ] ➔ Immediate Trigger
│  └─► 🔥 OnFireEvent                    ✅ Executed
│
├─ ⌛ [ ASYNC ] ➔ Delay: 0.5s | Dur: 1.0s | Wait: ON
│  └─► ❄️ OnCoolDownEvent                ✅ Async Recovery Done
│
└─ 🧹 [ FILTER ] ➔ Block Arguments
   └─► 💾 OnArchiveEvent                 ✅ Data Cleaned & Saved
```

**Key Points:**
- 🔗 **Sequential Execution:** Steps run one-by-one, not parallel
- ✅ **Conditional Gate:** Failed condition terminates entire chain
- ⏱️ **Duration:** Chain pauses for specified time
- 🕐 **Wait For Completion:** Blocks until receiver coroutines finish
- 🔒 **Argument Blocking:** `passArgument: false` sends default values
- 🧹 **Cleanup:** `RemoveChainEvent(handle)` or `RemoveAllChainEvents()`

---

## 🔑 API Reference Summary

### Listener Registration

| Method                                      | Use Case                  | Cleanup Method                      |
| ------------------------------------------- | ------------------------- | ----------------------------------- |
| `AddListener(method)`                       | Standard binding          | `RemoveListener(method)`            |
| `AddPriorityListener(method, priority)`     | Execution order control   | `RemovePriorityListener(method)`    |
| `AddConditionalListener(method, predicate)` | Predicate-based filtering | `RemoveConditionalListener(method)` |
| `AddPersistentListener(method)`             | Cross-scene survival      | `RemovePersistentListener(method)`  |

### Event Raising

| Method                            | Use Case             | Returns          |
| --------------------------------- | -------------------- | ---------------- |
| `Raise()`                         | Immediate execution  | `void`           |
| `Raise(arg)`                      | With single argument | `void`           |
| `Raise(sender, arg)`              | With sender context  | `void`           |
| `RaiseDelayed(seconds)`           | Scheduled execution  | `ScheduleHandle` |
| `RaiseRepeating(interval, count)` | Loop execution       | `ScheduleHandle` |

### Schedule Management

| Method                    | Use Case                   |
| ------------------------- | -------------------------- |
| `CancelDelayed(handle)`   | Stop pending delayed event |
| `CancelRepeating(handle)` | Stop active loop           |
| `handle.OnStep`           | Loop iteration callback    |
| `handle.OnCompleted`      | Loop completion callback   |
| `handle.OnCancelled`      | Cancellation callback      |

### Flow Graph Construction

| Method                         | Use Case        | Returns         |
| ------------------------------ | --------------- | --------------- |
| `AddTriggerEvent(target, ...)` | Parallel branch | `TriggerHandle` |
| `RemoveTriggerEvent(handle)`   | Remove branch   | `void`          |
| `AddChainEvent(target, ...)`   | Sequential step | `ChainHandle`   |
| `RemoveChainEvent(handle)`     | Remove step     | `void`          |
| `RemoveAllChainEvents()`       | Clear all steps | `void`          |

---

## ⚠️ Critical Best Practices

### ✅ DO
```csharp
private void OnEnable()
{
    myEvent.AddListener(OnReceived);  // ← Register
}

private void OnDisable()
{
    myEvent.RemoveListener(OnReceived);  // ← ALWAYS cleanup
}
```

### ❌ DON'T
```csharp
private void Start()
{
    myEvent.AddListener(OnReceived);  // ← Registered in Start...
}
// ❌ NO OnDisable cleanup → MEMORY LEAK
```

### Handle Management
```csharp
private ScheduleHandle _handle;

public void StartLoop()
{
    _handle = myEvent.RaiseRepeating(1f, -1);
}

public void StopLoop()
{
    if (_handle != null) myEvent.CancelRepeating(_handle);  // ← Use stored handle
}
```

### Lifecycle Patterns

| Lifecycle Method | Use For                                    |
| ---------------- | ------------------------------------------ |
| `Awake`          | Persistent listeners + `DontDestroyOnLoad` |
| `OnEnable`       | Standard listeners, triggers, chains       |
| `OnDisable`      | Remove standard listeners                  |
| `OnDestroy`      | Remove persistent listeners                |

---

## 🎯 When to Choose Code vs Visual

### Choose Visual Workflow When:
- ✅ Designers need direct control
- ✅ Rapid iteration is priority
- ✅ Logic is relatively static
- ✅ Visual debugging is beneficial
- ✅ Team collaboration across disciplines

### Choose Code Workflow When:
- ✅ Logic is highly dynamic (runtime graph building)
- ✅ Conditions require complex C# code
- ✅ Integration with existing code systems
- ✅ Advanced scheduling patterns
- ✅ Programmatic listener management
- ✅ Version control of logic (code diffs clearer than .asset diffs)

### Hybrid Approach:

- 🎨 **Visual:** Event definitions, simple bindings
- 💻 **Code:** Complex conditions, dynamic graphs, runtime scheduling
- **Example:** Define events visually, but build Trigger/Chain graphs in code for procedural systems

---

## 📚 Related Documentation

- **[Raising and Scheduling](../scripting/raising-and-scheduling.md)** - Complete scheduling API guide
- **[Listening Strategies](../scripting/listening-strategies.md)** - Listener patterns and best practices
- **[Programmatic Flow](../scripting/programmatic-flow.md)** - Building Trigger/Chain graphs via code
- **[Best Practices](../scripting/best-practices.md)** - Code patterns and anti-patterns
- **[API Reference](../scripting/api-reference.md)** - Complete method signatures
