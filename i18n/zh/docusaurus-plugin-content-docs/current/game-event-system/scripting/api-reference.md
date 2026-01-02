---
sidebar_label: 'API参考'
sidebar_position: 5
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# API参考

GameEvent系统的完整API参考文档。所有事件类型都实现了严格的类型安全接口，具有用于事件驱动架构的全面功能。

:::info 命名空间

所有类和接口都位于`TinyGiants.GameEventSystem.Runtime`命名空间中。

:::
```csharp
using TinyGiants.GameEventSystem.Runtime;
```

------

## 事件类型概述

GameEvent系统提供三种事件类型变体

| 类型 | 描述 |
| ------------------------------- | --------------------------------------------------- |
| **`GameEvent`** | 用于简单通知的无参数事件 |
| **`GameEvent<T>`** | 用于传递类型化数据的单参数事件 |
| **`GameEvent<TSender, TArgs>`** | 用于发送者感知通信的双参数事件 |

下面的所有方法都适用于这些类型，具有适当的参数变化。

------

## 🚀 事件触发与取消

<details>
<summary>Raise()</summary>

立即触发事件，按执行顺序调用所有注册的监听器。

**执行顺序**：基础 → 优先级 → 条件 → 持久化 → 触发器 → 链

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void Raise();
```

**示例：**
```csharp
myEvent.Raise();
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void Raise(T argument);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ---- | ----------------------------------------- |
| `argument` | `T` | 要传递给所有监听器的数据有效载荷 |

**示例：**
```csharp
// 用float值触发
healthEvent.Raise(50.5f);

// 用自定义类型触发
scoreEvent.Raise(new ScoreData { points = 100, combo = 5 });
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void Raise(TSender sender, TArgs args);
```

**参数：**

| 名称 | 类型 | 描述 |
| -------- | --------- | -------------------------------------- |
| `sender` | `TSender` | 触发事件的源对象 |
| `args` | `TArgs` | 要传递给监听器的数据有效载荷 |

**示例：**
```csharp
// 用GameObject sender和伤害数据触发
damageEvent.Raise(this.gameObject, new DamageInfo(10));

// 用player sender触发
playerEvent.Raise(playerInstance, new PlayerAction { type = "Jump" });
```

</TabItem> </Tabs>

</details>

<details>
<summary>Cancel()</summary>

停止此事件资产的任何活动的Inspector配置的调度执行（延迟或重复）。
```csharp
void Cancel();
```

**示例：**
```csharp
// 停止在Inspector中配置的自动重复
myEvent.Cancel();
```

:::warning 范围限制

这**仅**取消由Inspector的"调度配置"启动的调度。它**不会**取消通过`RaiseDelayed()`或`RaiseRepeating()`创建的手动调度。对于这些，使用`CancelDelayed(handle)`或`CancelRepeating(handle)`。

:::

</details>

## ⏱️ 基于时间的调度

<details>
<summary>RaiseDelayed()</summary>

调度事件在指定延迟后触发一次。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ScheduleHandle RaiseDelayed(float delay);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------- | ------- | ------------------------------------------------ |
| `delay` | `float` | 触发事件前等待的时间（秒） |

**返回值：** `ScheduleHandle` - 用于取消的句柄

**示例：**
```csharp
// 5秒后触发
ScheduleHandle handle = myEvent.RaiseDelayed(5f);

// 如果需要，取消
myEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ScheduleHandle RaiseDelayed(T argument, float delay);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ------- | ------------------------------------------------ |
| `argument` | `T` | 事件执行时要传递的数据 |
| `delay` | `float` | 触发事件前等待的时间（秒） |

**返回值：** `ScheduleHandle` - 用于取消的句柄

**示例：**
```csharp
// 3秒后生成敌人
ScheduleHandle handle = spawnEvent.RaiseDelayed(enemyType, 3f);

