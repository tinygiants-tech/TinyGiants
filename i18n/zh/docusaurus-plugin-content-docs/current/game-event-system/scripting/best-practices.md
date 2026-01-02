---
sidebar_label: '执行与实践'
sidebar_position: 4
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# 执行顺序与最佳实践

理解GameEvent如何执行回调和管理事件流对于构建可靠、高性能的事件驱动系统至关重要。本指南涵盖执行顺序、常见模式、陷阱和优化策略。

------

## 🎯 执行顺序

### 可视化时间线

当调用`myEvent.Raise()`时，执行遵循此精确顺序：
```text
myEvent.Raise() 🚀
      │
      ├── 1️⃣ 基础监听器（FIFO顺序）
      │      │
      │      ├─► OnUpdate() 📝
      │      │      ✓ 已执行
      │      │
      │      └─► OnRender() 🎨
      │             ✓ 已执行
      │
      ├── 2️⃣ 优先级监听器（高 → 低）
      │      │
      │      ├─► [优先级 100] Critical() ⚡
      │      │      ✓ 首先执行
      │      │
      │      ├─► [优先级 50] Normal() 📊
      │      │      ✓ 其次执行
      │      │
      │      └─► [优先级 0] LowPriority() 📌
      │             ✓ 最后执行
      │
      ├── 3️⃣ 条件监听器（优先级 + 条件）
      │      │
      │      └─► [优先级 10] IfHealthLow() 💊
      │             │
      │             ├─► 条件检查: health < 20?
      │             │      ├─► ✅ True → 执行监听器
      │             │      └─► ❌ False → 跳过监听器
      │             │
      │             └─► (检查下一个条件...)
      │
      ├── 4️⃣ 持久化监听器（跨场景）
      │      │
      │      └─► GlobalLogger() 📋
      │             ✓ 始终执行（DontDestroyOnLoad）
      │
      ├── 5️⃣ 触发器事件（并行 - 扇出）🌟
      │      │
      │      ├─────► lightOnEvent.Raise() 💡
      │      │          (独立执行)
      │      │
      │      ├─────► soundEvent.Raise() 🔊
      │      │          (独立执行)
      │      │
      │      └─────► particleEvent.Raise() ✨
      │                 (独立执行)
      │
      │      ⚠️ 如果一个失败，其他仍然执行
      │
      └── 6️⃣ 链事件（顺序 - 严格顺序）🔗
             │
             └─► fadeOutEvent.Raise() 🌑
                    ✓ 成功
                    │
                    ├─► ⏱️ 等待（持续时间/延迟）
                    │
                    └─► loadSceneEvent.Raise() 🗺️
                           ✓ 成功
                           │
                           ├─► ⏱️ 等待（持续时间/延迟）
                           │
                           └─► fadeInEvent.Raise() 🌕
                                  ✓ 成功
                                  
                                  🛑 如果任何步骤失败 → 链停止
```

------

### 执行特性

| 阶段 | 模式 | 时间 | 失败行为 | 使用场景 |
| ------------------------- | --------------------- | ----------------------- | ----------------------- | --------------------------- |
| **基础监听器** | 顺序 | 同一帧，同步 | 继续到下一个 | 标准回调 |
| **优先级监听器** | 顺序（排序） | 同一帧，同步 | 继续到下一个 | 有序处理 |
| **条件监听器** | 顺序（过滤） | 同一帧，同步 | 如果false则跳过，继续 | 状态依赖逻辑 |
| **持久化监听器** | 顺序 | 同一帧，同步 | 继续到下一个 | 跨场景系统 |
| **触发器事件** | **并行** | 同一帧，独立 | 其他不受影响 | 副作用、通知 |
| **链事件** | **顺序** | 多帧，阻塞 | **链停止** | 过场动画、序列 |

------

### 关键差异说明

<Tabs> <TabItem value="listeners" label="监听器（1-4）" default>

**特性：**

- 在当前帧中**同步**执行
- 按定义的顺序一个接一个运行
- 每个监听器都是独立的
- 一个监听器的失败不会停止其他监听器

