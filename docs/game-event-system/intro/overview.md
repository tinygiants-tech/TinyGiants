---
sidebar_label: Overview

sidebar_position: 1
---

# Game Event System

A production-ready, visual event architecture for Unity that transforms chaotic event management into maintainable, testable workflows.

:::tip From the Creator
"I built this system because I was tired of battling 'invisible spaghetti code' in my own projects. As an indie developer, I needed a tool that balanced visual clarity with raw coding power—without performance trade-offs. **TinyGiants** is my commitment to professional-grade tools that I use in my own games every day."
—  ***[TinyGiants]** from China*
:::

<img src="/img/game-event-system/intro/overview/hero-main.png" alt="Hero Diagram" class="img-full" />


---

## Why This System Exists

:::danger The Problem
In traditional Unity development, events become invisible spaghetti:

- **Hidden Dependencies**: Who's listening? Where's it triggered? Good luck finding out.
- **Runtime Breakage**: Rename a method, break 10 scene objects.
- **Cross-Scene Hell**: Events die when scenes unload—memory leaks and null references everywhere.
- **No Visibility**: Complex event chains exist only in your head (and outdated comments).

:::

:::success The Solution
**TinyGiants.GameEventSystem** provides a **Visual-First, Type-Safe** event architecture:

✅ **Events as Assets** - ScriptableObject-based, GUID-protected, survives refactoring  

✅ **Visual Flow Graphs** - See your event chains, triggers, and conditions in one window  

✅ **Zero-Reflection Runtime** - Expression Tree compilation for C++-like performance  

✅ **Designer-Friendly** - Drag-and-drop binding, no coding required for simple workflows  

✅ **Production-Grade Tools** - Real-time monitoring, reference finding, code generation automation

:::

---

## Core Philosophy: Hybrid Workflow

This system embraces a **division of labor** between programmers and designers:

```mermaid
graph LR

    classDef programmer fill:#1e40af,stroke:#0f172a,stroke-width:2px,color:#ffffff,font-weight:bold
    classDef asset fill:#4338ca,stroke:#1e1b4b,stroke-width:2px,color:#ffffff
    classDef code fill:#0f766e,stroke:#042f2e,stroke-width:2px,color:#ffffff
    classDef designer fill:#7c2d12,stroke:#431407,stroke-width:2px,color:#ffffff,font-weight:bold
    classDef scene fill:#b45309,stroke:#78350f,stroke-width:2px,color:#ffffff
    classDef visual fill:#9f1239,stroke:#4c0519,stroke-width:2px,color:#ffffff
    classDef runtime fill:#020617,stroke:#000000,stroke-width:2px,color:#ffffff,font-weight:bold

    A(👨‍💻 Programmer):::programmer
    B(📦 Event Assets):::asset
    C(🎧 Code Logic):::code

    D(🎨 Designer):::designer
    E(🎮 Scene Behaviors):::scene
    F(🕸️ Visual Orchestration):::visual

    G(▶️ Runtime Execution):::runtime

    A -->|Defines Events| B
    A -->|Writes Listeners| C

    B --> D
    D -->|Binds in Inspector| E
    D -->|Builds Flow Graphs| F

    C --> G
    E --> G
    F --> G
```




| Role              | Responsibility                                               | Tool                                   |
| ----------------- | ------------------------------------------------------------ | -------------------------------------- |
| **Programmer**    | Define **when** events fire `Raise()` and **what** logic responds | C# API, Listeners                      |
| **Designer**      | Wire events to **scene objects** and configure **behaviors** | Inspector Binding, `GameEventBehavior` |
| **Tech Designer** | Orchestrate **complex sequences** (delays, chains, conditions) | Visual Flow Editor                     |

**Result**: Clean separation of concerns with full visibility into event relationships.

---

## Architecture Highlights

### 🏗️ Foundation: ScriptableObject-Driven

Unlike string-based or singleton event systems, **events are first-class assets**:

```csharp
// Events are assets, not magic strings
[GameEventDropdown] public GameEvent onPlayerDeath;
[GameEventDropdown] public GameEvent<int> onScoreChanged;

void Die() {
    onPlayerDeath.Raise(); // Type-safe, asset-referenced
}
```

**Benefits**:

