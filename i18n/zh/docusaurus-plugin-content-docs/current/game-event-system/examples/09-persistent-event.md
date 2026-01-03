---
sidebar_label: '09 持久化事件'
sidebar_position: 10
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 09 持久化事件：在场景加载中存活

<!-- <VideoGif src="/video/game-event-system/09-persistent-event.mp4" /> -->

## 📋 概述

在Unity中，当您加载新场景时，前一个场景中的所有游戏对象（及其事件监听器）都会被销毁。**持久化事件**通过将监听器绑定存储在在场景转换中存活的全局管理器中来解决此问题——对于音乐控制器、库存管理器或成就跟踪器等全局系统至关重要。

:::tip 💡 您将学到
- Unity中的场景转换清理问题
- 如何通过单个复选框启用事件持久化
- 持久化和非持久化事件行为的区别
- 跨场景事件系统的架构模式

:::

---

## 🎬 示例场景
```
Assets/TinyGiants/GameEventSystem/Demo/09_PersistentEvent/09_PersistentEvent_1.unity
```

### 场景构成

**视觉元素：**
- 🔴 **Turret_A（左侧）** - 红色炮塔，灰色底座
  - 由**持久化**事件 `OnTurretA` 控制
  - 具有旋转头部机制
  - 场景重新加载后将继续工作
  
- 🔵 **Turret_B（右侧）** - 蓝色炮塔，灰色底座
  - 由**非持久化**事件 `OnTurretB` 控制
  - 与炮塔A功能相同
  - 场景重新加载后将停止工作

- 🎯 **TargetDummy** - 中央胶囊目标
  - 两个炮塔都瞄准并射击此目标
  - 具有刚体用于击退物理效果

- 📋 **HoloDisplay** - 信息面板
  - 显示关于实验的解释文本
  - 显示持久化状态信息

**UI层（Canvas）：**
- 🎮 **三个按钮** - 屏幕底部
  - "Fire A"（白色）→ 触发 `PersistentEventRaiser.FireTurretA()`
  - "Fire B"（白色）→ 触发 `PersistentEventRaiser.FireTurretB()`
  - "Load Scene 2"（绿色）→ 重新加载场景以测试持久化

**游戏逻辑层（示例脚本）：**
- 📤 **PersistentEventRaiser** - 标准的基于场景的触发器
  - 持有对两个事件的引用
  - 场景重新加载时被销毁并重新创建
  
- 📥 **PersistentEventReceiver** - **DontDestroyOnLoad** 单例
  - 在场景转换中存活
  - 持有两个炮塔的战斗逻辑
  - 使用**依赖注入**模式处理场景引用

- 🔧 **Scene Setup** - 依赖注入辅助器
  - 在场景加载时运行
  - 将新炮塔引用重新注入持久化接收器
  - 使持久化接收器能够控制新场景对象

---

## 🎮 如何交互

### 持久化实验

此示例证明持久化事件在场景加载中维持其绑定，而非持久化事件会被清除。

---

### 步骤1：进入播放模式

在Unity中按下**播放**按钮。

**初始状态：**
- 场景中两个炮塔（红色和蓝色）处于空闲状态
- HoloDisplay显示解释文本
- 控制台清空

---

### 步骤2：初始功能测试

**点击"Fire A"：**
- 🎯 红色炮塔（左侧）向目标旋转
- 🚀 发射抛射物并飞行
- 💥 撞击时：
  - 橙色浮动文本"CRIT! -500"
  - 大型爆炸特效
  - 相机震动
  - 目标被击退
- 📝 控制台：`[Raiser] Broadcasting Command: Fire Turret A`
- 📝 控制台：`[Receiver] Received Command A. Engaging...`

**点击"Fire B"：**
- 🎯 蓝色炮塔（右侧）向目标旋转
- 🚀 发射抛射物
- 💥 撞击时：
  - 白色浮动文本"-200"
  - 普通爆炸特效
  - 无相机震动（较弱攻击）
  - 目标被击退
- 📝 控制台：`[Raiser] Broadcasting Command: Fire Turret B`
- 📝 控制台：`[Receiver] Received Command B. Engaging...`

**结果：** ✅ 两个炮塔在初始场景中都完美工作。

---

### 步骤3：场景重新加载（清除）

**点击"Load Scene 2"：**

**幕后发生的事：**
1. 🔄 调用Unity的 `SceneManager.LoadScene()`
2. 💀 **场景销毁阶段：**
   - 所有场景游戏对象被销毁：
     - ❌ Turret_A 销毁
     - ❌ Turret_B 销毁
     - ❌ TargetDummy 销毁
     - ❌ PersistentEventRaiser 销毁
   - 🗑️ GameEventManager清理**非持久化**事件监听器
     - `OnTurretB` 监听器被清除
     - `OnTurretA` 监听器**保留**（持久化标志）