// 取消生成
spawnEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ScheduleHandle RaiseDelayed(TSender sender, TArgs args, float delay);
```

**参数：**

| 名称 | 类型 | 描述 |
| -------- | --------- | ------------------------------------------------ |
| `sender` | `TSender` | 事件执行时要传递的sender |
| `args` | `TArgs` | 事件执行时要传递的数据 |
| `delay` | `float` | 触发事件前等待的时间（秒） |

**返回值：** `ScheduleHandle` - 用于取消的句柄

**示例：**
```csharp
// 延迟伤害应用
ScheduleHandle handle = damageEvent.RaiseDelayed(
    attackerObject, 
    new DamageInfo(25), 
    2f
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RaiseRepeating()</summary>

调度事件以固定间隔重复触发。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ScheduleHandle RaiseRepeating(float interval, int repeatCount = -1);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------- | ------- | ------------------------------------------------------------ |
| `interval` | `float` | 每次执行之间的秒数 |
| `repeatCount` | `int` | 重复次数。使用`-1`表示无限（默认：`-1`） |

**返回值：** `ScheduleHandle` - 用于取消的句柄

**示例：**
```csharp
// 重复10次
ScheduleHandle handle = tickEvent.RaiseRepeating(1f, repeatCount: 10);

// 永远重复（无限循环）
ScheduleHandle infinite = pulseEvent.RaiseRepeating(0.5f);

// 停止无限循环
pulseEvent.CancelRepeating(infinite);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ScheduleHandle RaiseRepeating(T argument, float interval, int repeatCount = -1);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------- | ------- | ------------------------------------------------------------ |
| `argument` | `T` | 每次执行时要传递的数据 |
| `interval` | `float` | 每次执行之间的秒数 |
| `repeatCount` | `int` | 重复次数。使用`-1`表示无限（默认：`-1`） |

**返回值：** `ScheduleHandle` - 用于取消的句柄

**示例：**
```csharp
// 每秒造成伤害，5次
ScheduleHandle poison = damageEvent.RaiseRepeating(5, 1f, repeatCount: 5);

// 每30秒无限生成波次
ScheduleHandle waves = waveEvent.RaiseRepeating(waveData, 30f);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ScheduleHandle RaiseRepeating(TSender sender, TArgs args, float interval, int repeatCount = -1);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------- | --------- | ------------------------------------------------------------ |
| `sender` | `TSender` | 每次执行时要传递的sender |
| `args` | `TArgs` | 每次执行时要传递的数据 |
| `interval` | `float` | 每次执行之间的秒数 |
| `repeatCount` | `int` | 重复次数。使用`-1`表示无限（默认：`-1`） |

**返回值：** `ScheduleHandle` - 用于取消的句柄

**示例：**
```csharp
// 每2秒再生生命值，10次
ScheduleHandle regen = healEvent.RaiseRepeating(
    playerObject,
    new HealInfo(5),
    2f,
    repeatCount: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>CancelDelayed()</summary>

取消用`RaiseDelayed()`创建的特定延迟事件。
```csharp
bool CancelDelayed(ScheduleHandle handle);
```

**参数：**

| 名称 | 类型 | 描述 |
| -------- | ---------------- | --------------------------------------- |
| `handle` | `ScheduleHandle` | `RaiseDelayed()`返回的句柄 |

**返回值：** `bool` - 如果成功取消则为`true`，如果已执行或无效则为`false`

**示例：**
```csharp
ScheduleHandle handle = explosionEvent.RaiseDelayed(5f);

// 在爆炸发生前取消
if (explosionEvent.CancelDelayed(handle))
{
    Debug.Log("爆炸已拆除！");
}
```

</details>

<details>
<summary>CancelRepeating()</summary>

取消用`RaiseRepeating()`创建的特定重复事件。
```csharp
bool CancelRepeating(ScheduleHandle handle);
```

**参数：**

| 名称 | 类型 | 描述 |
| -------- | ---------------- | ----------------------------------------- |
| `handle` | `ScheduleHandle` | `RaiseRepeating()`返回的句柄 |

**返回值：** `bool` - 如果成功取消则为`true`，如果已完成或无效则为`false`

**示例：**
```csharp
ScheduleHandle handle = tickEvent.RaiseRepeating(1f);

// 停止重复
if (tickEvent.CancelRepeating(handle))
{
    Debug.Log("计时器已停止！");
}
```

</details>

## 🎧 监听器管理

<details>
<summary>AddListener()</summary>

注册具有标准执行优先级的基础监听器。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddListener(UnityAction call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | 无参数的回调方法 |

**示例：**
```csharp
myEvent.AddListener(OnEventTriggered);

void OnEventTriggered()
{
    Debug.Log("事件已触发！");
}
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddListener(UnityAction<T> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | 接收类型化参数的回调方法 |

**示例：**
```csharp
scoreEvent.AddListener(OnScoreChanged);

void OnScoreChanged(int newScore)
{
    Debug.Log($"分数：{newScore}");
}
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddListener(UnityAction<TSender, TArgs> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 接收sender和参数的回调 |

**示例：**
```csharp
damageEvent.AddListener(OnDamageDealt);

void OnDamageDealt(GameObject attacker, DamageInfo info)
{
    Debug.Log($"{attacker.name}造成了{info.amount}点伤害");
}
```

</TabItem> </Tabs>

:::tip 防止重复

如果监听器已存在，它将被删除并重新添加以防止重复。

:::

</details>

<details>
<summary>RemoveListener()</summary>

从事件中注销基础监听器。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemoveListener(UnityAction call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | 无参数的回调方法 |

**示例：**
```csharp
myEvent.RemoveListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemoveListener(UnityAction<T> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | 接收类型化参数的回调方法 |

**示例：**
```csharp
scoreEvent.RemoveListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemoveListener(UnityAction<TSender, TArgs> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 接收sender和参数的回调 |

**示例：**
```csharp
damageEvent.RemoveListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveAllListeners()</summary>

从事件中清除所有基础、优先级和条件监听器。
```csharp
void RemoveAllListeners();
```

**示例：**
```csharp
// 清理所有监听器
myEvent.RemoveAllListeners();
```

:::warning 范围

出于安全原因，**不会**删除持久化监听器或触发器/链事件。

:::

</details>

<details>
<summary>AddPriorityListener()</summary>

注册具有显式执行优先级的监听器。更高的优先级值先执行。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddPriorityListener(UnityAction call, int priority);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ------------- | ------------------------------------------------- |
| `call` | `UnityAction` | 回调方法 |
| `priority` | `int` | 执行优先级（越高 = 越早，默认：0） |

**示例：**
```csharp
myEvent.AddPriorityListener(CriticalHandler, 100);
myEvent.AddPriorityListener(NormalHandler, 50);
myEvent.AddPriorityListener(LowPriorityHandler, 10);
// 执行顺序：CriticalHandler → NormalHandler → LowPriorityHandler
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddPriorityListener(UnityAction<T> call, int priority);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ---------------- | ------------------------------------------------- |
| `call` | `UnityAction<T>` | 回调方法 |
| `priority` | `int` | 执行优先级（越高 = 越早，默认：0） |

**示例：**
```csharp
healthEvent.AddPriorityListener(UpdateUI, 100);
healthEvent.AddPriorityListener(PlaySound, 50);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddPriorityListener(UnityAction<TSender, TArgs> call, int priority);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ----------------------------- | ------------------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 回调方法 |
| `priority` | `int` | 执行优先级（越高 = 越早，默认：0） |

**示例：**
```csharp
attackEvent.AddPriorityListener(ProcessCombat, 100);
attackEvent.AddPriorityListener(ShowVFX, 50);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemovePriorityListener()</summary>

注销优先级监听器。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemovePriorityListener(UnityAction call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | 无参数的回调方法 |

**示例：**
```csharp
myEvent.RemovePriorityListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemovePriorityListener(UnityAction<T> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | 接收类型化参数的回调方法 |

**示例：**
```csharp
scoreEvent.RemovePriorityListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemovePriorityListener(UnityAction<TSender, TArgs> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 接收sender和参数的回调 |

**示例：**
```csharp
damageEvent.RemovePriorityListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddConditionalListener()</summary>

注册仅在条件评估为true时执行的监听器。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddConditionalListener(UnityAction call, Func<bool> condition, int priority = 0);
```

**参数：**

| 名称 | 类型 | 描述 |
| ----------- | ------------- | ------------------------------------------ |
| `call` | `UnityAction` | 回调方法 |
| `condition` | `Func<bool>` | 谓词函数（null = 始终执行） |
| `priority` | `int` | 执行优先级（默认：0） |

**示例：**
```csharp
myEvent.AddConditionalListener(
    OnHealthLow,
    () => playerHealth < 20,
    priority: 10
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority = 0);
```

**参数：**

| 名称 | 类型 | 描述 |
| ----------- | ---------------- | -------------------------------- |
| `call` | `UnityAction<T>` | 回调方法 |
| `condition` | `Func<T, bool>` | 接收参数的谓词 |
| `priority` | `int` | 执行优先级（默认：0） |

**示例：**
```csharp
scoreEvent.AddConditionalListener(
    OnHighScore,
    score => score > 1000,
    priority: 5
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddConditionalListener(
    UnityAction<TSender, TArgs> call, 
    Func<TSender, TArgs, bool> condition,
    int priority = 0
);
```

**参数：**

| 名称 | 类型 | 描述 |
| ----------- | ----------------------------- | ---------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 回调方法 |
| `condition` | `Func<TSender, TArgs, bool>` | 接收sender和参数的谓词 |
| `priority` | `int` | 执行优先级（默认：0） |

**示例：**
```csharp
damageEvent.AddConditionalListener(
    OnCriticalHit,
    (attacker, info) => info.isCritical,
    priority: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveConditionalListener()</summary>

注销条件监听器。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemoveConditionalListener(UnityAction call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | 无参数的回调方法 |

**示例：**
```csharp
myEvent.RemoveConditionalListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemoveConditionalListener(UnityAction<T> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | 接收类型化参数的回调方法 |

**示例：**
```csharp
scoreEvent.RemoveConditionalListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemoveConditionalListener(UnityAction<TSender, TArgs> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 接收sender和参数的回调 |

**示例：**
```csharp
damageEvent.RemoveConditionalListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddPersistentListener()</summary>

注册在场景更改后存活的全局监听器（DontDestroyOnLoad）。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddPersistentListener(UnityAction call, int priority = 0);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ------------- | ------------------------------- |
| `call` | `UnityAction` | 回调方法 |
| `priority` | `int` | 执行优先级（默认：0） |

**示例：**
```csharp
globalEvent.AddPersistentListener(OnGlobalAction, priority: 100);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddPersistentListener(UnityAction<T> call, int priority = 0);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ---------------- | ------------------------------- |
| `call` | `UnityAction<T>` | 回调方法 |
| `priority` | `int` | 执行优先级（默认：0） |

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddPersistentListener(UnityAction<TSender, TArgs> call, int priority = 0);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ----------------------------- | ------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 回调方法 |
| `priority` | `int` | 执行优先级（默认：0） |

</TabItem> </Tabs>

:::info 持久性

持久化监听器在场景加载间保持活动。用于全局系统，如保存管理或分析。

:::

</details>

<details>
<summary>RemovePersistentListener()</summary>

注销持久化监听器。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemovePersistentListener(UnityAction call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ------------- | ---------------------------------- |
| `call` | `UnityAction` | 无参数的回调方法 |

**示例：**
```csharp
myEvent.RemovePersistentListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemovePersistentListener(UnityAction<T> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ---------------- | ---------------------------------------- |
| `call` | `UnityAction<T>` | 接收类型化参数的回调方法 |

**示例：**
```csharp
scoreEvent.RemovePersistentListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemovePersistentListener(UnityAction<TSender, TArgs> call);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------ | ----------------------------- | --------------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 接收sender和参数的回调 |

**示例：**
```csharp
damageEvent.RemovePersistentListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

## ⚡ 触发器事件（扇出模式）

<details>
<summary>AddTriggerEvent()</summary>

注册在触发此事件时自动触发的目标事件。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<bool> condition = null,
    int priority = 0
);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------- | --------------- | ------------------------------------------------------- |
| `targetEvent` | `GameEventBase` | 要触发的事件 |
| `delay` | `float` | 可选延迟（秒）（默认：0） |
| `condition` | `Func<bool>` | 可选谓词来控制执行 |
| `priority` | `int` | 相对于其他触发器的执行顺序（默认：0） |

**返回值：** `TriggerHandle` - 用于安全移除的唯一标识符

**示例：**
```csharp
// 简单触发器：门打开 → 灯打开
doorOpenEvent.AddTriggerEvent(lightOnEvent);

// 延迟触发器：2秒后爆炸
fuseEvent.AddTriggerEvent(explosionEvent, delay: 2f);

// 条件触发器
doorOpenEvent.AddTriggerEvent(
    alarmEvent,
    condition: () => isNightTime
);

// 优先级排序的触发器
bossDefeatedEvent.AddTriggerEvent(stopMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(victoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(showRewardsEvent, priority: 50);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    int priority = 0
);
```

**参数：**

| 名称 | 类型 | 描述 |
| --------------------- | ----------------- | ---------------------------------------------- |
| `targetEvent` | `GameEventBase` | 要触发的事件 |
| `delay` | `float` | 可选延迟（秒）（默认：0） |
| `condition` | `Func<T, bool>` | 接收参数的可选谓词 |
| `passArgument` | `bool` | 是否将数据传递给目标（默认：true） |
| `argumentTransformer` | `Func<T, object>` | 可选的数据转换函数 |
| `priority` | `int` | 执行优先级（默认：0） |

**返回值：** `TriggerHandle` - 用于安全移除的唯一标识符

**示例：**
```csharp
// 直接传递参数
GameEvent<int> scoreEvent;
GameEvent<int> updateUIEvent;
scoreEvent.AddTriggerEvent(updateUIEvent, passArgument: true);

// 转换参数：int → string
GameEvent<int> scoreEvent;
GameEvent<string> notificationEvent;
scoreEvent.AddTriggerEvent(
    notificationEvent,
    passArgument: true,
    argumentTransformer: score => $"分数：{score}"
);

// 带参数检查的条件
GameEvent<float> healthEvent;
GameEvent lowHealthWarningEvent;
healthEvent.AddTriggerEvent(
    lowHealthWarningEvent,
    condition: health => health < 20f,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    int priority = 0
);
```

**参数：**

| 名称 | 类型 | 描述 |
| --------------------- | ------------------------------ | ---------------------------------------------- |
| `targetEvent` | `GameEventBase` | 要触发的事件 |
| `delay` | `float` | 可选延迟（秒）（默认：0） |
| `condition` | `Func<TSender, TArgs, bool>` | 接收sender和args的可选谓词 |
| `passArgument` | `bool` | 是否将数据传递给目标（默认：true） |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | 可选转换函数 |
| `priority` | `int` | 执行优先级（默认：0） |

**返回值：** `TriggerHandle` - 用于安全移除的唯一标识符

**示例：**
```csharp
// 将sender和args传递给另一个sender事件
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent<GameObject, DamageInfo> logEvent;
damageEvent.AddTriggerEvent(logEvent, passArgument: true);

// 转换：仅提取伤害值
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent<int> damageNumberEvent;
damageEvent.AddTriggerEvent(
    damageNumberEvent,
    passArgument: true,
    argumentTransformer: (sender, info) => info.amount
);

// 基于sender和args的条件
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent criticalHitEvent;
damageEvent.AddTriggerEvent(
    criticalHitEvent,
    condition: (sender, info) => 
        info.isCritical && sender.CompareTag("Player"),
    passArgument: false
);
```

</TabItem> </Tabs>

:::tip 扇出模式

触发器**并行**执行 - 每个触发器都是独立的。如果一个触发器的条件失败或抛出异常，其他触发器仍然执行。

:::

</details>

<details>
<summary>RemoveTriggerEvent()（按句柄）</summary>

使用其唯一句柄安全地移除特定触发器。
```csharp
void RemoveTriggerEvent(TriggerHandle handle);
```

**参数：**

| 名称 | 类型 | 描述 |
| -------- | --------------- | ------------------------------------------ |
| `handle` | `TriggerHandle` | `AddTriggerEvent()`返回的句柄 |

**示例：**
```csharp
TriggerHandle handle = doorEvent.AddTriggerEvent(lightEvent);

// 移除特定触发器
doorEvent.RemoveTriggerEvent(handle);
```

:::tip 推荐

这是**最安全的**移除方法，因为它只移除您的特定触发器实例。

:::

</details>

<details>
<summary>RemoveTriggerEvent()（按目标）</summary>

移除指向特定目标事件的**所有**触发器。
```csharp
void RemoveTriggerEvent(GameEventBase targetEvent);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------- | --------------- | ------------------------------ |
| `targetEvent` | `GameEventBase` | 要断开连接的目标事件 |

**示例：**
```csharp
doorEvent.RemoveTriggerEvent(lightEvent);
```

:::warning 广泛影响

这会移除指向此事件的**所有**触发器，包括其他系统注册的触发器。使用`RemoveTriggerEvent(handle)`以获得精确性。

:::

</details>

<details>
<summary>RemoveAllTriggerEvents()</summary>

从此事件中移除所有触发器事件。
```csharp
void RemoveAllTriggerEvents();
```

**示例：**
```csharp
myEvent.RemoveAllTriggerEvents();
```

</details>

## 🔗 链事件（顺序模式）

<details>
<summary>AddChainEvent()</summary>

注册在链中顺序执行的目标事件。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<bool> condition = null,
    bool waitForCompletion = false
);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------------- | --------------- | ----------------------------------------------- |
| `targetEvent` | `GameEventBase` | 要在链中执行的事件 |
| `delay` | `float` | 执行此节点前的延迟（默认：0） |
| `duration` | `float` | 执行此节点后的延迟（默认：0） |
| `condition` | `Func<bool>` | 可选谓词 - 如果为false则链中断 |
| `waitForCompletion` | `bool` | 执行后等待一帧（默认：false） |

**返回值：** `ChainHandle` - 用于安全移除的唯一标识符

**示例：**
```csharp
// 简单序列：A → B → C
eventA.AddChainEvent(eventB);
eventB.AddChainEvent(eventC);

// 带延迟的过场动画
fadeOutEvent.AddChainEvent(loadSceneEvent, delay: 1f);
loadSceneEvent.AddChainEvent(fadeInEvent, delay: 0.5f);

// 条件链：仅在满足条件时继续
combatEndEvent.AddChainEvent(
    victoryEvent,
    condition: () => playerHealth > 0
);

// 带异步操作帧等待的链
showDialogEvent.AddChainEvent(
    typeTextEvent,
    waitForCompletion: true
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**参数：**

| 名称 | 类型 | 描述 |
| --------------------- | ----------------- | ----------------------------------------------- |
| `targetEvent` | `GameEventBase` | 要在链中执行的事件 |
| `delay` | `float` | 执行此节点前的延迟（默认：0） |
| `duration` | `float` | 执行此节点后的延迟（默认：0） |
| `condition` | `Func<T, bool>` | 接收参数的可选谓词 |
| `passArgument` | `bool` | 是否将数据传递给目标（默认：true） |
| `argumentTransformer` | `Func<T, object>` | 可选转换函数 |
| `waitForCompletion` | `bool` | 执行后等待一帧（默认：false） |

**返回值：** `ChainHandle` - 用于安全移除的唯一标识符

**示例：**
```csharp
// 带参数传递的链
GameEvent<int> damageEvent;
GameEvent<int> applyDamageEvent;
GameEvent<int> updateHealthBarEvent;

damageEvent.AddChainEvent(applyDamageEvent, passArgument: true);
applyDamageEvent.AddChainEvent(updateHealthBarEvent, passArgument: true);

// 带转换的链
GameEvent<int> damageEvent;
GameEvent<float> healthPercentEvent;

damageEvent.AddChainEvent(
    healthPercentEvent,
    passArgument: true,
    argumentTransformer: damage => 
        (float)(currentHealth - damage) / maxHealth
);

// 带参数检查的条件链
GameEvent<int> damageEvent;
GameEvent deathEvent;

damageEvent.AddChainEvent(
    deathEvent,
    condition: damage => (currentHealth - damage) <= 0,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**参数：**

| 名称 | 类型 | 描述 |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| `targetEvent` | `GameEventBase` | 要在链中执行的事件 |
| `delay` | `float` | 执行此节点前的延迟（默认：0） |
| `duration` | `float` | 执行此节点后的延迟（默认：0） |
| `condition` | `Func<TSender, TArgs, bool>` | 接收sender和args的可选谓词 |
| `passArgument` | `bool` | 是否将数据传递给目标（默认：true） |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | 可选转换函数 |
| `waitForCompletion` | `bool` | 执行后等待一帧（默认：false） |

**返回值：** `ChainHandle` - 用于安全移除的唯一标识符

**示例：**
```csharp
// 攻击序列链
GameEvent<GameObject, AttackData> attackStartEvent;
GameEvent<GameObject, AttackData> playAnimationEvent;
GameEvent<GameObject, AttackData> dealDamageEvent;

attackStartEvent.AddChainEvent(playAnimationEvent, delay: 0f);
playAnimationEvent.AddChainEvent(dealDamageEvent, delay: 0.5f);

// 提取伤害值
GameEvent<GameObject, AttackData> dealDamageEvent;
GameEvent<int> showDamageNumberEvent;

dealDamageEvent.AddChainEvent(
    showDamageNumberEvent,
    passArgument: true,
    argumentTransformer: (attacker, data) => data.damage
);

// 带条件的胜利链
GameEvent<GameObject, AttackData> attackEndEvent;
GameEvent<GameObject, VictoryData> victoryEvent;

attackEndEvent.AddChainEvent(
    victoryEvent,
    condition: (attacker, data) => data.targetHealth <= 0,
    argumentTransformer: (attacker, data) => 
        new VictoryData { winner = attacker }
);
```

</TabItem> </Tabs>

:::warning 顺序执行

链是**顺序的**（A → B → C）。如果任何节点的条件返回`false`或抛出异常，整个链在该点**停止**。

:::

:::tip 触发器 vs 链

- **触发器** = 并行（A → [B, C, D]）- 所有独立执行
- **链** = 顺序（A → B → C）- 严格顺序，失败时停止

:::

</details>

<details>
<summary>RemoveChainEvent()（按句柄）</summary>

使用其唯一句柄安全地移除特定链节点。
```csharp
void RemoveChainEvent(ChainHandle handle);
```

**参数：**

| 名称 | 类型 | 描述 |
| -------- | ------------- | ---------------------------------------- |
| `handle` | `ChainHandle` | `AddChainEvent()`返回的句柄 |

**示例：**
```csharp
ChainHandle handle = eventA.AddChainEvent(eventB);

// 移除特定链节点
eventA.RemoveChainEvent(handle);
```

</details>

<details>
<summary>RemoveChainEvent()（按目标）</summary>

移除指向特定目标事件的**所有**链节点。
```csharp
void RemoveChainEvent(GameEventBase targetEvent);
```

**参数：**

| 名称 | 类型 | 描述 |
| ------------- | --------------- | ------------------------------ |
| `targetEvent` | `GameEventBase` | 要断开连接的目标事件 |

**示例：**
```csharp
eventA.RemoveChainEvent(eventB);
```

:::warning 广泛影响

这会移除指向此事件的**所有**链节点。使用`RemoveChainEvent(handle)`以获得精确性。

:::

</details>

<details>
<summary>RemoveAllChainEvents()</summary>

从此事件中移除所有链事件。
```csharp
void RemoveAllChainEvents();
```

**示例：**
```csharp
myEvent.RemoveAllChainEvents();
```

</details>

## 🔧 配置与实用工具

<details>
<summary>SetInspectorListenersActive()</summary>

控制触发事件时是否应执行Inspector配置的监听器。
```csharp
void SetInspectorListenersActive(bool isActive);
```

**参数：**

| 名称 | 类型 | 描述 |
| ---------- | ------ | ---------------------------------------------------------- |
| `isActive` | `bool` | `true`启用Inspector监听器，`false`静音它们 |

**示例：**
```csharp
// 静音Inspector配置的UI/音频效果
damageEvent.SetInspectorListenersActive(false);

// 事件将仅触发代码注册的监听器
damageEvent.Raise(10);

// 重新启用Inspector监听器
damageEvent.SetInspectorListenersActive(true);
```

**使用场景：**

- 在过场动画期间临时静音视觉/音频效果
- 运行后端计算而不触发UI更新
- 在加载屏幕期间禁用特定于场景的行为
- 在测试/调试模式下模拟游戏逻辑

:::info 范围

此设置仅影响通过GameEventManager在**Unity Inspector**中配置的监听器。通过代码中的`AddListener()`注册的监听器**不受影响**，将始终执行。

:::

</details>

------

## 📊 快速参考表

### 方法类别

| 类别 | 方法 | 目的 |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| **执行** | `Raise()`, `Cancel()` | 触发事件并停止调度执行 |
| **调度** | `RaiseDelayed()`, `RaiseRepeating()`, `CancelDelayed()`, `CancelRepeating()` | 基于时间的事件执行 |
| **基础监听器** | `AddListener()`, `RemoveListener()`, `RemoveAllListeners()` | 标准回调注册 |
| **优先级监听器** | `AddPriorityListener()`, `RemovePriorityListener()` | 有序回调执行 |
| **条件监听器** | `AddConditionalListener()`, `RemoveConditionalListener()` | 门控回调执行 |
| **持久化监听器** | `AddPersistentListener()`, `RemovePersistentListener()` | 场景独立回调 |
| **触发器事件** | `AddTriggerEvent()`, `RemoveTriggerEvent()`, `RemoveAllTriggerEvents()` | 并行事件链 |
| **链事件** | `AddChainEvent()`, `RemoveChainEvent()`, `RemoveAllChainEvents()` | 顺序事件链 |
| **配置** | `SetInspectorListenersActive()` | 运行时行为控制 |