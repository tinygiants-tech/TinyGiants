---
sidebar_label: '06 条件事件'
sidebar_position: 7
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 06 条件事件：可视化逻辑构建器

<VideoGif src="/video/game-event-system/example/06-conditional-event.mp4" />

## 📋 概述

通常，检查门是否应该打开需要这样的代码：`if (powerOn && (isAdmin || isLucky))`。此演示展示了**可视化条件树构建器**，它允许您直接在编辑器中创建复杂的嵌套验证规则——无需在脚本中使用`if/else`检查。

:::tip 💡 您将学到
- 如何在不写代码的情况下构建复杂的逻辑树
- 如何在条件中引用场景对象
- 如何使用AND/OR组进行分支逻辑
- 条件如何充当事件回调的守门人

:::

---

## 🎬 演示场景
```
Assets/TinyGiants/GameEventSystem/Demo/06_ConditionalEvent/06_ConditionalEvent.unity
```

### 场景组成

**UI层（Canvas）：**
- 🎮 **电源切换按钮** - 左上角
  - "Toggle Power (On)" / "Toggle Power (Off)"
  - 触发`ConditionalEventRaiser.TogglePower()`
  - 控制全局`SecurityGrid.IsPowerOn`状态
  
- 🎮 **四个访问卡按钮** - 屏幕底部
  - "Swipe GuestCard" → `ConditionalEventRaiser.SwipeGuestCard()`（等级1，访客部门）
  - "Swipe StaffCard" → `ConditionalEventRaiser.SwipeStaffCard()`（等级3，管理部门）
  - "Swipe AdminCard" → `ConditionalEventRaiser.SwipeAdminCard()`（等级5，主管部门）
  - "Attempt Hacking" → `ConditionalEventRaiser.AttemptHacking()`（等级0，暗网部门）

**游戏逻辑层（演示脚本）：**
- 📤 **ConditionalEventRaiser** - 带有触发器脚本的GameObject
  - 使用不同凭证构造`AccessCard`对象
  - 触发`OnAccessCard`事件以进行验证
  - 没有验证逻辑——只是传递数据

- 📥 **ConditionalEventReceiver** - 带有接收器脚本的GameObject
  - 包含**零**条件逻辑的`OpenVault()`方法
  - 被调用时简单地播放门动画
  - 假设如果被调用，所有条件都已通过

- 🔌 **SecurityGrid** - 持有系统状态的场景对象
  - 公共属性：`IsPowerOn`（bool）
  - 条件树直接从场景实例读取此值

**视觉反馈层（演示对象）：**
- 🚪 **VaultDoorSystem** - 大型双开门
  - 左右门滑动打开/关闭
  - 状态文本显示："LOCKED" / "ACCESS GRANTED" / "CLOSING..."
  - 门打开时播放蒸汽VFX
- 💡 **电源指示器** - 绿色球形灯
  - 电源开启时发光
  - 电源关闭时变暗
- 🖼️ **屏幕晕影** - 全屏叠加层
  - 电源开启时绿色闪光
  - 电源关闭时红色闪光

---

## 🎮 如何交互

### 逻辑门挑战

金库**仅当**此条件评估为`true`时打开：
```
[⚡ 电源开启]  AND  ([🏅 管理员] 等级  OR  [🏷️ 有效部门]  OR  [🎲 幸运黑客])
```

### 步骤1：进入播放模式

按Unity中的**播放**按钮。金库应该显示红色的"LOCKED"。

---

### 步骤2：在电源开启的情况下测试（正确设置）

**确保电源开启：**
- 查看左上角按钮：应显示"Toggle Power (On)"
- 查看电源指示器（绿色球体）：应该发光
- 切换到开启时屏幕晕影闪烁绿色

**点击"Swipe StaffCard"：**
- **凭证：** 等级3，部门"Management"
- **逻辑路径：**
  - ✅ 电源开启 → 通过
  - ❌ 等级3 < 4 → 失败（管理员检查）
  - ✅ 部门"Management"在白名单中 → 通过
  - **结果：** OR组中的一个分支通过
