---
sidebar_label: '04 自定义Sender事件'
sidebar_position: 5
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 04 自定义Sender事件：上下文感知事件

<VideoGif src="/video/game-event-system/example/04-custom-sender-event.mp4" />

## 📋 概述

在之前的演示中，事件携带数据但是匿名的。在复杂游戏中，**上下文很重要**。此演示介绍了**Sender感知事件**（`GameEvent<TSender, TArgs>`），允许接收者知道**谁**触发了事件，实现上下文敏感逻辑，如"面向攻击者"或"显示攻击者配置文件"。

:::tip 💡 您将学到
- 如何使用发送者信息创建双泛型事件
- GameObject发送者和纯C#类发送者之间的区别
- 接收者如何使用发送者上下文进行空间和逻辑反应
- 何时使用sender感知事件vs简单事件

:::

---

## 🎬 演示场景
```
Assets/TinyGiants/GameEventSystem/Demo/04_CustomSenderTypeEvent/04_CustomSenderTypeEvent.unity
```

### 场景组成

**UI层（Canvas）：**
- 🎮 **三个攻击按钮** - 位于屏幕底部
  - "Raise (Turret Damage)" → 触发`CustomSenderTypeEventRaiser.RaiseTurretDamage()`
  - "Raise (Turret2 Damage)" → 触发`CustomSenderTypeEventRaiser.RaiseTurret2Damage()`
  - "Raise (System Damage)" → 触发`CustomSenderTypeEventRaiser.RaiseSystemDamage()`

**游戏逻辑层（演示脚本）：**
- 📤 **CustomSenderTypeEventRaiser** - 带有触发器脚本的GameObject
  - 使用`GameObjectDamageInfoGameEvent`管理两个物理炮塔（红色和蓝色）
  - 使用`PlayerStatsDamageInfoGameEvent`处理系统级攻击
  - 控制炮塔瞄准、抛射物发射和事件触发

- 📥 **CustomSenderTypeEventReceiver** - 带有接收器脚本的GameObject
  - 通过可视化绑定监听炮塔和系统事件
  - 实现sender感知逻辑：旋转面向物理发送者，为逻辑发送者显示配置文件

**视觉反馈层（演示对象）：**
- 🎯 **TargetDummy** - 中心的受害者胶囊体
  - 有一个绿色的"护目镜"指示其面向方向
  - 包含用于击退物理的Rigidbody
  - 通过TextMeshPro在上方显示攻击者名称/信息
- 🔴 **SentryTurret_Red** - 左侧的物理攻击者
  - 由Head（旋转以瞄准）和MuzzlePoint（抛射物生成）组成
- 🔵 **SentryTurret_Blue** - 右侧的物理攻击者
  - 独立的瞄准和发射系统
- 🔥 **抛射物系统** - 带有爆炸效果的可视化抛射物
- 🏠 **平面** - 场景上下文的地面表面

---

## 🎮 如何交互

### 步骤1：进入播放模式

按Unity中的**播放**按钮。

### 步骤2：测试不同的攻击源

**点击"Raise (Turret Damage)"：**
- 🎯 红色炮塔快速瞄准假人
- 🚀 抛射物发射并向目标飞行
- 💥 撞击时：
  - 假人**旋转面向红色炮塔**
  - 信息文本显示："SenderName: SentryTurret_Red"
  - 黄色漂浮文本"15"出现
  - 应用物理击退
- 📝 控制台日志：`[Sender1] Target acquired. Aiming...` → `[Receiver] Ouch! Hit by SentryTurret_Red.`

**点击"Raise (Turret2 Damage)"：**
- 🎯 蓝色炮塔快速瞄准假人
- 🚀 抛射物从右侧发射
- 💥 撞击时：
  - 假人**旋转面向蓝色炮塔**
  - 信息文本显示："SenderName: SentryTurret_Blue"
  - 黄色漂浮文本"15"出现
- 📝 假人清楚地跟踪哪个炮塔攻击了它

**点击"Raise (System Damage)"：**
- 💥 即时伤害（无抛射物）
- 🎯 假人**不旋转**（没有物理发送者可面向）
- 信息文本显示："SenderName: DragonSlayer_99"
  - 这来自`PlayerStats`类，而不是GameObject
- 🟣 品红色漂浮文本"50!"出现
- 📹 相机震动效果（严重伤害）
- 📝 控制台日志：`[Receiver] Logical attack received from DragonSlayer_99. FactionID: 1`

---

## 🏗️ 场景架构

### 两种类型的Sender感知事件

此演示通过两个不同的场景展示了sender系统的灵活性：

#### 场景A：物理Sender（GameObject）
```csharp
GameObjectDamageInfoGameEvent
```