**示例：**
```csharp
healthEvent.AddListener(UpdateUI);           // 第1个运行
healthEvent.AddPriorityListener(SaveGame, 100); // 第2个运行（更高优先级）
healthEvent.AddConditionalListener(ShowWarning, 
    health => health < 20);                  // 第3个运行（如果条件为true）

healthEvent.Raise(15f);
// 顺序：SaveGame() → UpdateUI() → ShowWarning()（如果health < 20）
```

**时间线：**
```
🖼️ 帧 1024
🚀 healthEvent.Raise(15.0f)
│
├─► 💾 SaveGame()          ⏱️ 0.1ms
├─► 🖥️ UpdateUI()          ⏱️ 0.3ms
└─► ⚠️ ShowWarning()       ⏱️ 0.2ms
│
📊 总成本：0.6ms | ⚡ 状态：同步（同一帧）
```

</TabItem> <TabItem value="triggers" label="触发器（5）">

**特性：**

- **并行**执行（扇出模式）
- 所有触发器独立触发
- 一个触发器的失败不影响其他触发器
- 仍然是同步的，但逻辑上是并行的

**示例：**
```csharp
// 当boss死亡时，触发多个独立事件
bossDefeatedEvent.AddTriggerEvent(stopBossMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(playVictoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(spawnLootEvent, priority: 50);
bossDefeatedEvent.AddTriggerEvent(showVictoryUIEvent, priority: 40);
bossDefeatedEvent.AddTriggerEvent(saveCheckpointEvent, priority: 10);

bossDefeatedEvent.Raise();
// 所有5个事件触发，按优先级排序，但独立
// 如果spawnLootEvent失败，其他仍然执行
```

**时间线：**
```
🖼️ 帧 2048
🚀 bossDefeatedEvent.Raise()
│
├─► 🚀 stopBossMusicEvent.Raise()     ✅ 成功
├─► 🚀 playVictoryMusicEvent.Raise()  ✅ 成功
├─► 🚀 spawnLootEvent.Raise()         ❌ 失败！（异常隔离）
├─► 🚀 showVictoryUIEvent.Raise()     ✅ 已执行（弹性）
└─► 🚀 saveCheckpointEvent.Raise()    ✅ 已执行（弹性）
│
📊 结果：4/5成功 | 🛡️ 状态：容错（隔离失败）
```

</TabItem> <TabItem value="chains" label="链（6）">

**特性：**

- 带阻塞的**顺序**执行
- 严格顺序：A → B → C
- 支持步骤之间的延迟
- 如果任何步骤失败，**整个链停止**

**示例：**
```csharp
// 过场动画序列
cutsceneStartEvent.AddChainEvent(fadeOutEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(hideUIEvent, delay: 0f, duration: 0.5f);
cutsceneStartEvent.AddChainEvent(playCutsceneEvent, delay: 0f, duration: 5f);
cutsceneStartEvent.AddChainEvent(fadeInEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(showUIEvent, delay: 0f, duration: 0f);

// 执行链
cutsceneStartEvent.Raise();
```

**时间线：**
```
🖼️ T+0.0s | 帧 0
🚀 cutsceneStartEvent.Raise()
└─► 🎬 fadeOutEvent.Raise()             ✅ 已启动

        ┆  (Δ 1.0s 延迟)
        ▼
🖼️ T+1.0s | 帧 60
└─► 🖥️ hideUIEvent.Raise()              ✅ 已执行

        ┆  (Δ 0.5s 延迟)
        ▼
🖼️ T+1.5s | 帧 90
└─► 🎞️ playCutsceneEvent.Raise()         ✅ 已执行

        ┆  (Δ 5.0s 延迟)
        ▼
🖼️ T+6.5s | 帧 390
└─► 🎬 fadeInEvent.Raise()              ✅ 已执行

        ┆  (Δ 1.0s 延迟)
        ▼
🖼️ T+7.5s | 帧 450
└─► 🖥️ showUIEvent.Raise()              ✅ 已完成

📊 总时间线：~7.5s | 🎞️ 总跨度：450帧
```

