---
sidebar_label: '编程式流程'
sidebar_position: 3
---

# 编程式流程

虽然**可视化流程图**非常适合静态、设计时逻辑，但游戏开发通常需要**在运行时动态**构建事件关系。

**编程式流程API**允许您完全通过C#代码构建触发器（扇出）和链（序列）。这对于以下情况至关重要：
*   **程序化生成：** 为运行时生成的对象连接事件。
*   **动态任务：** 根据玩家选择创建逻辑步骤。
*   **临时状态效果：** 链接到期的伤害跳动或增益。

---

## ⚡ 核心概念：触发器 vs 链

在编码之前，理解内部管理器（`GameEventTriggerManager`和`GameEventChainManager`）处理的两种流程类型之间的区别至关重要。

| 特性 | ⚡ 触发器（扇出） | 🔗 链（序列） |
| :------------------- | :------------------------------------- | :--------------------------------------------- |
| **执行模式** | **并行**（即发即弃） | **顺序**（阻塞） |
| **失败处理** | 独立（如果A失败，B仍运行） | 严格（如果A失败，链停止） |
| **时间** | 同步（除非使用`delay`） | 基于协程（支持`wait`和`duration`） |
| **排序** | 按**优先级**排序 | 按**添加顺序**执行 |
| **使用场景** | VFX、成就、UI更新 | 过场动画、教程、回合逻辑 |

---

## 1. 触发器（并行执行）

使用`AddTriggerEvent`使一个事件自动触发其他事件。当源事件被触发时，所有注册的触发器立即执行（或在各自的延迟后）。

### 基本用法

当`onPlayerDeath`触发时，自动触发`onPlayDeathSound`和`onShowGameOverUI`。
```csharp
[GameEventDropdown] public GameEvent onPlayerDeath;
[GameEventDropdown] public GameEvent onPlayDeathSound;
[GameEventDropdown] public GameEvent onShowGameOverUI;

void Awake()
{
    // 这些实际上同时发生
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound);
    onPlayerDeath.AddTriggerEvent(onShowGameOverUI);
}
```

### 高级配置（优先级与条件）

您可以在不修改事件本身的情况下将逻辑注入到连接中。
```csharp
// 1. 高优先级：首先治疗
onPotionUsed.AddTriggerEvent(
    targetEvent: onRegenHealth,
    priority: 100 // 数字越大越先运行
);

// 2. 低优先级：逻辑开始后播放声音
onPotionUsed.AddTriggerEvent(
    targetEvent: onPlaySound,
    delay: 0.2f, // 可选延迟
    priority: 10
);

// 3. 条件：仅在图形设置允许时触发粒子
onPotionUsed.AddTriggerEvent(
    targetEvent: onParticleEffect,
    condition: () => GameSettings.EnableParticles
);
```

:::info 自动参数传递
默认情况下（passArgument: true），触发器尝试将数据从源传递到目标。如果类型匹配（例如，int到int），它会自动流动。如果类型不匹配，您需要一个**转换器**（见下文）。
:::

------

## 2. 链（顺序执行）

使用`AddChainEvent`在单个事件上构建严格排序的执行列表。

### 序列逻辑（队列）

当您将多个链节点添加到**同一个源事件**时，它们形成一个**队列**。系统逐个执行它们，等待前一个节点的`duration`完成后再开始下一个节点。

这允许您编排一个复杂的时间线（A → 等待 → B → 等待 → C），完全由源事件管理，而无需直接将B链接到C。
```csharp
[GameEventDropdown] public GameEvent onTurnStart;
[GameEventDropdown] public GameEvent onDrawCard;
[GameEventDropdown] public GameEvent onRefreshMana;

void Awake()
{
    // --- "回合开始"时间线 ---
    
    // 步骤1：抽牌
    // 设置'duration'意味着："执行此操作，然后在处理列表中的下一项之前等待0.5秒。"
    onTurnStart.AddChainEvent(onDrawCard, duration: 0.5f);
    
    // 步骤2：刷新法力
    // 这在步骤1完成（及其0.5秒持续时间过去）之后自动运行。
    onTurnStart.AddChainEvent(onRefreshMana);
    
    // 注意：我将两者都附加到'onTurnStart'。
    // 我不将步骤2附加到'onDrawCard'，因为我不想
    // 从法术抽牌意外触发法力刷新。
}
```

### 异步等待（waitForCompletion）

如果您的事件监听器启动协程或异步任务，您可以强制链等待它们。
```csharp
// 链将在这里暂停，直到'onPlayCutscene'的所有监听器
// 完成它们的工作（yield return null）。
onLevelEnd.AddChainEvent(onPlayCutscene, waitForCompletion: true);

// 这仅在过场动画完全处理后运行
onLevelEnd.AddChainEvent(onLoadNextLevel);
```

