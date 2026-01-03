---
sidebar_label: '13 运行时API'
sidebar_position: 14
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 13 运行时API：代码工作流

<!-- <VideoGif src="/video/game-event-system/13-runtime-api.mp4" /> -->

## 📋 概述

之前的示例（01-11）演示了**可视化工作流**——在检查器中绑定监听器、在行为窗口中配置条件以及可视化构建流程图。这种方法非常适合设计师和快速原型开发。然而，程序员通常更喜欢**完全的代码控制**，用于复杂系统、动态行为或可视化工具变得受限时。

**Demo 13证明了一个关键的架构原则：** 您在可视化工作流中看到的每个功能都有一个**完整的、类型安全的C# API**。本示例重新访问所有11个先前的场景，移除所有检查器绑定和图表配置，用运行时代码替换它们。

:::tip 💡 您将学到
- 如何以编程方式注册/移除监听器（`AddListener`、`RemoveListener`）
- 动态优先级控制（`AddPriorityListener`）
- 运行时条件注册（`AddConditionalListener`）
- 调度API（`RaiseDelayed`、`RaiseRepeating`、`Cancel`）
- 在代码中构建流程图（`AddTriggerEvent`、`AddChainEvent`）
- 持久化监听器管理（`AddPersistentListener`）
- 生命周期管理（`OnEnable`、`OnDisable`、清理模式）

:::

---

## 🎬 示例结构
```
📁 Assets/TinyGiants/GameEventSystem/Demo/13_RuntimeAPI/
│
├── 📁 01_VoidEvent             ➔ 🔘 [ 基于代码的void事件绑定 ]
├── 📁 02_BasicTypesEvent       ➔ 🔢 [ 泛型事件注册 ]
├── 📁 03_CustomTypeEvent       ➔ 💎 [ 自定义类绑定 ]
├── 📁 04_CustomSenderTypeEvent ➔ 👥 [ 双泛型监听器 ]
│
├── 📁 05_PriorityEvent         ➔ 🥇 [ 代码中的优先级管理 ]
├── 📁 06_ConditionalEvent      ➔ 🛡️ [ 基于谓词的过滤 ]
├── 📁 07_DelayedEvent          ➔ ⏱️ [ 调度和取消 ]
├── 📁 08_RepeatingEvent        ➔ 🔄 [ 循环管理和回调 ]
│
├── 📁 09_PersistentEvent       ➔ 🛡️ [ 跨场景监听器存活 ]
├── 📁 10_TriggerEvent          ➔ 🕸️ [ 并行图表构建 ]
└── 📁 11_ChainEvent            ➔ ⛓️ [ 顺序管道构建 ]
```

**与01-11的关键区别：**
- **场景设置：** 相同（相同的炮塔、目标、UI按钮）
- **可视化配置：** ❌ 移除（无行为窗口配置、无流程图）
- **代码实现：** 所有逻辑移至 `OnEnable`/`OnDisable`/生命周期方法

---

## 🔄 可视化与代码范式转变

| 功能           | 可视化工作流（01-11）          | 代码工作流（Demo 13）                                          |
| -------------- | ------------------------------ | -------------------------------------------------------------- |
| **监听器绑定** | 在行为窗口中拖放               | `OnEnable` 中的 `event.AddListener(Method)`                   |
| **条件逻辑**   | 检查器中的条件树               | `event.AddConditionalListener(Method, Predicate)`             |
| **执行优先级** | 在行为窗口中拖动重新排序       | `event.AddPriorityListener(Method, priority)`                 |
| **延迟/重复**  | 行为窗口中的延迟节点           | `event.RaiseDelayed(seconds)`、`event.RaiseRepeating(interval, count)` |
| **流程图**     | 流程图窗口中的可视化连接       | `event.AddTriggerEvent(target, ...)`、`event.AddChainEvent(target, ...)` |
| **清理**       | 游戏对象销毁时自动             | `OnDisable`/`OnDestroy` 中**手动**                            |

:::warning  关键生命周期规则

**手动注册 = 手动清理**。`OnEnable` 中的每个 `AddListener` 必须在 `OnDisable` 中有对应的 `RemoveListener`。清理失败会导致：

- 内存泄漏
- 监听器重复执行
- 在已销毁对象上执行监听器（NullReferenceException）