3. 🏗️ **场景重建阶段：**
   - 新的Turret_A生成
   - 新的Turret_B生成
   - 新的TargetDummy生成
   - 新的PersistentEventRaiser生成

4. ✨ **持久化对象：**
   - ✅ `PersistentEventReceiver` **存活**（DontDestroyOnLoad）
   - ✅ 它对 `OnTurretA` 的方法绑定**仍然活跃**

5. 🔧 **依赖注入：**
   - `PersistentEventSceneSetup.Start()` 运行
   - 调用 `PersistentEventReceiver.UpdateSceneReferences()`
   - 将新场景炮塔引用注入持久化接收器

**视觉变化：**
- 场景在重新加载期间短暂变黑
- 炮塔在相同位置重生
- UI按钮保持功能

---

### 步骤4：重新加载后存活测试

**点击"Fire A"（重新加载后）：**

**发生的事情：**
1. 🎯 红色炮塔旋转并开火（完美工作！）
2. 💥 完整战斗序列播放
3. 📝 控制台：`[Receiver] Received Command A. Engaging...`

**为什么有效：**
```
按钮 → fireAEvent.Raise() 
     → GameEventManager找到持久化绑定
     → PersistentEventReceiver.OnFireCommandA() 执行
     → 使用新注入的炮塔引用
     → 炮塔开火
```

**结果：** ✅ **持久化事件在场景重新加载中存活！**

---

**点击"Fire B"（重新加载后）：**

**发生的事情：**
1. 🔇 **无反应**
2. 📝 控制台：`[Raiser] Broadcasting Command: Fire Turret B`
3. ❌ 无接收器日志
4. 蓝色炮塔不移动也不开火

**为什么失败：**
```
🔘 输入：按钮点击
│
🚀 事件：fireBEvent.Raise()
│
🔍 注册表：[ GameEventManager 查找 ]
│   
├─❓ 结果：未找到
│  └─ 🗑️ 原因：绑定在场景重新加载时被清除
│
🌑 结果：信号消散
│  └─ 👻 结果："迷失在虚空中"（未调用接收器）
│
📊 状态：执行了0个动作 | ✅ 系统安全（无空引用）
```

**结果：** ❌ **非持久化事件绑定被销毁！**

:::danger 🔴 死亡事件

`OnTurretB` 监听器在场景卸载时被清除。事件资产仍然存在，但它与 `PersistentEventReceiver.OnFireCommandB()` 的连接**永久断开**（除非您通过代码手动重新订阅）。

:::

---

## 🏗️ 场景架构

### 场景转换问题

在标准Unity事件系统中：
```
🖼️ 场景A：已加载
   └─ 🔗 监听器：已订阅（本地上下文）
│
🚚 [ 加载场景B... ]
│
🧹 清理：内存清除
   └─ ❌ 结果：所有监听器从注册表中清除
│
🖼️ 场景B：激活
   └─ 🌑 状态：事件"空"（无接收器）
```

这会破坏需要跨场景持久化的全局系统。

### 持久化事件解决方案
```
🖼️ 场景A：已加载
   └─ 🛡️ 监听器：已订阅（全局上下文）
│
🚚 [ 加载场景B... ]
│
💎 保留：交接成功
   └─ ✅ 结果：绑定存储在全局持久化注册表中
│
🖼️ 场景B：激活
   └─ 🔥 状态：事件"热"（监听器保持就绪）
```

持久化事件的行为类似于事件逻辑的 `DontDestroyOnLoad`。

---

### 架构模式：依赖注入

此示例使用复杂的模式来处理场景引用：

**挑战：**
- `PersistentEventReceiver` 存活（DontDestroyOnLoad）
- 但炮塔在每次场景加载时被销毁并重新创建
- 接收器需要对新炮塔实例的引用

**解决方案：**
1. **持久化接收器** 持有战斗逻辑
2. **场景设置脚本** 在每次场景加载时运行
3. 设置将新场景引用注入持久化接收器
4. 接收器现在可以控制新炮塔
```
🛡️ 持久化层（"存活者"）
┃  └─ 💎 PersistentEventReceiver [场景加载中存活]
┃        ▲
┃        ║ 💉 依赖注入（引用重新绑定）
┃        ╚══════════════════════════════════════╗
┃                                               ║
🖼️ 场景层（"上下文"）                            ║
┃  └─ ⚙️ PersistentEventSceneSetup [重新创建]   ║
┃        │                                      ║
┃        └── 🔍 查找并传递引用 ➔ ═══════════════╝
┃              │
┃              ├── 🤖 新的Turret_A [场景实例]
┃              └── 🤖 新的Turret_B [场景实例]
```

