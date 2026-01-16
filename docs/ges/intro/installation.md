---
sidebar_label: 'Installation'
sidebar_position: 3
---

import Tabs from '@theme/Tabs';

import TabItem from '@theme/TabItem';

import VideoGif from '@site/src/components/Video/VideoGif';



# Installation

Welcome aboard! Setting up the **Game Event System** is a streamlined process designed to get you up and running in less than 5 seconds.

 <VideoGif src="/video/game-event-system/installation.mp4" />

 :::tip 

The video above shows the entire process from import to initialization. For a detailed breakdown of each step, see the guide below. 

::: 

------

## ✅ Prerequisites

Before installing, ensure your project meets the minimum requirements:

| Requirement           | Minimum Version   | Recommended             |
| :-------------------- | :---------------- | :---------------------- |
| **Unity Version**     | **2021.3 LTS**    | **2022.3 LTS** or newer |
| **Scripting Backend** | Mono or IL2CPP    | IL2CPP (for Production) |
| **API Compatibility** | .NET Standard 2.1 | .NET Standard 2.1       |

---

## Step 1: Import the Package

Depending on how you acquired the plugin, choose the appropriate import method:

<Tabs>
  <TabItem value="store" label="Via Package Manager" default>

  1.  Open Unity and go to **Window > Package Manager**.
  2.  Select **"My Assets"** from the dropdown.
  3.  Search for **"Game Event System"**.
  4.  Click **Download**, then **Import**.
  5.  When the file list appears, ensure **all files** are selected and click **Import**.

  </TabItem>
  <TabItem value="custom" label="Via .unitypackage">

  1.  Locate the `.unitypackage` file on your computer.
  2.  **Drag and drop** the file directly into your Unity **Project View**.
  3.  (Or go to **Assets > Import Package > Custom Package...**)
  4.  When the file list appears, ensure **all files** are selected and click **Import**.

  </TabItem>
</Tabs>

:::info Compilation Time
After importing, Unity will trigger a recompilation. This is normal. Wait for the loading bar to finish before proceeding.
:::

---

## Step 2: Open the System Dashboard

Once imported, access the main hub via the Unity toolbar:

```text
Tools > TinyGiants > Game Event System
```

:::tip Auto-Open

The first import will automatically open the GameEventSystem window

:::

### 🔍 Automatic Environment Check

Upon opening, the **System Information** panel (located at the bottom of the dashboard) will automatically scan your project environment.

![alt text](/img/game-event-system/intro/installation/install-step-2-sysinfo.png)

It verifies key compatibility metrics in real-time:

- **Unity Version**: Validates if you are on a supported version (Green check for 2021.3+).
- **Render Pipeline**: Auto-detects **Built-in**, **URP**, or **HDRP**. The plugin is compatible with all three.
- **Scripting Backend**: Displays whether you are running on **Mono** or **IL2CPP**.

:::tip Smart Detection
You don't need to configure anything manually. If you see Green Checks in this panel, your environment is ready.
:::

------

## Step 3: Initialize the System

When you first open the window, the system detects that your scene is missing the required managers.

### 1. The "Uninitialized" State

You will see a warning banner at the top of the dashboard:

> ⚠️ **Please initialize the system first.**

*(The action button will appear **Dark Blue**)*

![alt text](/img/game-event-system/intro/installation/install-step-3-uninitialized.png)

### 2. One-Click Setup

Click the **"Initialize Event System"** button.

The system performs the following automated tasks:

1. Creates a **Game Event Manager** GameObject (Singleton) in your scene.
2. Generates the default **GameEventDatabase** asset (if missing).
3. Generates the default **FlowContainer** asset (if missing).
4. Compiles the necessary C# generic types.

### 3. Success!

The button will turn **Green**, and the status text will read **"System Ready"**.

![alt text](/img/game-event-system/intro/installation/install-step-3-success.png)

---

## Step 4: Verify the Hierarchy & Components

To ensure everything is working correctly, look at your **Scene Hierarchy**. You should see a new GameObject:

> **🔹 Game Event Manager**

![alt text](/img/game-event-system/intro/installation/install-step-4-managers.png)

### The Component Stack

Select this object. In the Inspector, you will see it is pre-configured with a suite of manager components. Each component is a singleton-based manager responsible for a specific part of the event lifecycle.

![alt text](/img/game-event-system/intro/installation/install-step-4-manager.png)

| Component                      | Responsibility       | Key Features                                                 |
| :----------------------------- | :------------------- | :----------------------------------------------------------- |
| **GameEventManager**           | 👑 **The Core Brain** | Manages database loading, event lookups, and static state resets. This is the only mandatory component |
| **GameEventPersistentManager** | **Persistence**      | Manages events marked as "Persistent" that must survive scene transitions via `DontDestroyOnLoad` |
| **GameEventFlowManager**       | **Visual Scripting** | The execution engine for the Flow Graph. It coordinates the logic between Triggers and Chains |
| **GameEventSchedulerManager**  | **Time Logic**       | Handles time-based operations like `RaiseDelayed` and `RaiseRepeating` |
| **GameEventTriggerManager**    | **Fan-Out Logic**    | Manages "Trigger" nodes. When one event raises, it can trigger multiple target events simultaneously (Parallel) |
| **GameEventChainManager**      | **Sequential Logic** | Manages "Chain" nodes. Executes a series of events in order, supporting wait times and conditional breaks (serial) |

:::warning Modularity & Safety
This architecture is modular. Technically, you **can delete** specific managers (e.g., if you don't use Flow Graphs, you could remove the Flow, Trigger, and Chain managers) to minimize the scene footprint.

However, I **strongly recommend keeping the full stack attached**. These components:
1. Have **zero overhead** when idle (no Update loops).
2. Are required for the **Visual Workflow** to function.
3. Prevent "Missing Component" runtime errors if you later decide to use a Delayed Raise or a Flow Graph.

:::

------

## 🏁 Ready to Go!

Your system is now fully initialized and ready for production.

### Where to go next?

- **🎮 Create your first event**: Jump to the **[Game Event Creator](../visual-workflow/game-event-creator.md)** guide.
- **👀 See a working demo**: Open the **[00 Quick Start](../examples/00-quick-start.md)** example scene.
- **📚 Understand the tool**: Read about **[Game Event System](../visual-workflow/game-event-system.md)**.
