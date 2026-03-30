---
slug: five-minute-quickstart
title: "5 分钟上手：从零搭建你的第一个事件驱动系统"
authors: [tinygiants]
tags: [ges, unity, tutorial, beginner]
description: "一份快速、不废话的指南，帮你在 Unity 项目中跑起来 Game Event System。从安装到第一个可用事件，5 分钟搞定。"
image: /img/home-page/game-event-system-preview.png
---

"我只有 5 分钟，你能直接告诉我怎么让事件系统跑起来吗？"

没问题。不讲理论，不做架构深度分析，不和其他方案做比较。你想从零开始在 Unity 项目里搭建一个能用的事件驱动交互，而且要快。走起。

本指南假设你有一个打开的 Unity 项目（2021.3 LTS 或更新版本）以及大约 5 分钟的时间。读完后，你会有一个在游戏中某件事发生时触发、并在一个完全独立的 GameObject 上引发响应的事件——两者之间零直接引用。

<!-- truncate -->

## 第一步：从 Asset Store 安装 GES（60 秒）

打开 Unity Asset Store 的 Game Event System 页面。点击"Add to My Assets"，然后在 Unity 中打开 Package Manager（Window > Package Manager），在"My Assets"中找到 GES，点击 Import。

导入完成后，你应该能在项目中看到一个 `TinyGiants` 文件夹。如果出现编译错误，请确认你在用 Unity 2021.3 或更新版本。

![Installation Success](/img/game-event-system/intro/installation/install-step-3-success.png)

安装就这么多。没有额外依赖，不用解决 assembly definition 冲突，不用跑安装向导。

## 第二步：打开 Dashboard 并初始化（30 秒）

在 Unity 菜单栏：**Tools > TinyGiants > Game Event System**。这会打开 GES Dashboard。

第一次打开时，你会看到"Uninitialized"状态。系统需要创建核心 ScriptableObject 资产——事件管理器和默认事件数据库。

![Dashboard Uninitialized](/img/game-event-system/examples/00-quick-start/uninitialized.png)

点击 **Initialize** 按钮。GES 会在项目中创建必要的资产并设置默认配置。你会看到 dashboard 切换到已初始化状态，事件管理器已就绪。

![Dashboard Initialized](/img/game-event-system/examples/00-quick-start/initialized.png)

现在把 `GameEventManager` 添加到场景中。你可以把管理器资产拖进 Hierarchy，或者创建一个空 GameObject 然后添加 `GameEventManager` 组件。Dashboard 会在需要时引导你。

![Manager Setup](/img/game-event-system/intro/installation/install-step-4-manager.png)

## 第三步：创建你的第一个事件（45 秒）

我们来创建一个简单的 void 事件——一个说"有事发生了"但不携带任何数据的事件。我们叫它"OnButtonPressed"。

在 GES Event Editor（从 dashboard 或通过 **Tools > TinyGiants > Event Editor** 进入）中，点击 **"+ New Event"** 按钮。这会打开 Creator Window。选择 **Parameterless (Void)** 作为事件类型。命名为 `OnButtonPressed`，点击 Create。

