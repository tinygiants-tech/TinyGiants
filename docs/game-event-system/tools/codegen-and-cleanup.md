---
sidebar_label: 'Code Gen & Cleanup'
sidebar_position: 1
---

# Code Generation & Maintenance

To achieve maximum performance and **perfect Unity Inspector integration**, the **Game Event System** relies on concrete C# classes for your specific data types.

While `GameEvent<T>` is powerful, Unity's Inspector (`UnityEvent`) cannot serialize generic types directly. This toolset automates the creation of these wrapper classes, ensuring your custom data types (structs, classes, enums) appear natively in the Inspector without you writing a single line of boilerplate code.

## 🚀 Accessing the Tools

These utilities are located within the **[Game Event System](../visual-workflow/game-event-system)**, you can access through the following method:

**From the System Dashboard:**

```
Game Event System Window → Click "Generate/Clean Game Event Code" or "Clean All Game Event Code"
```

![alt text](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

---

## 📂 The Architecture

Before using the tools, it is important to understand where your code lives. The system strictly separates **Core Logic** from **User Data** to ensure you can upgrade the plugin without losing your generated files.

```text
Assets/
├── 📁 TinyGiants/                  # [CORE LOGIC] The immutable plugin root
│   └── 📁 GameEventSystem/
│
└── 📁 TinyGiantsData/              # [USER DATA] Your generated content sanctuary
    └── 📁 GameEventSystem/
        └── 📁 CodeGen/             # 💾 Auto-Generated C# Classes
            ├── 📁 Basic/           # 🛡️ Primitive Types (Required System Files)
            └── 📁 Custom/          # 💾 Your Custom Types (Managed by Tools)
```

:::info **Project Structure**

You can refer to the previous chapter **[Project Structure](../intro/project-structure.md)** to gain a detailed understanding of the structure of the entire project directory

:::

:::danger Do Not Modify the 'Basic' Folder
The `TinyGiantsData/GameEventSystem/CodeGen/Basic` folder contains essential system types (Int, Float, Bool, String, etc.).

**Never manually delete or modify files in this folder.** 

If you accidentally delete the Basic folder or if the system reports missing basic types (like Int32GameEvent), you can self-repair the environment.

1. Open the **Game Event System** (`Tools > TinyGiants > Game Event System`).
2. Click the **Initialize Event System** button at the top of the window.
3. The system will:
   - Re-create the directory structure.
   - Regenerate all missing Basic Type codes.

:::

------

## 📝 Understanding Generated Code

When you generate code for a type (e.g., int or a custom `DamageInfo` struct), the tool creates a file containing two critical parts:

1. **The Event Class**: A concrete wrapper (e.g., Int32GameEvent) inheriting from `GameEvent<T>`.
2. **The Binding Field**: A partial class extension for `GameEventManager` that adds a `UnityEvent<T>` field, allowing the Inspector to bind listeners via reflection.

### Example: Basic Type (Int32)

```csharp
// =============================================================
// BASIC GAME EVENT - AUTO GENERATED
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. The ScriptableObject Class
    public class Int32GameEvent : GameEvent<int> { }
    
    // 2. The Inspector Binding
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<int> Int32GameEventAction;
        }
    }
}
```

### Example: Custom Sender Type

For events that carry both a **Sender** and **Arguments**:

```csharp
// =============================================================
// CUSTOM SENDER GAME EVENT - AUTO GENERATED
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. The ScriptableObject Class
    public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }
    
    // 2. The Inspector Binding
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
        }
    }
}
```

------

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## ⚡ Code Generator Tool

The **Game Event Code Generator** features a tabbed interface allowing you to switch between simple single-parameter events and complex sender-argument events. Both modes support **batch queuing**, meaning you can setup multiple types and generate them all at once.

<Tabs>
  <TabItem value="single" label="Single Parameter" default>

  ![Code Generator - Single Parameter](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

  Use this mode for events that carry a single data payload (e.g., `GameEvent<float>` or `GameEvent<MyClass>`).

  1.  **Quick Add**: Use the dropdown to quickly add standard C# types (Double, Long, Vector3, etc.).
  2.  **Search Custom Types**: Type the name of any class, struct, or enum in your project.
  3.  **Queue System**: Click **Add** to move types into the "Selected Queue".
  4.  **Batch Generate**: Click the green **Generate Code(s)** button to create files for all queued types simultaneously.

  </TabItem>
  <TabItem value="sender" label="With Sender">

  ![Code Generator - With Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_sender.png)

  Use this mode for events that need to know **who** triggered the event and **what** happened (e.g., `Player` sent `DamageInfo`).

  1.  **Select Sender Type**: Usually `GameObject` or a specific script (e.g., `PlayerController`).
  2.  **Select Argument Type**: The payload data (e.g., `DamageInfo`).
  3.  **Add Pair**: Creates a specific combination (e.g., `GameObject` → `DamageInfo`) and adds it to the queue.
  4.  **Batch Generate**: Generates all defined pairs in one operation.

  </TabItem>
</Tabs>

:::tip Automatic Compilation
After clicking "Generate", Unity will trigger a script recompilation. The new event types will be available in the **Create Asset Menu** and the **Event Editor** immediately after compilation finishes.
:::

---

## 🧹 Code Cleaner Tool

As your project evolves, you may delete old structs or refactor code, leaving behind unused GameEvent classes. The **Code Cleaner** mirrors the Generator's interface, allowing you to filter and batch-delete obsolete files safely.

It **only targets the Custom folder** (`TinyGiantsData/.../Custom`). It will never display or delete files from the `Basic` folder, protecting system integrity.

<Tabs>
  <TabItem value="single" label="Single Parameter" default>

  ![Code Cleaner - Single Parameter](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_single.png)

  Lists all custom generated files for `GameEvent<T>`.

  *   **Search & Filter**: Find files by type name (e.g., searching "Damage" will find `DamageInfoGameEvent.cs`).
  *   **Select All / Clear**: Quickly manage large lists.
  *   **Multi-Selection**: Tick individual files or use "Select All".
  *   **Delete**: The red **Delete All Selected Files** button removes the `.cs` files and their `.meta` files for all checked items.

  </TabItem>
  <TabItem value="sender" label="With Sender">

  ![Code Cleaner - With Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_sender.png)

  Lists all custom generated files for `GameEvent<Sender, Args>`.

  *   **Complex Filtering**: You can search by Sender name OR Argument name.
  *   **File Inspection**: Click the **Object Icon** 📦 next to any file to ping/highlight the script in the Project Window before deleting (useful to double-check references).
  *   **Batch Delete**: Safely removes multiple Sender-Event definitions in one click.

  </TabItem>
</Tabs>

------

## ☢️ Clean All (Reset)

The **Clean All Game Event Code** button is the "Nuclear Option".

- **Action**: Deletes **ALL** custom files in `TinyGiantsData/GameEventSystem/CodeGen/Custom`.
- **Preservation**: It **preserves** the Basic folder.
- **Use Case**: Use this when you want to perform a hard reset of your custom events or if you have refactored a large number of types and want to regenerate only what is currently needed.

