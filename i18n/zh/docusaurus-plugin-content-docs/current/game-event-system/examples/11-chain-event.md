---
sidebar_label: '11 链式事件'
sidebar_position: 12
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 11 链式事件：顺序执行管道

<!-- <VideoGif src="/video/game-event-system/11-chain-event.mp4" /> -->

## 📋 概述

虽然触发器事件以**并行**方式通过条件过滤执行，但链式事件以**严格顺序**执行——一次一步，就像生产流水线。如果链中的任何节点条件失败、延迟或遇到错误，整个序列会暂停或终止。这非常适合过场动画、武器发射序列、教程步骤或任何顺序重要的工作流。

:::tip 💡 您将学到
- 链式（顺序）和触发器（并行）执行的区别
- 如何使用条件节点作为验证门
- 序列中定时暂停的延迟节点
- 异步操作的等待完成
- 条件失败时的早期终止模式

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/11_ChainEvent/11_ChainEvent.unity
```

### 场景构成

**视觉元素：**
- 🔴 **Turret_A（左侧）** - 红色发射器
- 🔵 **Turret_B（右侧）** - 蓝色发射器
- 🎯 **TargetDummy** - 中央胶囊目标
- 📺 **HoloDisplay** - 状态显示面板
  - 安全锁关闭时显示"SAFELOCK READY"
  - 安全锁开启时显示"SAFELOCK ACTIVED"

**UI层（Canvas）：**
- 🎮 **三个按钮** - 屏幕底部
  - "Launch A" → 触发 `ChainEventRaiser.RequestLaunchA()`
  - "Launch B" → 触发 `ChainEventRaiser.RequestLaunchB()`
  - "Toggle SafeLock"（橙色）→ 触发 `ChainEventReceiver.ToggleSafetyLock()`

**游戏逻辑层：**
- 📤 **ChainEventRaiser** - 序列启动器
  - 仅引用**一个**入口点：`0_StartSequence`
  - 不知道下游管道步骤
  
- 📥 **ChainEventReceiver** - 步骤执行器
  - 包含每个管道阶段的5个方法
  - 暴露 `IsSafetyCheckPassed` 属性用于条件验证
  - 包含 `isSafetyLockDisengaged` 标志（可切换）

---

## 🎮 如何交互

### 5步发射协议

一个根事件（`0_StartSequence`）触发一个带有验证、延迟和异步等待的顺序管道。

---

### 步骤1：进入播放模式

在Unity中按下**播放**按钮。

**初始状态：**
- 安全锁：**解除**（默认）
- HoloDisplay："SAFELOCK READY"
- 两个炮塔空闲

---

### 步骤2：测试成功发射（安全锁关闭）

**当前状态检查：**
- 确保HoloDisplay显示"SAFELOCK READY"
- 如果不是，点击"Toggle SafeLock"将安全锁**关闭**

**点击"Launch A"：**

**顺序执行：**

**[步骤1：系统检查]** - 立即
- 🔍 条件节点评估 `ChainEventReceiver.IsSafetyCheckPassed` 属性
- 属性检查 `isSafetyLockDisengaged` 标志
- 结果：**TRUE** ✅
- 控制台：`[Chain Step 1] Turret_A Checking...`
- **链继续到步骤2**

**[步骤2：充能]** - 1.0秒延迟
- ⏱️ 延迟节点暂停执行**1.0秒**
- 特效：炮塔处生成充能粒子效果
- 控制台：`[Chain Step 2] Turret_A Charging...`
- 图表精确等待1.0秒后继续
- **延迟后，链继续到步骤3**

**[步骤3：开火]** - 立即
- 🚀 实例化抛射物并向目标发射
- 炮塔处枪口闪光特效
- 控制台：`[Chain Step 3] Turret_A FIRED payload: 500`
- 抛射物飞向目标
- **链立即继续到步骤4**

**[步骤4：冷却]** - 等待完成
- 💨 生成蒸汽特效粒子系统
- 🕐 **等待节点** - 图表暂停直到特效完成（2.0秒）
- 控制台：`[Chain Step 4] Turret_A Cooldowning.`
- 与延迟（固定时间）不同，这等待实际特效完成
- **蒸汽结束后，链继续到步骤5**

**[步骤5：归档]** - 立即（参数被阻止）
- 📝 最终日志步骤
- 图表中**PassArgument = FALSE** → 接收默认/null值
- 控制台：`[Chain Step 5] Archived. Data Status: CLEAN`
- 炮塔解锁以供下次使用
- **链成功完成 ✅**

**时间线：**
```
0.0秒 → 步骤1：系统检查（瞬间）
0.0秒 → 步骤2：充能开始
1.0秒 → 步骤3：开火（充能延迟后）
1.0秒 → 步骤4：冷却开始
3.0秒 → 步骤5：归档（蒸汽特效约2秒后）
3.0秒 → 序列完成
```

**结果：** ✅ 完整的5步发射序列成功执行。

---

### 步骤3：测试失败发射（安全锁开启）

**点击"Toggle SafeLock"：**
- 安全标志更改：`isSafetyLockDisengaged = false`
- HoloDisplay更新："SAFELOCK ACTIVED"
- UI按钮颜色变为橙色（视觉警告）
- 控制台：`[Chain Settings] Safety Lock Disengaged: False`

**点击"Launch B"：**

**顺序执行：**

**[步骤1：系统检查]** - **失败** ❌
- 🔍 条件节点评估 `ChainEventReceiver.IsSafetyCheckPassed`
- 属性检查 `isSafetyLockDisengaged` → 发现**FALSE**
- 属性执行失败反馈：
  - 🚨 红色警报叠加层闪烁3次
  - 播放警报声音
  - 控制台：`[Chain Blocked] Safety Check Failed. Sequence stopped immediately.`
- 条件返回**FALSE**
- **🛑 链在此终止**

**[步骤2-5]** - **永不执行**
- ❌ 无充能特效
- ❌ 无抛射物发射
- ❌ 无蒸汽冷却
- ❌ 无归档日志

**结果：** ❌ 发射在门处中止。步骤2-5从未运行。

:::danger 🔴 关键链式行为

当链节点的条件失败时：

1. **立即终止** - 执行在该节点停止
2. **无下游执行** - 后续节点永不运行
3. **无部分完成** - 全有或全无的行为
4. **早期清理** - 资源立即解锁

这与触发器事件根本不同，触发器事件中失败的条件只是跳过个别分支，而其他分支继续。

:::

---

## 🏗️ 场景架构

### 链式与触发器：根本区别

**触发器事件（并行）：**
```
⚡ 根事件：OnInteraction
│
├─ 🔱 分支A：[ 🛡️ 守卫：`HasKey == true` ]
│  └─ 🚀 动作：OpenDoor() ➔ ✅ 条件通过：执行中...
│
├─ 🔱 分支B：[ 🛡️ 守卫：`PlayerLevel >= 10` ]
│  └─ 🚀 动作：GrantBonusXP() ➔ ❌ 条件失败：分支跳过
│
└─ 🔱 分支C：[ 🛡️ 守卫：`Always True` ]
   └─ 🚀 动作：PlaySound("Click") ➔ ✅ 条件通过：执行中...