![Creator](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

系统创建了一个新的 ScriptableObject 资产——你的事件现在作为一个可拖拽、可引用的资产存在于项目中。你可以在 Event Editor 窗口中看到它的 GUID、当前监听者数量和配置选项。

## 第四步：用代码触发事件（90 秒）

新建一个 C# 脚本叫 `ButtonPresser.cs`。这个脚本会在你调用它的方法时触发我们的事件（你可以用 UI 按钮的 OnClick 触发，或者用 trigger，随你）。

```csharp
using UnityEngine;
using TinyGiants.GES;

public class ButtonPresser : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onButtonPressed;

    // Call this from a UI Button's OnClick, or from Update, or from anywhere
    public void PressTheButton()
    {
        Debug.Log("Button pressed! Raising event...");
        onButtonPressed.Raise();
    }

    // For testing: press Space to trigger
    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            PressTheButton();
        }
    }
}
```

在场景中创建一个空 GameObject，命名为"EventSender"。添加 `ButtonPresser` 组件。

现在关键的部分：在 Inspector 中，`onButtonPressed` 字段显示为一个**可搜索的下拉列表**（多亏了 `[GameEventDropdown]`）。点击它，你会看到来自活跃数据库的所有 void 事件列表。找到 `OnButtonPressed` 并选择——搞定。不用在 Project 窗口里翻找，不用手动拖拽。

发送端就这样了。当 `PressTheButton()` 被调用时，它会触发事件。发送者不知道也不关心谁在监听。

## 第五步：在 Inspector 中绑定响应（90 秒）

现在来创建一个响应事件的东西。新建另一个脚本叫 `ButtonResponder.cs`：

```csharp
using UnityEngine;

public class ButtonResponder : MonoBehaviour
{
    public void RespondToButton()
    {
        Debug.Log("I heard the button press! Responding...");
        // Do anything here: play a sound, move an object, show UI, etc.
    }

    public void FlashColor()
    {
        var renderer = GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.material.color = Random.ColorHSV();
        }
    }
}
```

现在设置接收端：

1. 在场景中创建一个 **3D Cube**（GameObject > 3D Object > Cube）。命名为"Responder"。
2. 给 Cube 添加 `ButtonResponder` 组件。
3. 打开 `OnButtonPressed` 事件的 **Behavior Window**。你可以在 Event Editor 中点击事件的 Behavior 按钮来打开。

在 Behavior Window 中，配置一个 **Event Action**：

- 把 Cube 拖进目标对象槽，选择 `ButtonResponder > RespondToButton`（或者选 `ButtonResponder > FlashColor` 如果你想要视觉效果的话）

![Hierarchy Setup](/img/game-event-system/visual-workflow/game-event-behavior/behavior-action-add.png)

你的 Hierarchy 现在应该有：
- **EventSender**（带 `ButtonPresser` 组件，引用事件资产）
- **Responder**（带 `ButtonResponder` 组件）

两个对象之间没有直接引用。它们完全通过共享的事件资产进行通信。

## 第六步：点击 Play 验证（15 秒）

按 Play。按空格键（或者你设置的其他触发方式）。你应该看到：

1. 控制台打印"Button pressed! Raising event..."
2. 控制台打印"I heard the button press! Responding..."
3. 如果你用了 `FlashColor`，Cube 会变色

就是这样。你有了一个能用的事件驱动系统。发送者触发了事件，接收者做出了响应，双方互不知道对方的存在。

### 快速验证清单

- 事件触发，响应执行：正常工作
- 删掉 Responder 对象然后按空格：发送者仍然正常（没有空引用错误，事件只是触发了没人响应）
- 复制 Responder：两个副本都响应同一个事件（自动多监听者支持）
- 把监听者加到另一个场景的对象上（如果你有多场景设置）：仍然有效（免费的跨场景通信）

## 添加更多响应（不改代码）

这就是这个模式威力开始显现的地方。想在按钮按下时加个音效？

1. 创建一个空 GameObject 叫"AudioResponder"
2. 添加一个 `AudioSource` 组件
3. 打开 `OnButtonPressed` 事件的 **Behavior Window**
4. 添加一个新的 Event Action：拖入 AudioResponder GameObject 并选择 `AudioSource.Play()`

搞定。你没碰 `ButtonPresser.cs`。你没修改 Responder cube。你只是在同一个事件的 behavior 里添加了一个新 action。系统是完全解耦的——添加新响应对现有代码零修改。

想加粒子效果？同样的流程。镜头抖动？同样的流程。数据上报？同样的流程。每个新响应都是通过同一个事件的 Behavior Window 配置的独立 Event Action。

## 带数据的事件

我们刚创建的 void 事件是最简单的类型。但大多数真实事件会携带数据——"玩家受到了 25 点伤害"或"分数现在是 1500"。

快速预览一下带类型的事件。GES 预生成了常用数据类型：

```csharp
using UnityEngine;
using TinyGiants.GES;

public class ScoreManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;  // Pre-generated type

    private int currentScore;

    public void AddScore(int points)
    {
        currentScore += points;
        onScoreChanged.Raise(currentScore);  // Passes the int value with the event
    }
}
```

在监听端，响应方法接收数据：

```csharp
public class ScoreDisplay : MonoBehaviour
{
    [SerializeField] private TMP_Text scoreText;

    // This method is wired up via the Behavior Window's Event Action
    public void UpdateDisplay(int newScore)
    {
        scoreText.text = $"Score: {newScore}";
    }
}
```

对于带类型的事件，你通过 Behavior Window 以同样的方式配置响应。响应方法自动接收类型化参数。

## 常见新手问题

**Q：每个场景都需要一个 GameEventManager 吗？**
A：你需要在第一个加载的场景中有一个。如果你用持久化的"Bootstrap"场景或 DontDestroyOnLoad 模式，放那里就行。单场景游戏直接放到那个场景里。

**Q：触发一个没有监听者的事件会怎样？**
A：什么都不会发生。没有错误，没有警告，没有性能开销。事件触发了，没人响应。这是设计如此——意味着你可以在监听者存在之前就安全地给系统添加事件。

**Q：可以用代码监听事件而不是 Behavior Window 吗？**
A：当然可以。你可以用 `AddListener`/`RemoveListener` 程序化注册监听者：

```csharp
[GameEventDropdown, SerializeField] private GameEvent onButtonPressed;

private void OnEnable()
{
    onButtonPressed.AddListener(OnButtonPressed);
}

private void OnDisable()
{
    onButtonPressed.RemoveListener(OnButtonPressed);
}

private void OnButtonPressed()
{
    Debug.Log("Button pressed!");
}
```

大多数情况下推荐 Behavior Window 方式，因为它更可见、更容易调试，但代码监听在动态场景下完全支持。

**Q：可以在 Inspector 中不写代码触发事件吗？**
A：可以。事件资产在 Inspector 中有一个"Raise"按钮。这对测试很方便——你可以在游戏运行时手动触发任何事件，看监听者如何响应，而不需要复现实际的游戏条件。

**Q：怎么调试哪些事件在触发？**
A：GES 包含一个 Runtime Monitor 工具，显示所有活跃事件、它们的监听者数量、以及触发/接收操作的实时日志。在游戏运行时从 GES dashboard 打开它。

## 接下来：你的学习路径

现在基础已经跑起来了，以下是推荐的深入顺序：

### 第 1 周：掌握基础
- 为游戏的核心交互创建 5-10 个 void 事件（游戏开始、游戏结束、暂停、恢复、关卡完成）
- 练习这个模式：事件资产 + 发送者 + 监听者
- 熟悉 Inspector 工作流

### 第 2 周：带类型的事件
- 使用预生成类型（int、float、string、Vector3）处理携带数据的事件
- 搭建血量系统：`FloatGameEvent` 用于血量变化，`GameEvent` 用于死亡
- 搭建计分系统：`IntGameEvent` 用于分数更新

### 第 3 周：自定义类型
- 为游戏特定事件定义自定义数据 struct
- 打开 Event Editor，点击"+ New Event"，在 Creator 中选择你的自定义类型——它会自动生成所需代码
- 用自定义类型事件实现一个完整功能

### 第 4 周：条件树和可视化 Flow
- 给监听者添加条件："只在玩家存活时响应"
- 用 AND/OR 逻辑构建可视化条件树
- 使用 flow 系统实现多步骤事件响应

### 第 5 周：大规模组织
- 为项目模块搭建多数据库架构
- 实现基于分类的组织
- 配置场景特定事件的动态数据库加载

### 持续进阶：生产级模式
- 使用 Runtime Monitor 在 Play 模式下调试事件流
- 实现 Sender 事件进行每实例追踪
- 构建跨场景通信模式
- 用 GES 性能工具进行分析和优化

## 5 分钟回顾

以下是我们做过的所有事情，按顺序：

1. 从 Asset Store **安装**了 GES
2. 通过 Dashboard **初始化**了系统
3. **创建**了一个 void 事件资产（`OnButtonPressed`）
4. **写了一个发送端**脚本来触发事件
5. 通过 Behavior Window 为同一事件配置 Event Action **搭建了接收端**
6. **点击 Play** 验证它能用

总耗时：大约 5 分钟。总代码行数：大约 15 行（发送端脚本中）。发送者和接收者之间的直接引用总数：零。

这就是 GES 事件驱动架构的核心。所有其他功能——带类型事件、条件、可视化 flow、多数据库组织——都建立在这个基本模式之上：**一个事件资产坐在发送者和接收者之间，双方互不知道对方的存在。**

---

🚀 全球开发者服务矩阵

**🇨🇳 国区开发者社区**
- 🛒 [Unity 中国资产商店](https://tinygiants.tech/ges/cn)
- 🎥 [B站官方视频教程](https://tinygiants.tech/bilibili)
- 📘 [高性能架构技术文档](https://tinygiants.tech/docs/ges)
- 💬 国内技术交流群 (1071507578)

**🌐 全球开发者社区**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord 全球技术社区](https://tinygiants.tech/discord)
- 🎥 [YouTube 官方频道](https://tinygiants.tech/youtube)
- 🎮 [Unity 官方论坛专贴](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub 官方主页](https://github.com/tinygiants-tech/TinyGiants)

**📧 支持与合作**
- 🌐 [TinyGiants 工作室主页](https://tinygiants.tech)
- ✉️ [官方支持邮箱](mailto:support@tinygiants.tech)