:::

---

## 📚 API场景

### 01 Void事件：基本注册

**可视化 → 代码转换：**
- ❌ 检查器：将 `OnEventReceived` 拖到行为窗口
- ✅ 代码：在 `OnEnable` 中调用 `AddListener`

**RuntimeAPI_VoidEventRaiser.cs：**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventRaiser : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;  // ← 仍使用资产引用

    public void RaiseBasicEvent()
    {
        if (voidEvent) voidEvent.Raise();  // ← 与可视化工作流相同
    }
}
```

**RuntimeAPI_VoidEventReceiver.cs：**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventReceiver : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;

    [SerializeField] private Rigidbody targetRigidbody;

    // ✅ 注册：启用时
    private void OnEnable()
    {
        voidEvent.AddListener(OnEventReceived);  // ← 替换检查器绑定
    }

    // ✅ 清理：禁用时
    private void OnDisable()
    {
        voidEvent.RemoveListener(OnEventReceived);  // ← 强制清理
    }
    
    // 监听器方法（与可视化工作流相同）
    public void OnEventReceived()
    {
        // 应用物理...
        targetRigidbody.AddForce(Vector3.up * 5f, ForceMode.Impulse);
    }
}
```

**要点：**
- 🎯 **事件资产：** 仍通过 `[GameEventDropdown]` 引用
- 🔗 **注册：** `OnEnable` 中的 `AddListener(MethodName)`
- 🧹 **清理：** `OnDisable` 中的 `RemoveListener(MethodName)`
- ⚡ **签名：** 方法必须匹配事件类型（`GameEvent` 为 `void`）

---

### 02 基本类型：泛型注册

**演示：** 泛型事件的类型推断

**RuntimeAPI_BasicTypesEventRaiser.cs：**
```csharp
[GameEventDropdown] public GameEvent<string> messageEvent;
[GameEventDropdown] public GameEvent<Vector3> movementEvent;
[GameEventDropdown] public GameEvent<GameObject> spawnEvent;
[GameEventDropdown] public GameEvent<Material> changeMaterialEvent;

public void RaiseString()
{
    messageEvent.Raise("Hello World");  // ← 从事件推断类型
}

public void RaiseVector3()
{
    movementEvent.Raise(new Vector3(0, 2, 0));
}
```

**RuntimeAPI_BasicTypesEventReceiver.cs：**
```csharp
private void OnEnable()
{
    // 编译器从方法签名推断 <string>、<Vector3> 等
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

**要点：**
- ✅ **类型安全：** 编译器强制签名匹配
- ✅ **自动推断：** 无需手动类型规范
- ⚠️ **不匹配错误：** `void(int)` 无法绑定到 `GameEvent<string>`

---

### 03 自定义类型：复杂数据绑定

**演示：** 自动生成的泛型类

**RuntimeAPI_CustomTypeEventRaiser.cs：**
```csharp
[GameEventDropdown] public GameEvent<DamageInfo> physicalDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> fireDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> criticalStrikeEvent;

public void DealPhysicalDamage()
{
    DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, hitPoint, "Player01");
    physicalDamageEvent.Raise(info);  // ← 自定义类作为参数
}
```

**RuntimeAPI_CustomTypeEventReceiver.cs：**
```csharp
private void OnEnable()
{
    // 将多个事件绑定到同一处理器
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
    // 解析自定义类字段
    float damage = info.amount;
    DamageType type = info.type;
    bool isCrit = info.isCritical;
    
    // 基于数据应用逻辑...
}
```

**要点：**
- 📦 **自动生成：** 插件创建 `GameEvent<DamageInfo>` 类
- 🔗 **多重绑定：** 同一方法可以监听多个事件
- ⚡ **数据访问：** 完全访问自定义类属性

---

### 04 自定义发送者：双泛型监听器

**演示：** 访问事件源上下文

**RuntimeAPI_CustomSenderTypeEventRaiser.cs：**
```csharp
// 物理发送者：GameObject
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> turretEvent;

// 逻辑发送者：自定义类
[GameEventDropdown] public GameEvent<PlayerStats, DamageInfo> systemEvent;

public void RaiseTurretDamage()
{
    DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPoint, "Turret");
    turretEvent.Raise(this.gameObject, info);  // ← 将发送者作为第一个参数传递
}

