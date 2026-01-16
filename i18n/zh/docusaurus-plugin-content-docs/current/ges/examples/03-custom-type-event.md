---
sidebar_label: '03 自定义类型事件'
sidebar_position: 4
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 03 自定义类型事件：自动代码生成

<VideoGif src="/video/game-event-system/example/03-custom-type-event.mp4" />

## 📋 概述

在真实游戏中，传递单个`float`表示伤害通常是不够的。您经常需要打包数据：*谁攻击的？是暴击吗？什么伤害类型？击中哪里？*此演示展示了如何为**自定义C#类**创建事件，并利用**自动代码生成**系统来维护类型安全。

:::tip 💡 您将学到
- 如何使用自定义数据类创建事件
- 系统如何为您的类型自动生成`GameEvent<T>`
- 如何通过事件传递复杂的数据结构
- 一个事件有效载荷如何驱动多个反馈系统

:::

---

## 🎬 演示场景
```
Assets/TinyGiants/GameEventSystem/Demo/03_CustomTypeEvent/03_CustomTypeEvent.unity
```

### 场景组成

**UI层（Canvas）：**
- 🎮 **三个攻击按钮** - 位于屏幕底部
  - "Raise (Physical Damage)" → 触发`CustomEventRaiser.DealPhysicalDamage()`
  - "Raise (Fire Damage)" → 触发`CustomEventRaiser.DealFireDamage()`
  - "Raise (Critical Strike)" → 触发`CustomEventRaiser.DealCriticalStrike()`

**游戏逻辑层（演示脚本）：**
- 📤 **CustomTypeEventRaiser** - 带有触发器脚本的GameObject
  - 持有对3个事件的引用：物理、火焰和暴击攻击的`DamageInfoGameEvent`
  - 构造具有不同属性的`DamageInfo`对象并触发相应的事件

- 📥 **CustomTypeEventReceiver** - 带有接收器脚本的GameObject
  - 通过游戏事件编辑器中的可视化绑定监听所有3个伤害事件
  - 解析`DamageInfo`有效载荷以触发适当的视觉和物理反馈

**视觉反馈层（演示对象）：**
- 🎯 **胶囊体** - 伤害目标（假人）
  - 具有用于物理击退的Rigidbody
  - 具有用于颜色闪烁效果的Renderer
- 🔥 **粒子效果** - 在撞击点生成的火焰击中VFX
- 💬 **漂浮文本** - 在胶囊体上方显示的伤害数字
- 🏠 **平面** - 场景上下文的地面表面

---

## 🎮 如何交互

### 步骤1：进入播放模式

按Unity中的**播放**按钮。

### 步骤2：测试不同的攻击类型

**点击"Raise (Physical Damage)"：**
- ⚪ 胶囊体上的白色闪烁
- 💬 漂浮文本显示白色的"10"
- 🎯 应用小击退力
- 📝 控制台日志：`[Combat Log] Dealt 10 (Physical) damage. Crit: False, Attacker: Player01`

**点击"Raise (Fire Damage)"：**
- 🟠 胶囊体上的橙色闪烁
- 💬 漂浮文本显示橙色的随机伤害（15-25）
- 🔥 火焰粒子效果在击中点生成
- 🎯 应用标准击退力
- 📝 控制台记录攻击者"Player02"的火焰伤害详情

**点击"Raise (Critical Strike)"：**
- 🟣 胶囊体上的紫色闪烁
- 💬 更大的漂浮文本显示高伤害（50-80），带有"!"后缀
- 📹 **相机震动效果**以产生戏剧性冲击
- 🎯 应用**强击退力**
- 📝 控制台记录攻击者"Player03"的暴击详情

---

## 🏗️ 场景架构

### 自定义数据结构

`DamageInfo`类将所有战斗相关数据打包到一个单一数据包中：
```csharp
[Serializable]
public class DamageInfo
{
    public int amount;          // 伤害值
    public bool isCritical;     // 暴击标志
    public DamageType type;     // 物理、火焰或虚空
    public Vector3 hitPoint;    // VFX生成的撞击位置
    public string attacker;     // 伤害来源的名称
}
```