│
📊 摘要：2条路径执行 | 1条路径跳过 | ⚡ 时序：并发
```

**链式事件（顺序）：**
```
🏆 启动：根事件
│
├─ 1️⃣ [ 步骤1 ] ➔ 🛡️ 守卫：`条件A`
│  └─ ⏳ 状态：等待完成... ✅ 成功
│
├─ 2️⃣ [ 步骤2 ] ➔ 🛡️ 守卫：`条件B`
│  └─ ⏳ 状态：等待完成... ✅ 成功
│
├─ 3️⃣ [ 步骤3 ] ➔ 🛡️ 守卫：`条件C`
│  └─ ⏳ 状态：等待完成... ❌ 失败！
│
└─ 🛑 [ 终止 ] ➔ 逻辑链停止
   └─ ⏭️ 步骤4：[ 跳过 ]
│
📊 最终结果：在步骤3中止 | ⏳ 模式：严格阻塞
```

**何时使用每种：**

| 模式         | 使用链式                     | 使用触发器       |
| ------------ | ---------------------------- | ---------------- |
| **过场动画** | ✅ 顺序镜头                   | ❌ 步骤无序       |
| **战斗系统** | ❌ 不需要严格顺序             | ✅ 并行系统       |
| **教程**     | ✅ 必须先完成步骤1再进行步骤2 | ❌ 步骤可重叠     |
| **武器充能** | ✅ 充能 → 开火 → 冷却         | ❌ 顺序重要       |
| **成就**     | ❌ 独立检查                   | ✅ 多个触发器     |

---

### 事件定义

![游戏事件编辑器](/img/game-event-system/examples/11-chain-event/demo-11-editor.png)

| 事件名称          | 类型                                | 角色           | 步骤 |
| ----------------- | ----------------------------------- | -------------- | ---- |
| `0_StartSequence` | `GameEvent<GameObject, DamageInfo>` | **根**（金色） | 入口 |
| `1_SystemCheck`   | `GameEvent<GameObject, DamageInfo>` | **链**（绿色） | 1    |
| `2_Charge`        | `GameEvent<GameObject, DamageInfo>` | **链**（绿色） | 2    |
| `3_Fire`          | `GameEvent<GameObject, DamageInfo>` | **链**（绿色） | 3    |
| `4_CoolDown`      | `GameEvent<GameObject, DamageInfo>` | **链**（绿色） | 4    |
| `5_Archive`       | `GameEvent<GameObject, DamageInfo>` | **链**（绿色） | 5    |

**关键洞察：**
- **根**触发链
- **链节点**自动顺序触发
- 代码仅在根上调用 `.Raise()` ——图表处理其余部分

---

### 流程图配置

点击**"Flow Graph"**按钮可视化顺序管道：

![流程图概览](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

**图表结构（从左到右）：**

**节点1：0_StartSequence（根，红色）**
- 由代码触发的入口点
- 类型：`GameEvent<GameObject, DamageInfo>`
- 连接到第一个链节点

**节点2：1_SystemCheck（链，绿色）**
- ✅ **条件节点** - 守门员
- **条件：** `ChainEventReceiver.IsSafetyCheckPassed == true`
  - 在运行时评估场景对象属性
  - 如果为false → **链立即中断**
- **动作：** `ChainEventReceiver.OnSystemCheck(sender, args)`
- 绿色勾选图标表示条件已启用
- PassArgument：✓ 传递（完整数据转发）

**节点3：2_Charge（链，绿色）**
- ⏱️ **延迟节点** - 定时暂停
- **延迟：** `1.0`秒（显示为 ⏱️ 1秒图标）
- **动作：** `ChainEventReceiver.OnStartCharging(sender, args)`
- 图表在此精确冻结1秒
- PassArgument：✓ 传递

**节点4：3_Fire（链，绿色）**
- 🎯 **动作节点** - 标准执行
- **动作：** `ChainEventReceiver.OnFireWeapon(sender, args)`
- 无延迟，无条件
- 在前一步骤后立即执行
- PassArgument：✓ 传递

**节点5：4_CoolDown（链，绿色）**
- 🕐 **等待节点** - 异步完成
- **延迟：** `0.5秒`（最小等待）
- **WaitForCompletion：** ✓ 选中（显示为 ⏱️ 1秒图标）
  - 图表等待接收器协程完成
  - 不是固定计时器——等待实际完成信号
- **动作：** `ChainEventReceiver.OnCoolDown(sender, args)`
- PassArgument：✓ 传递

**节点6：5_Archive（链，绿色）**
- 🔒 **过滤节点** - 数据清理
- **动作：** `ChainEventReceiver.OnSequenceArchived(sender, args)`
- **PassArgument：** 🔴 静态（参数被阻止）
  - 即使前面的节点传递了完整数据
  - 此节点接收默认/null值
  - 演示链末端的数据防火墙
- 最后一步——无下游节点

**连接线：**
- 🟢 **绿色"CHAIN"线** - 顺序流
  - 每个输出端口连接到下一个输入端口
  - 线性拓扑——无分支
  - 执行遵循从左到右的线

**图例：**
- 🔴 **根节点** - 入口点（由代码触发）
- 🟢 **链节点** - 按顺序自动触发
- ✅ **勾选图标** - 条件已启用
- ⏱️ **时钟图标** - 配置了延迟或等待
- 🔒 **静态图标** - 参数被阻止

:::tip 🎨 可视化管道优势

链式图表提供即时理解：

- **顺序顺序** - 从左到右的流程显示精确执行顺序
- **验证门** - 条件节点充当检查点
- **时序控制** - 延迟/等待图标显示暂停点
- **数据流** - PassArgument切换显示数据过滤位置
- **失败点** - 条件节点显示链可能中断的位置

这比阅读带有嵌套 `yield return` 语句的协程要清晰得多！

:::

---

### 发送器设置（ChainEventRaiser）

选择**ChainEventRaiser**游戏对象：

![ChainEventRaiser检查器](/img/game-event-system/examples/11-chain-event/demo-11-inspector.png)

**链入口点：**
- `Sequence Start Event`：`0_StartSequence`
  - 提示："链图的启动节点"
  - 仅引用根——下游由图表处理

**炮塔：**
- **炮塔A：** Turret_A（游戏对象），Head A（Transform）
- **炮塔B：** Turret_B（游戏对象），Head B（Transform）

**目标：**
- `Hit Target`：TargetDummy（Transform）

**关键观察：**
与触发器示例一样，发送器仅知道**一个**事件。5步管道完全抽象到图表中。

---

### 接收器设置（ChainEventReceiver）

选择**ChainEventReceiver**游戏对象：

![ChainEventReceiver检查器](/img/game-event-system/examples/11-chain-event/demo-11-receiver.png)

**场景引用：**
- `Chain Event Raiser`：ChainEventRaiser（用于解锁回调）
- `Holo Text`：LogText（TextMeshPro）- 显示锁定状态

**目标引用：**
- `Target Dummy`、`Target Rigidbody`

**特效和抛射物：**
- `Projectile Prefab`：Projectile（TurretProjectile）
- `Charge VFX`：TurretBuffAura（粒子系统）- 步骤2
- `Fire VFX`：MuzzleFlashVFX（粒子系统）- 步骤3
- `Steam VFX`：SteamVFX（粒子系统）- 步骤4
- `Hit Normal/Crit VFX`、`Floating Text Prefab`

**音频：**
- `Hit Clip`、`UI Clip`、`Alarm Clip`

**屏幕：**
- `Screen Group`：AlarmVignette（CanvasGroup）- 失败时红色闪烁

**模拟设置：**
- ✅ `Is Safety Lock Disengaged`：TRUE（默认）
  - 控制步骤1条件是否通过
  - 可通过"Toggle SafeLock"按钮切换

---

## 💻 代码详解

### 📤 ChainEventRaiser.cs（发送器）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class ChainEventRaiser : MonoBehaviour
{
    [Header("Chain Entry Point")]
    [Tooltip("链图的启动节点。")]
    [GameEventDropdown]
    public GameEvent<GameObject, DamageInfo> sequenceStartEvent;

    [Header("Turrets")] 
    public GameObject turretA;
    public GameObject turretB;
    // ... 头部变换 ...

    private bool _isBusyA;
    private bool _isBusyB;

    /// <summary>
    /// UI按钮A：请求炮塔A发射。
    /// 
    /// 关键：仅触发根事件。
    /// 链图自动编排所有5个下游步骤。
    /// </summary>
    public void RequestLaunchA()
    {
        if (sequenceStartEvent == null) return;

        Debug.Log("<color=cyan>[Raiser] Requesting Launch Protocol A...</color>");
        _isBusyA = true;

        // 构建数据载荷
        DamageInfo info = new DamageInfo(500f, true, DamageType.Physical, 
                                        hitTarget.position, "Commander");
        
        // 魔法时刻：单次 .Raise() 启动整个5步链
        // 图表自动执行：
        // 1. 系统检查（带条件）
        // 2. 充能（带1秒延迟）
        // 3. 开火（立即）
        // 4. 冷却（带等待完成）
        // 5. 归档（带阻止参数）
        sequenceStartEvent.Raise(turretA, info);
    }

    /// <summary>
    /// UI按钮B：请求炮塔B发射。
    /// 相同逻辑，不同炮塔。
    /// </summary>
    public void RequestLaunchB()
    {
        if (sequenceStartEvent == null) return;

        Debug.Log("<color=orange>[Raiser] Requesting Launch Protocol B...</color>");
        _isBusyB = true;

        DamageInfo info = new DamageInfo(200f, false, DamageType.Physical, 
                                        hitTarget.position, "Commander");
        sequenceStartEvent.Raise(turretB, info);
    }

    // 序列完成或失败时由接收器调用的解锁方法
    public void UnlockTurretA() => _isBusyA = false;
    public void UnlockTurretB() => _isBusyB = false;
}
```

