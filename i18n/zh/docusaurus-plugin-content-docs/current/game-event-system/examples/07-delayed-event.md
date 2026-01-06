---
sidebar_label: '07 延迟事件'
sidebar_position: 8
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 07 延迟事件：定时炸弹场景

<VideoGif src="/video/game-event-system/example/07-delayed-event.mp4" />

## 📋 概述

标准事件会立即触发（`Raise()` → `Execute()`）。延迟事件引入了一个关键的间隔：`Raise()` → **[待执行状态]** → `Execute()`。本示例通过经典的"剪线"小游戏演示了**调度系统**，您将学习如何配置延迟执行，以及最关键的——如何在事件执行前**取消**待执行的事件。

:::tip 💡 您将学到
- 如何在行为窗口中配置动作延迟
- 事件调度系统的内部工作原理
- 如何使用 `.Cancel()` 取消待执行事件
- 视觉计时器与逻辑计时器的区别

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/07_DelayedEvent/07_DelayedEvent.unity
```

### 场景构成

**视觉元素：**
- 💣 **TimeBomb_TNT** - 中央的圆柱形炸弹
  - 黑色圆柱体，带红色端盖
  - 橙色计时器显示倒计时："04.046"（实时更新）
  - 顶部有两个彩色指示灯（红色和绿色）
  - 放置在灰色圆形平台上
  

**UI层（Canvas）：**
- 🎮 **三个按钮** - 屏幕底部
  - "Arm Bomb"（白色）→ 触发 `DelayedEventRaiser.ArmBomb()`
  - "Cut RedWire"（红色/粉色）→ 触发 `DelayedEventRaiser.CutRedWire()`
  - "Cut GreenWire"（绿色）→ 触发 `DelayedEventRaiser.CutGreenWire()`

**游戏逻辑层（示例脚本）：**
- 📤 **DelayedEventRaiser** - 带有触发器脚本的游戏对象
  - 管理炸弹启动和剪线逻辑
  - 每轮随机确定哪根线是安全的
  - 控制视觉倒计时器（装饰性）
  - 在剪对线时调用 `.Cancel()`

- 📥 **DelayedEventReceiver** - 带有接收器脚本的游戏对象
  - 监听 `onExplodeEvent`
  - 执行爆炸逻辑：视觉特效、物理效果、相机震动
  - 仅在计时器归零时调用（未被取消）

**音视频反馈：**
- 🔊 **滴答声** - 倒计时期间每秒播放
- 💥 **爆炸特效** - 引爆时生成粒子系统
- ⚡ **电线火花** - 剪线时的粒子效果
- 📹 **相机震动** - 爆炸时的强烈震动

---

## 🎮 如何交互

### 拆弹挑战

您有**5秒钟**来识别并剪断正确的线。一根线是**安全的**（取消事件），另一根是**陷阱**（无效果）。

:::warning 🎲 随机选择

每次启动炸弹时，安全线都是随机的！注意控制台日志（或碰碰运气）。

:::

---

### 步骤1：进入播放模式

在Unity中按下**播放**按钮。炸弹显示白色文本"READY"。

---

### 步骤2：启动炸弹

**点击"Arm Bomb"（白色按钮）：**

**发生的事情：**
1. 🔊 滴答声开始（每秒蜂鸣一次）
2. ⏱️ 计时器从 `05.000` 开始橙色倒计时
3. 🎲 系统随机选择安全线（红色或绿色）
4. 📝 **控制台显示答案：** `[Game Logic] Bomb Armed! The SAFE wire is: Red`
5. 💣 事件进入**待执行状态** - 将在5秒后执行

**视觉变化：**
- 计时器文本从白色变为橙色
- 计时器以毫秒精度倒计时：`04.987`、`04.834`...
- 随着时间流逝，颜色逐渐从橙色 → 红色

**幕后发生的事：**
- 调用 `explodeEvent.Raise()`
- 因为在行为窗口中配置了**动作延迟 = 5秒**
- 事件被**加入队列**到GameEventManager的调度器中
- 内部倒计时器开始计时

---

### 步骤3：选择您的命运

现在您有三个选项，结果截然不同：

#### 选项A：什么都不做（让它爆炸）

**操作：** 不点击任何按钮。等待。

**时间线：**
- `04.000` - 第二次滴答声
- `03.000` - 滴答声，计时器变得更红
- `02.000` - 滴答声，紧迫感增强
- `01.000` - 最后一次滴答声
- `00.000` - **轰！**

**结果：** 💥 **爆炸**
- 控制台：`BOOM! The event executed.`
- 炸弹位置生成巨大爆炸特效
- 炸弹圆柱体变为动力学并飞向空中
- 相机剧烈震动（0.5秒持续时间，0.8震动幅度）
- 播放爆炸声音
- 计时器文本变为深红色"ERROR"

**原因：** 5秒延迟已过，因此调度器调用了 `DelayedEventReceiver.OnExplode()`。

---

#### 选项B：剪错线

**操作：** 点击**不是**安全线的按钮。

例如：如果控制台显示 `The SAFE wire is: Red`，点击**"Cut GreenWire"**

**发生的事情：**
1. ⚡ 播放电线火花特效
2. 🔊 剪线声音
3. 📝 控制台：`[Player] Cutting Green Wire...`
4. 📝 控制台：`Wrong wire! The clock is still ticking...`
5. ⏱️ **计时器继续倒计时**
6. 💣 事件保持在**待执行状态**

**结果：** 没有任何改变。倒计时继续。
- 几秒钟后：**轰！**（与选项A相同）
- 您可以感受到做出错误选择的紧张感

**原因：** 代码检查 `if (color == _safeWireColor)`，由于条件为假，`.Cancel()` 从未被调用。调度器继续运行。

---

#### 选项C：剪对线（拆除）

**操作：** 点击与安全线匹配的按钮。

例如：如果控制台显示 `The SAFE wire is: Red`，点击**"Cut RedWire"**

**发生的事情：**
1. ⚡ 播放电线火花特效
2. 🔊 剪线声音
3. 📝 控制台：`[Player] Cutting Red Wire...`
4. 🎯 **关键：** 调用 `explodeEvent.Cancel()`
5. ⏱️ 计时器**立即停止**在当前值（例如 `03.247`）
6. 📝 控制台：`BOMB DEFUSED! Event Cancelled.`
7. ✅ 计时器文本变为**绿色**"DEFUSED"
8. 🔕 播放拆除成功声音
9. 💣 事件从**待执行状态**中移除

**结果：** 🟢 **成功 - 没有爆炸**
- 炸弹安全了
- `DelayedEventReceiver.OnExplode()` **永远不会被调用**
- 您可以再次启动炸弹进行另一轮

**原因：** `.Cancel()` 从GameEventManager的内部队列中移除了已调度的事件。当5秒计时器本应到期时，没有任何东西需要执行。

---

## 🏗️ 场景架构

### 调度系统

延迟事件使用由GameEventManager管理的内部计时器：
```
🚀 启动：Raise()
│
📦 [ 事件入队 + 启动计时器 ]
│
⏳ 状态：等待中...
│
├─ ⚡ 执行路径（计时器到期）
│  └─► ✅ Execute() ➔ 逻辑被调用
│
└─ 🛑 中断路径（手动/条件）
   └─► 🧹 Cancel() ➔ [ 从队列中移除 ]