**为什么打包数据？**
- ✅ 一次事件调用传递所有必要信息
- ✅ 更易于扩展（添加新属性而无需更改事件签名）
- ✅ 类型安全的序列化和验证
- ✅ 发送者和接收者之间的清晰数据契约

---

### 事件定义

打开**游戏事件编辑器**窗口以查看3个伤害事件：

![Game Event Editor](/img/game-event-system/examples/03-custom-type-event/demo-03-editor.png)

**数据库中的事件：**

| 事件名称 | 类型 | 目的 |
| ------------------ | ----------------------- | ------------------------- |
| `OnPhysicalDamage` | `DamageInfoGameEvent` | 标准物理攻击 |
| `OnFireDamage` | `DamageInfoGameEvent` | 基于火焰的魔法伤害 |
| `OnCriticalStrike` | `DamageInfoGameEvent` | 高冲击力暴击 |

**注意行为列：**
所有三个事件都显示**(DamageInfo)**作为类型指示器。这些`DamageInfoGameEvent`类是在您创建事件时由插件**自动生成**的——无需手动编码！

:::note 🔧 代码生成

当您在游戏事件创建器中使用自定义类型创建事件时，插件会自动：

1. 生成`YourTypeGameEvent`类
2. 创建相应的监听器接口
3. 确保Inspector下拉菜单和方法绑定中的类型安全

:::

---

### 发送者设置（CustomTypeEventRaiser）

在层级视图中选择**CustomTypeEventRaiser** GameObject：

![CustomTypeEventRaiser Inspector](/img/game-event-system/examples/03-custom-type-event/demo-03-inspector.png)

**配置详情：**

**GameEvent部分：**
- `Physical Damage Event` → `OnPhysicalDamage`
- `Fire Damage Event` → `OnFireDamage`
- `Critical Strike Event` → `OnCriticalStrike`

**设置部分：**
- `Hit Target` → 胶囊体（Transform）- 用于计算随机击中点

**类型安全实践：**
- 下拉菜单仅显示`DamageInfoGameEvent`资产
- 您不能将`StringGameEvent`或`Vector3GameEvent`分配给这些槽
- 这防止运行时类型不匹配错误

---

### 接收者设置（CustomTypeEventReceiver）

在层级视图中选择**CustomTypeEventReceiver** GameObject：

![CustomTypeEventReceiver Inspector](/img/game-event-system/examples/03-custom-type-event/demo-03-receiver.png)

**引用配置：**
- `Floating Text Prefab` → DamageFloatingText（GameObject）
- `Hit Particle Prefab` → FireHitVFX（ParticleSystem）
- `Target Renderer` → 胶囊体（Mesh Renderer）
- `Target Rigidbody` → 胶囊体（Rigidbody）

**行为绑定：**

所有三个伤害事件都通过**行为窗口**绑定到相同的接收器方法：

| 事件 | 绑定方法 | 签名 |
| ------------------ | ------------------ | ------------------------ |
| `OnPhysicalDamage` | `OnDamageReceived` | `void (DamageInfo info)` |
| `OnFireDamage` | `OnDamageReceived` | `void (DamageInfo info)` |
| `OnCriticalStrike` | `OnDamageReceived` | `void (DamageInfo info)` |

**智能路由：**
单个接收器方法根据`DamageInfo`属性智能地路由反馈——检查`type`以显示火焰粒子，检查`isCritical`以显示相机震动等。

---

## 💻 代码分解

