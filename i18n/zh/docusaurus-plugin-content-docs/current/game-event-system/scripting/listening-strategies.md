---
sidebar_label: '监听策略'
sidebar_position: 2
---

# 监听策略

虽然触发事件发送信号，但**监听**是实际游戏逻辑发生的地方。

游戏事件系统提供了分层监听架构，允许您不仅控制*什么*响应，还控制*何时*以及*在什么条件下*响应。

---

## 🚦 执行管线

当事件被触发时，监听器以严格、确定性的顺序执行。理解此管线对于管理依赖关系（例如，确保数据在UI之前更新）至关重要。

1.  **基础监听器**（代码）
2.  **Inspector绑定**（场景视觉效果）
3.  **优先级监听器**（排序代码）
4.  **条件监听器**（过滤代码）
5.  **持久化监听器**（全局/跨场景）
6.  **流程图**（触发器与链）

---

## 1. 基础监听器（标准）

这是绑定逻辑的最常见方式。它的行为与标准C#事件或`UnityEvent`完全相同。

### 用法
对于标准的、非关键的游戏逻辑，其中执行顺序相对于其他监听器无关紧要时使用此方法。
```csharp
public class PlayerHealth : MonoBehaviour
{
    [GameEventDropdown] public Int32GameEvent onTakeDamage;

    private void OnEnable()
    {
        // 订阅
        onTakeDamage.AddListener(OnDamageReceived);
    }

    private void OnDisable()
    {
        // 取消订阅（防止内存泄漏的关键！）
        onTakeDamage.RemoveListener(OnDamageReceived);
    }

    private void OnDamageReceived(int amount)
    {
        Debug.Log($"哎哟！受到{amount}点伤害。");
    }
}
```

:::warning 匿名函数（Lambda）
避免使用Lambda表达式（例如，AddListener(() => DoThing())），除非您确定不需要取消订阅。您**无法**稍后删除特定的lambda监听器，因为匿名实例丢失了。
:::

------

## 2. 优先级监听器（排序）

当多个脚本监听同一个事件时，执行顺序通常是未定义的。**优先级监听器**通过允许您注入整数权重来解决此问题。

### 执行规则

- **数字越大** = 执行**越早**。
- **数字越小** = 执行**越晚**。

### 用法

非常适合将**数据逻辑**与**视图逻辑**分离。
```csharp
// 1. 数据系统（高优先级）
// 必须首先运行以计算新的生命值。
onPlayerHit.AddPriorityListener(CalculateHealth, 100);

// 2. UI系统（低优先级）
// 稍后运行。安全读取现在更新的生命值。
onPlayerHit.AddPriorityListener(UpdateHealthBar, 0);
```

### Sender与参数支持

优先级监听器完全支持泛型和sender有效载荷。
```csharp
// 以优先级监听，接收Sender和Args
onCombatEvent.AddPriorityListener(OnCombatLog, 10);

void OnCombatLog(GameObject sender, DamageInfo info) { ... }
```

------

## 3. 条件监听器（谓词）

有时您想要监听事件，但只在满足特定条件时执行逻辑。与其在每个回调中编写if语句，不如注册一个**谓词**。

### 逻辑流程

1. 事件触发。
2. 系统调用您的**条件函数**。
3. 如果返回true ➔ 执行监听器。
4. 如果返回false ➔ 跳过监听器。

### 用法

非常适合过滤高频事件的噪音。
```csharp
// 仅在生命值实际为零时触发'死亡'逻辑
onHealthChanged.AddConditionalListener(
    OnDeath, 
    condition: (currentHealth) => currentHealth <= 0
);

// 仅在sender是玩家时响应
onInteraction.AddConditionalListener(
    OpenMenu, 
    condition: (sender, args) => sender.CompareTag("Player")
);
```

------

## 4. 持久化监听器（全局）

标准监听器在其GameObject被销毁时被销毁（例如，加载新场景）。**持久化监听器**注册到全局管理器（DontDestroyOnLoad）并在场景转换中存活。

### 用法

非常适合在整个游戏中持续存在的全局管理器，如**AudioManager**、**Analytics**或**SaveSystem**。
```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onLevelStart;

    void Awake()
    {
        DontDestroyOnLoad(this);
        
        // 即使在场景更改后，此监听器仍将继续工作
        onLevelStart.AddPersistentListener(PlayLevelMusic);
    }
    
    // 注意：如果此对象实际被销毁，您仍必须手动删除它
    void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(PlayLevelMusic);
    }
}
```