```

**核心概念：**
- **待执行状态：** 在 `Raise()` 和执行之间
- **调度器队列：** 定时事件的内部列表
- **取消：** 在执行前从队列中移除事件
- **原子操作：** 如果被取消，接收器方法永远不会运行

---

### 事件定义

![游戏事件编辑器](/img/game-event-system/examples/07-delayed-event/demo-07-editor.png)

| 事件名称         | 类型               | 配置的延迟 |
| ---------------- | ------------------ | ---------- |
| `onExplodeEvent` | `GameEvent`（void） | 5.0秒      |

---

### 带延迟的行为配置

点击行为列中的**(void)**图标打开行为窗口：

![行为设置](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

**调度配置部分：**
- ⏱️ **动作延迟：** `5`秒
  - 这是 `Raise()` 和执行之间的时间间隔
  - 在编辑器中可按事件配置
  - 调整时间无需更改代码

- 🔄 **重复间隔：** `0`（禁用）
- 🔢 **重复次数：** `Infinite Loop`（本示例未使用）
- 💾 **持久化事件：** 未选中

**事件动作：**
- 方法：`DelayedEventReceiver.OnExplode()`
- 模式：仅运行时

:::tip ⚙️ 轻松调整时间

想让炸弹倒计时更快或更慢？只需在此窗口中更改**动作延迟**值。尝试 `3` 提高难度或 `10` 降低难度！

:::

---

### 发送器设置（DelayedEventRaiser）

选择**DelayedEventRaiser**游戏对象：

![DelayedEventRaiser检查器](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

**事件通道：**
- `Explode Event`：`onExplodeEvent`
  - 提示："配置：启动延迟 = 5.0秒"

**引用：**
- `Bomb Receiver`：DelayedEventReceiver（用于回调协调）

**视觉效果：**
- `Timer Text`：TimerText（TextMeshPro）- 显示倒计时
- `Sparks VFX`：WireSparksVFX（粒子系统）- 剪线效果

---

### 接收器设置（DelayedEventReceiver）

选择**DelayedEventReceiver**游戏对象：

![DelayedEventReceiver检查器](/img/game-event-system/examples/07-delayed-event/demo-07-receiver.png)

**引用：**
- `Bomb Raiser`：DelayedEventRaiser（用于状态回调）
- `Bomb Rigidbody`：TimeBomb_TNT（Rigidbody）- 用于爆炸物理效果

**视觉效果：**
- `Explosion VFX Prefab`：BombExplosionVFX（粒子系统）

**音频：**
- `Tick Clip`：BeepSFX（每秒滴答声）
- `Explosion Clip`：BoomSFX（爆炸声）
- `Defuse Clip`：DefuseSFX（成功声音）

---

## 💻 代码详解

### 📤 DelayedEventRaiser.cs（发送器）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using System.Collections;

public class DelayedEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("配置：启动延迟 = 5.0秒。")]
    [GameEventDropdown] public GameEvent explodeEvent;

    private bool _isArmed;
    private float _countDownTime = 5.0f;
    private string _safeWireColor; // 每轮随机

    /// <summary>
    /// 按钮动作：启动炸弹并开始延迟事件。
    /// </summary>
    public void ArmBomb()
    {
        if (_isArmed || explodeEvent == null) return;

        _isArmed = true;
        
        // 随机化谜题解决方案
        _safeWireColor = Random.value > 0.5f ? "Red" : "Green";
        Debug.Log($"[Game Logic] Bomb Armed! The SAFE wire is: " +
                  $"<color={_safeWireColor.ToLower()}>{_safeWireColor}</color>");

        // 关键：触发延迟事件
        // 这不会立即执行！
        // 事件进入"待执行状态"5秒
        explodeEvent.Raise();
        
        // 启动装饰性倒计时（仅视觉效果）
        StartCoroutine(CountdownRoutine());
    }

    /// <summary>
    /// 按钮动作：玩家尝试剪断红线。
    /// </summary>
    public void CutRedWire() => ProcessCut("Red");

    /// <summary>
    /// 按钮动作：玩家尝试剪断绿线。
    /// </summary>
    public void CutGreenWire() => ProcessCut("Green");

    private void ProcessCut(string color)
    {
        if (!_isArmed) return;

        Debug.Log($"[Player] Cutting {color} Wire...");

        // 播放剪线特效...

        // 关键决策点
        if (color == _safeWireColor)
        {
            // 魔法时刻：取消待执行事件
            // 这会从调度器队列中移除它
            // OnExplode() 永远不会被调用
            explodeEvent.Cancel();
            
            DisarmSuccess();
        }
        else
        {
            // 错误的线 - 事件保持待执行
            Debug.LogWarning("Wrong wire! The clock is still ticking...");
        }
    }

    private void DisarmSuccess()
    {
        _isArmed = false;
        StopAllCoroutines(); // 停止视觉倒计时
        
        // 更新UI显示成功...
        Debug.Log("<color=green>BOMB DEFUSED! Event Cancelled.</color>");
    }

    private IEnumerator CountdownRoutine()
    {
        // 这纯粹是装饰性的
        // 真正的计时器由GameEventManager的调度器管理
        // 即使这个协程停止，炸弹仍会爆炸
        
        float _currentTimer = _countDownTime;
        
        while (_currentTimer > 0)
        {
            _currentTimer -= Time.deltaTime;
            if (_currentTimer < 0) _currentTimer = 0;

            // 更新视觉计时器文本
            if (timerText)
            {
                timerText.text = _currentTimer.ToString("00.000");
                
                // 颜色从橙色渐变到红色以增加紧迫感
                float urgency = 1f - (_currentTimer / _countDownTime);
                timerText.color = Color.Lerp(new Color(1f, 0.5f, 0f), 
                                            Color.red, urgency);
            }
            
            yield return null;
        }
    }
}
```