### 📤 CustomTypeEventRaiser.cs（发送者）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class CustomEventRaiser : MonoBehaviour
{
    [Header("GameEvent")]
    // 注意：DamageInfoGameEvent由插件自动生成
    [GameEventDropdown] public DamageInfoGameEvent physicalDamageEvent;
    [GameEventDropdown] public DamageInfoGameEvent fireDamageEvent;
    [GameEventDropdown] public DamageInfoGameEvent criticalStrikeEvent;

    [Header("Settings")]
    public Transform hitTarget;

    /// <summary>
    /// 模拟来自"Player01"的标准物理攻击。
    /// 发送具有物理类型的固定伤害。
    /// </summary>
    public void DealPhysicalDamage()
    {
        SendDamage(physicalDamageEvent, 10f, false, DamageType.Physical, "Player01");
    }

    /// <summary>
    /// 模拟来自"Player02"的火焰法术。
    /// 演示随机伤害生成（15-25）。
    /// </summary>
    public void DealFireDamage()
    {
        float dmg = Random.Range(15f, 25f);
        SendDamage(fireDamageEvent, dmg, false, DamageType.Fire, "Player02");
    }

    /// <summary>
    /// 模拟来自"Player03"的暴击。
    /// 设置isCritical标志以触发特殊效果（相机震动、更大文本）。
    /// </summary>
    public void DealCriticalStrike()
    {
        float dmg = Random.Range(50f, 80f);
        SendDamage(criticalStrikeEvent, dmg, true, DamageType.Void, "Player03");
    }

    /// <summary>
    /// 构造DamageInfo数据包并触发事件。
    /// </summary>
    private void SendDamage(DamageInfoGameEvent gameEvent, float baseDamage, 
                           bool isCrit, DamageType type, string attacker)
    {
        if (gameEvent == null) return;
        
        // 计算随机击中点以模拟撞击变化
        Vector3 randomPoint = hitTarget != null 
            ? hitTarget.position + Random.insideUnitSphere * 0.5f 
            : Vector3.zero;
        
        // 构造数据包
        DamageInfo info = new DamageInfo(
            Mathf.RoundToInt(baseDamage), 
            isCrit, 
            type, 
            randomPoint, 
            attacker
        );

        // 用复杂对象触发事件
        gameEvent.Raise(info);
        
        Debug.Log($"[Combat Log] 造成了 {info.amount} ({info.type}) 伤害。" +
                  $"暴击：{info.isCritical}，攻击者：{info.attacker}");
    }
}
```

**关键点：**
- 🎯 **自定义类型支持** - `DamageInfoGameEvent`处理复杂对象
- 🏗️ **数据构造** - 使用所有相关属性构建数据包
- 📦 **单次调用** - `.Raise(info)`传递整个数据结构
- 🔇 **解耦** - 不知道将触发什么视觉效果

---

### 📥 CustomTypeEventReceiver.cs（监听器）
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class CustomTypeEventReceiver : MonoBehaviour
{
    [Header("Reference")]
    [SerializeField] private GameObject floatingTextPrefab;
    [SerializeField] private ParticleSystem hitParticlePrefab;
    [SerializeField] private Renderer targetRenderer;
    [SerializeField] private Rigidbody targetRigidbody;

    private Camera _mainCamera;

    /// <summary>
    /// DamageInfoGameEvent的监听器方法。
    /// 解析复杂数据以触发多个反馈系统。
    /// </summary>
    public void OnDamageReceived(DamageInfo info)
    {
        // 1. 视觉：基于伤害类型的颜色闪烁
        Color effectColor = GetColorByType(info.type);
        StartCoroutine(FlashColorRoutine(effectColor));

        // 2. UI：漂浮伤害文本
        if (floatingTextPrefab != null)
        {
            ShowFloatingText(info, effectColor);
        }
        
        // 3. VFX：火焰伤害的火焰粒子
        if (info.type == DamageType.Fire && hitParticlePrefab != null)
        {
            Vector3 centerToHitDir = (info.hitPoint - transform.position).normalized;
            Vector3 spawnPos = info.hitPoint + (centerToHitDir * 0.2f);
            
            var vfxInstance = Instantiate(hitParticlePrefab, spawnPos, 
                                         Quaternion.LookRotation(centerToHitDir));
            var main = vfxInstance.main;
            main.startColor = effectColor;
            vfxInstance.Play();
            Destroy(vfxInstance.gameObject, 2.0f);
        }

        // 4. 物理：击退力（暴击更强）
        if (targetRigidbody != null)
        {
            Vector3 forceDir = (info.hitPoint - transform.position).normalized * -1f;
            float forceStrength = info.isCritical ? 5f : 2f;
            targetRigidbody.AddForce(forceDir * forceStrength + Vector3.up * 2f, 
                                    ForceMode.Impulse);
            targetRigidbody.AddTorque(Random.insideUnitSphere * forceStrength, 
                                     ForceMode.Impulse);
        }
        
        // 5. 相机：暴击的屏幕震动
        if (info.isCritical)
        {
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
        }
    }
    
    private void ShowFloatingText(DamageInfo info, Color color)
    {
        GameObject go = Instantiate(floatingTextPrefab, info.hitPoint + Vector3.up, 
                                   Quaternion.identity);
        var tmp = go.GetComponent<TextMeshPro>();
        
        if (tmp != null)
        {
            // 暴击获得"!"后缀和更大的字体
            tmp.text = info.isCritical ? $"{info.amount}!" : info.amount.ToString();
            tmp.color = color;
            tmp.fontSize = info.isCritical ? 10 : 6;
        }
        
        if (Camera.main) 
            go.transform.rotation = Camera.main.transform.rotation;

        StartCoroutine(AnimateText(go.transform));
    }

    private IEnumerator FlashColorRoutine(Color color)
    {
        if (targetRenderer != null)
        {
            Color original = targetRenderer.material.color;
            targetRenderer.material.color = color * 1.5f;
            yield return new WaitForSeconds(0.1f);
            targetRenderer.material.color = original;
        }
    }

    private IEnumerator ShakeCameraRoutine(float duration, float magnitude)
    {
        if (_mainCamera == null) yield break;
        
        Vector3 originalPos = _mainCamera.transform.position;
        float elapsed = 0.0f;
        
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

    private Color GetColorByType(DamageType type)
    {
        switch (type)
        {
            case DamageType.Physical: return Color.white;
            case DamageType.Fire: return new Color(1f, 0.5f, 0f);
            case DamageType.Void: return new Color(0.8f, 0f, 1f);
            default: return Color.grey;
        }
    }
}
```

