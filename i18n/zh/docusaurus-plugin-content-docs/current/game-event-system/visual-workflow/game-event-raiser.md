---
sidebar_label: '触发游戏事件'
sidebar_position: 6
---

# 触发游戏事件

创建和配置事件后，最后一步是 **在游戏逻辑中触发它们**。本页展示游戏事件的工作原理以及如何在脚本中触发它们。

:::tip 完成可视化工作流

1. ✅ 创建事件 → **[游戏事件创建器](./game-event-creator.md)**
2. ✅ 配置动作 → **[游戏事件行为](./game-event-behavior.md)**
3. ✅ **触发事件** ← 您在这里
   :::

---

## 🎯 游戏事件的工作原理

游戏事件将 **事件触发** 与 **动作执行** 解耦：

**传统方法**：
```csharp
// ❌ 紧密耦合 - 门的逻辑知道声音、动画等
public class Door : MonoBehaviour
{
    public AudioSource audioSource;
    public Animator animator;
    public UIManager uiManager;
    
    public void Open()
    {
        audioSource.Play();
        animator.SetTrigger("Open");
        uiManager.ShowNotification("Door opened");
        // 逻辑分散在多个依赖项中
    }
}
```

**游戏事件方法**：
```csharp
// ✅ 解耦 - 门只知道"发生了某事"
public class Door : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onDoorOpened;
    
    public void Open()
    {
        onDoorOpened.Raise();  // 动作在Inspector中配置
    }
}
```

**关键区别**：动作（声音、动画、UI）在 **事件行为中可视化配置**，而不是在脚本中硬编码。

---

## 📝 基本用法：触发事件

### 步骤1：在脚本中引用事件
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [GameEventDropdown]  // 智能Inspector选择器
    public GameEvent onDoorOpened;
    
    [GameEventDropdown]
    public GameEvent onDoorClosed;
    
    public void OpenDoor()
    {
        // 您的门逻辑在这里
        onDoorOpened.Raise();  // 触发事件
    }
    
    public void CloseDoor()
    {
        // 您的门逻辑在这里
        onDoorClosed.Raise();
    }
}
```

---

### 步骤2：在Inspector中分配事件

**[GameEventDropdown]** 属性提供 **类型安全的可搜索下拉菜单**：

![GameEvent Dropdown](/img/game-event-system/visual-workflow/game-event-raiser/raiser-dropdown.png)

**功能**：

- 🔍 **模糊搜索**：输入以按名称过滤事件
- 📁 **分类**：事件按数据库和类别分组
- 🔒 **类型安全**：仅显示兼容的事件类型
- ⚡ **快速访问**：无需手动拖动资产

---

### 替代方案：不使用[GameEventDropdown]

您也可以使用标准公共字段：
```csharp
public GameEvent onDoorOpened;  // 标准ScriptableObject字段
```

**Inspector视图**：

![Standard Object Field](/img/game-event-system/visual-workflow/game-event-raiser/raiser-so.png)

**工作流**：

1. 在项目窗口中找到事件资产（事件数据库）
2. 拖放到Inspector字段

**建议**：使用 **[GameEventDropdown]** 以获得更好的工作流——它更快且类型安全。

---

## 🎨 类型化事件（带参数）

事件可以向动作携带数据。

### 空事件（无数据）
```csharp
[GameEventDropdown]
public GameEvent onGameStart;

void Start()
{
    onGameStart.Raise();  // 无参数
}
```

---

### 单参数事件
```csharp
[GameEventDropdown]
public SingleGameEvent onHealthChanged;

private float health = 100f;

public void TakeDamage(float damage)
{
    health -= damage;
    onHealthChanged.Raise(health);  // 传递当前生命值
}
```

**类型安全**：下拉菜单仅显示 `SingleGameEvent` 事件，防止类型不匹配。

---

### Sender + 参数事件
```csharp
[GameEventDropdown]
public GameObjectDamageInfoGameEvent onPlayerDamaged;