**要点：**
- 🎯 **关注点分离** - 视觉计时器（协程）与逻辑计时器（调度器）
- 🎲 **随机选择** - 每轮确定 `_safeWireColor`
- 🔴 **取消API** - `.Cancel()` 从队列中移除待执行事件
- ⏱️ **装饰性倒计时** - UI独立于事件系统更新

---

### 📥 DelayedEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using System.Collections;

public class DelayedEventReceiver : MonoBehaviour
{
    [SerializeField] private Rigidbody bombRigidbody;
    [SerializeField] private ParticleSystem explosionVFXPrefab;
    
    private AudioSource _audioSource;
    private Camera _mainCamera;

    /// <summary>
    /// [事件回调 - 延迟执行]
    /// 
    /// 此方法仅在以下情况下被调用：
    /// 1. 调用了 explodeEvent.Raise()
    /// 2. 经过了5秒
    /// 3. 在此期间未调用 explodeEvent.Cancel()
    /// 
    /// 如果剪对了线，此方法永远不会运行。
    /// </summary>
    public void OnExplode()
    {
        Debug.Log("<color=red><b>BOOM! The event executed.</b></color>");

        // 生成爆炸特效
        if (explosionVFXPrefab != null)
        {
            ParticleSystem vfx = Instantiate(explosionVFXPrefab, 
                                            transform.position, 
                                            Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 3.0f);
        }

        // 在炸弹上启用物理
        if (bombRigidbody)
        {
            bombRigidbody.isKinematic = false;
            
            // 施加爆炸力（使炸弹向上发射）
            bombRigidbody.AddExplosionForce(2000f, 
                                           transform.position + Vector3.down * 0.5f, 
                                           5f);
            bombRigidbody.AddTorque(Random.insideUnitSphere * 100f, 
                                   ForceMode.Impulse);
        }
        
        // 音频 + 相机震动
        if (explosionClip) _audioSource.PlayOneShot(explosionClip);
        StartCoroutine(ShakeCamera(0.5f, 0.8f));
    }

