---
sidebar_label: '08 重复事件'
sidebar_position: 9
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 08 重复事件：自动化循环

<!-- <VideoGif src="/video/game-event-system/08-repeating-event.mp4" /> -->

## 📋 概述

通常，创建重复脉冲（如雷达扫描或毒性伤害）需要在C#中使用 `InvokeRepeating` 或协程编写计时器循环。游戏事件系统将这个逻辑移到了**事件资产**本身——无需代码循环。在编辑器中配置一次，然后 `Raise()` 自动处理重复。

:::tip 💡 您将学到
- 如何在行为窗口中配置重复间隔和次数
- 有限循环（N次）和无限循环（永久）的区别
- 如何使用 `.Cancel()` 取消无限循环
- 何时使用重复事件而非手动触发

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/08_RepeatingEvent/08_RepeatingEvent.unity
```

### 场景构成

**视觉元素：**
- 📡 **SonarBeacon** - 中央塔式信标
  - 黑色圆柱形塔身，灰色底座
  - **RotatingCore** - 顶部旋转元素（旋转速度指示激活模式）
  - 脉冲时发射扩张的青色冲击波环
  
- 🎯 **ScanTargets** - 四个分散在信标周围的绿色悬浮立方体
  - 默认显示"?"文本
  - 被冲击波击中时变为红色材质并显示"DETECTED"
  - 短暂高亮后重置为绿色

- 🔵 **Cyan Ring** - 大型圆形边界线
  - 指示最大扫描范围（40单位半径）
  - 脉冲扩展区域的视觉指引

**UI层（Canvas）：**
- 🎮 **三个按钮** - 屏幕底部
  - "Activate Beacon"（白色）→ 触发 `RepeatingEventRaiser.ActivateBeacon()`
  - "Toggle Mode (Finite[5])" → 触发 `RepeatingEventRaiser.ToggleMode()`
    - 在有限和无限模式之间切换
    - 文本更新显示当前模式
  - "StopSignal"（白色）→ 触发 `RepeatingEventRaiser.StopSignal()`

**游戏逻辑层（示例脚本）：**
- 📤 **RepeatingEventRaiser** - 带有触发器脚本的游戏对象
  - 管理两个事件：`onFinitePulseEvent` 和 `onInfinitePulseEvent`
  - 在模式之间切换并控制信标旋转速度
  - 仅调用一次 `.Raise()` ——系统自动处理重复

- 📥 **RepeatingEventReceiver** - 带有接收器脚本的游戏对象
  - 监听脉冲事件
  - 生成冲击波特效和声呐音频
  - 运行基于物理的扫描例程来检测目标

**音视频反馈：**
- 💫 **ShockwaveVFX** - 扩张的青色粒子环
- 🔊 **Sonar Ping** - 每次扫描的音频脉冲
- 🎵 **Toggle/Stop Sounds** - UI反馈音效

---

## 🎮 如何交互

### 两种循环模式

本示例展示了两种不同的循环模式：

**有限模式（5次脉冲）：**
- 间隔：1.5秒
- 次数：5次重复
- **行为：** 自动触发5次，然后停止

**无限模式（连续）：**
- 间隔：1.0秒
- 次数：-1（无限循环）
- **行为：** 永久触发直到手动取消

---

### 步骤1：进入播放模式

在Unity中按下**播放**按钮。信标的核心缓慢旋转（空闲状态）。

**UI状态：**
- 模式按钮显示："Toggle Mode (Finite[5])"
- 信标旋转：约20°/秒（空闲速度）

---

### 步骤2：测试有限循环模式

**当前模式检查：**
确保按钮显示**"Toggle Mode (Finite[5])"**（默认模式）。

**点击"Activate Beacon"：**

**发生的事情：**
1. 🎯 信标核心旋转**加速**至150°/秒
2. 📡 **第一次脉冲**立即触发
   - 青色冲击波环生成并向外扩张
   - 播放声呐脉冲声音
   - 环到达时绿色立方体短暂变红
   - 控制台：`[Raiser] Beacon Activated. Mode: Finite (5x)`
   - 控制台：`[Receiver] Pulse #1 emitted.`

3. ⏱️ **1.5秒后** - 第二次脉冲
   - 控制台：`[Receiver] Pulse #2 emitted.`
   - 另一个冲击波扩张
   - 目标再次闪红

4. ⏱️ **脉冲3、4、5**以1.5秒间隔继续
   - 控制台计数至 `[Receiver] Pulse #5 emitted.`