public void ApplyDamage(DamageInfo damageInfo)
{
    // Sender = 此GameObject, Args = 伤害信息
    onPlayerDamaged.Raise(this.gameObject, damageInfo);
}
```

**使用场景**：动作需要知道 **谁** 触发了事件以及要处理 **什么** 数据。

---

## 🔒 类型安全实战

下拉菜单根据字段类型 **自动过滤** 事件：
```csharp
public class ScoreManager : MonoBehaviour
{
    [GameEventDropdown]
    public Int32GameEvent onScoreChanged;  // 仅显示public Int32GameEvent
    
    [GameEventDropdown]
    public Int32GameEvent onLevelUp;       // 仅显示public Int32GameEvent
    
    private int score = 0;
    
    public void AddScore(int points)
    {
        score += points;
        onScoreChanged.Raise(score);  // 传递整数分数
    }
}
```

**下拉过滤**：
```
public Int32GameEvent的可用事件：
  ✅ OnScoreChanged (int)
  ✅ OnLevelUp (int)
  ✅ OnComboMultiplier (int)
  ❌ OnPlayerDeath (void) — 过滤掉（错误类型）
  ❌ OnDamage (float) — 过滤掉（错误类型）
```

**为什么这很重要**：在 **编辑时** 捕获类型错误，而不是运行时。

---

## 🔄 取消预定事件

如果您的事件使用 **延迟** 或 **重复** 设置（在 **[游戏事件行为](./game-event-behavior.md)** 中配置），您可以取消执行：
```csharp
[GameEventDropdown]
public GameEvent repeatingSoundEvent;

void StartAmbientSound()
{
    repeatingSoundEvent.Raise();  // 开始重复（基于行为配置）
}

void StopAmbientSound()
{
    repeatingSoundEvent.Cancel();  // 停止预定执行
}
```

**使用场景**：

- 玩家离开触发区域 → 取消环境声音
- 游戏暂停 → 取消定时事件
- 对象销毁 → 清理预定动作

---

## 🔧 高级：Inspector监听器控制

很少需要，但您可以在运行时禁用Inspector配置的动作：
```csharp
[GameEventDropdown]
public GameEvent myEvent;

void DisableCutsceneUI()
{
    myEvent.SetInspectorListenersActive(false);
    // Inspector动作不会触发，只有代码监听器
}

void EnableCutsceneUI()
{
    myEvent.SetInspectorListenersActive(true);
    // Inspector动作再次触发
}
```

**使用场景**：

- 在过场动画期间临时禁用UI更新
- 根据游戏状态在动作集之间切换

------

## 💡 完整工作流示例

让我们使用可视化工作流构建一个完整的门系统。

### 步骤1：创建事件

在 **[游戏事件创建器](./game-event-creator.md)** 中：

![Event Editor Create](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-editor.png)

- 创建 `OnDoorOpened`（空事件）
- 创建 `OnDoorClosed`（空事件）

---

### 步骤2：配置动作

在 **[游戏事件行为](./game-event-behavior.md)** 中：

![Event Behavior Configure](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-behavior.png)

**OnDoorOpened事件**：

- 动作：`AudioSource.PlayOneShot(doorOpenSound)`
- 动作：`Animator.SetTrigger("Open")`
- 动作：`ParticleSystem.Play()`（灰尘效果）

**OnDoorClosed事件**：

- 动作：`AudioSource.PlayOneShot(doorCloseSound)`
- 动作：`Animator.SetTrigger("Close")`

---

### 步骤3：编写脚本
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onDoorOpened;
    
    [GameEventDropdown]
    public GameEvent onDoorClosed;
    
    private bool isOpen = false;
    
    public void ToggleDoor()
    {
        if (isOpen)
        {
            isOpen = false;
            onDoorClosed.Raise();  // 所有动作自动触发
        }
        else
        {
            isOpen = true;
            onDoorOpened.Raise();  // 所有动作自动触发
        }
    }
    
    // 此方法可以从以下位置调用：
    // - Inspector中的按钮OnClick
    // - 碰撞/触发器检测
    // - 其他游戏系统
}
```

---

### 步骤4：在Inspector中分配事件

![Door Inspector Setup](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-dropdown.png)

1. 选择 `DoorController` GameObject
2. 使用下拉菜单分配 `OnDoorOpened` 事件
3. 使用下拉菜单分配 `OnDoorClosed` 事件

**完成！** 脚本中没有声音、动画或VFX引用——全部可视化配置。

---