    private IEnumerator ShakeCamera(float duration, float magnitude)
    {
        if (_mainCamera == null) yield break;
        
        Vector3 originalPos = _mainCamera.transform.position;
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            float x = Random.Range(-1f, 1f) * magnitude;
            float y = Random.Range(-1f, 1f) * magnitude;
            _mainCamera.transform.position = originalPos + new Vector3(x, y, 0);
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        _mainCamera.transform.position = originalPos;
    }
}
```

**要点：**
- 🎯 **条件执行** - 仅在未被取消时运行
- 💥 **爆炸逻辑** - 视觉特效、物理效果、音频、相机震动
- 🎬 **纯反应** - 不了解计时器或取消操作
- ⏱️ **延迟调用** - 在 `Raise()` 后5秒调用（如果未被取消）

---

## 🔑 核心要点

| 概念               | 实现                                     |
| ------------------ | ---------------------------------------- |
| ⏱️ **动作延迟**     | 在行为窗口中配置执行延迟（无需代码）     |
| 📋 **待执行状态**   | 事件在Raise和Execute之间在调度器队列中等待 |
| 🔴 **取消API**     | `.Cancel()` 在执行前从队列中移除事件     |
| 🎯 **原子执行**     | 被取消的事件永远不会调用接收器方法       |
| 🎨 **视觉与逻辑**   | 将装饰性计时器与事件系统计时器分离       |

:::note 🎓 设计洞察

延迟事件非常适合：

- **定时能力** - 冷却时间、施法时间、引导
- **倒计时机制** - 炸弹、增益到期、增援到达
- **可取消动作** - 打断施法、拆除机制
- **基于回合的延迟** - 等待动画后再执行下一个动作
- **计划事件** - 昼夜循环触发器、周期性生成

`.Cancel()` API对于交互式游戏玩法至关重要——让玩家打断危险动作增加了紧张感和玩家主动权！

:::

---

## 🎯 下一步

您已经掌握了延迟执行和取消。现在让我们探索用于周期性行为的**重复事件**。

**下一章**：在**[08 重复事件](./08-repeating-event.md)**中学习重复间隔

---

## 📚 相关文档

- **[游戏事件行为](../visual-workflow/game-event-behavior.md)** - 调度配置完整指南
- **[触发与调度](../scripting/raising-and-scheduling.md)** - `.Raise()` 和 `.Cancel()` 的API参考
- **[最佳实践](../scripting/best-practices.md)** - 定时游戏机制的模式