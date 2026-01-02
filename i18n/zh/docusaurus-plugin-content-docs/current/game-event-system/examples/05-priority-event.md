---
sidebar_label: '05 优先级事件'
sidebar_position: 6
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 05 优先级事件：执行顺序很重要

<!-- <VideoGif src="/video/game-event-system/05-priority-event.mp4" /> -->

## 📋 概述

在游戏逻辑中，**顺序很重要**。当多个动作响应单个事件时，它们的执行顺序可以显著改变结果。此演示展示了可视化编辑器配置——无需任何代码更改——如何将弱攻击转变为毁灭性的暴击。

:::tip 💡 您将学到
- 为什么执行顺序影响游戏玩法逻辑
- 如何在行为窗口中配置监听器优先级
- "增益-然后-攻击"模式的实际应用
- 如何调试顺序依赖的逻辑问题

:::

---

## 🎬 演示场景
```
Assets/TinyGiants/GameEventSystem/Demo/05_PriorityEvent/05_PriorityEvent.unity
```

### 场景组成

**UI层（Canvas）：**
- 🎮 **两个攻击按钮** - 位于屏幕底部
  - "Raise (Chaotic Hit)" → 触发`PriorityEventRaiser.FireChaoticSequence()`（错误顺序）
  - "Raise (Ordered Hit)" → 触发`PriorityEventRaiser.FireOrderedSequence()`（正确顺序）

**游戏逻辑层（演示脚本）：**
- 📤 **PriorityEventRaiser** - 带有触发器脚本的GameObject
  - 管理炮塔瞄准和抛射物发射
  - 持有对两个事件的引用：`OnChaoticHit`和`OnOrderedHit`
  - 两个事件都使用相同的`GameEvent<GameObject, DamageInfo>`类型

- 📥 **PriorityEventReceiver** - 带有接收器脚本的GameObject
  - 有两个监听器方法绑定到每个事件：
    - **ActivateBuff** - 启用暴击伤害模式
    - **ResolveHit** - 根据当前增益状态计算伤害
  - 这些方法的顺序决定了战斗结果

**视觉反馈层（演示对象）：**
- 🎯 **SentryTurret** - 攻击者
  - 增益时从灰色变为**金色**
  - 激活时生成粒子光环效果
- 🎯 **TargetDummy** - 受害者胶囊体
  - 具有用于击退物理的Rigidbody
- 💥 **VFX系统** - 普通vs暴击的不同效果
  - 普通：小烟雾
  - 暴击：大爆炸 + 相机震动
- 🏠 **平面** - 地面表面

---

## 🎮 如何交互

### 实验设置

两个按钮发射相同的物理抛射物，但触发具有**不同监听器顺序配置**的不同事件。

### 步骤1：进入播放模式

按Unity中的**播放**按钮。

### 步骤2：测试错误顺序（混乱击中）

**点击"Raise (Chaotic Hit)"（左按钮）：**

**发生了什么：**
1. 🎯 炮塔瞄准并发射抛射物
2. 💥 抛射物击中目标
3. 🔴 **问题：** 首先计算伤害（ResolveHit执行）
   - 结果：`-10`弱伤害（灰色文本）
   - 效果：小烟雾VFX
4. ✨ 其次激活增益（ActivateBuff执行）
   - 炮塔变为金色并带有粒子光环
   - **太晚了！**伤害已经计算完成

**控制台输出：**
```
[Receiver] (B) RESOLVE: 未检测到增益。弱攻击。（检查优先级顺序！）
[Receiver] (A) 增益已激活！系统功率达到300%。
```

**结果：** ❌ 普通攻击，因为计算伤害时增益未激活

---

### 步骤3：测试正确顺序（有序击中）

**点击"Raise (Ordered Hit)"（右按钮）：**

**发生了什么：**
1. 🎯 炮塔瞄准并发射抛射物
2. 💥 抛射物击中目标
3. ✨ **正确：** 首先激活增益（ActivateBuff执行）
   - 炮塔变为金色并带有粒子光环
   - 内部`_isBuffActive`标志设置为`true`
