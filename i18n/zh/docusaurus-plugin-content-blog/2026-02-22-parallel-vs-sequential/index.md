---
slug: parallel-vs-sequential
title: "并行还是顺序：每个事件系统都需要的两种执行模式"
authors: [tinygiants]
tags: [ges, unity, flow-graph, architecture, advanced]
description: "音效和粒子同时播放，但屏幕淡出必须在重生加载之前完成。真实的游戏需要并行和顺序两种事件执行模式——再加上条件分支、类型转换和异步协调。"
image: /img/home-page/game-event-system-preview.png
---

玩家死了。死亡音效和死亡粒子应该同一瞬间开始——没必要等一个完了再开始另一个。但屏幕淡出绝对必须在重生点加载之前完成。重生加载必须在传送之前完成。传送必须在屏幕淡入之前完成。

这就是并行和顺序执行同时存在于一个流程中，由一个事件触发。而尴尬的现实是：大多数 Unity 事件系统只给你一种模式。触发事件，所有监听器响应，完事。至于这些响应应该同时发生还是严格按顺序来？你自己想办法。

于是你就去解决了。用协程。用回调。用名为 `_hasFadeFinished` 的布尔值。不知不觉间，你搭了一个散落在六个文件里的临时状态机，包括未来的你在内没人能看懂。

<!-- truncate -->

## 执行模式问题

让我详细走一遍"同一个流程中的并行和顺序"在标准 Unity 工具下到底长什么样。因为魔鬼就在实现细节里。

### 并行部分（看起来简单）

玩家死了，三件事同时发生：死亡音效、死亡粒子、禁用输入。标准的 C# 事件可以处理：

```csharp
public static event Action OnPlayerDeath;

// AudioManager.cs
OnPlayerDeath += PlayDeathSound;

// ParticleManager.cs
OnPlayerDeath += SpawnDeathParticles;

// InputManager.cs
OnPlayerDeath += DisableInput;
```

事件触发时三个都执行。"并行"的意思是它们都在同一次派发中执行。挺直白的。

但如果 `PlayDeathSound` 抛了异常呢？委托调用链会停下来。`SpawnDeathParticles` 和 `DisableInput` 永远不会执行。一个出错的处理函数把整条响应链拖下水。你的玩家死得无声无息、没有粒子、还能继续操作。有趣。

"那每个处理函数外面套个 try-catch 呗。"行。那你就得在每个订阅里写样板异常处理代码。或者自己搭一个能逐个处理函数捕获异常的自定义事件派发器。这就是在造本该已经存在的基础设施。

还有优先级问题。也许输入应该最先禁用——在死亡音效准备阶段有个很小的窗口让玩家可以按按钮。但扁平的委托链里执行顺序就是订阅顺序，也就是加载顺序，而加载顺序是不确定的。

### 顺序部分（这才是崩溃的地方）

并行特效之后是顺序的重生流程：淡出画面、等待、加载重生点、等待、传送、淡入。

