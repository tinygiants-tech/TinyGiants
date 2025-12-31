---
sidebar_label: '09 Persistent Event'
sidebar_position: 10
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 09 Persistent Event: Surviving Scene Loads

<!-- <VideoGif src="/video/game-event-system/09-persistent-event.mp4" /> -->

## 📋 Overview

In Unity, when you load a new scene, all GameObjects (and their event listeners) from the previous scene are destroyed. **Persistent Events** solve this problem by storing listener bindings in a global manager that survives scene transitions—essential for global systems like music controllers, inventory managers, or achievement trackers.

:::tip 💡 What You'll Learn
- The scene transition cleanup problem in Unity
- How to enable event persistence with a single checkbox
- The difference between persistent and non-persistent event behavior
- Architectural patterns for cross-scene event systems

:::

---

## 🎬 Demo Scene
```
Assets/TinyGiants/GameEventSystem/Demo/09_PersistentEvent/09_PersistentEvent_1.unity
```

### Scene Composition

**Visual Elements:**
- 🔴 **Turret_A (Left)** - Red turret with grey base
  - Controlled by **persistent** event `OnTurretA`
  - Has rotating head mechanism
  - Will continue working after scene reload
  
- 🔵 **Turret_B (Right)** - Blue turret with grey base
  - Controlled by **non-persistent** event `OnTurretB`
  - Identical functionality to Turret A
  - Will stop working after scene reload

- 🎯 **TargetDummy** - Center capsule target
  - Both turrets aim and fire at this target
  - Has Rigidbody for knockback physics

- 📋 **HoloDisplay** - Information panel
  - Displays explanatory text about the experiment
  - Shows persistent state information

**UI Layer (Canvas):**
- 🎮 **Three Buttons** - Bottom of the screen
  - "Fire A" (White) → Triggers `PersistentEventRaiser.FireTurretA()`
  - "Fire B" (White) → Triggers `PersistentEventRaiser.FireTurretB()`
  - "Load Scene 2" (Green) → Reloads the scene to test persistence

**Game Logic Layer (Demo Scripts):**
- 📤 **PersistentEventRaiser** - Standard scene-based raiser
  - Holds references to both events
  - Destroyed and recreated on scene reload
  
- 📥 **PersistentEventReceiver** - **DontDestroyOnLoad** singleton
  - Survives scene transitions
  - Holds combat logic for both turrets
  - Uses **dependency injection** pattern for scene references

- 🔧 **Scene Setup** - Dependency injection helper
  - Runs on scene load
  - Re-injects new turret references into persistent receiver
  - Enables persistent receiver to control new scene objects

---

## 🎮 How to Interact

### The Persistence Experiment

This demo proves that persistent events maintain their bindings across scene loads while non-persistent events are cleared.

---

### Step 1: Enter Play Mode

Press the **Play** button in Unity.

**Initial State:**
- Two turrets (red and blue) idle in the scene
- HoloDisplay shows explanatory text
- Console is clear

---

### Step 2: Initial Functionality Test

**Click "Fire A":**
- 🎯 Red turret (left) rotates toward target
- 🚀 Projectile fires and travels
- 💥 On impact:
  - Orange floating text "CRIT! -500"
  - Large explosion VFX
  - Camera shake
  - Target knocked back
- 📝 Console: `[Raiser] Broadcasting Command: Fire Turret A`
- 📝 Console: `[Receiver] Received Command A. Engaging...`

**Click "Fire B":**
- 🎯 Blue turret (right) rotates toward target
- 🚀 Projectile fires
- 💥 On impact:
  - White floating text "-200"
  - Normal explosion VFX
  - No camera shake (weaker attack)
  - Target knocked back
- 📝 Console: `[Raiser] Broadcasting Command: Fire Turret B`
- 📝 Console: `[Receiver] Received Command B. Engaging...`

**Result:** ✅ Both turrets work perfectly in the initial scene.

---

### Step 3: The Scene Reload (The Purge)

**Click "Load Scene 2":**

**What Happens Behind the Scenes:**
1. 🔄 Unity's `SceneManager.LoadScene()` is called
2. 💀 **Scene Destruction Phase:**
   - All scene GameObjects are destroyed:
     - ❌ Turret_A destroyed
     - ❌ Turret_B destroyed
     - ❌ TargetDummy destroyed
     - ❌ PersistentEventRaiser destroyed
   - 🗑️ GameEventManager cleans up **non-persistent** event listeners
     - `OnTurretB` listeners cleared
     - `OnTurretA` listeners **preserved** (persistent flag)

