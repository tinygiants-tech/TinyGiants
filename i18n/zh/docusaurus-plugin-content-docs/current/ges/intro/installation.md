---
sidebar_label: '安装'
sidebar_position: 3
---

import Tabs from '@theme/Tabs';

import TabItem from '@theme/TabItem';

import VideoGif from '@site/src/components/Video/VideoGif';



# 安装

欢迎加入！设置 **游戏事件系统** 是一个精简的过程，旨在让您在不到5秒内启动并运行。

 <VideoGif src="/video/game-event-system/installation.mp4" />

 :::tip 

上面的视频展示了从导入到初始化的整个过程。有关每个步骤的详细分解，请参阅下面的指南。

::: 

------

## ✅ 前置要求

在安装之前，请确保您的项目满足最低要求：

| 要求 | 最低版本 | 推荐 |
| :-------------------- | :---------------- | :---------------------- |
| **Unity版本** | **2021.3 LTS** | **2022.3 LTS** 或更新版本 |
| **脚本后端** | Mono或IL2CPP | IL2CPP（用于生产环境） |
| **API兼容性** | .NET Standard 2.1 | .NET Standard 2.1 |

---

## 步骤1: 导入包

根据您获取插件的方式，选择适当的导入方法：

<Tabs>
  <TabItem value="store" label="通过包管理器" default>

  1.  打开Unity并前往 **Window > Package Manager**。
  2.  从下拉菜单中选择 **"My Assets"**。
  3.  搜索 **"Game Event System"**。
  4.  点击 **Download**，然后点击 **Import**。
  5.  当文件列表出现时，确保选中 **所有文件** 并点击 **Import**。

  </TabItem>
  <TabItem value="custom" label="通过.unitypackage">

  1.  在您的计算机上找到 `.unitypackage` 文件。
  2.  将文件直接 **拖放** 到Unity的 **Project View** 中。
  3.  （或前往 **Assets > Import Package > Custom Package...**）
  4.  当文件列表出现时，确保选中 **所有文件** 并点击 **Import**。

  </TabItem>
</Tabs>

:::info 编译时间
导入后，Unity将触发重新编译。这是正常的。在继续之前，请等待加载条完成。
:::

---

## 步骤2: 打开系统仪表板

导入完成后，通过Unity工具栏访问主控制中心：
```text
Tools > TinyGiants > Game Event System
```

:::tip 自动打开

首次导入将自动打开GameEventSystem窗口

:::

### 🔍 自动环境检查

打开时，**系统信息** 面板（位于仪表板底部）将自动扫描您的项目环境。

![alt text](/img/game-event-system/intro/installation/install-step-2-sysinfo.png)

它实时验证关键兼容性指标：

- **Unity版本**: 验证您是否使用受支持的版本（2021.3+显示绿色勾选）。
- **渲染管线**: 自动检测 **Built-in**、**URP** 或 **HDRP**。插件与这三者都兼容。
- **脚本后端**: 显示您是运行在 **Mono** 还是 **IL2CPP** 上。

:::tip 智能检测
您无需手动配置任何内容。如果您在此面板中看到绿色勾选，您的环境就已准备就绪。
:::

------

## 步骤3: 初始化系统

当您首次打开窗口时，系统会检测到您的场景缺少所需的管理器。

### 1. "未初始化"状态

您将在仪表板顶部看到一个警告横幅：

> ⚠️ **请先初始化系统。**

*（操作按钮将显示为 **深蓝色**）*

![alt text](/img/game-event-system/intro/installation/install-step-3-uninitialized.png)

### 2. 一键设置

点击 **"Initialize Event System"** 按钮。

系统执行以下自动化任务：

1. 在您的场景中创建一个 **Game Event Manager** GameObject（单例）。
2. 生成默认的 **GameEventDatabase** 资产（如果缺失）。
3. 生成默认的 **FlowContainer** 资产（如果缺失）。
4. 编译必要的C#泛型类型。

### 3. 成功！

按钮将变为 **绿色**，状态文本将显示 **"System Ready"**。

![alt text](/img/game-event-system/intro/installation/install-step-3-success.png)

---

## 步骤4: 验证层级和组件

为确保一切正常工作，请查看您的 **Scene Hierarchy**。您应该看到一个新的GameObject：

> **🔹 Game Event Manager**

![alt text](/img/game-event-system/intro/installation/install-step-4-managers.png)

### 组件堆栈

选择此对象。在Inspector中，您将看到它已预配置了一套管理器组件。每个组件都是基于单例的管理器，负责事件生命周期的特定部分。

![alt text](/img/game-event-system/intro/installation/install-step-4-manager.png)

| 组件 | 职责 | 核心功能 |
| :----------------------------- | :------------------- | :----------------------------------------------------------- |
| **GameEventManager** | 👑 **核心大脑** | 管理数据库加载、事件查找和静态状态重置。这是唯一强制性的组件 |
| **GameEventPersistentManager** | **持久化** | 管理标记为"持久化"的事件，这些事件必须通过 `DontDestroyOnLoad` 在场景转换中存活 |
| **GameEventFlowManager** | **可视化脚本** | 流程图的执行引擎。它协调触发器和链之间的逻辑 |
| **GameEventSchedulerManager** | **时间逻辑** | 处理基于时间的操作，如 `RaiseDelayed` 和 `RaiseRepeating` |
| **GameEventTriggerManager** | **扇出逻辑** | 管理"触发器"节点。当一个事件触发时，它可以同时触发多个目标事件（并行） |
| **GameEventChainManager** | **顺序逻辑** | 管理"链"节点。按顺序执行一系列事件，支持等待时间和条件中断（串行） |

:::warning 模块化与安全性
此架构是模块化的。从技术上讲，您**可以删除**特定的管理器（例如，如果您不使用流程图，您可以移除Flow、Trigger和Chain管理器）以最小化场景占用。

但是，我**强烈建议保留完整的堆栈**。这些组件：
1. 在空闲时**零开销**（无Update循环）。
2. 是**可视化工作流**正常运行所必需的。
3. 如果您以后决定使用延迟触发或流程图，可以防止"缺少组件"运行时错误。

:::

------

## 🏁 准备就绪！

您的系统现在已完全初始化并可用于生产。

### 接下来去哪里？

- **🎮 创建您的第一个事件**: 跳转到 **[游戏事件创建器](../visual-workflow/game-event-creator.md)** 指南。
- **👀 查看工作示例**: 打开 **[00 快速开始](../examples/00-quick-start.md)** 示例场景。
- **📚 理解工具**: 阅读 **[游戏事件系统](../visual-workflow/game-event-system.md)**。