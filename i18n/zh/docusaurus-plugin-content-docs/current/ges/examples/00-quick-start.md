---
sidebar_label: '00 快速开始'
sidebar_position: 1
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 🚀 快速开始

<VideoGif src="/video/game-event-system/example/00-quick-start.mp4" />

## 📋 概述

这个入门场景引导您完成在项目中激活游戏事件系统所需的**一次性设置**。在探索任何演示之前，您需要初始化核心框架组件。

:::tip 💡 您将学到
- 如何打开**游戏事件系统仪表板**
- 如何一键初始化系统
- 设置期间创建了哪些组件

:::

---

## 🎬 演示场景
```
Assets/TinyGiants/GameEventSystem/Demo/00_QuickStart/00_QuickStart.unity
```

打开此场景以开始初始化过程。

---

## 🤔 为什么要初始化？

游戏事件系统依赖于一个**持久化管理器**（`GameEventManager`）来协调所有事件操作。没有这个管理器，事件无法被触发或监听。

初始化过程自动设置：

| 组件 | 描述 |
| ---------------------- | ------------------------------------------------------------ |
| 🎮 **GameEventManager** | 单例管理器（标记为`DontDestroyOnLoad`） |
| 📚 **事件数据库** | 存储事件定义的默认资产 |
| 🔗 **流程容器** | 用于事件编排的可视化逻辑图 |
| ⚙️ **生成的代码** | 内置事件类型的C#类（`void`、`int`、`float`等） |

---

## 📖 分步设置

### 1️⃣ 打开仪表板

从Unity的顶部菜单导航到：
```
Tools → TinyGiants → Game Event System
```

这将打开**游戏事件系统**窗口——您管理事件、数据库和流程图的中央枢纽。

---

### 2️⃣ 检查系统状态

在窗口中找到**"Initialize System"**部分：

#### 🔵 初始化之前

![System Uninitialized](/img/game-event-system/examples/00-quick-start/uninitialized.png)

- 蓝色按钮**"Initialize Event System"**可见
- ⚠️ 警告："Please initialize the system first"

#### 🟢 初始化之后

![System Initialized](/img/game-event-system/examples/00-quick-start/initialized.png)

- 状态栏变为**绿色**，显示"✓ System Initialized"
- ✅ 确认："Core managers, database and codes are ready"

---

### 3️⃣ 点击初始化

按下**"Initialize Event System"**按钮。插件将自动执行以下操作：

| 操作 | 结果 |
| --------------------- | ------------------------------------------------------------ |
| **创建管理器** | 将`GameEventManager` GameObject添加到场景（持久化） |
| **生成数据库** | 在项目中创建`DefaultEventDatabase.asset` |
| **设置流程图** | 为可视化逻辑创建`DefaultFlowContainer.asset` |
| **编译代码** | 生成类型安全的C#事件类 |

控制台将显示：**🎉 GameEvent initialization complete**

---

## ✅ 验证

初始化完成后，验证设置：

1. **层级检查** 🔍  

   `GameEventManager` GameObject应该出现在根级别

2. **Inspector检查** 👀  
   
   选择管理器以查看分配的数据库和流程容器引用
   
3. **控制台检查** 📝  
   
   查找确认初始化的成功消息

![GameEventManager in Hierarchy](/img/game-event-system/examples/00-quick-start/hierarchy.png)

:::info 🔔 场景级设置

每个场景都需要自己的**GameEventManager**才能运行。管理器确定该场景中哪些**事件数据库**和**流程图**处于活动状态。虽然数据库本身（ScriptableObject资产）是持久化的并且可以跨场景重用，但每个场景必须明确绑定它将使用哪些数据库。

:::

---

## 🎯 下一步？

准备好环境后，您现在可以探索框架的核心功能。

**下一章**：学习如何使用**[01 Void事件](./01-void-event.md)**创建和触发您的第一个事件

:::note 📚 深入了解

有关初始化过程和手动设置选项的技术细节，请参阅**[安装指南](../intro/installation.md)**。

:::