---

### 事件定义

![游戏事件编辑器](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

| 事件名称    | 类型               | 持久化标志 |
| ----------- | ------------------ | ---------- |
| `OnTurretA` | `GameEvent`（void） | ✅ 已选中  |
| `OnTurretB` | `GameEvent`（void） | ❌ 未选中  |

**相同事件，不同命运：**
两者都是具有相同配置的void事件——除了一个决定其存活的复选框。

---

### 行为配置

#### 持久化事件（OnTurretA）

点击 `OnTurretA` 的**(void)**图标打开行为窗口：

![持久化行为](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

**关键设置：**
- 💾 **持久化事件：** ✅ **已选中**

**警告消息：**
> "事件将像DontDestroyOnLoad一样行为。"

**这意味着什么：**
- 监听器绑定存储在全局持久化管理器中
- 场景转换期间不会被清除
- 存活直到显式移除或游戏退出
- 对于跨场景系统至关重要

---

#### 非持久化事件（OnTurretB）

相同配置，除了：
- 💾 **持久化事件：** ❌ **未选中**

**结果：**
- 标准Unity生命周期
- 场景卸载时监听器被清除
- 如果在新场景中需要，必须重新订阅

---

### 发送器设置（PersistentEventRaiser）

选择**PersistentEventRaiser**游戏对象：

![PersistentEventRaiser检查器](/img/game-event-system/examples/09-persistent-event/demo-09-inspector.png)

**游戏事件：**
- `Fire A Event`：`OnTurretA`（持久化）
  - 提示："在编辑器中选中了'持久化事件'"
- `Fire B Event`：`OnTurretB`（非持久化）
  - 提示："在编辑器中未选中'持久化事件'"

**生命周期：**
- ❌ 场景重新加载时销毁
- ✅ 随新场景重新创建
- 持有新事件引用（资产是持久化的ScriptableObjects）

---

### 接收器设置（PersistentEventReceiver）

选择**PersistentEventReceiver**游戏对象：

![PersistentEventReceiver检查器](/img/game-event-system/examples/09-persistent-event/demo-09-receiver.png)

**战斗资源：**
- `Projectile Prefab`：Projectile（炮塔抛射物）
- `Fire VFX`：MuzzleFlashVFX（粒子系统）

**反馈：**
- `Hit Normal VFX`：HitVFX_Normal（粒子系统）
- `Hit Crit VFX`：HitVFX_Crit（粒子系统）
- `Floating Text Prefab`：DamageFloatingText（Text Mesh Pro）
- `Hit Clip`：ExplosionSFX（音频剪辑）

**动态引用（隐藏）：**
这些在运行时由场景设置注入：
- `turretA`、`headA`（炮塔A引用）
- `turretB`、`headB`（炮塔B引用）
- `targetDummy`、`targetRigidbody`（目标引用）

---

### 场景设置配置

选择**Scene Setup**游戏对象：

![场景设置检查器](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

**当前场景对象：**
- `Turret A`：Turret_A（游戏对象）
- `Head A`：Head（Transform）- 旋转枢轴
- `Turret B`：Turret_B（游戏对象）
- `Head B`：Head（Transform）
- `Target Dummy`：TargetDummy（Transform）
- `Target Rigidbody`：TargetDummy（Rigidbody）

**目的：**
在 `Start()` 时，此脚本查找持久化接收器并注入这些引用，使其能够控制新场景对象。

---

## 💻 代码详解

### 📤 PersistentEventRaiser.cs（发送器）
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PersistentEventRaiser : MonoBehaviour
{
	[Header("Game Events")]
	[Tooltip("配置：在编辑器中选中了'持久化事件'。")]
	[GameEventDropdown] public GameEvent fireAEvent;
	
	[Tooltip("配置：在编辑器中未选中'持久化事件'。")]
	[GameEventDropdown] public GameEvent fireBEvent;

	/// <summary>
	/// UI按钮：命令炮塔A开火。
	/// 
	/// 由于'fireAEvent'是持久化的，此绑定在场景加载中存活。
	/// 即使重新加载后，持久化接收器仍将响应。
	/// </summary>
	public void FireTurretA()
	{
		if (fireAEvent == null) return;
		
		fireAEvent.Raise();
		Debug.Log("<color=cyan>[Raiser] Broadcasting Command: Fire Turret A</color>");
	}

	/// <summary>
	/// UI按钮：命令炮塔B开火。
	/// 
	/// 由于'fireBEvent'不是持久化的，此绑定在场景加载后中断。
	/// 事件被触发，但没有人再监听。
	/// </summary>
	public void FireTurretB()
	{
		if (fireBEvent == null) return;
		
		fireBEvent.Raise();
		Debug.Log("<color=orange>[Raiser] Broadcasting Command: Fire Turret B</color>");
	}
}
```

**要点：**
- 🎯 **标准组件** - 非持久化，每个场景重新创建
- 📡 **事件引用** - ScriptableObject资产（持久化）
- 🔇 **无生命周期意识** - 不知道监听器是否存活

---

### 📥 PersistentEventReceiver.cs（监听器 - 单例）
```csharp
using UnityEngine;
using System.Collections;

public class PersistentEventReceiver : MonoBehaviour
{
	[Header("Combat Resources")]
	[SerializeField] private TurretProjectile projectilePrefab;
	[SerializeField] private ParticleSystem fireVFX;
	// ... 其他资源 ...

	// 运行时注入的场景引用
	[HideInInspector] public GameObject turretA;
	[HideInInspector] public Transform headA;
	[HideInInspector] public GameObject turretB;
	[HideInInspector] public Transform headB;
	[HideInInspector] public Transform targetDummy;
	[HideInInspector] public Rigidbody targetRigidbody;

	private bool _isFiringA;
	private bool _isFiringB;

	// 持久化的单例模式
	private static PersistentEventReceiver _instance;
	public static PersistentEventReceiver Instance => _instance;

	private void Awake()
	{
		// 关键：DontDestroyOnLoad使其在场景转换中存活
		if (_instance == null)
		{
			_instance = this;
			DontDestroyOnLoad(gameObject);
			Debug.Log("[PersistentReceiver] Initialized with DontDestroyOnLoad.");
		}
		else if (_instance != this)
		{
			// 如果场景重新加载，防止重复
			Destroy(gameObject);
		}
	}

	private void Update()
	{
		// 使用注入的引用控制炮塔
		HandleTurretRotation(turretA, headA, ref _isFiringA);
		HandleTurretRotation(turretB, headB, ref _isFiringB);
	}

	/// <summary>
	/// [事件回调 - 持久化绑定]
	/// 绑定到选中持久化事件标志的'OnTurretA'。
	/// 
	/// 此方法绑定在场景重新加载中存活。
	/// 重新加载后，当fireAEvent.Raise()执行时仍会调用此方法。
	/// </summary>
	public void OnFireCommandA()
	{
		Debug.Log("<color=cyan>[Receiver] Received Command A. Engaging...</color>");
		_isFiringA = true;
	}

	/// <summary>
	/// [事件回调 - 非持久化绑定]
	/// 绑定到未选中持久化事件标志的'OnTurretB'。
	/// 
	/// 此方法绑定在场景重新加载时被清除。
	/// 重新加载后，此方法将永远不会再被调用（绑定丢失）。
	/// </summary>
	public void OnFireCommandB()
	{
		Debug.Log("<color=orange>[Receiver] Received Command B. Engaging...</color>");
		_isFiringB = true;
	}
	
	/// <summary>
	/// 在每次场景加载时由PersistentEventSceneSetup调用。
	/// 将新场景对象引用注入持久化接收器。
	/// </summary>
	public void UpdateSceneReferences(
		GameObject tA, Transform hA, 
		GameObject tB, Transform hB, 
		Transform target, Rigidbody rb)
	{
		this.turretA = tA;
		this.headA = hA;
		this.turretB = tB;
		this.headB = hB;
		this.targetDummy = target;
		this.targetRigidbody = rb;
		
		Debug.Log("[PersistentReceiver] Scene references updated.");
	}

	private void HandleTurretRotation(GameObject turret, Transform head, ref bool isFiring)
	{
		if (head == null || targetDummy == null) return;

		// 空闲摆动或主动瞄准
		Quaternion targetRot;
		float speed = isFiring ? 10f : 2f;

		if (isFiring)
		{
			// 瞄准目标
			Vector3 dir = targetDummy.position - head.position;
			dir.y = 0;
			if (dir != Vector3.zero) 
				targetRot = Quaternion.LookRotation(dir);
			else 
				targetRot = head.rotation;
		}
		else
		{
			// 空闲巡逻扫描
			float angle = Mathf.Sin(Time.time * 0.5f) * 30f;
			targetRot = Quaternion.Euler(0, 180 + angle, 0);
		}

		head.rotation = Quaternion.Slerp(head.rotation, targetRot, speed * Time.deltaTime);

		// 瞄准时开火
		if (isFiring && Quaternion.Angle(head.rotation, targetRot) < 5f)
		{
			PerformFireSequence(turret);
			isFiring = false;
		}
	}

	private void PerformFireSequence(GameObject turret)
	{
		// 生成枪口闪光、发射抛射物等
		// ...（战斗逻辑）...
	}
}
```

**要点：**
- 🎯 **DontDestroyOnLoad** - 在场景转换中存活
- 🔀 **单例模式** - 全局仅存在一个实例
- 📍 **依赖注入** - 场景引用在运行时注入
- 🎭 **双重绑定** - 持久化（A）和非持久化（B）方法

---

### 🔧 PersistentEventSceneSetup.cs（依赖注入器）
```csharp
using UnityEngine;

public class PersistentEventSceneSetup : MonoBehaviour
{
	[Header("Current Scene Objects")]
	public GameObject turretA;
	public Transform headA;
	public GameObject turretB;
	public Transform headB;
	public Transform targetDummy;
	public Rigidbody targetRigidbody;

	private void Start()
	{
		// 查找持久化接收器（存在于DontDestroyOnLoad场景中）
		var receiver = PersistentEventReceiver.Instance;
		
		if (receiver != null)
		{
			// 注入此场景的对象引用
			receiver.UpdateSceneReferences(
				turretA, headA, 
				turretB, headB, 
				targetDummy, targetRigidbody
			);
			
			Debug.Log("[SceneSetup] Successfully injected scene references " +
					 "into persistent receiver.");
		}
		else
		{
			Debug.LogWarning("[SceneSetup] PersistentEventReceiver not found! " +
							"Is the demo started correctly?");
		}
	}
}
```

**要点：**
- 🔧 **场景加载时运行** - 场景初始化时执行 `Start()`
- 🔍 **查找单例** - 通过静态实例访问持久化接收器
- 💉 **注入引用** - 将新场景对象传递给持久化逻辑
- 🏗️ **启用跨场景控制** - 连接持久化逻辑与临时对象

---

## 🔑 核心要点

| 概念                  | 实现                                     |
| --------------------- | ---------------------------------------- |
| 💾 **持久化事件**      | 行为窗口中的复选框在场景间保留绑定       |
| 🗑️ **清理行为**       | 非持久化事件在场景卸载时被清除           |
| 🔄 **DontDestroyOnLoad** | 接收器必须存活才能使持久化事件工作    |
| 💉 **依赖注入**        | 连接持久化逻辑与场景对象的模式           |
| 🎯 **单个复选框**      | 一个设置决定跨场景存活                   |

:::note 🎓 设计洞察

持久化事件非常适合：

- **音乐系统** - 跨越多个关卡的背景音乐控制器
- **库存管理器** - 玩家库存在场景转换中持久化
- **成就跟踪器** - 监控所有场景的全局成就监听器
- **分析系统** - 永不中断的事件日志
- **UI系统** - 用于生命值、分数等的持久化HUD控制器

**架构模式：**
```
[持久化层 - DontDestroyOnLoad]
- 全局管理器
- 事件接收器
- 跨场景逻辑

[场景层 - 重新创建]
- 关卡特定对象
- 场景设置脚本（依赖注入）
- UI按钮和触发器
```

这种分离实现了干净的跨场景架构，无需手动重新订阅。

:::

:::warning ⚠️ 重要注意事项

1. **接收器必须是持久化的：** 选中"持久化事件"只保留绑定。接收器游戏对象必须使用 `DontDestroyOnLoad` 来存活。
2. **场景引用中断：** 即使绑定持久化，对已销毁场景对象的引用也会变为null。使用依赖注入来更新它们。
3. **内存管理：** 持久化事件在游戏退出前保持活跃。在长时间运行的游戏中要注意累积的绑定。
4. **初始场景要求：** 持久化接收器必须存在于首个加载的场景中。如果没有接收器的场景B首先加载，持久化事件将无法工作。

:::

---

## 🎯 下一步

您已经掌握了用于跨场景系统的持久化事件。现在让我们探索用于基于碰撞交互的**触发器事件**。

**下一章**：在**[10 触发器事件](./10-trigger-event.md)**中学习碰撞触发器

---

## 📚 相关文档

- **[游戏事件行为](../visual-workflow/game-event-behavior.md)** - 持久化配置完整指南
- **[最佳实践](../scripting/best-practices.md)** - 跨场景事件架构的模式