- **结果：** 🟢 **访问授权**
  - 状态文本变为绿色
  - 蒸汽VFX从门基座喷发
  - 门平滑滑开
  - 2秒后门关闭
- **控制台：** `[Vault] ACCESS GRANTED to Staff_Alice. Opening doors.`

**点击"Swipe AdminCard"：**
- **凭证：** 等级5，部门"Director"
- **逻辑路径：**
  - ✅ 电源开启 → 通过
  - ✅ 等级5 >= 4 → 通过（管理员检查立即成功）
  - **结果：** OR组中的第一个条件通过
- **结果：** 🟢 **访问授权**

**点击"Swipe GuestCard"：**
- **凭证：** 等级1，部门"Visitor"
- **逻辑路径：**
  - ✅ 电源开启 → 通过
  - ❌ 等级1 < 4 → 失败（管理员检查）
  - ❌ 部门"Visitor"不在白名单中 → 失败
  - 🎲 嵌套AND组中的Random(0-100) > 70 → 约30%的机会
  - **结果：** 很可能所有分支都失败
- **结果：** 🔴 **锁定**（90%的时间）
  - 金库保持关闭
  - 状态文本保持红色
- **控制台：** （没有接收器日志，因为条件失败）

---

### 步骤3：在电源关闭的情况下测试（失败案例）

**点击"Toggle Power"（关闭）：**
- 按钮文本更改为"Toggle Power (Off)"
- 电源指示器变暗
- 屏幕晕影闪烁红色

**点击"Swipe AdminCard"：**
- **凭证：** 等级5（管理员等级）
- **逻辑路径：**
  - ❌ 电源关闭 → **在根AND条件处失败**
  - 评估立即停止（短路）
- **结果：** 🔴 **锁定**
  - 即使管理员也无法绕过电源要求
  - 接收器方法从未被调用
- **控制台：** `[Terminal] Scanning...`（但没有金库日志）

:::note 🔐 安全设计

根部的AND逻辑确保**没有凭证**可以绕过电源要求。这展示了条件树如何强制执行硬性要求。

:::

---

## 🏗️ 场景架构

### 条件树结构

金库的访问逻辑在行为窗口中实现为可视化树：
```
🟦 根（AND）➔ 必须通过两个主要分支
│
├─ ⚡ SecurityGrid.IsPowerOn == true      ➔ [电源状态检查]
│
└─ 🟧 分支2（OR）➔ 必须至少通过下面一个
   │
   ├─ 🏅 Arg.securityLevel >= 4          ➔ [高权限]
   ├─ 🏷️ Arg.department ∈ [Mgmt, IT]     ➔ [部门验证]
   ├─ 🎲 Random(0-100) > 90              ➔ [10%幸运通过]
   │
   └─ 🟦 嵌套组（AND）➔ 组合低级别检查
      ├─ 🔢 Arg.securityLevel >= 1       ➔ [基本访问]
      └─ 🎲 Random(0-100) > 70           ➔ [30%幸运通过]
```

---

### 事件定义

![Game Event Editor](/img/game-event-system/examples/06-conditional-event/demo-06-editor.png)

| 事件名称 | 类型 | 目的 |
| -------------- | ----------------------- | ------------------------------------------------- |
| `OnAccessCard` | `AccessCardGameEvent` | 通过条件树验证卡凭证 |

**AccessCard数据结构：**
```csharp
[System.Serializable]
public class AccessCard
{
    public string holderName;        // "Staff_Alice"、"Admin_Root"等
    public int securityLevel;        // 1=访客，3=员工，5=管理员
    public string department;        // "Management"、"IT"、"Visitor"等
}
```

---

### 带条件树的行为配置

点击行为列中的**(AccessCard)**图标以打开行为窗口：

