---
sidebar_label: '10 触发器事件'
sidebar_position: 11
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 10 触发器事件：并行事件分发

<VideoGif src="/video/game-event-system/example/10-trigger-event.mp4" />

## 📋 概述

在复杂游戏中，一个动作（如"攻击指令"）通常需要触发多个独立系统：战斗逻辑、音效、UI更新、成就、数据分析等。在代码中实现这一点会导致函数臃肿，包含数十行代码。**流程图**将其可视化为**并行分发**——一个根事件扇出到多个条件分支，每个分支都有自己的优先级和过滤逻辑。

:::tip 💡 您将学到
- 如何使用流程图进行可视化事件路由
- 并行执行与顺序优先级排序
- 使用节点条件进行条件分支
- 触发器节点中的类型转换和参数过滤
- 触发器事件与链式事件的区别

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/10_TriggerEvent/10_TriggerEvent.unity
```

### 场景构成

**视觉元素：**
- 🔴 **Turret_A（左侧）** - 红色"智能"炮塔
  - 优先级顺序：增益（100）→ 开火（50）
  - 结果：**暴击**
  
- 🔵 **Turret_B（右侧）** - 蓝色"故障"炮塔
  - 优先级顺序：开火（100）→ 增益（30）
  - 结果：**弱击**（增益来得太晚）

- 🎯 **TargetDummy** - 中央胶囊目标
  - 接收来自两个炮塔的伤害
  - 具有刚体用于物理反应

- 📺 **HoloDisplay** - 信息面板
  - 显示伤害数据日志
  - 默认显示"SYSTEM READY"
  - 触发时更新为伤害信息

- 🚨 **AlarmVignette** - 全屏红色叠加层
  - 全局警报触发时闪烁
  - 独立于炮塔特定分支

**UI层（Canvas）：**
- 🎮 **两个指令按钮** - 屏幕底部
  - "Command A" → 触发 `TriggerEventRaiser.CommandTurretA()`
  - "Command B" → 触发 `TriggerEventRaiser.CommandTurretB()`

**游戏逻辑层：**
- 📤 **TriggerEventRaiser** - 指令发布者
  - 仅引用**一个**根事件：`onCommand`
  - 完全不知道下游事件
  - 终极解耦演示

- 📥 **TriggerEventReceiver** - 动作执行者
  - 包含5个独立动作方法
  - 流程图协调何时执行哪些方法
  - 方法具有不同的签名（void、单参数、双参数）

---

## 🎮 如何交互

### 并行分发实验

一个根事件（`onCommand`）根据条件和优先级分裂成多个并行分支。

---

### 步骤1：进入播放模式

在Unity中按下**播放**按钮。

**初始状态：**
- 两个炮塔空闲（缓慢旋转扫描）
- HoloDisplay显示"SYSTEM READY"
- 无警报叠加层可见

---

### 步骤2：测试智能炮塔（正确优先级）

**点击"Command A"：**

**发生的事情：**
1. 🎯 红色炮塔向目标旋转（快速跟踪）
2. 🚀 发射抛射物并飞行
3. 💥 **撞击时** - 以 `Turret_A` 作为发送者触发根事件

**并行执行分支：**

**分支1：炮塔A特定（有条件）：**
- ✅ **onActiveBuff**（优先级100）
  - 条件：`sender.name.Contains("Turret_A")` → **TRUE**
  - 由于最高优先级首先执行
  - 炮塔变为**金色**，生成增益光环
  - 设置 `_isBuffedA = true`
  - 控制台：`[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for Turret_A.`
  
- ✅ **onTurretFire**（优先级50）
  - 条件：`sender.name.Contains("Turret_A")` → **TRUE**
  - 第二个执行（优先级低于增益）
  - 检查 `_isBuffedA` → 发现为TRUE
  - 结果：**CRIT! -500** 伤害
  - 橙色浮动文本、爆炸特效、相机震动
  - 控制台：`[Receiver] (B) TURRET HIT: Critical Strike! (500 dmg)`

**分支2：全局（无条件）：**
- ✅ **onHoloData**（优先级1秒延迟）
  - 无条件 → 总是执行
  - 类型转换：丢弃 `GameObject` 发送者，仅传递 `DamageInfo`
  - HoloDisplay更新："Damage DATA Type: Physical, Target: 100"
  - 控制台：`[Receiver] (C) HOLO DATA: Recorded 100 damage packet.`
  
- ✅ **onGlobalAlarm**（优先级立即，void）
  - 无条件 → 总是执行
  - 类型转换：丢弃所有参数
  - 屏幕闪红3次
  - 播放警报声音
  - 控制台：`[Receiver] (D) ALARM: HQ UNDER ATTACK! EMERGENCY PROTOCOL!`
  
- ✅ **onSecretFire**（优先级1秒延迟，参数被阻止）
  - 无条件 → 总是执行
  - **PassArgument = false** → 接收默认/null值
  - 控制台：`[Receiver] (E) SECURE LOG: Data transmission blocked by Graph.`

**结果：** ✅ 智能炮塔实现暴击，因为增益在伤害计算之前应用。

---

### 步骤3：测试故障炮塔（错误优先级）

**点击"Command B"：**

**发生的事情：**
1. 🎯 蓝色炮塔向目标旋转
2. 🚀 发射抛射物并飞行
3. 💥 **撞击时** - 以 `Turret_B` 作为发送者触发根事件

**并行执行分支：**

**分支1：炮塔B特定（有条件）：**
- ❌ **onActiveBuff**（炮塔A条件）
  - 条件：`sender.name.Contains("Turret_A")` → **FALSE**
  - **未执行** - 被条件过滤掉

- ✅ **onTurretFire**（优先级100）- *与炮塔A不同的节点*
  - 条件：`sender.name.Contains("Turret_B")` → **TRUE**
  - 首先执行（炮塔B分支中最高优先级）
  - 检查 `_isBuffedB` → 发现为**FALSE**（增益尚未运行）
  - 结果：**-100** 普通伤害
  - 灰色浮动文本、小型爆炸
  - 控制台：`[Receiver] (B) TURRET HIT: Normal Hit. (100 dmg)`

- ✅ **onActiveBuff**（优先级30）- *与炮塔A不同的节点*
  - 条件：`sender.name.Contains("Turret_B")` → **TRUE**
  - 第二个执行（较低优先级）
  - 炮塔变为**金色**，生成增益光环
  - 设置 `_isBuffedB = true` **太晚了！**
  - 控制台：`[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for Turret_B.`

**分支2：全局（无条件）：**
- 相同的3个全局节点执行（onHoloData、onGlobalAlarm、onSecretFire）
- 独立于哪个炮塔开火

**结果：** ❌ 故障炮塔获得普通攻击，因为伤害在增益应用之前计算。

:::note 🔑 关键观察

两个炮塔触发相同的根事件（`onCommand`），但：

- **条件节点** 按发送者名称过滤
- 每个分支内的**优先级顺序**决定结果
- **全局节点** 无论发送者如何都会执行
- 所有分支**并行**评估（同一帧）

:::

---

## 🏗️ 场景架构

### 并行与顺序执行

**传统顺序代码：**
```csharp
void OnAttackCommand(GameObject sender, DamageInfo info)
{
    if (sender.name == "Turret_A") ActivateBuff(sender, info);
    TurretHit(sender, info);
    if (sender.name == "Turret_A") ActivateBuff(sender, info); // 错误的顺序！
    HoloDamageData(info);
    GlobalAlarm();
    LogSecretAccess(sender, info);
}
```

**流程图并行分发：**
```
📡 根：onCommand.Raise(sender, info)
│
├─ 🔱 [ 条件分支：炮塔A ] ➔ 🛡️ 守卫：`Sender == "Turret_A"`
│  ├─ 💎 [优先级：100] ➔ onActiveBuff()   ✅ 第1个执行
│  └─ ⚡ [优先级：50 ] ➔ onTurretFire()   ✅ 第2个执行
│
├─ 🔱 [ 条件分支：炮塔B ] ➔ 🛡️ 守卫：`Sender == "Turret_B"`
│  ├─ ⚡ [优先级：100] ➔ onTurretFire()   ✅ 第1个执行
│  └─ 💎 [优先级：30 ] ➔ onActiveBuff()   ✅ 第2个执行
│
└─ 🌍 [ 全局分支：总是运行 ]   ➔ 🟢 守卫：`无（总是通过）`
   ├─ 📽️ onHoloData       ⏱️ 延迟：1.0秒 | 🔢 单参数
   ├─ 🚨 onGlobalAlarm    ⚡ 立即        | 🔘 Void（仅信号）
   └─ 🕵️ onSecretFire     ⏱️ 延迟：1.0秒 | 🛡️ 阻止参数
```

**执行行为：**
- 所有分支同时评估（并行）
- 条件过滤哪些节点执行
- 优先级决定通过分支内的顺序
- 类型转换按节点自动发生

---

### 事件定义

![游戏事件编辑器](/img/game-event-system/examples/10-trigger-event/demo-10-editor.png)

| 事件名称        | 类型                                | 角色     | 颜色 |
| --------------- | ----------------------------------- | -------- | ---- |
| `onCommand`     | `GameEvent<GameObject, DamageInfo>` | **根**   | 金色 |
| `onActiveBuff`  | `GameEvent<GameObject, DamageInfo>` | 触发器   | 绿色 |
| `onTurretFire`  | `GameEvent<GameObject, DamageInfo>` | 触发器   | 绿色 |
| `onHoloData`    | `GameEvent<DamageInfo>`             | 触发器   | 绿色 |
| `onGlobalAlarm` | `GameEvent`（void）                 | 触发器   | 绿色 |
| `onSecretFire`  | `GameEvent<GameObject, DamageInfo>` | 触发器   | 绿色 |

**关键洞察：**
- **根事件**（金色）：唯一由代码直接触发的
- **触发器事件**（绿色）：由流程图自动触发
- 代码仅知道 `onCommand` ——与下游逻辑完全解耦

---

### 流程图配置

在游戏事件编辑器中点击**"Flow Graph"**按钮打开可视化图表：

![流程图概览](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

**图表结构：**

**根节点（左侧，红色）：**

- `onCommand <GameObject, DamageInfo>`
- 整个图表的入口点
- 由代码触发的单个节点

**炮塔A分支（右上，绿色）：**
- `onActiveBuff`（优先级：★100，条件：Turret_A，通过：✓）
  - 分支中最高优先级
  - 仅在发送者为Turret_A时执行
- `onTurretFire`（优先级：★50，条件：Turret_A，通过：✓）
  - 第二优先级
  - 仅在发送者为Turret_A时执行

**炮塔B分支（中右，绿色）：**
- `onTurretFire`（优先级：★100，条件：Turret_B，通过：✓）
  - 分支中最高优先级
  - 仅在发送者为Turret_B时执行
- `onActiveBuff`（优先级：★30，条件：Turret_B，通过：✓）
  - 较低优先级（在Fire之后执行！）
  - 仅在发送者为Turret_B时执行

**全局分支（右下，黄色/绿色）：**
- `onHoloData`（延迟：⏱️1秒，通过：🔴 仅单参数）
  - 类型转换：`<GameObject, DamageInfo>` → `<DamageInfo>`
  - 黄色线表示类型兼容性警告
- `onGlobalAlarm`（通过：⭕ Void）
  - 类型转换：`<GameObject, DamageInfo>` → `(void)`
  - 丢弃所有参数
- `onSecretFire`（延迟：⏱️1秒，通过：🔒 静态/阻止）
  - PassArgument = false
  - 接收默认/null值

**图例：**
- 🟢 **绿色线：** 类型匹配（兼容）
- 🟡 **黄色线：** 类型转换（兼容但有数据丢失）
- 🔴 **红色线：** 类型不兼容（无法连接）

:::tip 🎨 可视化图表优势

流程图提供了即时的视觉理解：

- 哪些事件触发哪些下游事件
- 分支内的执行优先级
- 类型转换和参数传递
- 条件路由逻辑
- 并行执行结构

:::

---

### 发送器设置（TriggerEventRaiser）

选择**TriggerEventRaiser**游戏对象：

![TriggerEventRaiser检查器](/img/game-event-system/examples/10-trigger-event/demo-10-inspector.png)

**游戏事件：**
- `Command Event`：`onCommand`
  - 提示："触发整个图表的唯一事件"
  - 类型：`GameEvent<GameObject, DamageInfo>`

**炮塔A（智能）：**
- `Turret A`：Turret_A（游戏对象）
- `Turret Head A`：Head（Transform）
- `Turret Muzzle A`：MuzzlePoint（Transform）

**炮塔B（仓促）：**
- `Turret B`：Turret_B（游戏对象）
- `Turret Head B`：Head（Transform）
- `Turret Muzzle B`：MuzzlePoint（Transform）

**共享资源：**
- `Projectile Prefab`、`Muzzle Flash VFX`、`Hit Target`

**关键观察：**
脚本仅引用**一个**事件。它**不知道**5个下游事件。这是终极解耦——流程图处理所有路由逻辑。

---

### 接收器设置（TriggerEventReceiver）

选择**TriggerEventReceiver**游戏对象：

![TriggerEventReceiver检查器](/img/game-event-system/examples/10-trigger-event/demo-10-receiver.png)

**目标引用：**
- `Target Dummy`、`Target Rigidbody`

**视觉资源：**
- `Buff VFX Prefab`：TurretBuffAura（粒子系统）
- `Hit Normal VFX`、`Hit Crit VFX`、`Floating Text Prefab`

**警报特效：**
- `Alarm Screen Group`：AlarmVignette（Canvas Group）
- `Holo Text`：LogText（Text Mesh Pro）

**炮塔配置：**
- **炮塔A：** 渲染器数组、普通材质
- **炮塔B：** 渲染器数组、普通材质
- **共享：** 增益材质（金色）

---

## 💻 代码详解

### 📤 TriggerEventRaiser.cs（发送器）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class TriggerEventRaiser : MonoBehaviour
{
    [Header("Game Event")]
    [Tooltip("触发整个图表的唯一事件。")]
    [GameEventDropdown]
    public GameEvent<GameObject, DamageInfo> commandEvent;

    [Header("Turret A (Smart)")] 
    public GameObject turretA;
    // ... 炮塔引用 ...

    private bool _isAttackingA;
    private bool _isAttackingB;

    /// <summary>
    /// 按钮A：命令炮塔A攻击。
    /// 开始瞄准序列，最终触发根事件。
    /// </summary>
    public void CommandTurretA()
    {
        if (commandEvent == null || turretA == null) return;
        _isAttackingA = true; // 开始旋转/开火序列
    }

    /// <summary>
    /// 按钮B：命令炮塔B攻击。
    /// </summary>
    public void CommandTurretB()
    {
        if (commandEvent == null || turretB == null) return;
        _isAttackingB = true;
    }

    private void FireProjectile(GameObject senderTurret, Transform muzzle)
    {
        // 生成枪口闪光、发射抛射物...
        
        var shell = Instantiate(projectilePrefab, muzzle.position, muzzle.rotation);
        shell.Initialize(hitTarget.position, 20f, () =>
        {
            Vector3 hitPos = hitTarget.position;
            DamageInfo info = new DamageInfo(100f, false, DamageType.Physical, 
                                            hitPos, "Commander");

            // 关键：触发唯一的根事件
            // 流程图决定其他一切：
            // - 哪些下游事件触发
            // - 以什么优先级顺序
            // - 带什么参数
            commandEvent.Raise(senderTurret, info);

            Debug.Log($"[Sender] Impact confirmed from {senderTurret.name}. " +
                     "Event Raised.");
        });
    }
}
```

**要点：**
- 🎯 **单一事件引用** - 仅知道根事件
- 🔇 **零下游知识** - 不知道5个触发器事件
- 📡 **简单API** - 只是 `.Raise(sender, data)`
- 🏗️ **最大解耦** - 流程图处理所有路由

---

### 📥 TriggerEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using System.Collections;

public class TriggerEventReceiver : MonoBehaviour
{
    private bool _isBuffedA;
    private bool _isBuffedB;

    /// <summary>
    /// [动作A] 激活增益
    /// 绑定到流程图中的触发器节点（炮塔A和B的独立节点）。
    /// 
    /// 优先级影响：
    /// - 炮塔A：优先级100 → 在伤害之前执行（正确）
    /// - 炮塔B：优先级30 → 在伤害之后执行（错误！）
    /// </summary>
    public void ActivateBuff(GameObject sender, DamageInfo args)
    {
        if (sender == null) return;
        bool isA = sender.name.Contains("Turret_A");

        // 设置关键标志
        if (isA) _isBuffedA = true;
        else _isBuffedB = true;

        // 视觉反馈：金色材质 + 粒子光环
        Renderer[] targetRenderers = isA ? renderersA : renderersB;
        foreach (var r in targetRenderers)
            if (r) r.material = mat_Buffed;

        if (buffVFXPrefab)
        {
            var vfx = Instantiate(buffVFXPrefab, sender.transform.position, 
                                 Quaternion.identity);
            vfx.transform.SetParent(sender.transform);
            vfx.Play();
            
            if (isA) _auraA = vfx;
            else _auraB = vfx;
        }

        Debug.Log($"[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for {sender.name}.");
    }

    /// <summary>
    /// [动作B] 炮塔命中
    /// 绑定到流程图中的触发器节点（炮塔A和B的独立节点）。
    /// 
    /// 在执行时刻检查增益状态。
    /// 优先级决定增益是否已激活。
    /// </summary>
    public void TurretHit(GameObject sender, DamageInfo args)
    {
        if (sender == null) return;

        // 检查增益当前是否激活
        bool isBuffed = sender.name.Contains("Turret_A") ? _isBuffedA : _isBuffedB;

        float finalDamage = args.amount;
        bool isCrit = false;
        ParticleSystem vfxToPlay;

        if (isBuffed)
        {
            // 暴击路径：增益已激活
            finalDamage *= 5f; // 500伤害
            isCrit = true;
            vfxToPlay = hitCritVFX;
            
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
            Debug.Log($"[Receiver] (B) TURRET HIT: Critical Strike! ({finalDamage} dmg)");
        }
        else
        {
            // 普通路径：增益尚未激活
            vfxToPlay = hitNormalVFX;
            Debug.Log($"[Receiver] (B) TURRET HIT: Normal Hit. ({finalDamage} dmg)");
        }

        // 生成特效、应用物理、显示浮动文本...
        StartCoroutine(ResetRoutine(sender, isBuffed));
    }

    /// <summary>
    /// [动作C] 全息伤害数据
    /// 绑定到带有类型转换的触发器节点。
    /// 
    /// 图表配置：
    /// - 输入：GameEvent<GameObject, DamageInfo>
    /// - 输出：GameEvent<DamageInfo>
    /// - 结果：发送者被丢弃，仅传递数据
    /// </summary>
    public void HoloDamageData(DamageInfo info)
    {
        if (holoText)
        {
            holoText.text = $"Damage DATA\nType: {info.type}, Target: {info.amount}";
        }

        Debug.Log($"[Receiver] (C) HOLO DATA: Recorded {info.amount} damage packet.");
        StartCoroutine(ClearLogRoutine());
    }

    /// <summary>
    /// [动作D] 全局警报
    /// 绑定到带有类型转换为VOID的触发器节点。
    /// 
    /// 图表配置：
    /// - 输入：GameEvent<GameObject, DamageInfo>
    /// - 输出：GameEvent（void）
    /// - 结果：所有参数被丢弃
    /// </summary>
    public void GlobalAlarm()
    {
        Debug.Log("[Receiver] (D) ALARM: HQ UNDER ATTACK! EMERGENCY PROTOCOL!");

        StopCoroutine(nameof(AlarmRoutine));
        if (alarmScreenGroup) StartCoroutine(AlarmRoutine());
    }

    /// <summary>
    /// [动作E] 秘密日志
    /// 绑定到PassArgument = FALSE的触发器节点。
    /// 
    /// 演示参数阻止：
    /// 即使根事件有数据，此节点也接收默认/null值。
    /// 用于安全、调试或数据隔离。
    /// </summary>
    public void LogSecretAccess(GameObject sender, DamageInfo data)
    {
        bool isBlocked = (data == null || (data.amount == 0 && data.attacker == null));

        if (isBlocked)
            Debug.Log("<color=lime>[Receiver] (E) SECURE LOG: " +
                     "Data transmission blocked by Graph.</color>");
        else
            Debug.Log("<color=red>[Receiver] (E) SECURE LOG: " +
                     "Data LEAKED! ({data.amount})</color>");
    }

    private IEnumerator AlarmRoutine()
    {
        int flashes = 3;
        float flashDuration = 0.5f;

        for (int i = 0; i < flashes; i++)
        {
            if (alarmClip) _audioSource.PlayOneShot(alarmClip);

            // 正弦波alpha动画
            float t = 0f;
            while (t < flashDuration)
            {
                t += Time.deltaTime;
                float alpha = Mathf.Sin((t / flashDuration) * Mathf.PI);
                alarmScreenGroup.alpha = alpha * 0.8f;
                yield return null;
            }

            alarmScreenGroup.alpha = 0f;
            yield return new WaitForSeconds(0.1f);
        }
    }
}
```

**要点：**
- 🎯 **5个独立方法** - 每个处理一个动作
- 🔀 **不同签名** - void、单参数、双参数
- 📊 **状态依赖** - `TurretHit` 读取 `_isBuffedA/B` 标志
- ⏱️ **优先级关键** - 顺序决定增益是否激活
- 🎨 **类型无关** - 方法不知道类型转换

---

## 🔑 核心要点

| 概念                  | 实现                             |
| --------------------- | -------------------------------- |
| 🌳 **流程图**          | 替代臃肿代码的可视化并行分发     |
| 🎯 **触发器节点**      | 自动触发的下游事件               |
| 📋 **条件路由**        | 节点条件过滤执行                 |
| ⏱️ **优先级排序**      | 控制分支内的执行顺序             |
| 🔀 **类型转换**        | 按节点自动适配参数               |
| 🔒 **参数阻止**        | PassArgument标志控制数据传输     |
| 📡 **并行执行**        | 所有分支同时评估                 |

:::note 🎓 设计洞察

触发器事件非常适合：

- **扇出架构** - 一个动作触发多个系统
- **条件路由** - 基于发送者/数据的不同逻辑路径
- **优先级管理** - 可视化控制执行顺序
- **类型适配** - 连接不兼容的事件签名
- **解耦** - 发送者不知道下游复杂性

**触发器与链式事件：**
- **触发器（并行）：** 所有节点同时评估，由条件过滤
- **链式（顺序）：** 节点按严格线性顺序执行，一个接一个

当您需要带条件的并行分支时使用**触发器**（例如响应不同攻击者的战斗系统）。当您需要保证顺序时使用**链式**（例如教程步骤、过场动画序列）。

:::

:::warning ⚠️ 优先级陷阱

1. **相同优先级：** 如果多个节点具有相同优先级，执行顺序未定义
2. **跨分支优先级：** 优先级仅在同一条件分支内有效
3. **延迟交互：** 延迟节点可能在非延迟节点之后执行，无论优先级如何
4. **状态变化：** 小心状态变化——后面的节点会看到早期的变化

:::

---

## 🎯 下一步

您已经掌握了并行触发器事件。现在让我们探索用于保证顺序执行的**链式事件**。

**下一章**：在**[11 链式事件](./11-chain-event.md)**中学习顺序链

---

## 📚 相关文档

- **[流程图编辑器](../flow-graph/game-event-node-editor.md)** - 编辑节点流程图
- **[节点与连接器](../flow-graph/game-event-node-connector.md)** - 理解图表的可视化语言
- **[节点行为](../flow-graph/game-event-node-behavior.md)** - 节点配置和条件
- **[高级逻辑模式](../flow-graph/advanced-logic-patterns.md)** - 系统如何执行触发器与链式
- **[编程流程](../scripting/programmatic-flow.md)** - 如何通过FlowGraph API实现流程控制
- **[最佳实践](../scripting/best-practices.md)** - 复杂系统的架构模式