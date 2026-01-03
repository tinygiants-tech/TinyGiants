---
sidebar_label: 'System Dashboard'
sidebar_position: 1
---

# System Dashboard

The **Game Event System Window** (The system dashboard) is your central command center. It is designed to provide a high-level overview of the plugin's status, quick access to core tools, and real-time environment telemetry.

Instead of hunting through project folders or menus, The dashboard brings every critical operation into a single, organized interface—all in one place.

## 🚀 Accessing the Dashboard

Open the dashboard via the Unity top menu:

```text
Tools > TinyGiants > Game Event System
```

:::tip First Time Setup
If this is your first time opening the dashboard, you'll be guided through an automatic initialization process. See **[Installation](../intro/installation.md)** for details.
:::

------

## 🗺️ Interface Overview

The dashboard is divided into specific functional zones. Below is a detailed breakdown of each section.

![alt text](/img/game-event-system/visual-workflow/game-event-system/system-dashboard-full.png)

### 1. 🚀 Initialization & Status

Located on the **Middle-Left**, this bar acts as the **Global Health Indicator** for the system.

- **Green Check**: The system is fully initialized. Core managers and databases are present.
- **Blue Action Button**: Critical components are missing (e.g., if the Manager object was accidentally deleted from the scene).

:::tip Quick Repair
If this bar turns Blue during development, simply click it to **Auto-Repair** the scene dependencies immediately. For the initial setup guide, refer to **[Installation](../intro/installation.md)**.
:::

------

### 2. ⚡ Core Workflow Tools

Located in the **Editor & Monitor** section, these are your daily drivers.

![alt text](/img/game-event-system/visual-workflow/game-event-system/hub-core-tools.png)

| Tool                                                    | Description                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| [**📝 Game Event Editor**](./game-event-editor.md)       | Opens the main management window to batch operations (create, delete, search, filter, and edit events). This is where you will spend 80% of your time. |
| [**📊 Game Event Monitor**](../tools/runtime-monitor.md) | Opens the runtime debugger. Use this during Play Mode to watch event execution in real-time, inspect listener call stacks, profile performance bottlenecks, and visualize flow graph automation exectuion. |

------

### 3. ⚙️ Code Maintenance Tools

Located in the **Tools & Utilities** section, these utilities manage the underlying C# generation system.

![alt text](/img/game-event-system/visual-workflow/game-event-system/hub-code-tools.png)

| Tool                                                         | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [**📜 Generate Game Event Code**](../tools/codegen-and-cleanup.md) | Manually triggers the code generator. Use this if you have added a new custom type (e.g., `GameEvent<MyCustomData>`) and need the concrete class generated immediately. |
| [**✂️ Clean Game Event Code**](../tools/codegen-and-cleanup.md) | Scan your project, find all GameEvent classes, and safely delete them to keep the project tidy. |
| [**🧹 Clean All Game Event Code**](../tools/codegen-and-cleanup.md) | A hard reset. Removes **ALL** generated code (except basic types). Use this only if you are reinstalling or refactoring significantly. |

:::tip Automation
The system is designed to auto-generate code when you create events via the Wizard. You rarely need to click "Generate" manually unless you are doing custom scripting work.
:::

------

### 4. ℹ️ System Telemetry
Located on the **Right**, this panel monitors your project environment in real-time.

It automatically validates your **Unity Version**, **Render Pipeline**, and **Scripting Backend** compatibility.