3. 🏗️ **Scene Recreation Phase:**
   - New Turret_A spawned
   - New Turret_B spawned
   - New TargetDummy spawned
   - New PersistentEventRaiser spawned

4. ✨ **Persistent Objects:**
   - ✅ `PersistentEventReceiver` **survives** (DontDestroyOnLoad)
   - ✅ Its method bindings to `OnTurretA` **still active**

5. 🔧 **Dependency Injection:**
   - `PersistentEventSceneSetup.Start()` runs
   - Calls `PersistentEventReceiver.UpdateSceneReferences()`
   - Injects new scene turret references into persistent receiver

**Visual Changes:**
- Scene briefly goes black during reload
- Turrets respawn in same positions
- UI buttons remain functional

---

### Step 4: Post-Reload Survival Test

**Click "Fire A" (After Reload):**

**What Happens:**
1. 🎯 Red turret rotates and fires (works perfectly!)
2. 💥 Full combat sequence plays
3. 📝 Console: `[Receiver] Received Command A. Engaging...`

**Why It Works:**
```
Button → fireAEvent.Raise() 
       → GameEventManager finds persistent binding
       → PersistentEventReceiver.OnFireCommandA() executes
       → Uses newly injected turret reference
       → Turret fires
```

**Result:** ✅ **Persistent event survived scene reload!**

---

**Click "Fire B" (After Reload):**

**What Happens:**
1. 🔇 **NOTHING**
2. 📝 Console: `[Raiser] Broadcasting Command: Fire Turret B`
3. ❌ No receiver log
4. Blue turret does not move or fire

**Why It Failed:**
```
🔘 Input: Button Click
│
🚀 Event: fireBEvent.Raise()
│
🔍 Registry: [ GameEventManager Lookup ]
│   
├─❓ Result: NONE Found
│  └─ 🗑️ Reason: Bindings cleared during Scene Reload
│
🌑 Outcome: Signal Dissipated
│  └─ 👻 Result: "Lost in the void" (No receivers called)
│
📊 Status: 0 Actions Executed | ✅ System Safe (No NullRef)
```

**Result:** ❌ **Non-persistent event binding was destroyed!**

:::danger 🔴 The Dead Event

`OnTurretB` listener was cleared when the scene unloaded. The event asset still exists, but its connection to `PersistentEventReceiver.OnFireCommandB()` is **permanently broken** (unless you manually re-subscribe via code).

:::

---

## 🏗️ Scene Architecture

### The Scene Transition Problem

In standard Unity event systems:
```
🖼️ Scene A: Loaded
   └─ 🔗 Listeners: Subscribed (Local Context)
│
🚚 [ Loading Scene B... ]
│
🧹 Cleanup: Memory Purged
   └─ ❌ Result: ALL listeners cleared from the registry
│
🖼️ Scene B: Active
   └─ 🌑 Status: Event is "Empty" (No receivers)
```

This breaks global systems that need to persist across scenes.

### The Persistent Event Solution
```
🖼️ Scene A: Loaded
   └─ 🛡️ Listeners: Subscribed (Global Context)
│
🚚 [ Loading Scene B... ]
│
💎 Preservation: Handover Successful
   └─ ✅ Result: Bindings stored in the Global Persistent Registry
│
🖼️ Scene B: Active
   └─ 🔥 Status: Event is "Hot" (Listeners remain ready to fire)
```

Persistent events behave like `DontDestroyOnLoad` for event logic.

---

### Architectural Pattern: Dependency Injection

This demo uses a sophisticated pattern to handle scene references:

**The Challenge:**
- `PersistentEventReceiver` survives (DontDestroyOnLoad)
- But turrets are destroyed and recreated each scene load
- Receiver needs references to new turret instances

**The Solution:**
1. **Persistent Receiver** holds combat logic
2. **Scene Setup Script** runs on each scene load
3. Setup injects new scene references into persistent receiver
4. Receiver can now control new turrets
```
🛡️ Persistent Layer (The "Survivor")
┃  └─ 💎 PersistentEventReceiver [Survives Scene Load]
┃        ▲
┃        ║ 💉 Dependency Injection (References Re-bound)
┃        ╚══════════════════════════════════════╗
┃                                               ║
🖼️ Scene Layer (The "Context")                  ║
┃  └─ ⚙️ PersistentEventSceneSetup [Recreated]  ║
┃        │                                      ║
┃        └── 🔍 Finds & Passes References ➔ ════╝
┃              │
┃              ├── 🤖 New Turret_A [Scene Instance]
┃              └── 🤖 New Turret_B [Scene Instance]
```