- ✅ **Complete Decoupling** - Senders never know receivers. Fire once, notify many.
- ✅ **Cross-Scene Persistence** - Events survive scene loads/unloads.
- ✅ **GUID Identity** - Rename files, reorganize folders—references never break.
- ✅ **Multi-Database Support** - Modular organization for large teams.

<details>
<summary>📖 How GUID Protection Works</summary>


Every event has a unique GUID stored in `.meta` files:

```yaml
# PlayerDeath.asset.meta
guid: a7f3c21e9b4d8f6e2d1a9c8b7e6f5a4d
```

Even if you rename `PlayerDeath` `OnCharacterDied`, Unity maintains the reference via GUID. **No broken scene links.**

</details>

---

### 🕸️ Visual Flow Orchestration

Stop hunting through code to understand event relationships. The **Flow Editor** turns invisible logic into maintainable graphs:


#### Use Cases

**🎯 Triggers (Fan-Out)**

![alt text](/img/game-event-system/intro/overview/flow-graph-trigger.png)

**⛓️ Chains (Sequential)**

![alt text](/img/game-event-system/intro/overview/flow-graph-chain.png)

**🔀 Hybrid Flows** 

Mix parallel + sequential logic

![alt text](/img/game-event-system/intro/overview/flow-graph-mix.png)

:::tip Visual Benefits

- **Group Organization** - Color-coded groups for large flows
- **Real-Time Validation** - Connection type checking (Green=Valid, Red=Error)
- **Undo/Redo Support** - Full history system (Ctrl+Z/Y)
- **Runtime Debugging** - Active nodes highlight in Play Mode

:::

---

### ⚡ Type-Safe, Zero-Reflection Performance

Unity's generic serialization is broken by design. I fixed it.

#### The Problem

```csharp
// ❌ Unity can't serialize this
[SerializeField] private GameEvent<PlayerData> onPlayerDataChanged;
```

#### Our Solution

```csharp
// ✅ Auto-generated concrete class
[GameEventDropdown] public PlayerDataGameEvent onPlayerDataChanged;

// Generated code (automatic):
[Serializable]
public class PlayerDataGameEvent : GameEvent<PlayerData> { }
```

**Performance Benefits**:

- 🚀 **Expression Tree Compilation** - Conditions compile to delegates at startup (no runtime parsing)
- 🚀 **No Reflection Cost** - Direct method calls, not `Invoke()`
- 🚀 **Native Inspector Support** - Full `UnityEvent<T>` compatibility

<details>
<summary>⚙️ Code Generation Workflow</summary>


1. **Select Types** - Choose your custom types in the Creator window
2. **Generate** - Click "Generate" to create concrete classes
3. **Compile** - Unity auto-compiles the new code
4. **Create** - Now you can create events for your custom types

**Time investment**: ~30 seconds. **Benefit**: Lifetime type safety.

</details>

---

## Feature Matrix

### ⚓ Core Architecture

| Feature                    | Description                                                  |
| :------------------------- | :----------------------------------------------------------- |
| **Asset-Based Events**     | ScriptableObject architecture with **GUID Identity**—references survive renames and file moves. |
| **Comprehensive Generics** | Native support for `GaneEvent<Void>`, `GameEvent<T>`, and source-aware `GameEvent<TSender, TArgs>`. |
| **Multi-Database System**  | Modular organization supporting multiple databases with **Dynamic Loading** and **Health Checks**. |
| **Category System**        | String-based categorization for efficient fuzzy-search filtering within large event libraries. |
| **Auto Static Reset**      | Automatic clearing of static caches in Editor Play Mode to prevent data pollution. |

### 🧠 Advanced Logic & Flow
| Feature                   | Description                                                  |
| :------------------------ | :----------------------------------------------------------- |
| **Expression Trees**      | **Zero-reflection** logic evaluation; conditions are compiled into high-performance delegates at runtime. |
| **Visual Logic Builder**  | Construct complex **nested AND/OR logic** and dynamic property comparisons without code. |
| **Hybrid Execution**      | Seamlessly mix parallel **Fan-out Triggers** and sequential **Blocking Chains** in one graph. |
| **Argument Transformers** | Dynamically extract and pass specific object properties as arguments between flow nodes. |
| **Granular Flow Control** | Per-node delays, **Async/Coroutine waits**, loop counts, and conditional execution gates. |