![Condition Tree](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

**根AND组：**
- **条件1：** 场景对象引用
  - 源：场景中的`SecurityGrid` GameObject
  - 属性：`IsPowerOn`（bool）
  - 运算符：`==`（等于）
  - 目标：`true`
  - **目的：** 硬性要求——电源必须开启

**嵌套OR组：**
OR组提供多个有效的访问路径：

- **条件A：** 事件参数检查
  - 源：`Arg.securityLevel`（AccessCard中的int）
  - 运算符：`>=`（大于或等于）
  - 目标：`4`
  - **目的：** 管理员级别凭证

- **条件B：** 列表成员资格检查
  - 源：`Arg.department`（AccessCard中的string）
  - 运算符：`In List`（包含在内）
  - 目标：常量列表`["Management", "IT"]`
  - **目的：** 白名单部门

- **条件C：** 随机机会
  - 源：`Random Value`（0-100范围）
  - 运算符：`>`（大于）
  - 目标：`90`
  - **目的：** 黑客10%的幸运绕过

- **嵌套AND组：** 访客访问逻辑
  - 子条件1：`Arg.securityLevel >= 1`（有效卡）
  - 子条件2：`Random(0-100) > 70`（30%机会）
  - **目的：** 访客有较低的机会但必须有有效卡

:::tip 🎨 拖放构建

您可以在行为窗口中可视化构建此树：

1. 点击**"+ Condition"**添加单个检查
2. 点击**"+ Group"**添加AND/OR容器
3. 拖动`≡`句柄重新排序条件
4. 通过点击组标签在AND/OR逻辑之间切换

:::

---

### 发送者设置（ConditionalEventRaiser）

选择**ConditionalEventRaiser** GameObject：

![ConditionalEventRaiser Inspector](/img/game-event-system/examples/06-conditional-event/demo-06-inspector.png)

**事件频道：**
- `Request Access Event`: `OnAccessCard`

**场景引用：**
- `Security Grid`: SecurityGrid GameObject（用于电源切换功能）
- `Screen Vignette`: UI叠加层，用于视觉电源反馈

**卡的工作原理：**
```csharp
// 访客卡（依靠运气）
SwipeGuestCard() → AccessCard("Guest_Bob", 1, "Visitor")

// 员工卡（有效部门）
SwipeStaffCard() → AccessCard("Staff_Alice", 3, "Management")

// 管理员卡（高等级）
SwipeAdminCard() → AccessCard("Admin_Root", 5, "Director")

// 黑客（纯随机性）
AttemptHacking() → AccessCard("Unknown_Hacker", 0, "DarkWeb")
```

---

### 接收者设置（ConditionalEventReceiver）

选择**ConditionalEventReceiver** GameObject：

![ConditionalEventReceiver Inspector](/img/game-event-system/examples/06-conditional-event/demo-06-receiver.png)

**金库视觉效果：**
- `Door ROOT`: VaultDoorSystem（Transform）
- `Left Door`: DoorLeft（Transform）- 打开时向左滑动
- `Right Door`: DoorRight（Transform）- 打开时向右滑动
- `Steam VFX Prefab`: 用于开门效果的粒子系统

**反馈：**
- `Status Text`: StatusText（TextMeshPro）- 显示访问状态

**行为绑定：**
- 事件：`OnAccessCard`
- 方法：`ConditionalEventReceiver.OpenVault(AccessCard card)`
- **条件树：** 充当守门人（如上配置）

:::note 🎯 零逻辑接收器

`OpenVault()`方法不包含**任何**条件检查。它**仅在**条件树评估为`true`时被调用。这将验证逻辑（数据层）与动作逻辑（行为层）分离。

:::

---

## 💻 代码分解

### 📤 ConditionalEventRaiser.cs（发送者）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class ConditionalEventRaiser : MonoBehaviour
{
    [Header("事件频道")]
    [GameEventDropdown] public AccessCardGameEvent requestAccessEvent;

    [Header("场景引用")]
    [SerializeField] private SecurityGrid securityGrid;

    public void SwipeGuestCard()
    {
        // 等级1，部门"Visitor"
        // 等级检查失败，部门检查失败
        // 依靠嵌套AND组中的Random > 70（约30%机会）
        SendRequest("Guest_Bob", 1, "Visitor");
    }

    public void SwipeStaffCard()
    {
        // 等级3，部门"Management"
        // 等级检查失败（3 < 4）
        // 部门检查通过（Management在白名单中）
        SendRequest("Staff_Alice", 3, "Management");
    }

    public void SwipeAdminCard()
    {
        // 等级5
        // 等级检查立即通过（5 >= 4）
        SendRequest("Admin_Root", 5, "Director");
    }

    public void AttemptHacking()
    {
        // 等级0
        // 纯粹依靠Random > 90（10%机会）
        SendRequest("Unknown_Hacker", 0, "DarkWeb");
    }

    private void SendRequest(string name, int level, string dept)
    {
        if (requestAccessEvent == null) return;

        // 构造数据包
        AccessCard card = new AccessCard(name, level, dept);
        
        // 触发事件
        // 条件树在调用接收器之前评估
        requestAccessEvent.Raise(card);
        
        Debug.Log($"[Terminal] 扫描中... 名称：{name} | 等级：{level} | 部门：{dept}");
    }
}
```

**关键点：**
- 🎯 **无验证** - 发送者只是创建数据并触发事件
- 📦 **数据构造** - 每个按钮创建唯一的凭证配置文件
- 🔇 **零逻辑** - 不知道必须满足什么条件

---

### 📥 ConditionalEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class ConditionalEventReceiver : MonoBehaviour
{
    [Header("金库视觉效果")]
    [SerializeField] private Transform doorROOT;
    [SerializeField] private Transform leftDoor;
    [SerializeField] private Transform rightDoor;
    [SerializeField] private ParticleSystem steamVFXPrefab;

    [Header("反馈")]
    [SerializeField] private TextMeshPro statusText;

    private Vector3 _leftClosedPos;
    private Vector3 _rightClosedPos;

    private void Start()
    {
        // 存储关闭位置以供动画使用
        if(leftDoor) _leftClosedPos = leftDoor.localPosition;
        if(rightDoor) _rightClosedPos = rightDoor.localPosition;
        
        UpdateStatusText("LOCKED", Color.red);
    }

    /// <summary>
    /// [事件回调 - 条件门控]
    /// 
    /// 关键：此方法不包含验证逻辑！
    /// 
    /// GameEvent条件树充当守门人。
    /// 如果此方法执行，意味着所有条件都评估为TRUE：
    /// - 电源开启
    /// - 并且至少满足以下之一：管理员等级、有效部门或幸运随机
    /// 
    /// 这种分离允许设计师在编辑器中修改访问规则
    /// 而无需触及代码。
    /// </summary>
    public void OpenVault(AccessCard card)
    {
        if (_isOpen) return;

        Debug.Log($"<color=green>[Vault] 访问授权给{card.holderName}。" +
                  "打开门。</color>");
        
        StartCoroutine(OpenSequenceRoutine(card.holderName));
    }

    private IEnumerator OpenSequenceRoutine(string name)
    {
        _isOpen = true;
        UpdateStatusText("ACCESS GRANTED", Color.green);

        // 生成蒸汽VFX
        if (doorROOT != null && steamVFXPrefab != null)
        {
            Vector3 spawnPos = doorROOT.position;
            spawnPos.y -= 2.6f;
            
            var vfxInstance = Instantiate(steamVFXPrefab, spawnPos, Quaternion.identity);
            vfxInstance.Play();
            Destroy(vfxInstance.gameObject, 2.0f);
        }
        
        // 打开门（向外滑动）
        float t = 0;
        while(t < 1f)
        {
            t += Time.deltaTime * 2f;
            if(leftDoor) 
                leftDoor.localPosition = Vector3.Lerp(_leftClosedPos, 
                                                      _leftClosedPos + Vector3.left * 1.2f, t);
            if(rightDoor) 
                rightDoor.localPosition = Vector3.Lerp(_rightClosedPos, 
                                                       _rightClosedPos + Vector3.right * 1.2f, t);
            yield return null;
        }
        
        yield return new WaitForSeconds(2.0f);
        UpdateStatusText("CLOSING...", Color.yellow);
        
        // 关闭门（滑回）
        t = 0;
        while(t < 1f)
        {
            t += Time.deltaTime * 2f;
            if(leftDoor) 
                leftDoor.localPosition = Vector3.Lerp(_leftClosedPos + Vector3.left * 1.2f, 
                                                      _leftClosedPos, t);
            if(rightDoor) 
                rightDoor.localPosition = Vector3.Lerp(_rightClosedPos + Vector3.right * 1.2f, 
                                                       _rightClosedPos, t);
            yield return null;
        }

        _isOpen = false;
        UpdateStatusText("LOCKED", Color.red);
    }

    private void UpdateStatusText(string text, Color col)
    {
        if (statusText)
        {
            statusText.text = text;
            statusText.color = col;
        }
    }
}
```

**关键点：**
- 🎯 **零条件逻辑** - 没有检查凭证的`if`语句
- 🔓 **基于信任的执行** - 如果被调用，所有条件都已通过
- 🎨 **纯展示** - 只是播放门动画和VFX
- 🏗️ **关注点分离** - 验证（数据）vs动作（行为）

---

### 🔌 SecurityGrid.cs（场景状态）
```csharp
using UnityEngine;

public class SecurityGrid : MonoBehaviour
{
    // 这个公共属性被条件树读取
    public bool IsPowerOn = true;

    public void TogglePower()
    {
        IsPowerOn = !IsPowerOn;
        
        // 更新视觉效果...
        Debug.Log($"[Environment] 电源系统现在：{(IsPowerOn ? "在线" : "离线")}");
    }
}
```

**关键点：**
- 🔌 **公共状态** - `IsPowerOn`可供条件树访问
- 📍 **场景对象** - 条件引用此特定GameObject实例
- 🎮 **运行时更改** - 切换电源立即影响条件评估

---

## 🔑 关键要点

| 概念 | 实现 |
| ------------------------ | ------------------------------------------------------ |
| 🎯 **可视化逻辑** | 在不编写代码的情况下构建复杂条件 |
| 🌳 **树结构** | AND/OR组允许嵌套分支逻辑 |
| 📍 **场景引用** | 直接从场景中的GameObjects读取属性 |
| 🎲 **随机条件** | 用于基于机会的逻辑的内置随机值源 |
| 🔀 **参数访问** | 在条件中引用事件数据属性 |
| 🚪 **守门人模式** | 条件控制回调是否执行 |

:::note 🎓 设计洞察

可视化条件树非常适合：

- **访问控制系统** - 门、终端、限制区域
- **任务要求** - 在任务完成前检查多个条件
- **增益激活** - 仅在满足先决条件时应用效果
- **AI行为** - 敌人反应的决策树
- **战利品系统** - 验证掉落条件（等级、运气、位置）

通过将逻辑移入数据（条件树资产），您可以让**设计师**在无需程序员干预的情况下调整游戏玩法规则！

:::

---

## 🎯 下一步？

您已经掌握了条件逻辑。现在让我们探索**基于时间的事件控制**与延迟和调度。

**下一章**：在**[07 延迟事件](./07-delayed-event.md)**中学习延迟执行

---

## 📚 相关文档

- **[可视化条件树](../visual-workflow/visual-condition-tree.md)** - 条件构建器的完整指南
- **[游戏事件行为](../visual-workflow/game-event-behavior.md)** - 如何配置动作条件
- **[最佳实践](../scripting/best-practices.md)** - 数据驱动设计的模式