:::tip Environment Check
For a detailed explanation of what these metrics mean and how they affect the plugin, please refer to the **[Automatic Environment Check](../intro/installation.md#step-2-open-the-system-dashboard)** section in the Installation guide.
:::

------

### 5. 📂 Quick Access

Stop digging through the Project window. The **Quick Access** panel provides direct shortcuts to critical folders and assets.

![alt text](/img/game-event-system/visual-workflow/game-event-system/quick-access.png)

| Tool                | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| 📘 **Documentation** | Opens this local documentation.                              |
| 📜 **API Scripts**   | Selects the API folder in the Project View.                  |
| **🗄️ Databases**     | Selects the folder containing default database asset files.  |
| **🕸️ Flow Graph**    | Selects the folder containing default visual-graph asset files. |
| ⚙️ **CodeGen**       | Jumps to the generated code folder                           |
| **🎮 Demo Scenes**   | Quickly locate the examples folder.                          |

------

### 6. 🌐  Support & Community

I believe in strong support. Use this panel to connect with us.

![alt text](/img/game-event-system/visual-workflow/game-event-system/support-community.png)

| Tool                    | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| **💬 Discord Community** | Join our active server for real-time help and showcase.      |
| **📺 Video Tutorials**   | Watch step-by-step guides on YouTube.                        |
| **📧 Email Support**     | Please provide a complete description of the problem you encountered and provide detailed environmental information, I will reply to you within 24 hours every day if I am available. |
| **🛒 Asset Store**       | If you enjoy the plugin, a 5-star review helps us immensely! 🌟 |

:::tip Community First

Before emailing, check the **Discord #faq** channel—90% of common issues have existing solutions posted by the community!

:::

------

## 📝 Release Notes

This panel highlights the foundational pillars of **Game Event System v1.0.0**. This major release introduces a robust ecosystem for event-driven architecture, featuring:

![alt text](/img/game-event-system/visual-workflow/game-event-system/release-notes.png)

- **Core & Logic**: ScriptableObject-driven backend with high-performance Expression Tree compilation.
- **Visual Orchestration**: A powerful Node Graph for managing complex event dependencies and hybrid execution.
- **Workflow Automation**: Automated code generation, smart Inspector bindings, and batch processing tools.
- **Diagnostics**: Real-time monitors and performance profiling for deep system visibility.

:::tip View Details

Click **"View Full Details"** to explore the full technical changelog across all 7 major categories.

:::

------

## 🛠️ Troubleshooting

:::caution[Pre-flight Check]

Before troubleshooting, ensure there are no **Red Compiler Errors** in your Unity Console, as they will disable all editor-script functionality.

:::

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="dashboard" label="❌ Dashboard Won't Open" default>

> **Symptom:** The menu item is grayed out or the window fails to appear.

| Solution                | Action                                                       |
| ----------------------- | ------------------------------------------------------------ |
| **Check Compilation**   | Fix all script errors in the Console first.                  |
| **Clear Library Cache** | Close Unity → Delete Library/ folder → Reopen project to force re-index. |
| **Re-import Plugin**    | If scripts are missing, re-import the package from the Asset Store. |

</TabItem>
<TabItem value="alert" label="🔵 Status Indicator Issues">

> **Symptom:** Clicking "Initialize" does not turn the status icon green.

| Solution             | Action                                                       |
| -------------------- | ------------------------------------------------------------ |
| **Check Exceptions** | Look for any "Initialization Failed" errors in the Console   |
| **Naming Conflicts** | Ensure no other GameObject is named `GameEventManager` in your active scene |
| **Prefab Overrides** | If the manager is part of a prefab, ensure the instance isn't blocked by missing references. Delete the instance and re-initialize |

</TabItem>
<TabItem value="telemetry" label="🚩 Telemetry Alerts">

> **Symptom:** System requirements show a Red Cross ❌ in the telemetry panel.

| Issue | Fix / Requirement |
| :--- | :--- |
| **Unity Version** | Upgrade to **Unity 2020.3 LTS** or higher. |
| **API Level** | Switch to **.NET Standard 2.0** or **.NET 4.x** in Player Settings. |
| **IL2CPP Warning** | Ensure "Stripping Level" is not set to "High" to avoid losing generic metadata. |

</TabItem>
</Tabs>

------

## Next Steps

**🎨 Manage Existing Events**: Learn the [Edit Game Event](./game-event-editor.md) window features 

**📝 Create Your First Event**: Follow the [Create Game Event](./game-event-creator.md) guide 

**🎯 Raise Your First Event**: View the [Raise Game Event](./game-event-creator.md) guide 

**🕸️ Build Visual Flows**: Orchestrate complex event chains [Game Event Node Editor](../flow-graph/game-event-node-editor.md)

**📊 Debug in Play Mode**: Monitor runtime execution [Runtime Monitor](../tools/runtime-monitor.md)

------

:::tip[Pro Tip]
For the best experience, **Dock the Dashboard** as a tab next to your Inspector. This allows for instant access to search and debugging tools without disrupting your layout.
:::