---

### Event Definitions

![Game Event Editor](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

| Event Name  | Type               | Persistent Flag |
| ----------- | ------------------ | --------------- |
| `OnTurretA` | `GameEvent` (void) | ✅ Checked       |
| `OnTurretB` | `GameEvent` (void) | ❌ Unchecked     |

**Identical Events, Different Fate:**
Both are void events with the same configuration—except for one checkbox that determines their survival.

---

### Behavior Configuration

#### Persistent Event (OnTurretA)

Click the **(void)** icon for `OnTurretA` to open the Behavior Window:

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

**Critical Setting:**
- 💾 **Persistent Event:** ✅ **CHECKED**

**Warning Message:**
> "Event will behave like DontDestroyOnLoad."

**What This Means:**
- Listener bindings stored in global persistent manager
- NOT cleared during scene transitions
- Survives until explicitly removed or game exit
- Essential for cross-scene systems

---

#### Non-Persistent Event (OnTurretB)

Same configuration except:
- 💾 **Persistent Event:** ❌ **UNCHECKED**

**Result:**
- Standard Unity lifecycle
- Listeners cleared on scene unload
- Must re-subscribe if needed in new scene

---

### Sender Setup (PersistentEventRaiser)

Select the **PersistentEventRaiser** GameObject:

![PersistentEventRaiser Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-inspector.png)

**Game Events:**
- `Fire A Event`: `OnTurretA` (Persistent)
  - Tooltip: "Checked 'Persistent Event' in Editor"
- `Fire B Event`: `OnTurretB` (Non-Persistent)
  - Tooltip: "Unchecked 'Persistent Event' in Editor"

**Lifecycle:**
- ❌ Destroyed on scene reload
- ✅ Recreated with new scene
- Holds new event references (assets are persistent ScriptableObjects)

---

### Receiver Setup (PersistentEventReceiver)

Select the **PersistentEventReceiver** GameObject:

![PersistentEventReceiver Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-receiver.png)

**Combat Resources:**
- `Projectile Prefab`: Projectile (Turret Projectile)
- `Fire VFX`: MuzzleFlashVFX (Particle System)

**Feedback:**
- `Hit Normal VFX`: HitVFX_Normal (Particle System)
- `Hit Crit VFX`: HitVFX_Crit (Particle System)
- `Floating Text Prefab`: DamageFloatingText (Text Mesh Pro)
- `Hit Clip`: ExplosionSFX (Audio Clip)

**Dynamic References (Hidden):**
These are injected at runtime by Scene Setup:
- `turretA`, `headA` (Turret A references)
- `turretB`, `headB` (Turret B references)
- `targetDummy`, `targetRigidbody` (Target references)

---

### Scene Setup Configuration

Select the **Scene Setup** GameObject:

![Scene Setup Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

**Current Scene Objects:**
- `Turret A`: Turret_A (GameObject)
- `Head A`: Head (Transform) - rotation pivot
- `Turret B`: Turret_B (GameObject)
- `Head B`: Head (Transform)
- `Target Dummy`: TargetDummy (Transform)
- `Target Rigidbody`: TargetDummy (Rigidbody)

**Purpose:**
On `Start()`, this script finds the persistent receiver and injects these references, enabling it to control new scene objects.

---

## 💻 Code Breakdown

### 📤 PersistentEventRaiser.cs (Sender)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PersistentEventRaiser : MonoBehaviour
{
    [Header("Game Events")]
    [Tooltip("Configuration: Checked 'Persistent Event' in Editor.")]
    [GameEventDropdown] public GameEvent fireAEvent;
    
    [Tooltip("Configuration: Unchecked 'Persistent Event' in Editor.")]
    [GameEventDropdown] public GameEvent fireBEvent;

    /// <summary>
    /// UI Button: Commands Turret A to fire.
    /// 
    /// Since 'fireAEvent' is Persistent, this binding survives scene loads.
    /// Even after reloading, the persistent receiver will still respond.
    /// </summary>
    public void FireTurretA()
    {
        if (fireAEvent == null) return;
        
        fireAEvent.Raise();
        Debug.Log("<color=cyan>[Raiser] Broadcasting Command: Fire Turret A</color>");
    }

    /// <summary>
    /// UI Button: Commands Turret B to fire.
    /// 
    /// Since 'fireBEvent' is NOT Persistent, this binding BREAKS after scene load.
    /// The event is raised, but no one is listening anymore.
    /// </summary>
    public void FireTurretB()
    {
        if (fireBEvent == null) return;
        
        fireBEvent.Raise();
        Debug.Log("<color=orange>[Raiser] Broadcasting Command: Fire Turret B</color>");
    }
}
```

**Key Points:**
- 🎯 **Standard Component** - Not persistent, recreated each scene
- 📡 **Event References** - ScriptableObject assets (persistent)
- 🔇 **No Lifecycle Awareness** - Doesn't know if listeners survived

---

### 📥 PersistentEventReceiver.cs (Listener - Singleton)
```csharp
using UnityEngine;
using System.Collections;

public class PersistentEventReceiver : MonoBehaviour
{
    [Header("Combat Resources")]
    [SerializeField] private TurretProjectile projectilePrefab;
    [SerializeField] private ParticleSystem fireVFX;
    // ... other resources ...

    // Runtime-injected scene references
    [HideInInspector] public GameObject turretA;
    [HideInInspector] public Transform headA;
    [HideInInspector] public GameObject turretB;
    [HideInInspector] public Transform headB;
    [HideInInspector] public Transform targetDummy;
    [HideInInspector] public Rigidbody targetRigidbody;

    private bool _isFiringA;
    private bool _isFiringB;

    // Singleton pattern for persistence
    private static PersistentEventReceiver _instance;
    public static PersistentEventReceiver Instance => _instance;

    private void Awake()
    {
        // CRITICAL: DontDestroyOnLoad makes this survive scene transitions
        if (_instance == null)
        {
            _instance = this;
            DontDestroyOnLoad(gameObject);
            Debug.Log("[PersistentReceiver] Initialized with DontDestroyOnLoad.");
        }
        else if (_instance != this)
        {
            // Prevent duplicates if scene reloaded
            Destroy(gameObject);
        }
    }

    private void Update()
    {
        // Control turrets using injected references
        HandleTurretRotation(turretA, headA, ref _isFiringA);
        HandleTurretRotation(turretB, headB, ref _isFiringB);
    }

    /// <summary>
    /// [Event Callback - Persistent Binding]
    /// Bound to 'OnTurretA' with Persistent Event flag checked.
    /// 
    /// This method binding SURVIVES scene reload.
    /// After reload, this will still be called when fireAEvent.Raise() executes.
    /// </summary>
    public void OnFireCommandA()
    {
        Debug.Log("<color=cyan>[Receiver] Received Command A. Engaging...</color>");
        _isFiringA = true;
    }

    /// <summary>
    /// [Event Callback - Non-Persistent Binding]
    /// Bound to 'OnTurretB' with Persistent Event flag UNCHECKED.
    /// 
    /// This method binding is CLEARED on scene reload.
    /// After reload, this will NEVER be called again (binding is lost).
    /// </summary>
    public void OnFireCommandB()
    {
        Debug.Log("<color=orange>[Receiver] Received Command B. Engaging...</color>");
        _isFiringB = true;
    }
    
    /// <summary>
    /// Called by PersistentEventSceneSetup on each scene load.
    /// Injects new scene object references into persistent receiver.
    /// </summary>
    public void UpdateSceneReferences(
        GameObject tA, Transform hA, 
        GameObject tB, Transform hB, 
        Transform target, Rigidbody rb)
    {
        this.turretA = tA;
        this.headA = hA;
        this.turretB = tB;
        this.headB = hB;
        this.targetDummy = target;
        this.targetRigidbody = rb;
        
        Debug.Log("[PersistentReceiver] Scene references updated.");
    }

    private void HandleTurretRotation(GameObject turret, Transform head, ref bool isFiring)
    {
        if (head == null || targetDummy == null) return;

        // Idle sway or active targeting
        Quaternion targetRot;
        float speed = isFiring ? 10f : 2f;

        if (isFiring)
        {
            // Aim at target
            Vector3 dir = targetDummy.position - head.position;
            dir.y = 0;
            if (dir != Vector3.zero) 
                targetRot = Quaternion.LookRotation(dir);
            else 
                targetRot = head.rotation;
        }
        else
        {
            // Idle patrol sweep
            float angle = Mathf.Sin(Time.time * 0.5f) * 30f;
            targetRot = Quaternion.Euler(0, 180 + angle, 0);
        }

        head.rotation = Quaternion.Slerp(head.rotation, targetRot, speed * Time.deltaTime);

        // Fire when aimed
        if (isFiring && Quaternion.Angle(head.rotation, targetRot) < 5f)
        {
            PerformFireSequence(turret);
            isFiring = false;
        }
    }

    private void PerformFireSequence(GameObject turret)
    {
        // Spawn muzzle flash, launch projectile, etc.
        // ... (combat logic) ...
    }
}
```

**Key Points:**
- 🎯 **DontDestroyOnLoad** - Survives scene transitions
- 🔀 **Singleton Pattern** - Only one instance exists globally
- 📍 **Dependency Injection** - Scene references injected at runtime
- 🎭 **Dual Binding** - Persistent (A) and non-persistent (B) methods

---

### 🔧 PersistentEventSceneSetup.cs (Dependency Injector)
```csharp
using UnityEngine;

public class PersistentEventSceneSetup : MonoBehaviour
{
    [Header("Current Scene Objects")]
    public GameObject turretA;
    public Transform headA;
    public GameObject turretB;
    public Transform headB;
    public Transform targetDummy;
    public Rigidbody targetRigidbody;

    private void Start()
    {
        // Find the persistent receiver (lives in DontDestroyOnLoad scene)
        var receiver = PersistentEventReceiver.Instance;
        
        if (receiver != null)
        {
            // Inject this scene's object references
            receiver.UpdateSceneReferences(
                turretA, headA, 
                turretB, headB, 
                targetDummy, targetRigidbody
            );
            
            Debug.Log("[SceneSetup] Successfully injected scene references " +
                     "into persistent receiver.");
        }
        else
        {
            Debug.LogWarning("[SceneSetup] PersistentEventReceiver not found! " +
                            "Is the demo started correctly?");
        }
    }
}
```

**Key Points:**
- 🔧 **Runs on Scene Load** - `Start()` executes when scene initializes
- 🔍 **Finds Singleton** - Accesses persistent receiver via static instance
- 💉 **Injects References** - Passes new scene objects to persistent logic
- 🏗️ **Enables Cross-Scene Control** - Bridges persistent logic with transient objects

---

## 🔑 Key Takeaways

| Concept                    | Implementation                                               |
| -------------------------- | ------------------------------------------------------------ |
| 💾 **Persistent Event**     | Checkbox in Behavior Window preserves bindings across scenes |
| 🗑️ **Cleanup Behavior**     | Non-persistent events cleared on scene unload                |
| 🔄 **DontDestroyOnLoad**    | Receiver must survive for persistent events to work          |
| 💉 **Dependency Injection** | Pattern for connecting persistent logic with scene objects   |
| 🎯 **Single Checkbox**      | One setting determines cross-scene survival                  |

:::note 🎓 Design Insight

Persistent events are perfect for:

- **Music systems** - Background music controller that spans multiple levels
- **Inventory managers** - Player inventory persists across scene transitions
- **Achievement trackers** - Global achievement listeners that monitor all scenes
- **Analytics systems** - Event logging that never gets interrupted
- **UI systems** - Persistent HUD controllers for health, score, etc.

**Architecture Pattern:**
```
[Persistent Layer - DontDestroyOnLoad]
- Global managers
- Event receivers
- Cross-scene logic

[Scene Layer - Recreated]
- Level-specific objects
- Scene setup scripts (dependency injection)
- UI buttons and raisers
```

This separation enables clean cross-scene architecture without manual re-subscription.

:::

:::warning ⚠️ Important Considerations

1. **Receiver Must Be Persistent:** Checking "Persistent Event" only preserves the binding. The receiver GameObject must use `DontDestroyOnLoad` to survive.
2. **Scene References Break:** Even though bindings persist, references to destroyed scene objects become null. Use dependency injection to update them.
3. **Memory Management:** Persistent events stay active until game exit. Be mindful of accumulating bindings in long-running games.
4. **Initial Scene Requirement:** The persistent receiver must be present in the first loaded scene. If Scene B loads first without the receiver, persistent events won't work.

:::

---

## 🎯 What's Next?

You've mastered persistent events for cross-scene systems. Now let's explore **trigger events** for collision-based interactions.

**Next Chapter**: Learn about collision triggers in **[10 Trigger Event](./10-trigger-event.md)**

---

## 📚 Related Documentation

- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - Complete guide to persistence configuration
- **[Best Practices](../scripting/best-practices.md)** - Patterns for cross-scene event architecture