**失败场景：**
```csharp
🖼️ T+0.0s | 帧 0
🚀 cutsceneStartEvent.Raise()           ✅ 已启动

        ┆  (Δ 1.0s)
        ▼
🖼️ T+1.0s | 帧 60
🚀 fadeOutEvent.Raise()                 ✅ 已执行

        ┆  (Δ 0.5s)
        ▼
🖼️ T+1.5s | 帧 90
🚀 hideUIEvent.Raise()                  ✅ 已执行

        ┆  (Δ 5.0s)
        ▼
🖼️ T+6.5s | 帧 390
🚀 playCutsceneEvent.Raise()            ❌ 严重失败！
                                        
        🛑 [ 断路器激活 ]
        ⚠️ 逻辑链停止以防止状态不同步。

        ⏩ fadeInEvent.Raise()          🚫 从未执行
        ⏩ showUIEvent.Raise()          🚫 从未执行
```

</TabItem> </Tabs>

------

## 💡 最佳实践

### 1. 监听器管理

#### 始终取消订阅

内存泄漏是事件系统的第一大问题。始终清理监听器。

<Tabs> <TabItem value="bad" label="❌ 不好">
```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void Start()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    // 对象被销毁但监听器仍在内存中！
    // 这会导致内存泄漏和潜在的崩溃
}
```

</TabItem> <TabItem value="good" label="✅ 好">
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
        // 始终取消订阅以防止内存泄漏
        onPlayerDeath.RemoveListener(HandleDeath);
    }
    
    void HandleDeath()
    {
        Debug.Log("玩家死亡！");
    }
}
```

</TabItem> </Tabs>

------

#### 使用OnEnable/OnDisable模式

OnEnable/OnDisable模式是Unity推荐的方法。
```csharp
public class HealthUI : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<float> healthChangedEvent;
    
    void OnEnable()
    {
        // 活动时订阅
        healthChangedEvent.AddListener(OnHealthChanged);
    }
    
    void OnDisable()
    {
        // 非活动时取消订阅
        healthChangedEvent.RemoveListener(OnHealthChanged);
    }
    
    void OnHealthChanged(float newHealth)
    {
        // 更新UI
    }
}
```

**好处：**

- 对象禁用/销毁时自动清理
- 监听器仅在需要时活动
- 防止重复订阅
- 适用于对象池

------

### 2. 调度管理

#### 存储句柄以便取消

如果以后需要取消，始终存储`ScheduleHandle`。

<Tabs> <TabItem value="bad" label="❌ 不好">
```csharp
public class PoisonEffect : MonoBehaviour
{
    void ApplyPoison()
    {
        // 以后无法取消这个！
        poisonEvent.RaiseRepeating(damagePerTick, 1f, repeatCount: 10);
    }
    
    void CurePoison()
    {
        // 无法停止毒药！
        // 它将继续执行所有10次
    }
}
```

</TabItem> <TabItem value="good" label="✅ 好">
```csharp
public class PoisonEffect : MonoBehaviour
{
    private ScheduleHandle _poisonHandle;
    
    void ApplyPoison()
    {
        // 存储句柄
        _poisonHandle = poisonEvent.RaiseRepeating(
            damagePerTick, 
            1f, 
            repeatCount: 10
        );
    }
    
    void CurePoison()
    {
        // 可以取消毒药效果
        if (poisonEvent.CancelRepeating(_poisonHandle))
        {
            Debug.Log("毒药已治愈！");
        }
    }
    