**使用场景：** 当发送者在场景中具有物理存在时
- **Sender类型：** Unity `GameObject`（炮塔）
- **可用上下文：** Transform、位置、旋转、组件
- **接收器逻辑：** 空间反应（看向、移向、绘制轨迹线）

#### 场景B：逻辑Sender（纯C#类）
```csharp
PlayerStatsDamageInfoGameEvent
```

**使用场景：** 当发送者是没有场景表示的数据对象时
- **Sender类型：** 自定义C#类`PlayerStats`
- **可用上下文：** 玩家名称、等级、派系ID、自定义属性
- **接收器逻辑：** 数据驱动反应（显示配置文件、检查派系、应用修饰符）

---

### PlayerStats类

一个纯C#类，演示sender不需要继承自`MonoBehaviour`：
```csharp
[System.Serializable]
public class PlayerStats
{
    public string playerName;
    public int level;
    public int factionId;

    public PlayerStats(string name, int lvl, int faction)
    {
        playerName = name;
        level = lvl;
        factionId = faction;
    }
}
```

**关键点：** 这证明事件系统适用于**任何可序列化类型**，而不仅仅是Unity对象。

---

### 事件定义

打开**游戏事件编辑器**窗口以查看双泛型事件：

![Game Event Editor](/img/game-event-system/examples/04-custom-sender-event/demo-04-editor.png)

**数据库中的事件：**

| 事件名称 | 类型 | 目的 |
| -------------------------- | ------------------------------------ | ---------------------------- |
| `OnGameObjectDamageInfo` | `GameObjectDamageInfoGameEvent` | 红色炮塔物理攻击 |
| `OnGameObjectDamageInfo_1` | `GameObjectDamageInfoGameEvent` | 蓝色炮塔物理攻击 |
| `OnPlayerStatsDamageInfo` | `PlayerStatsDamageInfoGameEvent` | 系统级逻辑伤害 |

**注意行为列：**
- 前两个事件显示**(GameObject,DamageInfo)** - 用于物理发送者
- 第三个事件显示**(PlayerStats,DamageInfo)** - 用于逻辑发送者

这些复杂的泛型类是在创建sender感知事件时由插件**自动生成**的。

:::note 🔧 创建Sender事件

在游戏事件创建器中创建事件时：

1. 将**事件模式**设置为**"With Sender"**
2. **Sender类型**：为物理对象选择`GameObject`或搜索像`PlayerStats`这样的自定义类
3. **参数类型**：选择数据有效载荷类型（例如，`DamageInfo`）
4. 系统自动生成完整的`GameEvent<TSender, TArgs>`类

:::

---

### 发送者设置（CustomSenderTypeEventRaiser）

在层级视图中选择**CustomSenderTypeEventRaiser** GameObject：

![CustomSenderTypeEventRaiser Inspector](/img/game-event-system/examples/04-custom-sender-event/demo-04-inspector.png)

**炮塔配置：**

**炮塔1（红色）：**
- `Name`: "Sender1"
- `Attack Event`: `OnGameObjectDamageInfo`（GameObject sender）
- `Head`: SentryTurret_Red/Head（用于瞄准的Transform）
- `Muzzle Position`: Head/MuzzlePoint（抛射物生成的Transform）

**炮塔2（蓝色）：**
- `Name`: "Sender2"
- `Attack Event`: `OnGameObjectDamageInfo_1`（GameObject sender）
- `Head`: SentryTurret_Blue/Head
- `Muzzle Position`: Head/MuzzlePoint

**全局系统事件：**
- `Global System Event`: `OnPlayerStatsDamageInfo`（PlayerStats sender）

**共享资源：**
- `Hit Target`: TargetDummy（Transform）
- `Projectile Prefab`: 用于视觉效果的抛射物预制体
- `Muzzle Flash VFX`: 用于发射效果的粒子系统

**工作原理：**
1. 按钮点击启动炮塔攻击序列
2. 炮塔旋转向目标（平滑跟踪）
3. 对齐时，抛射物生成并飞行
4. 撞击时，事件被触发，**炮塔GameObject作为sender**和DamageInfo作为数据
5. 对于系统伤害，创建`PlayerStats`实例并用作sender

---

### 接收者设置（CustomSenderTypeEventReceiver）

在层级视图中选择**CustomSenderTypeEventReceiver** GameObject：

![CustomSenderTypeEventReceiver Inspector](/img/game-event-system/examples/04-custom-sender-event/demo-04-receiver.png)

**引用配置：**
- `Floating Text Prefab`: DamageFloatingText（Text Mesh Pro）
- `Target Renderer`: TargetDummy（用于闪烁效果的Mesh Renderer）
- `Target Rigidbody`: TargetDummy（用于物理的Rigidbody）
- `Attacker Info Text`: LogText（用于显示sender名称的Text Mesh Pro）