## 🆚 为什么比UnityEvents好？

传统的UnityEvent方法有游戏事件解决的限制：

### 传统UnityEvent限制
```csharp
// ❌ 问题1：配置分散在许多GameObject中
public class Button1 : MonoBehaviour
{
    public UnityEvent onClick;  // 在Button1的Inspector中配置
}

public class Button2 : MonoBehaviour
{
    public UnityEvent onClick;  // 在Button2的Inspector中配置
}

// ❌ 问题2：难以找到所有使用
// 需要手动搜索场景中的每个GameObject

// ❌ 问题3：没有集中控制
// 无法全局启用/禁用按钮声音

// ❌ 问题4：重复
// 在50个按钮中重复相同的声音/VFX设置
```

---

### 游戏事件优势
```csharp
// ✅ 解决方案：所有按钮触发相同事件
public class ButtonController : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onButtonClick;  // 所有按钮的相同事件
    
    public void OnClick()
    {
        onButtonClick.Raise();
    }
}
```

**好处**：

| 功能 | UnityEvent | 游戏事件 |
| ---------------------- | ------------------- | ---------------------------------------- |
| **集中配置** | ❌ 每个GameObject | ✅ 一个事件行为 |
| **查找所有使用** | ❌ 手动搜索 | ✅ [事件查找器](./game-event-finder.md) |
| **全局控制** | ❌ 更改50个对象 | ✅ 更改一个事件 |
| **可重用性** | ❌ 复制粘贴 | ✅ 引用相同资产 |
| **条件逻辑** | ❌ 需要代码 | ✅ 可视化条件树 |
| **调试** | ❌ 仅Inspector | ✅ 流程图可视化 |

---

### 何时使用每种

**使用UnityEvents**：

- 简单的一次性回调（例如，教程按钮）
- 组件特定逻辑（例如，滑块更新其自己的标签）
- 不需要可重用性

**使用游戏事件**：

- 可重用逻辑（例如，所有按钮点击播放相同声音）
- 复杂序列（例如，过场动画、门谜题）
- 需要集中控制（例如，静音所有UI声音）
- 想要可视化调试（流程图）

------

## ❓ 故障排除

### 下拉菜单显示"Manager Missing"

**原因**：场景中没有 `GameEventManager`。

**解决方案**：

通过Unity工具栏打开游戏事件系统：
```csharp
Tools > TinyGiants > Game Event System
```

点击 **"Initialize Event System"** 按钮，在场景中创建一个 **Game Event Manager** GameObject（单例）。

---

### 下拉菜单显示"No Active Databases"

**原因**：`GameEventManager` 中未分配数据库。

**解决方案**：
1. 在场景中选择 `GameEventManager`
2. Inspector → 数据库部分
3. 添加您的事件数据库

---

### 下拉菜单显示"No Matching Events"

**原因**：没有事件匹配字段类型。

**示例**：
```csharp
[GameEventDropdown]
public StringGameEvent textEvent;  // 需要StringGameEvent

// 但您的数据库只有：
// - GameEvent (void)
// - public Int32GameEvent
// - SingleGameEvent

结果：没有匹配的事件！
```

**解决方案**：使用[游戏事件创建器](./game-event-creator.md)创建正确类型的事件。

---

### 事件未触发

**检查清单**：
1. ✅ 事件资产是否在Inspector中分配？
2. ✅ `Raise()` 是否被调用？（添加Debug.Log以验证）
3. ✅ 动作是否在[游戏事件行为](./game-event-behavior.md)中配置？
4. ✅ 条件是否通过？（检查条件树）
5. ✅ GameEventManager是否在场景中？

:::tip 可视化工作流完成！

您现在已经学习了完整的可视化工作流：

1. ✅ 在事件创建器中**创建**事件
2. ✅ 在事件行为中**配置**动作
3. ✅ 使用UnityEvents或 `GameEventDropdown` **触发**事件

**结果**：解耦、可维护、设计师友好的游戏逻辑！

:::

:::info 从可视化到代码

本页涵盖 **可视化工作流**（在脚本中使用Inspector分配触发事件）。对于 **高级代码技术**（运行时监听器、条件触发器、事件链），请参阅 **[运行时API](../scripting/raising-and-scheduling.md)**。

:::