### 🎧 Listening & Binding
| Feature                   | Description                                                  |
| :------------------------ | :----------------------------------------------------------- |
| **Visual Binding**        | Drag-and-drop **UnityEvent wiring** in the Inspector with visual status markers and type safety. |
| **Priority Listeners**    | **Integer-based sorting** ensuring critical systems react before standard UI/Audio listeners. |
| **Conditional Listeners** | Built-in **Predicate support**—callbacks only fire when specific logical criteria are met. |
| **Persistent Listeners**  | Native support for **cross-scene listeners** that remain active during scene transitions. |
| **Dynamic Runtime API**   | Full programmatic control to register or unregister listeners and manage **Task Handles**. |

### 📊 Tooling & Debug
| Feature                | Description                                                  |
| :--------------------- | :----------------------------------------------------------- |
| **Dashboard & Wizard** | Modern UI for **Batch Operations** and a fuzzy-matching Wizard for rapid event creation. |
| **Code Automation**    | **Tri-Mode CodeGen** (Basic/Custom/Sender) with automatic compilation pipeline integration. |
| **Reference Finder**   | Scene-wide scanner to pinpoint exactly which components reference specific event assets. |
| **Runtime Monitor**    | Real-time profiling of **Execution Time (Avg/Min/Max)**, listener counts, and **GC allocation**. |
| **Automation Tree**    | Real-time visualizer for active Trigger and Chain hierarchies to debug complex logic flows. |

------

## Performance Characteristics

Real-world metrics from production builds:

| Scenario                        | Performance | Notes                        |
| ------------------------------- | ----------- | ---------------------------- |
| **Event Raise (0 listeners)**   | ~0.001ms    | Virtually free               |
| **Event Raise (10 listeners)**  | ~0.02ms     | No GC allocation             |
| **Condition Evaluation**        | ~0.003ms    | Expression Tree compilation  |
| **Flow Node Execution**         | ~0.05ms     | Includes coroutine overhead  |
| **Monitor Window (100 events)** | ~0.3ms      | Editor-only, no runtime cost |

:::success Production Ready
Tested in shipped titles with **500+ events** and **10,000+ listeners** across scenes. Zero performance regressions.
:::

------

## 🗺️ Navigation Roadmap

This map provides a complete overview of the system documentation. Use the tables below to quickly jump to the specific feature or tutorial you need.

:::info Recommended Learning Paths

