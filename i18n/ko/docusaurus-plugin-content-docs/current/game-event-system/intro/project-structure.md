---
sidebar_label: 'Project Structure'
sidebar_position: 2
---

# Project Structure

Understanding the file structure is crucial for maintaining a clean project lifecycle, ensuring safe upgrades, and managing version control effectively.

The **Game Event System** adheres to a strict **"Logic vs. Data" Separation Principle**.
This architecture ensures that updating the plugin (Core Logic) **never overwrites** your created events, graphs, or generated code (User Data).

---

## 📂 The Directory Tree

Below is the standard hierarchy. I use distinct icons to indicate the nature of each folder:

*   🛡️ **Immutable Core**: Never modify, move, or rename.
*   💾 **Mutable Data**: Your project data. Safe to commit, safe to modify.
*   🗑️ **Disposable**: Safe to delete for optimization.

```bash
Assets/
├── 📁 TinyGiants/                  # [CORE LOGIC] The immutable plugin root
│   └── 📁 GameEventSystem/
│       ├── 📁 API/                 # 🛡️ Interfaces & Public APIs
│       ├── 📁 Demo/                # 🗑️ Example Scenes & Assets (Safe to delete)
│       ├── 📁 Editor/              # 🛡️ Custom Inspectors & Window Logic
│       │   └── 📁 Icons/           # 🗑️ UI Textures (Delete for <1.2MB builds)
│       ├── 📁 Runtime/             # 🛡️ Core Engine & Event Types
│       ├── 📄 LICENSE.txt
│       └── 📄 Readme.txt
│
└── 📁 TinyGiantsData/              # [USER DATA] Your generated content sanctuary
    └── 📁 GameEventSystem/
        ├── 📁 CodeGen/             # 💾 Auto-Generated C# Classes
        │   ├── 📁 Basic/           # 🛡️ Primitive Types (Required)
        │   └── 📁 Custom/          # 💾 Your Custom Types (Auto-regenerated)
        ├── 📁 Database/            # 💾 Your Event Database Assets (.asset)
        └── 📁 FlowGraph/           # 💾 Your Visual Flow Graphs (.asset)
```

:::info Architecture Note
**TinyGiants** contains the tool itself (The Hammer).
**TinyGiantsData** contains what you build with it (The House).
:::

------

## ⛔ CRITICAL: The "Plugins" Folder Warning

:::danger DO NOT MOVE TO "PLUGINS"
You **MUST NOT** move the TinyGiants or TinyGiantsData folders into the standard Assets/Plugins/ directory.
:::

### Why is this critical?

1. **Compilation Order (Scripting Phase)**:
   Unity compiles the Plugins folder **before** your standard game scripts (Assembly-CSharp).
   - Our plugin needs to reference *your* custom classes (e.g., PlayerStats, InventoryItem) to generate events for them.
   - If the plugin sits in Plugins, it **cannot see your gameplay code**, leading to "Type Not Found" errors.
2. **Relative Path Dependencies**:
   The automated Code Generator and Database Manager rely on specific relative paths to locate assets. Breaking this structure may cause the "Hub" to lose track of your databases.
3. **Asset Protection Mechanism**:
   The plugin includes a background AssetProtector service. If it detects these folders being moved to Plugins, it will attempt to warn you or block the operation to prevent project corruption.

------

## 💾 Version Control (Git/SVN) Strategy

For teams working with Source Control, here is the recommended configuration:

| Folder Path                  | Strategy   | Reasoning                                                    |
| ---------------------------- | ---------- | ------------------------------------------------------------ |
| TinyGiants/                  | **Commit** | Contains the core plugin code required for the project to run. |
| TinyGiantsData/.../Database  | **Commit** | Contains your actual Event Assets. Critical data.            |
| TinyGiantsData/.../FlowGraph | **Commit** | Contains your visual logic graphs. Critical data.            |
| TinyGiantsData/.../CodeGen   | **Commit** | **Recommended.** While these *can* be regenerated, committing them ensures the project compiles immediately for other team members without needing to run the Wizard first. |

------

## 🧹 Optimization Guide: Deployment Strategy

The Game Event System is modular. Depending on your project stage, you can strip it down to reduce build size.

### Deployment Tiers

Use this table to decide what to keep:

| Tier            | Folder to Delete                 | Size Savings | Consequence                                                  |
| --------------- | -------------------------------- | ------------ | ------------------------------------------------------------ |
| **Development** | *Keep Everything*                | 0 MB         | Full experience with Demos and high-res UI.                  |
| **Production**  | TinyGiants/GameEventSystem/Demo/ | ~10 MB       | Removes examples. **Safe** for all projects once you know the basics. |
| **Minimalist**  | .../Editor/Icons/                | ~4 MB        | **UI degrades.** Custom icons disappear; Windows use default Unity styling. Logic remains 100% functional. |

### 📉 Extreme Compression (< 1.2 MB)

If you are building for ultra-lightweight platforms (e.g., Instant Games), you can achieve the **Minimalist** tier.

1. Delete the **Demo** folder.
2. Delete the **Icons** folder.
3. Ensure your **CodeGen/Custom** folder only contains event types you actually use. You can use the **[Cleanup Tools](../tools/codegen-and-cleanup.md)** to remove unused generated classes.

:::tip
For most PC/Mobile projects, **Level 1 (Deleting Demo)** is sufficient. I recommend keeping the **Icons** folder to maintain a pleasant workflow for your designers.
:::