**行为绑定：**

两个单独的接收器方法处理不同的sender类型：

| 事件 | 绑定方法 | 签名 |
| -------------------------- | ------------------------ | -------------------------------------------- |
| `OnGameObjectDamageInfo` | `OnTurretAttackReceived` | `void (GameObject sender, DamageInfo args)` |
| `OnGameObjectDamageInfo_1` | `OnTurretAttackReceived` | `void (GameObject sender, DamageInfo args)` |
| `OnPlayerStatsDamageInfo` | `OnSystemAttackReceived` | `void (PlayerStats sender, DamageInfo args)` |

**上下文感知逻辑：**
- **物理sender：** 使用`sender.transform.position`进行空间旋转
- **逻辑sender：** 使用`sender.playerName`和`sender.level`进行显示

---

## 💻 代码分解

### 📤 CustomSenderTypeEventRaiser.cs（发送者）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class CustomSenderTypeEventRaiser : MonoBehaviour
{
    [System.Serializable]
    private class TurretConfig
    {
        public string name;
        [GameEventDropdown] public GameObjectDamageInfoGameEvent attackEvent;
        public Transform head;
        public Transform muzzlePosition;
        [HideInInspector] public bool isAttacking;
    }

    [Header("炮塔配置")]
    [SerializeField] private TurretConfig turret1;
    [SerializeField] private TurretConfig turret2;

    [Header("全局系统事件")]
    [GameEventDropdown] public PlayerStatsDamageInfoGameEvent globalSystemEvent;

    private PlayerStats _localPlayerStats;

    private void Start()
    {
        // 创建一个逻辑发送者（没有GameObject表示）
        _localPlayerStats = new PlayerStats("DragonSlayer_99", 99, 1);
    }

    /// <summary>
    /// 由炮塔伤害按钮调用。
    /// 启动攻击序列：瞄准 → 发射 → 击中 → 用GameObject sender触发事件
    /// </summary>
    public void RaiseTurretDamage()
    {
        InitiateAttack(turret1);
    }

    /// <summary>
    /// 由炮塔2伤害按钮调用。
    /// </summary>
    public void RaiseTurret2Damage()
    {
        InitiateAttack(turret2);
    }

    private void InitiateAttack(TurretConfig turret)
    {
        if (turret.attackEvent == null) return;
        
        turret.isAttacking = true;
        Debug.Log($"[{turret.name}] 目标已锁定。瞄准中...");
    }

    private void OnProjectileHit(TurretConfig turret)
    {
        if (turret.attackEvent == null) return;

        Vector3 hitPos = hitTarget.position;
        DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPos, "哨兵炮塔");

        // 关键：将炮塔的GameObject作为sender传递
        GameObject turretRoot = turret.head.parent.gameObject;
        turret.attackEvent.Raise(turretRoot, info);
        
        Debug.Log($"[{turret.name}] 抛射物撞击！事件已触发。");
    }

    /// <summary>
    /// 模拟来自逻辑实体的系统级攻击。
    /// </summary>
    public void RaiseSystemDamage()
    {
        if (globalSystemEvent == null) return;

        Vector3 hitPos = hitTarget != null ? hitTarget.position : Vector3.zero;
        DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPos, "游戏管理员");
        
        // 关键：将PlayerStats实例作为sender传递（不是GameObject）
        globalSystemEvent.Raise(_localPlayerStats, info);
        
        Debug.Log("[游戏管理员] 全局系统伤害事件已触发。");
    }
}
```

**关键点：**
- 🎯 **双泛型语法** - `GameEvent<TSender, TArgs>`需要两个类型参数
- 🏗️ **Sender灵活性** - 可以传递`GameObject`或自定义C#类
- 📦 **`.Raise(sender, data)`** - 两参数方法同时提供上下文和有效载荷
- 🎮 **物理Sender** - 使用实际场景GameObjects提供空间上下文
- 💡 **逻辑Sender** - 使用数据类提供非空间上下文

---

### 📥 CustomSenderTypeEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class CustomSenderTypeEventReceiver : MonoBehaviour
{
    [SerializeField] private TextMeshPro floatingTextPrefab;
    [SerializeField] private Renderer targetRenderer;
    [SerializeField] private Rigidbody targetRigidbody;
    [SerializeField] private TextMeshPro attackerInfoText;

    /// <summary>
    /// 绑定到：GameObjectDamageInfoGameEvent
    /// 处理具有场景存在的物理攻击者。
    /// </summary>
    /// <param name="sender">攻击的GameObject（炮塔）</param>
    /// <param name="args">伤害详情</param>
    public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
    {
        // 使用sender的Transform进行空间逻辑
        if (sender != null)
        {
            // 平滑旋转面向攻击者
            StartCoroutine(SmoothLookAtRoutine(sender.transform.position));
            Debug.Log($"[Receiver] 哎哟！被{sender.name}击中。");
        }

        // 显示sender的GameObject名称
        if (attackerInfoText != null)
        {
            attackerInfoText.text = $"发送者名称：<color=yellow>{sender.name}</color>";
        }

        // 通用反馈：漂浮文本、闪烁、击退
        ProcessCommonFeedback(args, Color.yellow);
    }

    /// <summary>
    /// 绑定到：PlayerStatsDamageInfoGameEvent
    /// 处理没有场景表示的逻辑攻击者。
    /// </summary>
    /// <param name="sender">带有配置文件数据的PlayerStats对象</param>
    /// <param name="args">伤害详情</param>
    public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
    {
        // 使用sender的属性进行数据驱动逻辑
        if (attackerInfoText != null)
        {
            attackerInfoText.text = $"发送者名称：<color=yellow>{sender.playerName}</color>";
        }
        
        Debug.Log($"[Receiver] 来自{sender.playerName}的逻辑攻击。" +
                  $"派系ID：{sender.factionId}");
        
        // 系统伤害使用不同颜色的通用反馈
        ProcessCommonFeedback(args, Color.magenta);
    }
    
    private void ProcessCommonFeedback(DamageInfo args, Color color)
    {
        // 漂浮伤害文本
        if (floatingTextPrefab)
        {
            string text = args.isCritical ? $"{args.amount}!" : args.amount.ToString();
            ShowFloatingText(text, color, args.hitPoint);
        }
        
        // 颜色闪烁
        StartCoroutine(FlashColorRoutine(Color.red));

        // 物理击退（暴击更强）
        ApplyPhysicsKnockback(args);
        
        // 暴击的相机震动
        if (args.isCritical)
        {
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
        }
    }
    
    private IEnumerator SmoothLookAtRoutine(Vector3 targetPos)
    {
        Vector3 direction = targetPos - transform.position;
        direction.y = 0;
        
        if (direction != Vector3.zero)
        {
            Quaternion targetRot = Quaternion.LookRotation(direction);
            float time = 0f;
            Quaternion startRot = transform.rotation;
            
            // 随时间平滑旋转
            while(time < 1f)
            {
                time += Time.deltaTime * 5f;
                transform.rotation = Quaternion.Slerp(startRot, targetRot, time);
                yield return null;
            }
        }
    }
}
```

