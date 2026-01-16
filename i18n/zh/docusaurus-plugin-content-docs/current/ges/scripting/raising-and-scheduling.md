---
sidebar_label: '触发与调度'
sidebar_position: 1
---

# 触发与调度

在核心层面，游戏事件系统是关于发送信号的。虽然Inspector处理可视化绑定，但**运行时API**为程序员提供对这些信号*何时*以及*如何*触发的精确控制。

本指南涵盖即时执行、基于时间的调度以及取消待处理事件。

---

## 🚀 即时执行（`Raise`）

`Raise()` 方法是触发事件的标准方式。它在当前帧中同步执行所有监听器（Inspector、代码、流程图）。

### 1. 空事件
没有参数的事件。
```csharp
[GameEventDropdown] public GameEvent onPlayerJump;

void Update()
{
    if (Input.GetButtonDown("Jump"))
    {
        // 立即触发
        onPlayerJump.Raise();
    }
}
```

### 2. 单参数事件

携带特定数据有效载荷（T）的事件。
```csharp
[GameEventDropdown] public SingleGameEvent onHealthChanged;

public void TakeDamage(float damage)
{
    currentHealth -= damage;
    
    // 类型安全调用
    onHealthChanged.Raise(currentHealth);
}
```

### 3. Sender + 参数事件

验证事件的**源**（TSender）并携带数据（TArgs）的事件。
```csharp
// 定义类型：Sender是GameObject，Arg是DamageInfo
[GameEventDropdown] public GameObjectDamageInfoGameEvent onActorDamaged;

public void Hit()
{
    var info = new DamageInfo { amount = 50, type = DamageType.Fire };
    
    // 将'this.gameObject'作为sender传递
    onActorDamaged.Raise(this.gameObject, info);
}
```