    void OnDisable()
    {
        // 禁用时清理
        poisonEvent.CancelRepeating(_poisonHandle);
    }
}
```

</TabItem> </Tabs>

------

#### 多个调度模式

管理多个调度时，使用集合。
```csharp
public class BuffManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<string> buffTickEvent;
    
    private Dictionary<string, ScheduleHandle> _activeBuffs = new();
    
    public void ApplyBuff(string buffName, float interval, int duration)
    {
        // 如果有，取消现有buff
        if (_activeBuffs.TryGetValue(buffName, out var existingHandle))
        {
            buffTickEvent.CancelRepeating(existingHandle);
        }
        
        // 应用新buff
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
        // 取消所有buff
        foreach (var handle in _activeBuffs.Values)
        {
            buffTickEvent.CancelRepeating(handle);
        }
        _activeBuffs.Clear();
    }
}
```

------

### 3. 触发器和链管理

#### 使用句柄以安全移除

始终使用句柄以避免删除其他系统的触发器/链。

<Tabs> <TabItem value="bad" label="❌ 有风险">
```csharp
public class DoorSystem : MonoBehaviour
{
    void SetupDoor()
    {
        doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // 危险：删除所有到lightOnEvent的触发器
        // 甚至是其他系统注册的！
        doorOpenEvent.RemoveTriggerEvent(lightOnEvent);
    }
}
```

</TabItem> <TabItem value="good" label="✅ 安全">
```csharp
public class DoorSystem : MonoBehaviour
{
    private TriggerHandle _lightTriggerHandle;
    
    void SetupDoor()
    {
        // 存储句柄
        _lightTriggerHandle = doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // 仅删除您的特定触发器
        doorOpenEvent.RemoveTriggerEvent(_lightTriggerHandle);
    }
}
```

</TabItem> </Tabs>

------

#### 组织多个触发器/链

对复杂系统使用结构化方法。
```csharp
public class CutsceneManager : MonoBehaviour
{
    // 存储所有句柄以便清理
    private readonly List<ChainHandle> _cutsceneChains = new();
    private readonly List<TriggerHandle> _cutsceneTriggers = new();
    
    void SetupCutscene()
    {
        // 构建过场动画序列
        var chain1 = startEvent.AddChainEvent(fadeOutEvent, duration: 1f);
        var chain2 = startEvent.AddChainEvent(playVideoEvent, duration: 5f);
        var chain3 = startEvent.AddChainEvent(fadeInEvent, duration: 1f);
        
        _cutsceneChains.Add(chain1);
        _cutsceneChains.Add(chain2);
        _cutsceneChains.Add(chain3);
        
        // 为效果添加并行触发器
        var trigger1 = startEvent.AddTriggerEvent(stopGameplayMusicEvent);
        var trigger2 = startEvent.AddTriggerEvent(hideCrosshairEvent);
        
        _cutsceneTriggers.Add(trigger1);
        _cutsceneTriggers.Add(trigger2);
    }
    
    void SkipCutscene()
    {
        // 清理所有链
        foreach (var chain in _cutsceneChains)
        {
            startEvent.RemoveChainEvent(chain);
        }
        _cutsceneChains.Clear();
        
        // 清理所有触发器
        foreach (var trigger in _cutsceneTriggers)
        {
            startEvent.RemoveTriggerEvent(trigger);
        }
        _cutsceneTriggers.Clear();
    }
}
```

------

### 4. 优先级使用

#### 优先级值指南

在项目中使用一致的优先级刻度。
```csharp
// 定义优先级常量
public static class EventPriority
{
    public const int CRITICAL = 1000;    // 绝对必须首先运行
    public const int HIGH = 100;         // 重要系统
    public const int NORMAL = 0;         // 默认优先级
    public const int LOW = -100;         // 可以稍后运行
    public const int CLEANUP = -1000;    // 最终清理任务
}

// 用法
healthEvent.AddPriorityListener(SavePlayerData, EventPriority.CRITICAL);
healthEvent.AddPriorityListener(UpdateHealthBar, EventPriority.HIGH);
healthEvent.AddPriorityListener(PlayDamageSound, EventPriority.NORMAL);
healthEvent.AddPriorityListener(UpdateStatistics, EventPriority.LOW);
```

------

#### 优先级反模式

<Tabs> <TabItem value="bad" label="❌ 避免">
```csharp
// 不要使用随机或不一致的优先级
healthEvent.AddPriorityListener(SystemA, 523);
healthEvent.AddPriorityListener(SystemB, 891);
healthEvent.AddPriorityListener(SystemC, 7);