public void RaiseSystemDamage()
{
    PlayerStats admin = new PlayerStats("DragonSlayer_99", 99, 1);
    DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPoint, "Admin");
    systemEvent.Raise(admin, info);  // ← 自定义类作为发送者
}
```

**RuntimeAPI_CustomSenderTypeEventReceiver.cs：**
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

// 签名：void(GameObject, DamageInfo)
public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
{
    Vector3 attackerPos = sender.transform.position;  // ← 访问发送者GameObject
    // 响应物理攻击者...
}

// 签名：void(PlayerStats, DamageInfo)
public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
{
    string attackerName = sender.playerName;  // ← 访问发送者数据
    int factionId = sender.factionId;
    // 响应逻辑攻击者...
}
```

**要点：**
- 🎯 **上下文感知：** 监听器知道谁触发了事件
- 🔀 **灵活的发送者：** GameObject或自定义类
- ⚡ **签名匹配：** 方法参数必须匹配事件泛型

---

### 05 优先级：执行顺序控制

**可视化 → 代码转换：**
- ❌ 检查器：在行为窗口中拖动重新排序监听器
- ✅ 代码：指定 `priority` 参数（越高 = 越早）

**RuntimeAPI_PriorityEventReceiver.cs：**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> orderedHitEvent;
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> chaoticHitEvent;

private void OnEnable()
{
    // ✅ 有序：高优先级首先执行
    orderedHitEvent.AddPriorityListener(ActivateBuff, priority: 100);  // 第1个运行
    orderedHitEvent.AddPriorityListener(ResolveHit, priority: 50);     // 第2个运行
    
    // ❌ 混乱：故意错误的顺序
    chaoticHitEvent.AddPriorityListener(ResolveHit, priority: 80);     // 第1个运行（太早！）
    chaoticHitEvent.AddPriorityListener(ActivateBuff, priority: 40);   // 第2个运行（太晚！）
}

private void OnDisable()
{
    // 必须专门移除优先级监听器
    orderedHitEvent.RemovePriorityListener(ActivateBuff);
    orderedHitEvent.RemovePriorityListener(ResolveHit);
    
    chaoticHitEvent.RemovePriorityListener(ResolveHit);
    chaoticHitEvent.RemovePriorityListener(ActivateBuff);
}

public void ActivateBuff(GameObject sender, DamageInfo args)
{
    _isBuffActive = true;  // ← 必须在ResolveHit之前运行
}

public void ResolveHit(GameObject sender, DamageInfo args)
{
    float damage = _isBuffActive ? args.amount * 5f : args.amount;  // ← 检查增益状态
}
```

**要点：**
- 🔢 **优先级值：** 数字越大 = 执行越早
- ⚠️ **顺序重要：** `ActivateBuff(100) → ResolveHit(50)` = 暴击
- ❌ **错误顺序：** `ResolveHit(80) → ActivateBuff(40)` = 普通攻击
- 🧹 **清理：** 使用 `RemovePriorityListener`（而非 `RemoveListener`）

---

### 06 条件：基于谓词的过滤

**可视化 → 代码转换：**
- ❌ 检查器：行为窗口中的可视化条件树
- ✅ 代码：将谓词函数传递给 `AddConditionalListener`

**RuntimeAPI_ConditionalEventReceiver.cs：**
```csharp
[GameEventDropdown] public GameEvent<AccessCard> requestAccessEvent;

private void OnEnable()
{
    // 使用条件函数注册
    // 仅当CanOpen返回true时调用OpenVault
    requestAccessEvent.AddConditionalListener(OpenVault, CanOpen);
}

private void OnDisable()
{
    requestAccessEvent.RemoveConditionalListener(OpenVault);
}

// ✅ 条件函数（谓词）
// 替换可视化条件树
public bool CanOpen(AccessCard card)
{
    return securityGrid.IsPowerOn && (
        card.securityLevel >= 4 || 
        departments.Contains(card.department) ||
        (card.securityLevel >= 1 && Random.Range(0, 100) > 70)
    );
}