5. ✅ **第5次脉冲后** - 自动停止
   - 信标核心旋转**减速**至20°/秒（空闲）
   - 不再触发脉冲
   - 系统自动停止——无需手动干预

**时间线：**
```
🖼️ T+0.0s | 初始
⚡ 脉冲 #1（首次触发）
│
┆  (Δ 1.5s 循环)
▼
🖼️ T+1.5s | 重复 1
⚡ 脉冲 #2
│
┆  (Δ 1.5s 循环)
▼
🖼️ T+3.0s | 重复 2
⚡ 脉冲 #3
│
┆  (Δ 1.5s 循环)
▼
🖼️ T+4.5s | 重复 3
⚡ 脉冲 #4
│
┆  (Δ 1.5s 循环)
▼
🖼️ T+6.0s | 重复 4
⚡ 脉冲 #5（最终）
│
┆  (Δ 1.5s 间隔)
▼
🛑 T+7.5s | 生命周期结束
🏁 [ 自动停止：无脉冲 #6 ]
```

**结果：** ✅ 事件精确重复5次，然后自动终止。

---

### 步骤3：测试无限循环模式

**点击"Toggle Mode"：**
- 按钮文本变为："Toggle Mode (Infinite)"
- 播放切换声音
- 如果信标处于激活状态，先停止
- 控制台：模式已切换

**点击"Activate Beacon"：**

**发生的事情：**
1. 🎯 信标核心旋转**加速**至300°/秒（比有限模式更快！）
2. 📡 **连续脉冲**开始
   - 第一次脉冲立即触发
   - 控制台：`[Raiser] Beacon Activated. Mode: Infinite`
   - 控制台：`[Receiver] Pulse #1 emitted.`

3. ⏱️ **每1.0秒** - 新脉冲
   - 比有限模式间隔更快（1.0秒 vs 1.5秒）
   - 脉冲持续到来：#2、#3、#4、#5...
   - 计数器无限递增

4. ⚠️ **永不自动停止**
   - 脉冲 #10、#20、#100...
   - 将持续直到手动取消
   - 信标在整个过程中快速旋转

**观察期：**
让它运行约10秒以观察它不会自动停止。控制台显示脉冲计数无限增加。

---

### 步骤4：手动取消

**在无限模式运行时：**

**点击"StopSignal"：**

**发生的事情：**
1. 🛑 脉冲**立即停止**
   - 当前脉冲完成，但不再安排新脉冲
   - 信标核心旋转**减速至空闲**（20°/秒）
   - 控制台：`[Raiser] Signal Interrupted manually.`

2. 🔄 系统状态重置
   - 脉冲计数器重置为0
   - 播放断电声音
   - 信标返回待机模式

**结果：** ✅ 通过 `.Cancel()` API成功取消无限循环。

:::note 🔑 关键区别
- **有限模式：** N次重复后自动停止
- **无限模式：** 需要手动 `.Cancel()` 来停止

:::

---

## 🏗️ 场景架构

### 重复事件系统

与延迟事件（等待一次，执行一次）不同，重复事件使用**计时器循环**：
```
🚀 启动：Raise()
│
▼ ❮─── 循环周期 ───┐
⚡ [ 执行动作 ]     │
│                  │
⏳ [ 等待间隔 ]     │ (Δ 增量时间)
│                  │
🔄 [ 重复检查 ] ────┘ (如果剩余 > 0)
│
🛑 [ 停止条件 ] ➔ 🏁 生命周期结束
```

**停止条件：**
1. **达到重复次数：** 有限模式在N次执行后自动停止
2. **手动取消：** `.Cancel()` 立即终止无限循环
3. **场景卸载：** 所有待执行事件被清理

**内部调度：**
- GameEventManager维护一个调度器队列
- 每个重复事件都有一个内部计时器
- 每次执行后计时器重置以保持精确间隔

---

### 事件定义

![游戏事件编辑器](/img/game-event-system/examples/08-repeating-event/demo-08-editor.png)

| 事件名称               | 类型               | 重复间隔 | 重复次数      |
| ---------------------- | ------------------ | -------- | ------------- |
| `onFinitePulseEvent`   | `GameEvent`（void） | 1.5秒    | 5             |
| `onInfinitePulseEvent` | `GameEvent`（void） | 1.0秒    | -1（无限）    |

**相同的接收器方法：**
两个事件都绑定到 `RepeatingEventReceiver.OnPulseReceived()`。接收器不知道也不关心哪个事件触发了它——它只是响应每个脉冲。

---

### 行为配置比较

#### 有限循环配置