**要点：**
- 🎯 **单一事件引用** - 仅知道根事件
- 📡 **零管道知识** - 不知道5个步骤
- 🔓 **解锁回调** - 接收器发出完成/失败信号
- 🎬 **最大解耦** - 所有序列逻辑在图表中

---

### 📥 ChainEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using System.Collections;

public class ChainEventReceiver : MonoBehaviour
{
    [Header("Simulation Settings")]
    [Tooltip("如果为TRUE，通过检查。如果为FALSE，链在步骤1中断。")]
    public bool isSafetyLockDisengaged = true;

    /// <summary>
    /// 由'1_SystemCheck'节点条件访问的属性。
    /// 
    /// 图表配置：场景对象 → 属性 → IsSafetyCheckPassed
    /// 
    /// 关键：这在节点动作执行之前评估。
    /// 如果返回false，链立即终止。
    /// </summary>
    public bool IsSafetyCheckPassed
    {
        get
        {
            bool result = true;

            if (!isSafetyLockDisengaged)
            {
                // 失败路径：安全锁已启用
                result = false;
                
                Debug.LogWarning(
                    "<color=red>[Chain Blocked] Safety Check Failed. " +
                    "Sequence stopped immediately.</color>");
                
                // 失败的视觉反馈
                StopCoroutine(nameof(ScreenRoutine));
                if (screenGroup) StartCoroutine(ScreenRoutine());
            }

            return result;
        }
    }