// ✅ 动作（仅在条件通过时执行）
public void OpenVault(AccessCard card)
{
    // 假定所有条件满足
    Debug.Log($"ACCESS GRANTED to {card.holderName}");
    StartCoroutine(OpenDoorSequence());
}
```

**要点：**
- ✅ **谓词函数：** 返回 `bool`，接受事件参数
- 🔒 **守门员：** 仅在谓词返回 `true` 时运行动作
- 🧹 **清理：** 使用 `RemoveConditionalListener`（而非 `RemoveListener`）
- ⚡ **评估：** 谓词在动作方法之前运行

---

### 07 延迟：调度和取消

**可视化 → 代码转换：**
- ❌ 行为：检查器中"动作延迟 = 5.0秒"
- ✅ 代码：`event.RaiseDelayed(5f)` 返回 `ScheduleHandle`

**RuntimeAPI_DelayedEventRaiser.cs：**
```csharp
[GameEventDropdown] public GameEvent explodeEvent;

private ScheduleHandle _handle;  // ← 跟踪已调度的任务

public void ArmBomb()
{
    // 5秒后调度事件
    _handle = explodeEvent.RaiseDelayed(5f);  // ← 返回句柄
    
    Debug.Log("Bomb armed! 5 seconds to defuse...");
}

public void CutRedWire() => ProcessCut("Red");
public void CutGreenWire() => ProcessCut("Green");

private void ProcessCut(string color)
{
    if (color == _safeWireColor)
    {
        // 取消已调度的爆炸
        explodeEvent.CancelDelayed(_handle);  // ← 使用句柄取消
        Debug.Log("DEFUSED! Event cancelled.");
    }
    else
    {
        Debug.LogWarning("Wrong wire! Clock still ticking...");
    }
}
```

**要点：**
- ⏱️ **调度：** `RaiseDelayed(seconds)` 将事件加入队列
- 📍 **句柄：** 存储返回值以便稍后取消
- 🛑 **取消：** `CancelDelayed(handle)` 从队列中移除
- ⚠️ **时序：** 如果未取消，事件在延迟后执行

---

### 08 重复：循环管理和回调

**可视化 → 代码转换：**
- ❌ 行为：检查器中"重复间隔 = 1.0秒，重复次数 = 5"
- ✅ 代码：带回调的 `event.RaiseRepeating(interval, count)`

**RuntimeAPI_RepeatingEventRaiser.cs：**
```csharp
[GameEventDropdown] public GameEvent finitePulseEvent;

private ScheduleHandle _handle;

public void ActivateBeacon()
{
    // 启动循环：1秒间隔，5次
    _handle = finitePulseEvent.RaiseRepeating(interval: 1.0f, count: 5);
    
    // ✅ 钩子：每次迭代触发
    _handle.OnStep += (currentCount) => 
    {
        Debug.Log($"Pulse #{currentCount} emitted");
    };
    
    // ✅ 钩子：循环自然完成时触发
    _handle.OnCompleted += () => 
    {
        Debug.Log("Beacon sequence completed");
        UpdateUI("IDLE");
    };
    
    // ✅ 钩子：手动取消时触发
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
        finitePulseEvent.CancelRepeating(_handle);  // ← 停止循环
    }
}
```

**要点：**
- 🔁 **有限循环：** `RaiseRepeating(1.0f, 5)` = 1秒间隔5次脉冲
- ∞ **无限循环：** `RaiseRepeating(1.0f, -1)` = 无限直到取消
- 📡 **回调：** `OnStep`、`OnCompleted`、`OnCancelled` 事件
- 🛑 **手动停止：** 无限循环使用 `CancelRepeating(handle)`

---

### 09 持久化：跨场景监听器存活

**可视化 → 代码转换：**
- ❌ 检查器：在行为窗口中勾选"持久化事件"
- ✅ 代码：`Awake` 中的 `AddPersistentListener` + `DontDestroyOnLoad`

**RuntimeAPI_PersistentEventReceiver.cs：**
```csharp
[GameEventDropdown] public GameEvent fireAEvent;  // 持久化
[GameEventDropdown] public GameEvent fireBEvent;  // 标准

private void Awake()
{
    DontDestroyOnLoad(gameObject);  // ← 场景加载中存活
    
    // ✅ 持久化监听器（场景重新加载中存活）
    fireAEvent.AddPersistentListener(OnFireCommandA);
}

private void OnDestroy()
{
    // 必须手动移除持久化监听器
    fireAEvent.RemovePersistentListener(OnFireCommandA);
}