点击 `onFinitePulseEvent` 的**(void)**图标打开行为窗口：

![有限行为](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

**调度配置：**
- ⏱️ **动作延迟：** `0`（无初始延迟）
- 🔄 **重复间隔：** `1.5`秒
  - 每次脉冲执行之间的时间
- 🔢 **重复次数：** `5`
  - 脉冲总数
  - 第5次执行后自动停止

**行为：**
```
🖼️ T+0.0s | 初始触发
🚀 Raise() ➔ ⚡ 执行 #1
│
┆  (Δ 1.5s 间隔)
▼
🖼️ T+1.5s | 重复 1/4
⚡ 执行 #2
│
┆  (Δ 1.5s 间隔)
▼
🖼️ T+3.0s | 重复 2/4
⚡ 执行 #3
│
┆  (Δ 1.5s 间隔)
▼
🖼️ T+4.5s | 重复 3/4
⚡ 执行 #4
│
┆  (Δ 1.5s 间隔)
▼
🖼️ T+6.0s | 重复 4/4
⚡ 执行 #5 ➔ [最终执行]
│
🏁 T+7.5s | 生命周期结束
🛑 [ 序列终止：计数器归零 ]
```

---

#### 无限循环配置

点击 `onInfinitePulseEvent` 的**(void)**图标打开行为窗口：

![无限行为](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

**调度配置：**
- ⏱️ **动作延迟：** `0`
- 🔄 **重复间隔：** `1`秒（比有限模式更快）
- 🔢 **重复次数：** `Infinite Loop` ♾️
  - 特殊值：`-1` 表示无限制
  - 永不自动停止

**行为：**
```
🚀 启动：Raise()
│
▼ ❮━━━━━━━━━  永久循环  ━━━━━━━━━┓
⚡ 执行 #1（初始）              ┃
│                              ┃
⏳ (等待 1.0s)                 ┃
│                              ┃
⚡ 执行 #2（重复）              ┃
│                              ┃
⏳ (等待 1.0s)                 ┃
│                              ┃
⚡ 执行 #N...（重复）           ┛
│
│   [ 需要外部干预 ]
└─► 🛠️ 调用：.Cancel() 
    └─► 🛑 循环终止 ➔ 🏁 清理
```

:::tip ⚙️ 配置无限循环

要设置无限重复，点击重复次数旁边的**Infinite Loop**切换按钮（♾️图标）。这会自动将值设置为 `-1`。

:::

---

### 发送器设置（RepeatingEventRaiser）

选择**RepeatingEventRaiser**游戏对象：

![RepeatingEventRaiser检查器](/img/game-event-system/examples/08-repeating-event/demo-08-inspector.png)

**事件通道：**
- `Finite Pulse Event`：`onFinitePulseEvent`
  - 提示："间隔 = 1.0秒，次数 = 5"
- `Infinite Pulse Event`：`onInfinitePulseEvent`
  - 提示："间隔 = 0.5秒，次数 = -1（无限）"

**引用：**
- `Repeating Event Receiver`：RepeatingEventReceiver（用于协调）

**视觉引用：**
- `Rotating Core`：RotatingCore（Transform）- 激活状态的视觉指示器
- `Mode Text`：Text（TMP）（TextMeshProUGUI）- 显示当前模式

---

### 接收器设置（RepeatingEventReceiver）

选择**RepeatingEventReceiver**游戏对象：

![RepeatingEventReceiver检查器](/img/game-event-system/examples/08-repeating-event/demo-08-receiver.png)

**配置：**
- `Beacon Origin`：SonarBeacon（Transform）- 脉冲生成点

**视觉资源：**
- `Shockwave Prefab`：ShockwaveVFX（粒子系统）- 扩张环效果
- `Scanned Material`：Prototype_Guide_Red - 目标高亮材质
- `Default Material`：Prototype_Guide_Default - 目标正常材质

**音频：**
- `Sonar Ping Clip`：SonarPingSFX - 脉冲声音
- `Power Down Clip`：PowerDownSFX - 停止声音

---

## 💻 代码详解

### 📤 RepeatingEventRaiser.cs（发送器）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using TMPro;

public class RepeatingEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("在编辑器中配置：间隔 = 1.5秒，次数 = 5。")]
    [GameEventDropdown] public GameEvent finitePulseEvent;

    [Tooltip("在编辑器中配置：间隔 = 1.0秒，次数 = -1（无限）。")]
    [GameEventDropdown] public GameEvent infinitePulseEvent;

    [SerializeField] private Transform rotatingCore;
    [SerializeField] private TextMeshProUGUI modeText;
    
    private bool _isInfiniteMode = false;
    private bool _isActive = false;
    private GameEvent _currentEvent;

    private void Update()
    {
        // 视觉反馈：旋转速度指示状态
        if (rotatingCore != null)
        {
            float speed = _isActive 
                ? (_isInfiniteMode ? 300f : 150f)  // 激活：快速或中速
                : 20f;                              // 空闲：慢速
            rotatingCore.Rotate(Vector3.up, speed * Time.deltaTime);
        }
    }

    /// <summary>
    /// 按钮动作：启动重复事件循环。
    /// 
    /// 关键：这只调用一次 Raise()。
    /// 事件系统的调度器根据编辑器中配置的重复间隔和重复次数
    /// 自动处理所有重复。
    /// </summary>
    public void ActivateBeacon()
    {
        if (_isActive) return;

        _isActive = true;
        
        // 根据当前模式选择使用哪个事件
        _currentEvent = _isInfiniteMode ? infinitePulseEvent : finitePulseEvent;

        if (_currentEvent != null)
        {
            // 魔法时刻：单次 Raise() 调用启动整个循环
            // 系统检查事件的重复间隔和重复次数
            // 自动调度所有未来的执行
            _currentEvent.Raise();
            
            Debug.Log($"[Raiser] Beacon Activated. Mode: " +
                     $"{(_isInfiniteMode ? "Infinite" : "Finite (5x)")}");
        }
    }
    
    /// <summary>
    /// 按钮动作：在有限和无限模式之间切换。
    /// 切换前停止任何激活的循环。
    /// </summary>
    public void ToggleMode()
    {
        // 切换模式前必须停止
        if (_isActive) StopSignal();

        _isInfiniteMode = !_isInfiniteMode;
        UpdateUI();
    }

    /// <summary>
    /// 按钮动作：手动取消激活的循环。
    /// 
    /// 对于无限循环至关重要 - 它们永不自动停止。
    /// 对于有限循环，这允许提前终止。
    /// </summary>
    public void StopSignal()
    {
        if (!_isActive || _currentEvent == null) return;

        // 关键API：Cancel从调度器中移除事件
        // 立即停止计时器 - 不再触发脉冲
        _currentEvent.Cancel();
        
        _isActive = false;
        UpdateUI();
        
        Debug.Log("[Raiser] Signal Interrupted manually.");
    }

    private void UpdateUI()
    {
        if (modeText) 
            modeText.text = _isInfiniteMode 
                ? "Toggle Mode\n<b>(Infinite)</b>" 
                : "Toggle Mode\n<b>(Finite[5])</b>";
    }
}
```

**要点：**
- 🎯 **单次Raise()** - 仅调用一次即可启动整个循环
- 🔀 **模式选择** - 在两个预配置事件之间切换
- 🛑 **取消API** - 停止无限循环或提前终止有限循环
- 🎨 **视觉反馈** - 旋转速度指示激活状态和模式

---

### 📥 RepeatingEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using System.Collections;

public class RepeatingEventReceiver : MonoBehaviour
{
    [Header("Configuration")]
    public Transform beaconOrigin;

    [Header("Visual Resources")]
    public ParticleSystem shockwavePrefab;
    public Material scannedMaterial;
    public Material defaultMaterial;

    [Header("Audio")]
    public AudioClip sonarPingClip;
    
    private AudioSource _audioSource;
    private int _pulseCount = 0;

    /// <summary>
    /// [事件回调 - 重复执行]
    /// 
    /// 绑定到 'onFinitePulseEvent' 和 'onInfinitePulseEvent'。
    /// 
    /// 此方法执行：
    /// - 调用 Raise() 时立即执行（第一次脉冲）
    /// - 然后在每个重复间隔重复执行
    /// - 直到达到重复次数（有限）或调用 Cancel()（无限）
    /// 
    /// 接收器是无状态的 - 它不跟踪脉冲数量或循环状态。
    /// 它只是对每次触发做出反应。
    /// </summary>
    public void OnPulseReceived()
    {
        _pulseCount++;
        Debug.Log($"[Receiver] Pulse #{_pulseCount} emitted.");

        Vector3 spawnPos = beaconOrigin != null 
            ? beaconOrigin.position 
            : transform.position;

        // 生成视觉冲击波
        if (shockwavePrefab != null)
        {
            var vfx = Instantiate(shockwavePrefab, spawnPos, Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 播放声呐脉冲，带有轻微音调变化
        if (sonarPingClip) 
        {
            _audioSource.pitch = Random.Range(0.95f, 1.05f);
            _audioSource.PlayOneShot(sonarPingClip);
        }

        // 启动基于物理的目标扫描
        StartCoroutine(ScanRoutine(spawnPos));
    }

    public void OnPowerDown()
    {
        _pulseCount = 0;  // 系统断电时重置计数器
    }

    /// <summary>
    /// 从信标原点扩展一个不可见的球体。
    /// 扩张波前内的目标被高亮显示。
    /// </summary>
    private IEnumerator ScanRoutine(Vector3 center)
    {
        float maxRadius = 40f;      // 匹配青色环大小
        float speed = 10f;          // 扩张速度
        float currentRadius = 0f;

        while (currentRadius < maxRadius)
        {
            currentRadius += speed * Time.deltaTime;
            
            // 物理球体投射查找目标
            Collider[] hits = Physics.OverlapSphere(center, currentRadius);
            
            foreach (var hit in hits)
            {
                if (hit.name.Contains("ScanTarget"))
                {
                    var rend = hit.GetComponent<Renderer>();
                    if (rend && rend.sharedMaterial != scannedMaterial)
                    {
                        float dist = Vector3.Distance(center, hit.transform.position);
                        
                        // 仅在波前边缘时高亮（1单位内）
                        if (dist <= currentRadius && dist > currentRadius - 1.0f)
                        {
                            StartCoroutine(HighlightTarget(rend));
                        }
                    }
                }
            }
            
            yield return null;
        }
    }

    private IEnumerator HighlightTarget(Renderer target)
    {
        // 临时闪红
        target.material = scannedMaterial;
        
        var tmp = target.GetComponentInChildren<TMPro.TextMeshPro>();
        if(tmp) tmp.text = "DETECTED";

        yield return new WaitForSeconds(0.4f);

        // 重置为默认
        target.material = defaultMaterial;
        if(tmp) tmp.text = "?";
    }
}
```