    /// <summary>
    /// 切换安全锁状态。将此绑定到UI按钮。
    /// </summary>
    public void ToggleSafetyLock()
    {
        if (UIClip) _audioSource.PlayOneShot(UIClip);
        
        isSafetyLockDisengaged = !isSafetyLockDisengaged;
        
        // 更新UI
        string text = isSafetyLockDisengaged ? "SAFELOCK READY" : "SAFELOCK ACTIVED";
        if (holoText) holoText.text = text;

        Debug.Log($"[Chain Settings] Safety Lock Disengaged: {isSafetyLockDisengaged}");
    }

    /// <summary>
    /// [链步骤1] 系统检查
    /// 绑定到'1_SystemCheck'链节点。
    /// 
    /// 注意：此动作在条件通过后运行。
    /// 如果条件失败，此方法永不执行。
    /// </summary>
    public void OnSystemCheck(GameObject sender, DamageInfo args)
    {
        bool isA = sender != null && sender.name.Contains("Turret_A");
        
        // 如果到达这里，条件通过
        // 但我们仍处理潜在的边缘情况
        if (!IsSafetyCheckPassed)
        {
            // 由于序列失败解锁炮塔
            if (isA) chainEventRaiser.UnlockTurretA();
            else chainEventRaiser.UnlockTurretB();
        }

        Debug.Log($"[Chain Step 1] {sender.name} Checking...");
    }