:::warning 链中断
如果条件返回false或在链节点中发生异常，**整个后续链将停止**。这对于条件逻辑很有用（例如，"如果敌人格挡则停止连击攻击"）。
:::

------

## 🔄 数据流与转换器

编程式流程最强大的功能是**参数转换**。这允许您桥接具有不兼容类型的事件或从复杂对象中提取特定数据。

### 1. 复杂到空（过滤器）

仅基于特定数据触发通用事件。
```csharp
// 源：伤害事件（float amount）
// 目标：暴击事件（Void）
onDamageTaken.AddTriggerEvent(
    targetEvent: onCriticalHitEffect,
    condition: (amount) => amount > 50f, // 仅当伤害 > 50
    passArgument: false // 目标是void，不传递float
);
```

### 2. 简单转换（类型转换）

将复杂对象事件映射到简单基本类型事件。

- **源：** `EnemyGameEvent (OnEnemyKilled)`
- **目标：** `public Int32GameEvent (OnAddXP)`
```csharp
[GameEventDropdown] public EnemyGameEvent onEnemyKilled;
[GameEventDropdown] public Int32GameEvent onAddXP;

void Awake()
{
    // 从Enemy对象中提取'xpValue'并将其传递给int事件
    onEnemyKilled.AddTriggerEvent(
        targetEvent: onAddXP,
        passArgument: true,
        argumentTransformer: (enemy) => enemy.xpValue 
    );
}
```

### 3. Sender与参数转换

对于`GameEvent<TSender, TArgs>`，转换器接收两个参数。
```csharp
// 源：玩家拾取物品（Sender: Player, Args: ItemData）
// 目标：通知（string）
onItemPickup.AddTriggerEvent(
    targetEvent: onShowNotification,
    passArgument: true,
    argumentTransformer: (player, item) => $"{player.Name}找到了一个{item.Rarity}物品！"
);
```

------

## 🧹 生命周期管理

与标准监听器（AddListener）不同，动态触发器和链返回一个**句柄**。您必须管理这些句柄以防止内存泄漏或不需要的逻辑持久性，特别是在对象池时。

### 使用句柄
```csharp
private TriggerHandle _triggerHandle;

void OnEnable()
{
    // 保存句柄
    _triggerHandle = onDoorOpen.AddTriggerEvent(onLightOn);
}

void OnDisable()
{
    // 使用句柄仅删除此特定链接
    if (_triggerHandle != null)
    {
        onDoorOpen.RemoveTriggerEvent(_triggerHandle);
        _triggerHandle = null;
    }
}
```

### 批量清理

如果对象被销毁或返回到池中，您可以清除与事件关联的所有动态逻辑。
```csharp
void OnDestroy()
{
    // 删除所有针对此事件的动态触发器
    myEvent.RemoveAllTriggerEvents();
    
    // 删除所有针对此事件的动态链
    myEvent.RemoveAllChainEvents();
}
```

## 📜 API摘要

| 方法签名 | 返回值 | 描述 |
| ------------------------------------------------------------ | --------------- | ------------------------------------ |
| **触发器注册** | | *并行/即发即弃* |
| `AddTriggerEvent(GameEventBase target, float delay, Func<bool> condition, int priority)` | `TriggerHandle` | 向Void事件添加触发器。 |
| `AddTriggerEvent(GameEventBase target, float delay, Func<T, bool> condition, bool passArg, Func<T, object> transformer, int priority)` | `TriggerHandle` | 向类型化事件添加触发器。 |
| `AddTriggerEvent(GameEventBase target, float delay, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, int priority)` | `TriggerHandle` | 向Sender事件添加触发器。 |
| **链注册** | | *顺序/阻塞* |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<bool> condition, bool wait)` | `ChainHandle` | 向Void事件添加链步骤。 |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<T, bool> condition, bool passArg, Func<T, object> transformer, bool wait)` | `ChainHandle` | 向类型化事件添加链步骤。 |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, bool wait)` | `ChainHandle` | 向Sender事件添加链步骤。 |
| **清理** | | *移除* |
| `RemoveTriggerEvent(TriggerHandle handle)` | `void` | 删除特定的触发器节点。 |
| `RemoveChainEvent(ChainHandle handle)` | `void` | 删除特定的链节点。 |
| `RemoveAllTriggerEvents()` | `void` | 清除所有动态触发器。 |
| `RemoveAllChainEvents()` | `void` | 清除所有动态链。 |