**要点：**
- 🎯 **无状态接收器** - 不跟踪循环计数或时间
- 📡 **物理扫描** - 扩张的球体投射检测目标
- 🎨 **波前检测** - 仅在冲击波边缘高亮目标
- 🔢 **脉冲计数器** - 跟踪接收到的总脉冲（装饰性）

---

## 🔑 核心要点

| 概念                  | 实现                                         |
| --------------------- | -------------------------------------------- |
| 🔄 **重复间隔**        | 每次执行之间的时间（在编辑器中配置）         |
| 🔢 **重复次数**        | 重复数量（有限为 `N`，无限为 `-1`）          |
| 🎯 **单次Raise()**     | 一次调用启动整个循环——无需手动触发           |
| ✅ **自动停止**        | 有限循环在N次执行后自动终止                  |
| 🛑 **手动取消**        | 需要 `.Cancel()` 来停止无限循环              |
| 🎨 **无状态接收器**    | 回调无需跟踪循环状态                         |

:::note 🎓 设计洞察

重复事件非常适合：

- **周期性能力** - 毒性伤害、再生、区域拒止
- **环境效果** - 熔岩气泡、蒸汽喷口、灯塔信标
- **生成系统** - 敌人波次、物品掉落、粒子爆发
- **雷达/检测** - 声呐脉冲、安全扫描、邻近警报
- **游戏循环** - 回合计时器、检查点自动保存、周期性事件

当您确切知道某事应该重复多少次时使用**有限**循环（例如"射击3次"）。对于应该持续直到满足特定条件的持续效果使用**无限**循环（例如"脉冲直到玩家离开区域"）。

:::

:::tip 💻 编程API

您也可以纯粹通过代码配置循环，覆盖检查器设置：
```csharp
// 临时覆盖检查器设置
myEvent.RaiseRepeating(interval: 0.5f, repeatCount: 10);

// 或使用默认的检查器设置
myEvent.Raise();
```

这允许基于运行时条件进行动态调整（例如难度修改器、增益道具）。

:::

---

## 🎯 下一步

您已经掌握了用于自动化循环的重复事件。现在让我们探索在场景转换中存活的**持久化事件**。

**下一章**：在**[09 持久化事件](./09-persistent-event.md)**中学习跨场景事件

---

## 📚 相关文档

- **[游戏事件行为](../visual-workflow/game-event-behavior.md)** - 调度配置完整指南
- **[触发与调度](../scripting/raising-and-scheduling.md)** - `.Raise()`、`.RaiseRepeating()`、`.Cancel()` 的API参考
- **[最佳实践](../scripting/best-practices.md)** - 周期性游戏机制的模式