**关键点：**
- 🎯 **基于属性的路由** - 检查`info.type`和`info.isCritical`来决定操作
- 🎨 **多个反馈系统** - 颜色闪烁、漂浮文本、VFX、物理、相机震动
- 📍 **空间数据使用** - `info.hitPoint`确定VFX生成位置
- 🔇 **解耦** - 不知道哪个按钮或触发器触发了事件

---

## 🔑 关键要点

| 概念 | 实现 |
| --------------------- | ------------------------------------------------------------ |
| 🎯 **自定义类型** | `YourClassGameEvent`支持任何可序列化的C#类 |
| 🏭 **自动生成** | 插件自动生成事件类——无需手动编码 |
| 📦 **数据打包** | 一次调用传递具有多个属性的复杂对象 |
| 🔀 **智能路由** | 单个接收器方法可以根据数据处理不同的逻辑路径 |
| 🎨 **丰富反馈** | 一个事件有效载荷驱动多个协调系统 |

:::note 🎓 设计洞察

自定义类型事件非常适合复杂的游戏系统，如战斗、对话或库存。您不需要触发5个单独的事件（`OnDamage`、`OnDamageType`、`OnCritical`等），而是触发**一个包含所有数据的事件**，保持事件系统的清晰和高效！

:::

---

## 🎯 下一步？

您已经掌握了自定义数据类型。现在让我们探索如何**添加自定义发送者信息**来跟踪事件来源。

**下一章**：在**[04 自定义Sender事件](./04-custom-sender-event.md)**中学习发送者跟踪

---

## 📚 相关文档

- **[游戏事件创建器](../visual-workflow/game-event-creator.md)** - 如何使用自定义类型创建事件
- **[代码生成](../tools/codegen-and-cleanup.md)** - 理解自动代码生成系统
- **[API参考](../scripting/api-reference.md)** - 自定义类型的泛型事件API