```csharp
IEnumerator DeathSequence()
{
    yield return StartCoroutine(FadeToBlack());
    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();
    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

清晰。能跑。直到你需要改动。

想在多人即时重生时跳过淡出？想在淡出和重生之间加个"继续？"画面？想在传送后加个重生动画？三处改动你就得到了这个：

```csharp
IEnumerator DeathSequence(DeathInfo info)
{
    if (!info.isInstantRespawn)
    {
        yield return StartCoroutine(FadeToBlack());
    }

    if (info.showContinueScreen)
    {
        yield return StartCoroutine(ShowContinuePrompt());
        if (!_playerChoseContinue)
        {
            yield return StartCoroutine(ShowGameOverScreen());
            yield break;
        }
    }

    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();

    if (info.playRespawnAnimation)
    {
        yield return StartCoroutine(PlayRespawnAnimation());
    }

    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

协程现在有了分支、提前返回、条件步骤。它在一个文件里。AudioManager、ParticleManager 和 InputManager 对它一无所知。并行特效和顺序流程完全脱节。而这还是一个相对简单的死亡序列。

### 类型不匹配问题

这是一个很少有人谈到但一碰上就头疼的问题。你的伤害事件携带一个 `DamageInfo` 结构体——攻击者、目标、数值、类型、暴击标志。但下游的血条 UI 只需要 `float` 伤害值，屏幕震动系统只需要 `bool` 是否暴击。

在扁平事件系统里你有两个选择：

**方案 A：所有人都接收 `DamageInfo`。** 血条提取 `info.damage`，屏幕震动提取 `info.isCritical`。每个监听器都接收了不需要的数据并自行提取。到处都是耦合。

**方案 B：中间人事件。** 伤害处理函数接收 `DamageInfo`，提取出 float，触发一个单独的 `OnDamageAmountChanged` 事件。提取出 bool，触发 `OnCriticalHitOccurred`。现在你有了一堆唯一功能就是做类型转换的样板中转事件。

有50个事件的话，方案 B 可能意味着几十个只为了转换类型而存在的中间人事件。样板爆炸。每个中转事件都是另一个要管理的资源、另一个要命名的东西、事件下拉框里又多一项。

### 异步问题

"等这个完成再继续"听起来简单。在 Unity 里可不是。

场景加载是异步的。动画是基于时间的。网络调用返回 Task。淡出用的是自定义缓动系统。每种异步机制都有自己的完成模式——协程 yield、Task continuation、回调委托、动画事件。

要在一个顺序流程中协调它们，你的协程就变成了不同异步范式之间的翻译器：

```csharp
IEnumerator WaitForAnimation(Animator anim, string clipName)
{
    anim.Play(clipName);
    while (anim.GetCurrentAnimatorStateInfo(0).normalizedTime < 1.0f)
        yield return null;
}

IEnumerator WaitForSceneLoad(string sceneName)
{
    var op = SceneManager.LoadSceneAsync(sceneName);
    while (!op.isDone)
        yield return null;
}
```

每个异步的东西都需要一个自定义协程包装器。协调逻辑是不可见的——藏在 yield 语句和 while 循环里面。策划看到这段代码只会看到实现细节，看不到流程。

### 混合复杂度：Boss 战

现在把所有东西组合起来。一个 Boss 战阶段转换：

1. 血量降到阈值以下（条件）
2. 咆哮动画 + 音乐切换 + 场地灯光变化（并行，但咆哮是异步的）
3. 等咆哮完成（异步顺序）
4. 切换攻击模式（顺序）
5. 依次刷出小怪，有间隔延迟（顺序循环）
6. 等所有小怪刷完（异步顺序）
7. Boss 变为可被攻击（顺序）
8. 如果是最后阶段，播放特殊对话（条件分支）

这里面有并行触发、顺序链、异步等待、条件分支和间隔延迟——全在一个流程里。用协程来表达的话就是一个100行的方法，嵌套的 yield、布尔标志、阶段枚举，加上动画事件回调协程。

逻辑是对的。但这是只写不读的代码。六个月后没人能看懂。没人敢安全地修改，除非理解了每个 yield 和每个标志。

状态机？抽象层面更好，但复杂度同样爆炸。三个阶段带条件转换和并行特效，很容易需要 15-20 个状态。每个状态管理自己的并行操作、处理转换、评估条件。你把不可见的协程意大利面换成了结构良好但同样不透明的状态机意大利面。

## GES 的方案：两种可以混用的显式模式

GES 引入了两种基本执行模式——Trigger 和 Chain——作为可视化 Flow Graph 编辑器和代码 API 中的一等公民概念。它们不是叠加在 Unity 事件系统之上的抽象层，而是构成每个事件流的两种原子构建块。

### Trigger：并行扇出（橙色）

源事件触发时，所有 Trigger 连接的目标同时且独立地触发。

![Trigger Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-trigger.png)

**并行执行。** 所有目标在同一帧开始处理。它们之间没有保证顺序（除非你指定优先级）。

**容错。** 如果目标 B 抛出异常，目标 A 和 C 照常执行。一个出错的处理函数不会拖垮整个流程。这才是你希望 C# 事件开箱即用就有的行为。

**发后不管。** 源不等待任何目标完成。如果某个目标启动了一个5秒的协程，源不知道也不关心。

**优先级排序。** 虽然概念上是并行的，但 Trigger 目标在一帧内以确定的顺序执行。指定优先级：`priority: 20` 在 `priority: 10` 之前执行。这解决了"基本上是并行的，但禁用输入要在播放死亡音效之前"的需求，不需要额外的顺序步骤。

```csharp
// 当 onPlayerDeath 触发时全部同时执行
onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);     // 第一个
onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);   // 第二个
onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5); // 第三个
```

在 Flow Graph 编辑器中，Trigger 连接是从源节点扇出的橙色线。视觉简写："这些同时发生。"

![Trigger Demo Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### Chain：顺序阻塞（绿色）

源事件触发时，Chain 连接的目标按严格顺序逐个执行。每一步等待上一步完成。

![Chain Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-chain.png)

**严格排序。** 步骤1，然后步骤2，然后步骤3。没有歧义，没有竞争条件。可视化布局从左到右、从上到下——就是执行顺序。

**延迟和持续时间。** 每个 Chain 步骤可以有延迟（开始前暂停）和持续时间（这一步"用时"多久然后链才继续）。这替代了散布在协程中的 `WaitForSeconds`，用每个连接上明确可见的时序代替。

**异步等待与 waitForCompletion。** Chain 步骤可以暂停链直到处理函数的异步操作完成。场景加载、动画、网络调用——链优雅地等待它们。不需要协程包装代码，不需要完成回调，只是一个勾选框。

**条件中止。** Chain 连接支持条件，可以停止剩余序列。如果条件求值为 `false`，后续步骤不执行。"如果玩家有复活币，中止死亡序列"就是第一个 Chain 步骤上的一个条件。

```csharp
// 每一步等待上一步完成
onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
onLoadRespawn.AddChainEvent(onTeleportPlayer);
onTeleportPlayer.AddChainEvent(onResetPlayerState);
onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
onFadeIn.AddChainEvent(onEnableInput);
```

在 Flow Graph 中，Chain 连接是依次流动的绿色线。视觉简写："这些按这个顺序发生。"

![Chain Demo Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### 混合使用：混合流程

真实的游戏逻辑永远不会纯粹是并行或纯粹是顺序的。两种都有。拥有两种显式模式的全部意义就在于你可以从同一个源节点自由混合它们。

![Hybrid Flow](/img/game-event-system/intro/overview/flow-graph-mix.png)

玩家死亡流程变成了这样：

```
OnPlayerDeath ──trigger──► OnPlayDeathSound       （并行，立即）
              ──trigger──► OnSpawnDeathParticles   （并行，立即）
              ──trigger──► OnDisableInput          （并行，立即，priority: 20）
              ──chain───► OnFadeToBlack            （顺序，delay: 1.0s）
                          └──chain──► OnLoadRespawn （waitForCompletion）
                                     └──chain──► OnTeleportPlayer
                                                 └──chain──► OnResetState
                                                             └──chain──► OnFadeIn （duration: 1.0s）
                                                                         └──chain──► OnEnableInput
```

三条橙色 Trigger 线扇出——并行特效立即触发。一条绿色 Chain 启动顺序重生流程。两者并发运行：死亡音效在播放的同时，Chain 在等待1.0秒延迟后才开始淡出。

代码写法：

```csharp
void SetupDeathFlow()
{
    // 并行特效（Trigger - 橙色）
    onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);
    onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5);

    // 顺序重生（Chain - 绿色）
    onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
    onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
    onLoadRespawn.AddChainEvent(onTeleportPlayer);
    onTeleportPlayer.AddChainEvent(onResetPlayerState);
    onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
    onFadeIn.AddChainEvent(onEnableInput);
}
```

但可视化 Flow Graph 才是真正让人恍然大悟的地方。打开编辑器你就能看到整个流程：左边的并行扇出，右边的顺序链。橙色和绿色。对于原本在多个文件中需要80行协程代码的东西，这里一眼就能理解。

## Argument Transformer：解决类型不匹配

还记得中间人事件的问题吗？上游发 `DamageInfo`，下游只要 `float` 伤害值。没有 Transformer 的话，你得为每种类型转换创建中转事件。

GES 用 Argument Transformer 解决了这个问题——它们是 Flow Graph 中事件连接上的类型转换节点。

![Node Transform](/img/game-event-system/flow-graph/game-event-node-behavior/node-transform.png)

当你把一个 `DamageInfo` 源连接到一个 `SingleGameEvent` 目标时，编辑器检测到类型不匹配，让你定义一个转换。你指定从源类型到目标类型的属性路径：

```
DamageInfo → .damage → float
```

Transformer 提取 `damageInfo.damage` 并将 `float` 值传给下游事件。不需要中间人事件，不需要样板中转代码。转换直接可见在连接上。

嵌套属性访问也支持：

```
DamageInfo → .attacker.stats.critChance → float
```

Flow Graph 用不同的方式显示 Transformer 连接和直接连接，这样你随时都能看到哪里在做类型转换。类型系统在配置时验证路径——如果属性不存在或最终类型不匹配目标，你在运行前就能看到错误。

### 连接兼容性指示

当你在两个节点之间拖拽连接时，编辑器显示颜色编码的兼容性：

![Node Connection](/img/game-event-system/flow-graph/game-event-node-connector/node-connection.png)

- **绿色：** 类型完全匹配。`Int32GameEvent` 到 `Int32GameEvent`。直接连接。
- **黄色：** 通过转换兼容。`DamageInfo` 源，`float` 目标。Argument Transformer 可以桥接。
- **橙色：** 可能但需要配置。类型无关，但 void 透传或自定义 Transformer 可以工作。
- **红色：** 无效。通常是 Chain 模式下的循环依赖。

不需要猜两个节点能不能连。可视化反馈立刻告诉你。

## 双层条件系统

这是 Trigger/Chain 设计中最精妙的部分。有两个独立的条件层，它们服务于不同的目的。

**节点条件**（在 NodeBehavior Window 中配置）控制流程本身。

如果节点条件求值为 `false`：
- 在 **Trigger** 连接上：那个特定的目标不触发，但同一源的其他 Trigger 不受影响
- 在 **Chain** 连接上：剩余的整个序列中止——后续步骤永远不执行

**事件条件**（在 Behavior Window 中配置）只控制副作用。

如果事件条件求值为 `false`：
- 事件的 Action（播放声音、生成粒子等游戏响应）不执行
- 但流程继续——下一个 Chain 步骤照常触发，Trigger 派发照常进行

为什么要有这个区分？因为"跳过"和"中止"是根本不同的操作。

"跳过播放声音但继续重生序列" → 声音的 Event Action 上的事件条件。链继续到下一步。

"如果玩家有复活币，中止整个死亡序列" → 第一个 Chain 步骤上的节点条件。整条链停止。

在 Flow Graph 中，两种条件类型分别可见在各自的节点上。运行时调试时，你能看到是哪一层阻断了执行。光这个可见性就能省下几个小时的调试"为什么链停了？"

## 嵌套分组：组织复杂流程

当流程变大——20个以上的节点、多个 Trigger 扇出、分支链——图就会变得难以阅读。GES 支持嵌套分组：可以把子流程折叠成一个带标签的方框的可视化容器。

把 Boss 阶段转换分成一个"阶段2转换"组。折叠它。现在你的顶层图显示的是 `OnBossHP50` → `[阶段2转换]` → `OnPhase2Active`，而不是12个中间节点。

需要编辑内部时展开，想看全局时折叠。这跟 IDE 里的代码折叠是同一个概念——隐藏已确认的细节，显示结构。

## 模式集锦：三种常见架构

在多个项目中使用 Trigger 和 Chain 之后，三种模式反复出现。

### 广播模式

一个源，多个独立响应。纯 Trigger 扇出。

![Broadcaster Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-broadcaster.png)

`OnPlayerDeath` 触发：更新分数、记录分析、播放声音、显示 UI、通知 AI。全部独立，全部容错。如果分析记录失败了，声音照放。

**何时使用：** 事件响应之间互相独立，不需要协调。最常见的模式——大概占所有事件连接的60%。

**代码等价：**

```csharp
onPlayerDeath.AddTriggerEvent(onUpdateScore);
onPlayerDeath.AddTriggerEvent(onLogAnalytics);
onPlayerDeath.AddTriggerEvent(onPlaySound);
onPlayerDeath.AddTriggerEvent(onShowDeathUI);
onPlayerDeath.AddTriggerEvent(onNotifyAI);
```

### 过场模式

严格的顺序流程带时序控制。纯 Chain。

![Cinematic Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-cinematic.png)

`OnCutsceneStart` 链式执行：移动摄像机（waitForCompletion）→ 开始对话（waitForCompletion）→ 显示选项 UI（waitForCompletion）→ 根据选择走不同分支。

**何时使用：** 顺序是关键的。步骤 B 在步骤 A 没完成时会出错或产生错误结果。过场动画、教程、需要严格按序的状态变更。

**代码等价：**

```csharp
onCutsceneStart.AddChainEvent(onMoveCamera, waitForCompletion: true);
onMoveCamera.AddChainEvent(onStartDialogue, waitForCompletion: true);
onStartDialogue.AddChainEvent(onShowChoiceUI, waitForCompletion: true);
```

### Boss 战混合模式

并行即时反馈 + 顺序状态变更 + 条件分支。两种模式的全部力量。

![Hybrid Boss Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-hybrid.png)

`OnBossPhaseTransition`：
- **Trigger（并行）：** 警告音效、屏幕震动、UI 提示、粒子爆发
- **Chain（顺序）：** Boss 无敌 → 咆哮动画（waitForCompletion）→ 刷小怪（间隔延迟）→ 加载新攻击模式 → Boss 恢复可被攻击
- **最后一步的节点条件：** 如果这是最后一个阶段，分支到特殊结局链

**何时使用：** 任何复杂游戏时刻的真实模式。即时感官反馈（Trigger）+ 谨慎的状态变更（Chain）+ 条件分支（节点条件）。

**代码等价：**

```csharp
void SetupBossTransition()
{
    // 即时反馈（并行）
    onBossPhaseTransition.AddTriggerEvent(onWarningSound);
    onBossPhaseTransition.AddTriggerEvent(onScreenShake);
    onBossPhaseTransition.AddTriggerEvent(onUIAlert);

    // 状态变更（顺序）
    onBossPhaseTransition.AddChainEvent(onBossInvulnerable);
    onBossInvulnerable.AddChainEvent(onRoarAnimation, waitForCompletion: true);
    onRoarAnimation.AddChainEvent(onSpawnMinions, delay: 0.5f);
    onSpawnMinions.AddChainEvent(onLoadAttackPatterns);
    onLoadAttackPatterns.AddChainEvent(onBossVulnerable);
}
```

## 运行时调试：看着流程执行

Flow Graph 不仅仅是一个配置工具。在 Play 模式下，你可以实时看着整个流程执行：

- **活跃的节点** 以连接颜色闪烁（橙色 = Trigger，绿色 = Chain）
- **完成的节点** 短暂闪烁
- **跳过的节点**（条件为 false）显示红色闪烁
- **出错的节点** 显示持续的红色高亮

你可以一步步看着 Boss 阶段转换执行。看 Trigger 扇出同时触发。看 Chain 逐步推进。在条件阻断某一步或错误打断流程时立刻发现。

这就是协程流程让你失去的可见性。当一个协程在中间悄悄停了，你到处加 `Debug.Log` 当侦探。当 Flow Graph 节点闪红，你一眼就看到了在哪里以及为什么。

## 决策框架

在多个项目中使用 Trigger 和 Chain 模式之后，总结出这个经验法则：

**默认用 Trigger。** 如果你不确定，先用 Trigger。大多数事件连接都是"这个系统应该独立响应这个事件"。音频、粒子、UI、数据分析、状态追踪——全是 Trigger。大概占 60-70% 的连接。

**当顺序是关键时升级到 Chain。** 如果步骤 B 在步骤 A 没完成时会出错，那就是 Chain。淡出在传送之前，加载在初始化之前，动画在碰撞框激活之前。

**即时反馈 + 延迟后果时两个都用。** 即时的感官响应（音效、粒子、视觉特效）用 Trigger。谨慎的状态变更（场景加载、传送、数据保存）用 Chain。玩家立刻感受到响应，同时游戏状态在后台安全地按序更新。

**类型不匹配时用 Argument Transformer。** 不要为类型转换创建中间人事件。在连接上放一个 Transformer，指定属性路径。

**需要"中止"时用节点条件。** 剩余的整条链停止。"玩家有复活币？不执行死亡序列。"

**需要"跳过"时用事件条件。** 链继续但这一步的副作用不执行。"静音模式？跳过声音但继续重生。"

可视化 Flow Graph 让所有这些一目了然。橙色是并行，绿色是顺序。连接上有 Transformer，节点上有条件。一个复杂游戏流程的完整架构——Boss 战、过场动画、死亡序列——全在一个窗口里可见，而不是散落在几十个文件中。

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