4. 🔴 其次计算伤害（ResolveHit执行）
   - 检查增益标志：**激活！**
   - 结果：`CRIT! -50`（橙色文本，5倍伤害倍数）
   - 效果：大爆炸VFX + 相机震动

**控制台输出：**
```
[Receiver] (A) 增益已激活！系统功率达到300%。
[Receiver] (B) RESOLVE: 检测到增益！严重爆炸。
```

**结果：** ✅ 暴击，因为计算伤害时增益已激活

---

## 🏗️ 场景架构

### "增益-然后-攻击"问题

这是游戏开发中的常见模式：
```
⚡ 事件触发：OnHit
│
├─ 🥇 第1个动作：[优先级 10]
│  └─ 🛡️ ActivateBuff() ➔ 设置 `_isBuffActive = true` 🟢
│
└─ 🥈 第2个动作：[优先级 5]
   └─ ⚔️ ResolveHit()  ➔ If (_isBuffActive) ? 💥 暴击 : 🛡️ 普通
│
🎯 结果：暴击（逻辑用更新的状态解决）
```

**挑战：**
如果`ResolveHit`在`ActivateBuff`之前运行，标志尚未设置，即使增益"附加"到同一事件，也会导致普通伤害！

---

### 事件定义

两个事件使用相同的类型，但具有不同的行为配置：

![Game Event Editor](/img/game-event-system/examples/05-priority-event/demo-05-editor.png)

| 事件名称 | 类型 | 监听器顺序 |
| -------------- | ----------------------------------- | ------------------------------------- |
| `OnChaoticHit` | `GameEvent<GameObject, DamageInfo>` | ❌ ResolveHit → ActivateBuff（错误） |
| `OnOrderedHit` | `GameEvent<GameObject, DamageInfo>` | ✅ ActivateBuff → ResolveHit（正确） |

:::note 🔧 相同类型，不同顺序

两个事件都是`GameEvent<GameObject, DamageInfo>`。唯一的区别是在[行为窗口](../visual-workflow/game-event-behavior.md)中配置的**监听器执行顺序**。

:::

---

### 行为配置比较

关键区别在于**行为窗口**配置。

#### ❌ 错误顺序（OnChaoticHit）