:::danger 目标安全性
如果持久化监听器的目标对象被销毁（例如，普通敌人），系统将检测到空引用并跳过执行，打印警告。始终在OnDestroy中注销持久化监听器。
:::

------

## 🧹 安全性与维护

### 移除监听器

始终将您的Add调用与Remove调用配对。API为每种监听器类型提供对称的移除方法：

- RemoveListener(action)
- RemovePriorityListener(action)
- RemoveConditionalListener(action)
- RemovePersistentListener(action)

### 核选项（RemoveAllListeners）

在极少数情况下（例如，对象池重置或游戏关闭），您可能想要清空事件。
```csharp
// 清除基础、优先级和条件监听器。
// 不清除持久化监听器（为了安全）。
myEvent.RemoveAllListeners();
```

------

## 🧩 总结：使用哪种策略？

| 需求 | 策略 | 为什么？ |
| ------------------------------------------ | --------------- | ------------------------------------------------- |
| **"只要告诉我何时发生。"** | **基础** | 最低开销，标准行为。 |
| **"我需要在UI更新之前运行。"** | **优先级** | 保证执行顺序（高优先级优先）。 |
| **"仅在Health < 0时运行。"** | **条件** | 清晰的代码，在源头过滤逻辑。 |
| **"在下一个场景中继续监听。"** | **持久化** | 在场景加载/卸载中存活。 |

---

## 📜 API摘要

| 方法签名 | 返回值 | 描述 |
| :----------------------------------------------------------- | :------ | :----------------------------------------------------------- |
| **基础监听器** | | |
| `AddListener(UnityAction call)` | `void` | 添加基础void监听器。 |
| `AddListener(UnityAction<T> call)` | `void` | 添加带一个参数的基础监听器。 |
| `AddListener(UnityAction<TSender, TArgs> call)` | `void` | 添加带sender和参数的基础监听器。 |
| `RemoveListener(UnityAction call)` | `void` | 移除基础void监听器。 |
| `RemoveListener(UnityAction<T> call)` | `void` | 移除带一个参数的基础监听器。 |
| `RemoveListener(UnityAction<TSender, TArgs> call)` | `void` | 移除带sender和参数的基础监听器。 |
| **优先级监听器** | | |
| `AddPriorityListener(UnityAction call, int priority)` | `void` | 添加带执行优先级的void监听器。 |
| `AddPriorityListener(UnityAction<T> call, int priority)` | `void` | 添加带执行优先级的类型化监听器。 |
| `AddPriorityListener(UnityAction<TSender, TArgs> call, int priority)` | `void` | 添加带执行优先级的sender监听器。 |
| `RemovePriorityListener(UnityAction call)` | `void` | 移除void优先级监听器。 |
| `RemovePriorityListener(UnityAction<T> call)` | `void` | 移除类型化优先级监听器。 |
| `RemovePriorityListener(UnityAction<TSender, TArgs> call)` | `void` | 移除sender优先级监听器。 |
| **条件监听器** | | |
| `AddConditionalListener(UnityAction call, Func<bool> condition, int priority)` | `void` | 添加由条件保护的void监听器。 |
| `AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority)` | `void` | 添加由条件保护的类型化监听器。 |
| `AddConditionalListener(UnityAction<TSender, TArgs> call, Func<TSender, TArgs, bool> condition, int priority)` | `void` | 添加由条件保护的sender监听器。 |
| `RemoveConditionalListener(UnityAction call)` | `void` | 移除void条件监听器。 |
| `RemoveConditionalListener(UnityAction<T> call)` | `void` | 移除类型化条件监听器。 |
| `RemoveConditionalListener(UnityAction<TSender, TArgs> call)` | `void` | 移除sender条件监听器。 |
| **持久化监听器** | | |
| `AddPersistentListener(UnityAction call, int priority)` | `void` | 添加全局void监听器（DontDestroyOnLoad）。 |
| `AddPersistentListener(UnityAction<T> call, int priority)` | `void` | 添加全局类型化监听器。 |
| `AddPersistentListener(UnityAction<TSender, TArgs> call, int priority)` | `void` | 添加全局sender监听器。 |
| `RemovePersistentListener(UnityAction call)` | `void` | 移除全局void监听器。 |
| `RemovePersistentListener(UnityAction<T> call)` | `void` | 移除全局类型化监听器。 |
| `RemovePersistentListener(UnityAction<TSender, TArgs> call)` | `void` | 移除全局sender监听器。 |
| **全局清理** | | |
| `RemoveAllListeners()` | `void` | 清除**基础**、**优先级**和**条件**监听器。<br/>*（注意：为了安全不清除持久化监听器）。* |