---
sidebar_label: '01 Void事件'
sidebar_position: 2
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 01 Void事件：解耦架构

<VideoGif src="/video/game-event-system/example/01-void-event.mp4" />

## 📋 概述

此演示展示了使用游戏事件系统的核心**观察者模式**工作流。最重要的要点是**发送者**（VoidEventRaiser）和**接收者**（VoidEventReceiver）脚本完全解耦——它们在代码中不相互引用！

:::tip 💡 您将学到
- 如何创建无参数（void）事件
- 如何在不知道谁在监听的情况下触发事件
- 如何在游戏事件编辑器中可视化绑定回调
- 解耦架构的力量

:::

---

## 🎬 演示场景
```
Assets/TinyGiants/GameEventSystem/Demo/01_VoidEvent/01_VoidEvent.unity
```

### 场景组成

**UI层（Canvas）：**
- 🎮 **按钮** - 位于底部中心的Canvas UI按钮
  - `OnClick()`事件连接到 → `VoidEventRaiser.RaiseBasicEvent()`
  - 这是标准的Unity UI事件绑定

**游戏逻辑层（演示脚本）：**
- 📤 **VoidEventRaiser** - 带有`VoidEventRaiser.cs`脚本的GameObject
  - 持有对`OnVoidEvent` GameEvent资产的引用
  - 当按钮调用`RaiseBasicEvent()`时，它触发`voidEvent.Raise()`
  - 还播放UI音频反馈
  
- 📥 **VoidEventReceiver** - 带有`VoidEventReceiver.cs`脚本的GameObject
  - 通过游戏事件编辑器中的可视化绑定监听`OnVoidEvent`
  - 引用蓝色立方体的Rigidbody以应用物理响应

**视觉反馈层（演示对象）：**
- 🎲 **蓝色立方体** - 场景中的3D对象
  - 具有用于物理模拟的Rigidbody组件
  - 当事件触发时以跳跃和旋转响应
  - 下方的地面平面作为着陆表面

---

## 🎮 如何交互

### 步骤1：进入播放模式

按Unity中的**播放**按钮以启动演示。

### 步骤2：点击"Raise"按钮

点击游戏视图底部的**"Raise"**按钮。

**事件流：**
1. 🖱️ Unity的按钮`OnClick()`触发 → `VoidEventRaiser.RaiseBasicEvent()`
2. 🔊 VoidEventRaiser播放音频反馈
3. 📡 `voidEvent.Raise()`通过GameEventManager广播信号
4. 📥 VoidEventReceiver的`OnEventReceived()`方法被自动调用
5. 🎲 立方体向上跳跃，带有随机的水平漂移和旋转
6. 📝 控制台日志确认每个步骤：`[VoidEvent] Raise()` → `[VoidEvent] OnEventReceived()`

---

## 🏗️ 场景架构

### 事件定义

打开**游戏事件编辑器**窗口（`Tools → TinyGiants → Game Event Editor`）：

![Game Event Editor](/img/game-event-system/examples/01-void-event/demo-01-editor.png)

**关键组件：**
- **事件名称**：`OnVoidEvent`
- **事件类型**：`void`（无参数）
- **数据库**：`GameEventDatabase_Void`
- **行为列**：显示绿色的**(void)**图标，表示回调绑定

此ScriptableObject充当发送者和接收者之间的**信号通道**。

---

### 发送者设置（VoidEventRaiser）

在层级视图中选择**VoidEventRaiser** GameObject（`Demo Scripts/VoidEventRaiser`）：

![VoidEventRaiser Inspector](/img/game-event-system/examples/01-void-event/demo-01-inspector.png)

**配置：**
- **GameObject部分**：
  - `Void Event`字段使用`[GameEventDropdown]`特性
  - 设置为`OnVoidEvent`资产
  
- **音频部分**：
  - 为按钮点击反馈分配了`UI Clip`

脚本在按钮触发时简单地调用`voidEvent.Raise()`——**不知道谁在监听**。

---

### 接收者绑定（行为配置）

这就是**解耦魔法**发生的地方！事件和回调之间的连接完全在编辑器中配置。

**如何配置：**

1. 在**游戏事件编辑器**窗口中，在事件列表中找到`OnVoidEvent`
2. 查看右侧的**Behavior**列
3. 点击绿色的**(void)**图标以打开**行为窗口**

![Behavior Window](/img/game-event-system/examples/01-void-event/demo-01-behavior.png)

**配置详情：**

**事件动作部分：**
- **模式**：`Runtime Only`（在运行时执行，而不是在编辑器中）
- **目标对象**：`VoidEventReceiver` GameObject
- **方法**：`VoidEventReceiver.OnEventReceived`（void方法）

此绑定告诉GameEventManager：*"当调用`OnVoidEvent.Raise()`时，自动调用`VoidEventReceiver.OnEventReceived()`"*

:::note 🎯 可视化绑定的好处

- ✅ Raiser和Receiver之间不需要代码引用
- ✅ 无需接触脚本即可轻松添加/删除监听器
- ✅ 清晰的事件→回调关系的可视化概览
- ✅ 仅运行时模式防止意外的编辑器执行

:::

---

## 💻 代码分解