// 当顺序不重要时不要过度使用优先级
uiClickEvent.AddPriorityListener(PlaySound, 50);
uiClickEvent.AddPriorityListener(PlayParticle, 49);
// 这些不需要优先级，使用基础监听器！
```

</TabItem> <TabItem value="good" label="✅ 最佳实践">
```csharp
// 仅在顺序重要时使用优先级
saveGameEvent.AddPriorityListener(ValidateData, 100);   // 必须首先验证
saveGameEvent.AddPriorityListener(SerializeData, 50);   // 然后序列化
saveGameEvent.AddPriorityListener(WriteToFile, 0);      // 最后写入

// 当顺序不重要时使用基础监听器
buttonClickEvent.AddListener(PlaySound);
buttonClickEvent.AddListener(ShowFeedback);
buttonClickEvent.AddListener(LogAnalytics);
```

</TabItem> </Tabs>

------

### 5. 条件监听器

#### 有效的条件设计

保持条件简单快速。

<Tabs> <TabItem value="bad" label="❌ 昂贵">
```csharp
// 不要在条件中做昂贵的操作
enemySpawnEvent.AddConditionalListener(
    SpawnBoss,
    () => {
        // 不好：条件中的复杂计算
        var enemies = FindObjectsOfType<Enemy>();
        var totalHealth = enemies.Sum(e => e.Health);
        var averageLevel = enemies.Average(e => e.Level);
        return totalHealth < 100 && averageLevel > 5;
    }
);
```

</TabItem> <TabItem value="good" label="✅ 高效">
```csharp
// 缓存状态，使条件成为简单检查
private bool _shouldSpawnBoss = false;

void UpdateGameState()
{
    // 偶尔更新缓存状态，而不是每帧
    _shouldSpawnBoss = enemyManager.TotalHealth < 100 
                    && enemyManager.AverageLevel > 5;
}

void Setup()
{
    // 简单、快速的条件检查
    enemySpawnEvent.AddConditionalListener(
        SpawnBoss,
        () => _shouldSpawnBoss
    );
}
```

</TabItem> </Tabs>

------

## ⚠️ 常见陷阱

### 1. 内存泄漏

**问题：** 对象销毁时不取消订阅监听器。

**症状：**

- 随时间增加的内存使用
- 关于销毁对象的错误
- 回调在空引用上执行

**解决方案：**
```csharp
// 始终使用OnEnable/OnDisable模式
void OnEnable() => myEvent.AddListener(OnCallback);
void OnDisable() => myEvent.RemoveListener(OnCallback);
```

------

### 2. 丢失调度句柄

**问题：** 创建调度而不存储句柄。

**症状：**

- 无法取消重复事件
- 对象销毁后事件继续
- 不需要的执行造成资源浪费

**解决方案：**
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

### 3. 广泛移除影响

**问题：** 使用基于目标的移除而不是基于句柄的移除。

**症状：**

- 其他系统的触发器/链意外被删除
- 难以调试的问题，事件停止触发
- 跨系统耦合和脆弱性

**解决方案：**
```csharp
// 存储句柄，精确移除
private TriggerHandle _myTrigger;

void Setup()
{
    _myTrigger = eventA.AddTriggerEvent(eventB);
}

void Cleanup()
{
    eventA.RemoveTriggerEvent(_myTrigger);  // 安全！
}
```

------

### 4. 递归事件触发

**问题：** 事件监听器触发相同的事件，导致无限循环。

**症状：**

- 堆栈溢出异常
- Unity冻结
- 指数执行增长

**示例：**
```csharp
// ❌ 危险：无限递归！
void Setup()
{
    healthEvent.AddListener(OnHealthChanged);
}