private void OnEnable()
{
    // ❌ 标准监听器（随场景消亡）
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

**要点：**
- 🧬 **单例模式：** `DontDestroyOnLoad` + 持久化监听器
- ✅ **在重新加载中存活：** `AddPersistentListener` 绑定到全局注册表
- ❌ **标准死亡：** `AddListener` 绑定随场景销毁
- 🧹 **清理：** 持久化使用 `OnDestroy`，标准使用 `OnDisable`

---

### 10 触发器事件：在代码中构建并行图表

**可视化 → 代码转换：**
- ❌ 流程图：可视化节点和连接
- ✅ 代码：`OnEnable` 中的 `AddTriggerEvent(target, ...)`

**RuntimeAPI_TriggerEventRaiser.cs：**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onCommand;      // 根
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onActiveBuff;   // 分支A
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onTurretFire;   // 分支B
[GameEventDropdown] public GameEvent<DamageInfo> onHoloData;                 // 分支C（类型转换）
[GameEventDropdown] public GameEvent onGlobalAlarm;                          // 分支D（void）

private TriggerHandle _buffAHandle;
private TriggerHandle _fireAHandle;
private TriggerHandle _holoHandle;
private TriggerHandle _alarmHandle;

private void OnEnable()
{
    // ✅ 在代码中构建并行图表
    
    // 分支A：增益（优先级100，条件）
    _buffAHandle = onCommand.AddTriggerEvent(
        targetEvent: onActiveBuff,
        delay: 0f,
        condition: (sender, args) => sender == turretA,  // ← 仅炮塔A
        passArgument: true,
        priority: 100  // ← 高优先级
    );
    
    // 分支B：开火（优先级50，条件）
    _fireAHandle = onCommand.AddTriggerEvent(
        targetEvent: onTurretFire,
        delay: 0f,
        condition: (sender, args) => sender == turretA,
        passArgument: true,
        priority: 50  // ← 较低优先级（在增益后运行）
    );
    
    // 分支C：全息数据（类型转换，延迟）
    _holoHandle = onCommand.AddTriggerEvent(
        targetEvent: onHoloData,  // ← GameEvent<DamageInfo>（无发送者）
        delay: 1f,  // ← 1秒延迟
        passArgument: true
    );
    
    // 分支D：全局警报（Void转换）
    _alarmHandle = onCommand.AddTriggerEvent(
        targetEvent: onGlobalAlarm  // ← GameEvent（void，无参数）
    );
    
    // ✅ 钩子：触发器触发时的回调
    _buffAHandle.OnTriggered += () => Debug.Log("Buff triggered via code graph");
}

private void OnDisable()
{
    // ✅ 清理：动态触发器强制要求
    onCommand.RemoveTriggerEvent(_buffAHandle);
    onCommand.RemoveTriggerEvent(_fireAHandle);
    onCommand.RemoveTriggerEvent(_holoHandle);
    onCommand.RemoveTriggerEvent(_alarmHandle);
}
```

**图表可视化（代码定义）：**
```
📡 根：onCommand.Raise(sender, info)
│
├─ 🔱 [ 分支：单元A ] ➔ 🛡️ 守卫：`Sender == Turret_A`
│  ├─ 💎 [优先级：100] ➔ 🛡️ onActiveBuff()      ✅ 高优先级同步
│  └─ ⚡ [优先级：50 ] ➔ 🔥 onTurretFire()      ✅ 顺序动作
│
├─ 🔱 [ 分支：分析 ] ➔ 🔢 签名：`<DamageInfo>`
│  └─ ⏱️ [ 延迟：1.0秒 ] ➔ 📽️ onHoloData()    ✅ 延迟数据中继
│
└─ 🔱 [ 分支：全局 ] ➔ 🔘 签名：`<void>`
   └─ 🚀 [ 即时 ] ➔ 🚨 onGlobalAlarm()     ✅ 立即信号
```

**要点：**
- 🌳 **并行执行：** 所有分支同时评估
- 🔢 **优先级：** 控制通过分支内的执行顺序
- ✅ **条件：** 谓词函数按发送者/参数过滤
- 🔄 **类型转换：** 自动参数适配
- 📡 **回调：** 每个句柄的 `OnTriggered` 事件
- 🧹 **清理：** 需要 `RemoveTriggerEvent(handle)`

---

### 11 链式事件：在代码中构建顺序管道

**可视化 → 代码转换：**
- ❌ 流程图：线性节点序列
- ✅ 代码：`OnEnable` 中的 `AddChainEvent(target, ...)`

**RuntimeAPI_ChainEventRaiser.cs：**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnStartSequenceEvent;  // 根
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnSystemCheckEvent;    // 步骤1
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnChargeEvent;         // 步骤2
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnFireEvent;           // 步骤3
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnCoolDownEvent;       // 步骤4
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnArchiveEvent;        // 步骤5

private ChainHandle _checkHandle;
private ChainHandle _chargeHandle;
private ChainHandle _fireHandle;
private ChainHandle _cooldownHandle;
private ChainHandle _archiveHandle;

private void OnEnable()
{
    // ✅ 在代码中构建顺序链
    
    // 步骤1：系统检查（条件门）
    _checkHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnSystemCheckEvent,
        delay: 0f,
        duration: 0f,
        condition: (sender, args) => chainEventReceiver.IsSafetyCheckPassed,  // ← 门
        passArgument: true,
        waitForCompletion: false
    );
    
    // 步骤2：充能（1秒持续时间）
    _chargeHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnChargeEvent,
        delay: 0f,
        duration: 1f,  // ← 链在此暂停1秒
        passArgument: true
    );
    
    // 步骤3：开火（即时）
    _fireHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnFireEvent,
        passArgument: true
    );
    
    // 步骤4：冷却（0.5秒延迟 + 1秒持续时间 + 等待完成）
    _cooldownHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnCoolDownEvent,
        delay: 0.5f,  // ← 前置延迟
        duration: 1f,  // ← 动作后持续时间
        passArgument: true,
        waitForCompletion: true  // ← 等待接收器协程
    );
    
    // 步骤5：归档（参数被阻止）
    _archiveHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnArchiveEvent,
        passArgument: false  // ← 下游接收null/默认值
    );
}

private void OnDisable()
{
    // ✅ 清理：动态链强制要求
    OnStartSequenceEvent.RemoveChainEvent(_checkHandle);
    OnStartSequenceEvent.RemoveChainEvent(_chargeHandle);
    OnStartSequenceEvent.RemoveChainEvent(_fireHandle);
    OnStartSequenceEvent.RemoveChainEvent(_cooldownHandle);
    OnStartSequenceEvent.RemoveChainEvent(_archiveHandle);
    
    // 替代方案：OnStartSequenceEvent.RemoveAllChainEvents();
}
```

**管道可视化（代码定义）：**
```
🚀 [ 根 ] OnStartSequenceEvent
│
├─ 🛡️ [ 守卫 ] ➔ 安全检查
│  └─► ⚙️ OnSystemCheckEvent             ✅ 条件通过
│
├─ ⏱️ [ 地板 ] ➔ 持续时间：1.0秒
│  └─► ⚡ OnChargeEvent                  ✅ 最小节奏满足
│
├─ 🚀 [ 即时 ] ➔ 立即触发
│  └─► 🔥 OnFireEvent                    ✅ 已执行
│
├─ ⌛ [ 异步 ] ➔ 延迟：0.5秒 | 持续：1.0秒 | 等待：开
│  └─► ❄️ OnCoolDownEvent                ✅ 异步恢复完成
│
└─ 🧹 [ 过滤 ] ➔ 阻止参数
   └─► 💾 OnArchiveEvent                 ✅ 数据已清理并保存
```

**要点：**
- 🔗 **顺序执行：** 步骤一个接一个运行，而非并行
- ✅ **条件门：** 失败的条件终止整个链
- ⏱️ **持续时间：** 链暂停指定时间
- 🕐 **等待完成：** 阻塞直到接收器协程完成
- 🔒 **参数阻止：** `passArgument: false` 发送默认值
- 🧹 **清理：** `RemoveChainEvent(handle)` 或 `RemoveAllChainEvents()`

---

## 🔑 API参考

### 监听器注册

| 方法                                        | 用例         | 清理方法                            |
| ------------------------------------------- | ------------ | ----------------------------------- |
| `AddListener(method)`                       | 标准绑定     | `RemoveListener(method)`            |
| `AddPriorityListener(method, priority)`     | 执行顺序控制 | `RemovePriorityListener(method)`    |
| `AddConditionalListener(method, predicate)` | 基于谓词过滤 | `RemoveConditionalListener(method)` |
| `AddPersistentListener(method)`             | 跨场景存活   | `RemovePersistentListener(method)`  |

### 事件触发

| 方法                              | 用例       | 返回             |
| --------------------------------- | ---------- | ---------------- |
| `Raise()`                         | 立即执行   | `void`           |
| `Raise(arg)`                      | 带单个参数 | `void`           |
| `Raise(sender, arg)`              | 带发送者上下文 | `void`           |
| `RaiseDelayed(seconds)`           | 计划执行   | `ScheduleHandle` |
| `RaiseRepeating(interval, count)` | 循环执行   | `ScheduleHandle` |

### 调度管理

| 方法                      | 用例               |
| ------------------------- | ------------------ |
| `CancelDelayed(handle)`   | 停止待执行的延迟事件 |
| `CancelRepeating(handle)` | 停止活动循环       |
| `handle.OnStep`           | 循环迭代回调       |
| `handle.OnCompleted`      | 循环完成回调       |
| `handle.OnCancelled`      | 取消回调           |

### 流程图构建

| 方法                           | 用例     | 返回            |
| ------------------------------ | -------- | --------------- |
| `AddTriggerEvent(target, ...)` | 并行分支 | `TriggerHandle` |
| `RemoveTriggerEvent(handle)`   | 移除分支 | `void`          |
| `AddChainEvent(target, ...)`   | 顺序步骤 | `ChainHandle`   |
| `RemoveChainEvent(handle)`     | 移除步骤 | `void`          |
| `RemoveAllChainEvents()`       | 清除所有步骤 | `void`          |

---

## ⚠️ 关键最佳实践

### ✅ 应该做
```csharp
private void OnEnable()
{
    myEvent.AddListener(OnReceived);  // ← 注册
}

private void OnDisable()
{
    myEvent.RemoveListener(OnReceived);  // ← 总是清理
}
```

### ❌ 不应该做
```csharp
private void Start()
{
    myEvent.AddListener(OnReceived);  // ← 在Start中注册...
}
// ❌ 无OnDisable清理 → 内存泄漏
```

### 句柄管理
```csharp
private ScheduleHandle _handle;

public void StartLoop()
{
    _handle = myEvent.RaiseRepeating(1f, -1);
}

public void StopLoop()
{
    if (_handle != null) myEvent.CancelRepeating(_handle);  // ← 使用存储的句柄
}
```

### 生命周期模式

| 生命周期方法 | 用于                             |
| ------------ | -------------------------------- |
| `Awake`      | 持久化监听器 + `DontDestroyOnLoad` |
| `OnEnable`   | 标准监听器、触发器、链           |
| `OnDisable`  | 移除标准监听器                   |
| `OnDestroy`  | 移除持久化监听器                 |

---

## 🎯 何时选择代码与可视化

### 选择可视化工作流当：
- ✅ 设计师需要直接控制
- ✅ 快速迭代是优先事项
- ✅ 逻辑相对静态
- ✅ 可视化调试有益
- ✅ 跨学科团队协作

### 选择代码工作流当：
- ✅ 逻辑高度动态（运行时图表构建）
- ✅ 条件需要复杂的C#代码
- ✅ 与现有代码系统集成
- ✅ 高级调度模式
- ✅ 编程监听器管理
- ✅ 逻辑的版本控制（代码差异比.asset差异更清晰）

### 混合方法：

- 🎨 **可视化：** 事件定义、简单绑定
- 💻 **代码：** 复杂条件、动态图表、运行时调度
- **示例：** 可视化定义事件，但在代码中为程序化系统构建触发器/链式图表

---

## 📚 相关文档

- **[触发与调度](../scripting/raising-and-scheduling.md)** - 完整调度API指南
- **[监听策略](../scripting/listening-strategies.md)** - 监听器模式和最佳实践
- **[编程流程](../scripting/programmatic-flow.md)** - 通过代码构建触发器/链式图表
- **[最佳实践](../scripting/best-practices.md)** - 代码模式和反模式
- **[API参考](../scripting/api-reference.md)** - 完整方法签名