**关键点：**
- 🎯 **签名匹配** - 每个方法签名必须匹配其事件的泛型类型
- 🧭 **空间逻辑** - `GameObject` sender启用基于位置的反应（旋转、距离检查）
- 📊 **数据逻辑** - `PlayerStats` sender启用基于配置文件的反应（名称显示、派系检查）
- 🔀 **统一反馈** - 通用效果（闪烁、击退）适用于两种sender类型
- 🎨 **上下文特定行为** - 旋转仅对物理sender发生

---

## 🔑 关键要点

| 概念 | 实现 |
| ------------------------- | ------------------------------------------------------------ |
| 🎯 **双泛型事件** | `GameEvent<TSender, TArgs>`同时提供sender上下文和数据有效载荷 |
| 🏗️ **Sender灵活性** | 支持Unity GameObjects和纯C#类 |
| 🧭 **空间上下文** | GameObject sender启用基于位置/旋转的逻辑 |
| 📊 **数据上下文** | 自定义类sender启用基于配置文件/属性的逻辑 |
| 🔀 **统一处理** | 一个接收器可以智能地处理多个sender类型 |

:::note 🎓 设计洞察

当**谁触发了事件**与**发生了什么**同样重要时，sender感知事件是完美的选择。对空间反应（面向、瞄准、距离）使用GameObject sender，对数据驱动逻辑（配置文件、派系、统计）使用自定义类sender。这种模式非常适合战斗系统、AI反应和多人游戏归因！

:::

---

## 🎯 下一步？

您已经掌握了sender感知事件。现在让我们探索如何使用优先级系统**控制事件执行顺序**。

**下一章**：在**[05 优先级事件](./05-priority-event.md)**中学习事件优先级

---

## 📚 相关文档

- **[游戏事件创建器](../visual-workflow/game-event-creator.md)** - 如何创建sender感知事件
- **[触发事件](../scripting/raising-and-scheduling.md)** - `.Raise(sender, args)`的API
- **[监听策略](../scripting/listening-strategies.md)** - 高级回调模式
- **[API参考](../scripting/api-reference.md)** - 完整的双泛型事件API