void OnHealthChanged(float health)
{
    // 这再次触发OnHealthChanged！
    healthEvent.Raise(health - 1);  // ← 无限循环
}
```

**解决方案：**
```csharp
// ✅ 使用标志防止递归
private bool _isProcessingHealthChange = false;

void OnHealthChanged(float health)
{
    if (_isProcessingHealthChange) return;  // 防止递归
    
    _isProcessingHealthChange = true;
    
    // 现在这里触发是安全的
    if (health <= 0)
    {
        deathEvent.Raise();
    }
    
    _isProcessingHealthChange = false;
}
```

------

## 🚀 性能优化

### 1. 最小化监听器数量

即使代码已经高度优化，每个监听器仍会有一些开销。尽可能合并。

<Tabs> <TabItem value="bad" label="❌ 低效">
```csharp
// 相关操作的多个监听器
healthEvent.AddListener(UpdateHealthBar);
healthEvent.AddListener(UpdateHealthText);
healthEvent.AddListener(UpdateHealthIcon);
healthEvent.AddListener(UpdateHealthColor);
```

</TabItem> <TabItem value="good" label="✅ 优化">
```csharp
// 单个监听器处理所有UI更新
healthEvent.AddListener(UpdateHealthUI);

void UpdateHealthUI(float health)
{
    // 批量所有UI更新
    healthBar.value = health / maxHealth;
    healthText.text = $"{health:F0}";
    healthIcon.sprite = GetHealthIcon(health);
    healthColor.color = GetHealthColor(health);
}
```

</TabItem> </Tabs>

------

### 2. 避免监听器中的重操作

保持监听器轻量级。将重工作移到协程/异步。

<Tabs> <TabItem value="bad" label="❌ 阻塞">
```csharp
void OnDataLoaded(string data)
{
    // 不好：阻塞所有后续监听器的执行
    var parsed = JsonUtility.FromJson<LargeData>(data);
    ProcessComplexData(parsed);  // 需要50ms
    SaveToDatabase(parsed);      // 需要100ms
}
```

</TabItem> <TabItem value="good" label="✅ 异步">
```csharp
void OnDataLoaded(string data)
{
    // 好：启动异步处理，不阻塞
    StartCoroutine(ProcessDataAsync(data));
}

IEnumerator ProcessDataAsync(string data)
{
    // 解析
    var parsed = JsonUtility.FromJson<LargeData>(data);
    yield return null;
    
    // 处理
    ProcessComplexData(parsed);
    yield return null;
    
    // 保存
    SaveToDatabase(parsed);
}
```

</TabItem> </Tabs>

------

### 3. 缓存委托分配

避免每帧创建新的委托分配。

<Tabs> <TabItem value="bad" label="❌ 分配">
```csharp
void OnEnable()
{
    // 每次都创建新的委托分配
    updateEvent.AddListener(() => UpdateHealth());
}
```

</TabItem> <TabItem value="good" label="✅ 缓存">
```csharp
void OnEnable()
{
    // 重用相同的方法引用，无分配
    updateEvent.AddListener(UpdateHealth);
}

void UpdateHealth()
{
    // 实现
}
```

</TabItem> </Tabs>

------

## 📊 总结检查清单

使用此检查清单处理`GameEvent`：

### 监听器管理

- 始终在OnDisable中取消订阅
- 使用OnEnable/OnDisable模式
- 尽可能缓存委托引用
- 保持监听器轻量级

### 调度管理

- 需要取消时存储ScheduleHandle
- 在OnDisable中取消调度
- 使用集合管理多个调度
- 对象销毁时清理

### 触发器/链管理

- 使用句柄以安全移除
- 在集合中存储句柄以便清理
- 为并行选择触发器，为顺序选择链
- 记得为链调用ExecuteChainEvents()

### 性能

- 合并相关监听器
- 将重工作移到协程/异步
- 使用简单、快速的条件
- 避免递归事件触发

### 优先级与条件

- 使用一致的优先级刻度
- 仅在顺序重要时使用优先级
- 保持条件简单且缓存
- 记录优先级依赖关系