    /// <summary>
    /// [链步骤2] 充能
    /// 绑定到带有1.0秒延迟的'2_Charge'链节点。
    /// 
    /// 图表在调用此方法之前暂停1秒。
    /// 当此执行时，1.0秒已经过去。
    /// </summary>
    public void OnStartCharging(GameObject sender, DamageInfo args)
    {
        if (chargeVFX)
        {
            var vfx = Instantiate(chargeVFX, sender.transform.position + Vector3.up * 1.5f, 
                                 Quaternion.identity);
            vfx.transform.SetParent(sender.transform);
            vfx.Play();
            Destroy(vfx.gameObject, 1.2f);
        }

        Debug.Log($"[Chain Step 2] {sender.name} Charging...");
    }

    /// <summary>
    /// [链步骤3] 开火
    /// 绑定到'3_Fire'链节点。
    /// 
    /// 生成抛射物并向目标发射。
    /// 在步骤2完成后立即执行。
    /// </summary>
    public void OnFireWeapon(GameObject sender, DamageInfo args)
    {
        // 生成枪口闪光
        if (fireVFX)
        {
            Vector3 spawnPos = sender.transform.position + 
                             sender.transform.forward * 1.5f + Vector3.up * 1.5f;
            var vfx = Instantiate(fireVFX, spawnPos, sender.transform.rotation);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 发射抛射物
        if (projectilePrefab != null)
        {
            var muzzlePos = sender.transform.Find("Head/Barrel/MuzzlePoint");
            var shell = Instantiate(projectilePrefab, muzzlePos.position, 
                                   sender.transform.rotation);

            shell.Initialize(args.hitPoint, 20f, () =>
            {
                // 撞击回调
                if (hitClip) _audioSource.PlayOneShot(hitClip);
                
                // 生成撞击特效、浮动文本、应用物理...
                ParticleSystem vfxToPlay = args.isCritical ? hitCritVFX : hitNormalVFX;
                
                if (args.isCritical)
                    StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
                
                // ...（特效、物理、文本逻辑）...
            });
        }

        Debug.Log($"[Chain Step 3] {sender.name} FIRED payload: {args.amount}");
    }

    /// <summary>
    /// [链步骤4] 冷却
    /// 绑定到带有WaitForCompletion的'4_CoolDown'链节点。
    /// 
    /// 图表等待此协程完成后再进入步骤5。
    /// 与延迟（固定时间）不同，这等待实际任务完成。
    /// </summary>
    public void OnCoolDown(GameObject sender, DamageInfo args)
    {
        if (steamVFX)
        {
            var vfx = Instantiate(steamVFX, sender.transform.position + Vector3.up, 
                                 Quaternion.Euler(-90, 0, 0));
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        Debug.Log($"[Chain Step 4] {sender.name} Cooldowning.");
    }

    /// <summary>
    /// [链步骤5] 归档
    /// 绑定到PassArgument = FALSE的'5_Archive'链节点。
    /// 
    /// 关键：即使前面的步骤传递了完整的DamageInfo，
    /// 此节点由于图表配置接收默认/NULL值。
    /// 
    /// 演示数据防火墙——可以在链末端清理敏感数据。
    /// </summary>
    public void OnSequenceArchived(GameObject sender, DamageInfo args)
    {
        bool isA = sender != null && sender.name.Contains("Turret_A");

        // 解锁炮塔以供下次使用
        if (isA) chainEventRaiser.UnlockTurretA();
        else chainEventRaiser.UnlockTurretB();

        // 检查数据是否成功阻止
        bool isClean = (args == null || args.amount == 0);
        string logMsg = isClean ? "<color=cyan>CLEAN</color>" : "<color=red>LEAKED</color>";

        Debug.Log($"[Chain Step 5] Archived. Data Status: {logMsg}");
    }

    private IEnumerator ScreenRoutine()
    {
        // 红色警报叠加层闪烁动画
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
                screenGroup.alpha = alpha * 0.8f;
                yield return null;
            }

            screenGroup.alpha = 0f;
            yield return new WaitForSeconds(0.1f);
        }
    }
}
```

**要点：**
- 🎯 **5个独立方法** - 每个处理一个管道阶段
- ✅ **条件属性** - `IsSafetyCheckPassed` 由图表评估
- ⏱️ **时序无关** - 方法不知道延迟
- 🔒 **数据防火墙** - 步骤5接收清理的数据
- 🎬 **完成回调** - 成功/失败时解锁炮塔

---

## 🔑 核心要点

| 概念                | 实现                             |
| ------------------- | -------------------------------- |
| 🔗 **顺序执行**      | 节点按严格顺序一个接一个执行     |
| ✅ **验证门**        | 条件节点在失败时终止链           |
| ⏱️ **延迟节点**      | 步骤之间的固定时间暂停           |
| 🕐 **等待节点**      | 异步完成等待（非固定时间）       |
| 🔒 **数据过滤**      | PassArgument按节点控制数据流     |
| 🛑 **早期终止**      | 失败的条件停止整个链             |
| 🎯 **全有或全无**    | 链完全完成或提前终止             |

:::note 🎓 设计洞察

链式事件非常适合：

- **过场动画** - 镜头1 → 镜头2 → 镜头3精确顺序
- **武器序列** - 充能 → 开火 → 冷却 → 重新加载
- **教程步骤** - 必须在步骤N+1之前完成步骤N
- **制作配方** - 顺序添加成分
- **Boss阶段** - 带验证的阶段转换
- **施法** - 引导 → 施放 → 效果 → 恢复

**链式 vs 协程：**
无需编写：
```csharp
IEnumerator LaunchSequence()
{
    if (!SafetyCheck()) yield break;
    Charge();
    yield return new WaitForSeconds(1.0f);
    Fire();
    yield return StartCoroutine(CoolDown());
    Archive();
}
```

使用链式图表，其中：
- 时序是**可见的**和设计师可**编辑的**
- 条件是**可视检查点**，而非隐藏的 `if` 语句
- 异步等待是**可配置的**，而非硬编码
- 整个管道可通过图表可视化进行**调试**

:::

:::warning ⚠️ 链式陷阱

1. **阻塞行为：** 如果步骤3有bug且永不完成，步骤4-5永不运行
2. **条件时序：** 条件在节点动作之前评估——不能使用动作的副作用
3. **无并行分支：** 无法同时执行步骤2A和步骤2B（使用触发器）
4. **延迟叠加：** 多个延迟累加——3个节点各1秒 = 总共3秒等待
5. **早期退出清理：** 始终在条件失败路径中解锁资源

:::

---

## 🎯 下一步

您已经掌握了顺序链式执行。示例系列继续探索更高级的模式。

**下一章**：继续探索**[12 多数据库](./12-multi-database.md)**中的高级示例

---

## 📚 相关文档

- **[流程图编辑器](../flow-graph/game-event-node-editor.md)** - 编辑节点流程图
- **[节点与连接器](../flow-graph/game-event-node-connector.md)** - 理解图表的可视化语言
- **[节点行为](../flow-graph/game-event-node-behavior.md)** - 节点配置和条件
- **[高级逻辑模式](../flow-graph/advanced-logic-patterns.md)** - 系统如何执行触发器与链式
- **[编程流程](../scripting/programmatic-flow.md)** - 如何通过FlowGraph API实现流程控制
- **[最佳实践](../scripting/best-practices.md)** - 复杂系统的架构模式