### 📤 VoidEventRaiser.cs（事件发送者）
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class VoidEventRaiser : MonoBehaviour
{
    [Header("GameObject")]
    [GameEventDropdown] public GameEvent voidEvent;

    [Header("Audio")]
    [SerializeField] private AudioClip UIClip;

    private AudioSource _audioSource;

    private void Start()
    {
        _audioSource = gameObject.AddComponent<AudioSource>();
    }

    /// <summary>
    /// [输入触发器]
    /// 此方法由按钮的OnClick()事件（在Inspector中配置）调用。
    /// 它在不知道谁在监听的情况下广播事件信号。
    /// </summary>
    public void RaiseBasicEvent()
    {
        if (UIClip) _audioSource.PlayOneShot(UIClip);
        
        if (voidEvent == null)
        {
            Debug.LogWarning("[VoidEvent] VoidEventRaiser上未分配GameEvent。");
            return;
        }
        
        voidEvent.Raise();
        Debug.Log("[VoidEvent] 在GameEvent上调用了Raise()。");
    }
}
```

**关键点：**
- 🎯 **`[GameEventDropdown]`** - 在Inspector中提供下拉菜单以选择事件
- 🔊 **音频反馈** - 在触发事件前播放声音
- 📢 **`voidEvent.Raise()`** - 单行代码广播到所有监听器
- 🔇 **零耦合** - 没有对VoidEventReceiver或立方体的引用

---

### 📥 VoidEventReceiver.cs（事件监听器）
```csharp
using UnityEngine;

public class VoidEventReceiver : MonoBehaviour
{
    [SerializeField] private Rigidbody targetRigidbody;
    
    private float jumpForce = 5.0f;
    private float horizontalRandomness = 1.0f;
    private float spinStrength = 5.0f;
    
    /// <summary>
    /// [事件回调]
    /// 此方法不是由VoidEventRaiser直接调用的。
    /// 它通过游戏事件编辑器的行为窗口绑定到'OnVoidEvent'。
    /// 
    /// 效果：重置垂直速度，然后应用跳跃 + 随机漂移 + 旋转。
    /// </summary>
    public void OnEventReceived()
    {
        Debug.Log("[VoidEvent] 在GameEvent上调用了OnEventReceived()。");
        
        if (targetRigidbody != null)
        {
            // 重置垂直速度以获得一致的跳跃高度
            Vector3 currentVel;
#if UNITY_6000_0_OR_NEWER
            currentVel = targetRigidbody.linearVelocity;
#else
            currentVel = targetRigidbody.velocity;
#endif
            currentVel.y = 0;
            
#if UNITY_6000_0_OR_NEWER
            targetRigidbody.linearVelocity = currentVel;
#else
            targetRigidbody.velocity = currentVel;
#endif
            
            // 应用带随机水平漂移的跳跃
            Vector2 randomCircle = Random.insideUnitCircle * horizontalRandomness;
            Vector3 sideForce = new Vector3(randomCircle.x, 0, randomCircle.y);
            Vector3 finalForce = (Vector3.up * jumpForce) + sideForce;
            targetRigidbody.AddForce(finalForce, ForceMode.Impulse);

            // 应用随机旋转
            Vector3 randomTorque = Random.insideUnitSphere * spinStrength;
            targetRigidbody.AddTorque(randomTorque, ForceMode.Impulse);
        }
        else
        {
            Debug.LogWarning("VoidEventReceiver: 请在Inspector中分配targetRigidbody！");
        }
    }
}
```

**关键点：**
- 🎲 **速度重置** - 通过首先将Y速度归零来确保一致的跳跃高度
- 🎯 **物理响应** - 结合向上冲量 + 随机水平漂移 + 随机扭矩
- 🔇 **零耦合** - 没有对VoidEventRaiser或按钮的引用
- 🔄 **Unity版本兼容性** - 处理旧版和Unity 6的物理API

---

## 🔑 关键要点

| 概念 | 实现 |
| ---------------------- | ------------------------------------------------------------ |
| 🎯 **解耦** | Raiser和Receiver永远不相互引用 |
| 📡 **广播** | 单个`Raise()`调用通知所有监听器 |
| 🎨 **可视化绑定** | 在行为窗口中配置事件回调，而不是在代码中 |
| 🔗 **层分离** | UI → 逻辑（Raiser）→ 事件系统 → 逻辑（Receiver）→ 视觉 |
| 🔄 **可扩展性** | 无需修改发送者代码即可添加更多接收者 |

:::note 🧠 设计模式

这展示了经典的**观察者模式**，其中主体（事件）在没有紧密耦合的情况下通知观察者（监听器）。按钮只知道VoidEventRaiser，VoidEventRaiser只知道GameEvent，VoidEventReceiver只通过编辑器绑定知道GameEvent——完美的解耦！

:::

---

## 🎯 下一步？

现在您了解了无参数事件，让我们探索如何在系统之间**传递数据**。

**下一章**：学习如何在**[02 基本类型事件](./02-basic-types-event.md)**中使用事件发送参数

---

## 📚 相关文档

- **[游戏事件编辑器](../visual-workflow/game-event-editor.md)** - 事件配置的详细指南
- **[游戏事件行为](../visual-workflow/game-event-behavior.md)** - 如何配置事件回调
- **[触发事件](../scripting/raising-and-scheduling.md)** - 用于触发事件的运行时API
- **[监听策略](../scripting/listening-strategies.md)** - 响应事件的不同方式