:::warning 自动调度逻辑
如果您在Inspector中为特定事件资产配置了**动作延迟**或**重复**设置，调用Raise()将自动遵守这些设置（例如，它可能在实际触发前等待2秒）。
请参阅下面的[Inspector集成](#-inspector集成)。
:::

------

## ⏱️ 延迟执行（RaiseDelayed）

有时您想要在不使用协程的情况下为将来调度事件。系统提供了内置的调度器。

所有调度方法都返回一个`ScheduleHandle`，如果您需要在事件触发前取消它，这至关重要。
```csharp
[GameEventDropdown] public GameEvent onBombExplode;

public void PlantBomb()
{
    Debug.Log("炸弹已放置...");
    
    // 5.0秒后触发事件
    ScheduleHandle handle = onBombExplode.RaiseDelayed(5.0f);
}
```

### 带延迟传递参数

API完全支持延迟调用的泛型。
```csharp
// 等待1.5秒，然后发送float值'100f'
onScoreAdded.RaiseDelayed(100f, 1.5f);

// 等待0.5秒，然后传递Sender和Args
onItemPickup.RaiseDelayed(this, itemData, 0.5f);
```

------

## 🔄 重复执行（RaiseRepeating）

使用此方法完全在事件系统内创建循环、计时器或轮询机制。

| 参数 | 描述 |
| ----------- | --------------------------------------------------- |
| interval | 每次触发之间的时间（秒）。 |
| repeatCount | 触发多少次？设置为-1表示**无限**。 |

### 示例：毒药效果

每1秒伤害玩家一次，共5次。
```csharp
[GameEventDropdown] public Int32GameEvent onTakeDamage;

private void ApplyPoison()
{
    // 立即触发（可选），然后每1秒重复5次
    // 注意：默认情况下，RaiseRepeating在第一次触发前等待间隔
    onTakeDamage.RaiseRepeating(10, interval: 1.0f, repeatCount: 5);
}
```

### 示例：雷达扫描（无限）

每2秒永久ping一次雷达事件。
```csharp
private ScheduleHandle _radarHandle;

void Start()
{
    // -1表示永远执行直到取消
    _radarHandle = onRadarPing.RaiseRepeating(2.0f, repeatCount: -1);
}
```

------

## 🔔 监控与生命周期回调

`ScheduleHandle` 不仅用于取消。它提供三个内置回调，允许您监控调度任务的状态，这对于更新UI进度条、触发后续逻辑或清理资源至关重要。
```csharp
[GameEventDropdown] public GameEvent onStatusUpdate;

private void StartTrackedLoop()
{
    // 启动一个每1秒重复5次的任务
    ScheduleHandle handle = onStatusUpdate.RaiseRepeating(interval: 1.0f, repeatCount: 5);

    // 1. 在每次执行时触发（步骤）
    handle.OnStep += (remainingCount) => 
    {
        Debug.Log($"[调度] 执行步骤！剩余循环：{remainingCount}");
    };

    // 2. 当任务自然完成时触发
    handle.OnCompleted += () => 
    {
        Debug.Log("[调度] 任务成功完成。");
    };

    // 3. 如果任务通过代码手动停止时触发
    handle.OnCancelled += () => 
    {
        Debug.Log("[调度] 任务被用户取消。");
    };
}
```

### 回调定义

| 回调 | 调用时机 | 典型使用场景 |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **OnStep** | 在每次事件执行后立即触发。传递剩余的repeatCount。 | 更新倒计时计时器或"进度"UI。 |
| **OnCompleted** | 当任务达到其repeatCount并自然完成时触发。 | 触发"冷却完成"或"连击结束"逻辑。 |
| **OnCancelled** | 专门在调用CancelDelayed或CancelRepeating时触发。 | 停止相关的VFX/SFX或重置角色状态。 |

:::tip Handle处置
您不需要手动取消订阅这些回调。一旦任务达到终端状态（已完成或已取消），内部调度器会自动清理ScheduleHandle。
:::

------

## 🛑 取消

停止待处理事件与启动它们同样重要。有两种不同的方式取消事件，具体取决于它们是如何启动的。

### 1. 取消手动调度
如果您使用了`RaiseDelayed`或`RaiseRepeating`，您收到了一个**ScheduleHandle**。您必须使用此句柄来停止该特定任务。

#### 取消延迟调用
```csharp
public void DefuseBomb()
{
    // 停止待处理的延迟执行
    if (_bombHandle != null)
    {
        // 如果成功取消则返回true
        bool success = onBombExplode.CancelDelayed(_bombHandle); 
    }
}
```

#### 取消重复循环
```csharp
public void StopRadar()
{
    // 停止手动循环
    if (_radarHandle != null)
    {
        onRadarPing.CancelRepeating(_radarHandle);
    }
}
```

### 2. 取消自动（Inspector）调度

如果事件由于其**Inspector配置**（行为窗口）而循环或延迟，请使用无参数的Cancel()方法。

- **目标**：停止此事件资产上的**活动**自动序列（延迟或循环）。
- **安全性**：Raise()在启动新的自动序列之前会自动在内部调用Cancel()以防止重叠循环。
```csharp
// 停止当前正在运行的"动作延迟"或"重复"逻辑
// 这是由先前的.Raise()调用触发的
onEvent.Cancel();
```

:::danger 重要区别
**Cancel()不会删除监听器。**

- **Cancel()**：停止基于时间的执行（待处理的计时器/循环）。事件表现得好像从未被触发。
- **RemoveAllListeners()**：取消订阅所有脚本，使它们不再接收未来的事件。
  :::

------

## 🔌 Inspector集成

理解代码如何与**可视化行为配置**交互至关重要。

当您在代码中调用Raise()时，系统会检查[游戏事件行为窗口](../visual-workflow/game-event-behavior.md)中定义的**调度配置**：

1. **代码**：调用myEvent.Raise()。
2. **系统检查**：此事件在Inspector中的动作延迟是否> 0？
   - **是**：系统隐式将其转换为RaiseDelayed。
   - **否**：立即触发。
3. **系统检查**：此事件的重复间隔是否> 0？
   - **是**：系统自动启动循环。

:::tip 最佳实践
如果您想要**纯代码控制**，在Inspector中将调度设置保留为0。
如果您想要**设计师调整时间**，使用Raise()并让Inspector控制延迟。
:::

------

## 🔇 静音视觉效果（SetInspectorListenersActive）

在复杂系统中，您经常想要将**游戏逻辑**（数据）与**游戏感觉**（视觉/声音）分离。

使用SetInspectorListenersActive(false)来静音"视觉/场景"层，同时保持"逻辑/代码"层运行。

### 使用场景：快进或加载

想象加载一个保存文件。您需要触发OnItemAdded 100次来填充库存，但您**不**想播放100个音效或生成100个UI弹窗。
```csharp
public void LoadSaveData(List<Item> items)
{
    // 1. 静音"华丽"的内容（Inspector绑定）
    onItemAdded.SetInspectorListenersActive(false);

    // 2. 处理逻辑（数据监听器仍在运行！）
    foreach(var item in items)
    {
        // 这更新后端库存数据
        // 但跳过编辑器中配置的UI/声音
        onItemAdded.Raise(item); 
    }

    // 3. 重新启用视觉效果
    onItemAdded.SetInspectorListenersActive(true);
    
    // 4. 一次性刷新UI
    onInventoryUpdated.Raise();
}
```

------

## 📜 API摘要

| 方法签名 | 返回值 | 描述 |
| :----------------------------------------------------------- | :--------------- | :----------------------------------------------------------- |
| **即时执行** | | |
| `Raise()` | `void` | 立即触发Void事件。 |
| `Raise(T argument)` | `void` | 立即触发单参数事件。 |
| `Raise(TSender sender, TArgs args)` | `void` | 立即触发Sender+参数事件。 |
| **延迟执行** | | |
| `RaiseDelayed(float delay)` | `ScheduleHandle` | 调度Void事件在`delay`秒后触发。 |
| `RaiseDelayed(T arg, float delay)` | `ScheduleHandle` | 调度类型化事件在`delay`秒后触发。 |
| `RaiseDelayed(TSender s, TArgs a, float delay)` | `ScheduleHandle` | 调度Sender事件在`delay`秒后触发。 |
| **重复执行** | | |
| `RaiseRepeating(float interval, int count)` | `ScheduleHandle` | 启动重复循环。将`count`设置为-1表示无限。 |
| `RaiseRepeating(T arg, float interval, int count)` | `ScheduleHandle` | 启动重复类型化循环。 |
| `RaiseRepeating(TSender s, TArgs a, float interval, int count)` | `ScheduleHandle` | 启动重复Sender循环。 |
| **取消与控制** | | |
| `Cancel()` | `void` | 停止此事件的任何**Inspector配置的**自动循环/延迟。 |
| `CancelDelayed(ScheduleHandle handle)` | `bool` | 取消特定的手动延迟任务。如果成功则返回true。 |
| `CancelRepeating(ScheduleHandle handle)` | `bool` | 取消特定的手动重复任务。如果成功则返回true。 |
| `SetInspectorListenersActive(bool isActive)` | `void` | 在运行时静音或取消静音基于场景的`UnityEvent`监听器。 |