- 🚀 **Quickest Start**: Jump straight to [**Example: Quick Start**](../examples/00-quick-start.md).
- 🎨 **Visual Learner**: Focus on the [**Visual Workflow**](#visual-workflow) and [**Flow Orchestration**](#flow-orchestration) tables.
- 💻 **Programmer's Deep Dive**: Head directly to [**Runtime API**](#runtime-api).

:::

### 🏁 1. Introduction {#introduction}

Foundational setup and core philosophy of the event-as-asset architecture.

| Page                                            | Description                                                  |
| :---------------------------------------------- | :----------------------------------------------------------- |
| [**Project Structure**](./project-structure.md) | Understanding directory layout, folder protection, and modular organization. |
| [**Installation**](./installation.md)           | Initializing the plugin and setting up the automated static reset pipeline. |

### 💎 2. Visual Workflow {#visual-workflow}

Management tools designed to transform invisible code into a tangible visual dashboard.

| Page                                                         | Description                                                  |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| [**System Dashboard**](../visual-workflow/game-event-system.md) | Overview of the asset-based workflow and GUID identity system |
| [**Database & FlowGraph**](../visual-workflow/game-event-manager.md) | Handling multi-database and multi-flowgraph setups and database health maintenance |
| [**Edit Game Event**](../visual-workflow/game-event-editor.md) | Using the Dashboard for batch editing, search, and categorization |
| [**Create Game Event**](../visual-workflow/game-event-creator.md) | Rapidly generating event assets using the fuzzy-search batch wizard |
| [**Configure Game Event**](../visual-workflow/game-event-behavior.md) | Mastering Inspector binding with visual status markers and type safety |
| [**Raise Game Event**](../visual-workflow/game-event-raiser.md) | Learn how to call events and enhance inspectors using the built-in GameEventDropdown Attribute |
| [**Find Game Event**](../visual-workflow/game-event-finder.md) | Scanning scenes to locate component-level event dependencies. |
| [**Visual Condition Tree**](../visual-workflow/visual-condition-tree.md) | Learn how to control the logic execution of event action through condition tree configuration |

### 🕸️ 3. Flow Orchestration {#flow-orchestration}

Visualizing and building complex multi-step logic sequences using nodes.

| Page                                                         | Description                                                  |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| [**Node Editor**](../flow-graph/game-event-node-editor.md)   | Managing the GraphView canvas, groups, and snapshot-based Undo/Redo |
| [**Node Connector**](../flow-graph/game-event-node-connector.md) | Rules for hybrid execution modes and real-time connection validation |
| [**Node Behavior**](../flow-graph/game-event-node-behavior.md) | Configuring node-level delays, loops, and argument transformation logic |
| [**Advanced Logic Patterns**](../flow-graph/advanced-logic-patterns.md) | Building no-code nested logic groups and conditional execution gates |

### 💻 4. Scripting & API {#runtime-api}

The developer's guide to high-performance C# integration and lifecycle management.

| Page                                                         | Description                                                  |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| [**Raising & Scheduling**](../scripting/raising-and-scheduling.md) | Programmatic firing, delayed execution, and Task Handle management |
| [**Listening Strategies**](../scripting/listening-strategies.md) | implementing prioritized, persistent, and source-aware (Sender) listeners |
| [**Programmatic Flow**](../scripting/programmatic-flow.md)   | Using Expression Tree-based predicates for zero-reflection logic filtering |
| [**Best Practices**](../scripting/best-practices.md)         | Architectural tips for clean decoupling and preventing data pollution |
| [**API Reference**](../scripting/api-reference.md)           | Detailed technical documentation for all core classes and attributes |

### 🛠️ 5. Tools & Support {#tools-support}

Automation and monitoring utilities for professional production environments.

| Page                                                         | Description                                                  |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| [**CodeGen & Cleanup**](../tools/codegen-and-cleanup.md)     | Using the Tri-Mode Generator and compilation pipeline automation |
| [**Runtime Monitor**](../tools/runtime-monitor.md)           | Real-time performance profiling, deep logging, and warning systems |
| [**Community & Support**](../tools/community-and-support.md) | Accessing updates, reporting bugs, and getting technical assistance |

### 📚 6. Examples {#examples}

Practical, ready-to-use scenes covering every scenario from basics to advanced API usage.

| ID   | Example Page                                                 | Key Learning Point                                           |
| :--- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| 00   | [**Quick Start**](../examples/00-quick-start.md)             | The minimal workflow for creating, raising, and binding an event |
| 01   | [**Void Event**](../examples/01-void-event.md)               | Using parameterless signals for global triggers like "Level Start" |
| 02   | [**Basic Types Event**](../examples/02-basic-types-event.md) | Passing primitive data (int, float, string) through events   |
| 03   | [**Custom Type Event**](../examples/03-custom-type-event.md) | Leveraging CodeGen for serialized custom data classes and structs |
| 04   | [**Custom Sender Event**](../examples/04-custom-sender-event.md) | Using source-aware events to identify which entity raised the signal |
| 05   | [**Priority Event**](../examples/05-priority-event.md)       | Precisely controlling the execution order of multiple listeners |
| 06   | [**Conditional Event**](../examples/06-conditional-event.md) | Using predicates to execute callbacks only when criteria are met |
| 07   | [**Delayed Event**](../examples/07-delayed-event.md)         | Managing timed logic and using Task Handles for cancellation |
| 08   | [**Repeating Event**](../examples/08-repeating-event.md)     | Creating recurring pulse signals and automated logic loops   |
| 09   | [**Persistent Event**](../examples/09-persistent-event.md)   | Handling events during scene transitions (DontDestroyOnLoad) |
| 10   | [**Trigger Event**](../examples/10-trigger-event.md)         | Bridging Unity's Physics system with Game Event assets       |
| 11   | [**Chain Event**](../examples/11-chain-event.md)             | Building visual sequential logic using the Flow Orchestration graph |
| 12   | [**Multi Database**](../examples/12-multi-database.md)       | Isolating events into different assets for modular project organization |
| 13   | [**Runtime API**](../examples/13-runtime-api.md)             | Registering and unregistering listeners dynamically via C# scripts |
| 14   | [**Runtime Monitor**](../examples/14-runtime-monitor.md)     | Using profiling tools to debug execution timing and GC allocations |

:::tip Navigational Tip
For a hands-on start, we recommend following **Example 00 (Quick Start)** first, then exploring the **Visual Workflow** section to see how the editor tools can streamline your development.
:::