![Chaotic Behavior](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

**执行序列：**
1. `ResolveHit`（顶部位置 - 首先执行）
2. `ActivateBuff`（底部位置 - 其次执行）

**结果：** 应用增益前计算伤害 = 普通攻击

#### ✅ 正确顺序（OnOrderedHit）

![Ordered Behavior](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

**执行序列：**
1. `ActivateBuff`（顶部位置 - 首先执行）
2. `ResolveHit`（底部位置 - 其次执行）

**结果：** 计算伤害前应用增益 = 暴击

:::tip 🎯 拖放重新排序

您可以通过**拖动句柄**（`≡`）在行为窗口中每个监听器的左侧来更改执行顺序。这是一种可视化的、无代码的方式来修改游戏玩法逻辑！

:::

---

### 发送者设置（PriorityEventRaiser）

在层级视图中选择**PriorityEventRaiser** GameObject：

![PriorityEventRaiser Inspector](/img/game-event-system/examples/05-priority-event/demo-05-inspector.png)

**事件频道：**
- `Ordered Hit Event`: `OnOrderedHit`（配置正确）
  - 工具提示："应用增益 → 然后发射"
- `Chaotic Hit Event`: `OnChaoticHit`（配置错误）
  - 工具提示："发射 → 然后应用增益（太晚了！）"

**设置：**
- `Turret Head`: SentryTurret/Head（用于瞄准的Transform）
- `Turret Muzzle Position`: Head/MuzzlePoint（抛射物生成）
- `Projectile Prefab`: 抛射物视觉效果
- `Muzzle Flash VFX`: 用于发射的粒子系统
- `Hit Target`: TargetDummy（Transform）

---

### 接收者设置（PriorityEventReceiver）

在层级视图中选择**PriorityEventReceiver** GameObject：

![PriorityEventReceiver Inspector](/img/game-event-system/examples/05-priority-event/demo-05-receiver.png)

**视觉配置：**
- `Turret Root`: SentryTurret（Transform）
- `Turret Renderers`: 1个渲染器的数组（炮塔主体）
- `Normal Mat`: 灰色材质（默认状态）
- `Buffed Mat`: 金色材质（增益状态）
- `Buff Aura Prefab`: 用于增益可视化的青色粒子效果

**VFX配置：**
- `Hit Normal VFX`: 小烟雾粒子系统
- `Hit Crit VFX`: 大爆炸粒子系统
- `Floating Text Prefab`: 伤害数字显示

**目标引用：**
- `Hit Target`: TargetDummy（Transform）
- `Target Rigidbody`: TargetDummy（用于击退的Rigidbody）

---

## 💻 代码分解

### 📤 PriorityEventRaiser.cs（发送者）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PriorityEventRaiser : MonoBehaviour
{
    [Header("事件频道")]
    [Tooltip("在编辑器中配置：应用增益 -> 然后发射。")]
    [GameEventDropdown] public GameEvent<GameObject, DamageInfo> orderedHitEvent;

    [Tooltip("在编辑器中配置：发射 -> 然后应用增益（太晚了！）。")]
    [GameEventDropdown] public GameEvent<GameObject, DamageInfo> chaoticHitEvent;

    private GameEvent<GameObject, DamageInfo> _pendingEvent;

    /// <summary>
    /// 按钮A：启动触发"有序"事件的攻击序列。
    /// </summary>
    public void FireOrderedSequence()
    {
        if (orderedHitEvent == null) return;
        _pendingEvent = orderedHitEvent;
        _isAttacking = true;
        Debug.Log("[Sender] 启动有序攻击序列...");
    }

    /// <summary>
    /// 按钮B：启动触发"混乱"事件的攻击序列。
    /// </summary>
    public void FireChaoticSequence()
    {
        if (chaoticHitEvent == null) return;
        _pendingEvent = chaoticHitEvent;
        _isAttacking = true;
        Debug.Log("[Sender] 启动混乱攻击序列...");
    }

    private void FireProjectile()
    {
        // ... 抛射物创建逻辑 ...
        
        shell.Initialize(hitTarget.position, 15f, () => 
        {
            DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, 
                                            hitTarget.position, "哨兵炮塔");
            
            // 触发排队的任何事件（有序或混乱）
            if(_pendingEvent != null) 
                _pendingEvent.Raise(this.gameObject, info);
            
            Debug.Log($"[Sender] 撞击！事件'{_pendingEvent?.name}'已触发。");
        });
    }
}
```

**关键点：**
- 🎯 **相同的发送者代码** - 两个事件使用相同的触发逻辑
- 📦 **事件选择** - `_pendingEvent`决定触发哪个事件
- 🔇 **顺序无关** - 发送者不知道监听器顺序

---

### 📥 PriorityEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using System.Collections;

public class PriorityEventReceiver : MonoBehaviour
{
    [SerializeField] private Renderer[] turretRenderers;
    [SerializeField] private Material buffedMat;
    [SerializeField] private ParticleSystem buffAuraPrefab;
    
    private bool _isBuffActive; // 关键状态标志

    /// <summary>
    /// [监听器方法A]
    /// 激活增益状态和视觉效果。
    /// 
    /// 优先级影响：
    /// - 如果配置在ResolveHit之上：增益在伤害计算之前应用 → 暴击
    /// - 如果配置在ResolveHit之下：增益在伤害计算之后应用 → 普通攻击
    /// </summary>
    public void ActivateBuff(GameObject sender, DamageInfo args)
    {
        _isBuffActive = true; // <-- 关键状态变化
        
        // 视觉反馈：金色材质 + 粒子光环
        foreach (var r in turretRenderers) 
            if(r) r.material = buffedMat;

        if (buffAuraPrefab != null)
        {
            _activeBuffEffect = Instantiate(buffAuraPrefab, turretRoot.position, 
                                           Quaternion.identity);
            _activeBuffEffect.transform.SetParent(turretRoot);
            _activeBuffEffect.Play();
        }

        Debug.Log("<color=cyan>[Receiver] (A) 增益已激活！" +
                  "系统功率达到300%。</color>");
    }
    
    /// <summary>
    /// [监听器方法B]
    /// 根据当前增益状态计算伤害并生成VFX。
    /// 
    /// 逻辑：在执行的确切时刻检查_isBuffActive。
    /// 为了正确的行为，ActivateBuff必须在此方法之前执行。
    /// </summary>
    public void ResolveHit(GameObject sender, DamageInfo args)
    {
        float finalDamage = args.amount;
        bool isCrit = false;
        ParticleSystem vfxToPlay;

        // 在此确切时刻检查标志
        if (_isBuffActive)
        {
            // 暴击路径
            finalDamage *= 5f; // 5倍伤害倍数
            isCrit = true;
            vfxToPlay = hitCritVFX;
            
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
            Debug.Log("<color=green>[Receiver] (B) RESOLVE: 检测到增益！" +
                      "严重爆炸。</color>");
        }
        else
        {
            // 普通路径
            vfxToPlay = hitNormalVFX;
            Debug.Log("<color=red>[Receiver] (B) RESOLVE: 未检测到增益。" +
                      "弱攻击。（检查优先级顺序！）</color>");
        }

        // 生成适当的VFX
        if (vfxToPlay != null)
        {
            var vfx = Instantiate(vfxToPlay, args.hitPoint, Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 应用物理和UI反馈
        ApplyPhysicsKnockback(args, isCrit);
        ShowFloatingText(finalDamage, isCrit, hitTarget.position);
        
        StartCoroutine(ResetRoutine());
    }
    
    private IEnumerator ResetRoutine()
    {
        yield return new WaitForSeconds(1.5f);
        _isBuffActive = false; // 为下一次攻击重置
        // ... 重置视觉效果 ...
    }
}
```

**关键点：**
- 🎯 **状态依赖** - `ResolveHit`行为完全取决于`_isBuffActive`标志
- ⏱️ **时间关键** - 标志必须在伤害计算之前设置
- 🔀 **顺序依赖逻辑** - 相同的代码，根据执行顺序产生不同的结果
- 🎨 **视觉反馈** - 每条路径的不同VFX、文本大小和效果

---

## 🔑 关键要点

| 概念 | 实现 |
| -------------------------- | ------------------------------------------------------------ |
| 🎯 **执行顺序** | 监听器顺序直接影响游戏玩法逻辑 |
| 🎨 **可视化配置** | 在行为窗口中拖放——无需代码更改 |
| 🔀 **状态管理** | 当监听器修改共享状态时，顺序很重要 |
| 🐛 **调试模式** | 控制台日志帮助识别与顺序相关的错误 |
| 🔄 **游戏玩法设计** | 启用/禁用顺序控制连击系统、增益堆叠等 |

:::note 🎓 设计洞察

执行顺序对以下情况至关重要：

- **增益系统** - 在计算效果之前应用修饰符
- **连击链** - 在触发下一个动作之前验证条件
- **护盾机制** - 在应用伤害之前检查吸收
- **触发序列** - 在执行依赖逻辑之前确保满足先决条件

始终测试两种顺序以确保您的逻辑按预期工作！

:::

---

## 🎯 下一步？

您已经掌握了执行顺序。现在让我们探索**条件事件触发**以使事件更智能。

**下一章**：在**[06 条件事件](./06-conditional-event.md)**中学习条件逻辑

---

## 📚 相关文档

- **[游戏事件行为](../visual-workflow/game-event-behavior.md)** - 监听器配置的详细指南
- **[最佳实践](../scripting/best-practices.md)** - 顺序依赖逻辑的模式
- **[监听策略](../scripting/listening-strategies.md)** - 高级回调模式