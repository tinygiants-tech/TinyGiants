---
slug: system-dashboard-guide
title: "System Dashboard Deep Dive: Your Event System's Mission Control Center"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tools, tutorial]
description: "The GES System Dashboard gives you a bird's-eye view of your entire event architecture. Learn every panel and shortcut."
image: /img/home-page/game-event-system-preview.png
---

Quick question: can you tell me how many events your project has right now? Not roughly. Exactly. How many are parameterless? How many use sender patterns? Which ones have Inspector-configured behaviors, and which ones are just floating around unconfigured?

If you're like most Unity developers I've worked with, the honest answer is "I have no idea." And that's not a personal failing — it's a tooling problem. Unity gives you a Project window and a search bar. That's it. When your event architecture grows past a couple dozen events, you're basically flying blind.

<!-- truncate -->

That's exactly why the Game Event System ships with a System Dashboard — a single window that acts as mission control for your entire event architecture. Think of it like the cockpit of an airplane. You don't need to check every instrument every second, but when you need information, it's right there at a glance.

In this post, I'm going to walk through every panel and shortcut in the System Dashboard, explain why each piece of information matters, and share how I use it in my daily workflow.

![System Dashboard Full](/img/game-event-system/visual-workflow/game-event-system/system-dashboard-full.png)

## Opening the Dashboard

You can access the System Dashboard through the Unity menu: `Tools > TinyGiants > Game Event System`, or use the keyboard shortcut if you've configured one. The window is dockable, so you can pin it next to your Scene or Game view — wherever makes sense for your layout.

The first time you open it, you'll see everything laid out in a vertical scroll view. The dashboard is read-mostly — it's not where you create or edit events. It's where you get your bearings and jump to the right tool for the job.

## System Info Panel: Know Your Environment

The top section of the dashboard displays your project's technical environment. This might seem trivial, but it's actually incredibly useful, especially when you're working across multiple projects or helping teammates debug issues.

The System Info panel auto-detects and displays:

- **Unity Version** — the exact version you're running (e.g., 2022.3.20f1)
- **Render Pipeline** — whether you're on Built-in, URP, or HDRP
- **Scripting Backend** — Mono or IL2CPP
- **Target Platform** — your current build target

Why does this matter for an event system? Because GES adapts its code generation and serialization strategies based on these settings. IL2CPP has stricter AOT compilation requirements, which affects how generic event types get generated. The render pipeline detection matters for the built-in integration examples. And knowing your target platform helps when you're debugging platform-specific event timing issues.

I can't tell you how many times someone has filed a bug report and the first question is "what's your scripting backend?" Now you don't even have to check — it's right there on the dashboard.

## Quick Access Shortcuts: One Click to Anywhere

![Quick Access](/img/game-event-system/visual-workflow/game-event-system/quick-access.png)

Below the system info, you'll find the Quick Access panel. This is a grid of buttons that jump you directly to the most-used parts of the GES toolchain. Instead of navigating menus or remembering window names, you just click.

The shortcuts typically include:

- **Open Event Editor** — jumps to the main event management window
- **Open Event Creator** — launches the batch event creation wizard (auto-generates code for custom types)
- **Open Behavior Window** — opens the visual behavior configuration for event responses
- **Open Flow Graph** — visual node-based event flow visualization
- **Open Code Generator** — access code maintenance tools (regenerate, clean up generated files)
- **Open Settings** — GES configuration and preferences

The beauty here is consistency. No matter which project you open, no matter how your editor layout is configured, the Quick Access panel is always the same. It becomes muscle memory after a few days — open dashboard, click the tool you need, get to work.

For new team members, this panel is a lifesaver. Instead of saying "go to Tools > TinyGiants > blah blah > sub-menu > thing," you just say "open the dashboard and click Event Editor." Done.

## Core Tools Section

![Core Tools](/img/game-event-system/visual-workflow/game-event-system/hub-core-tools.png)

The Core Tools section is where the dashboard really earns its keep. This panel gives you a visual overview of the four primary GES tools, each with a brief description and a launch button.

### Event Editor

The Event Editor is your main workspace for managing existing events. From here you can browse, search, filter, and organize every event in your project. The dashboard shows you a quick summary — how many events exist, how many databases you're using — and lets you jump straight in.

I think of the Event Editor as the "spreadsheet view" of your event architecture. It's where you go when you need to find something specific or get an overview of what exists.

### Event Creator

The Event Creator is where new events are born. The dashboard link takes you directly to the batch creation wizard, which lets you queue up multiple events of different types and create them all at once. If you've ever had to create 20+ events for a new feature, you know why this exists.

### Behavior Window

The Behavior Window is the Inspector-side configuration tool. This is where designers and gameplay programmers set up event responses without writing code — binding actions, configuring delays, setting up repeat loops, all from a visual interface. The dashboard provides quick access so you don't have to select a specific event asset first.

### Flow Graph

The Flow Graph is the visual representation of your event architecture — a node-based graph showing which events connect to which behaviors. It's incredibly useful for understanding the big picture, especially in complex systems where events trigger chains of other events.

## Code Tools Section

![Code Tools](/img/game-event-system/visual-workflow/game-event-system/hub-code-tools.png)

Below the Core Tools, you'll find the Code Tools section. These are the automated code generation and maintenance utilities that keep your codebase clean.

### Code Generator

The Code Generator is a maintenance tool for managing the C# boilerplate that GES generates for your custom event types. When you create events through the Creator (Event Editor > "+ New Event"), the Creator auto-generates all necessary code for custom types. The Code Generator is for maintenance tasks: regenerating code after version control merges, cleaning up after refactors, or resolving issues with generated files.

From the dashboard, you can launch the generator and see at a glance whether there are any pending types that need regeneration. This is particularly useful after pulling from version control — if generated files got out of sync, you'll know immediately.

When the Creator generates code for a custom type, it produces:

```csharp
// You define a custom type:
[System.Serializable]
public struct DamageInfo
{
    public float amount;
    public DamageType type;
    public Vector3 hitPoint;
}

// The Creator auto-generates when you create an event with this type:
// - GameEvent<DamageInfo> support
// - Serialization support
// - Editor drawer and property support
```

You don't write any of that boilerplate. The Creator handles it during event creation, and the Code Generator is there for maintenance if you ever need to regenerate or clean up.

### Code Cleaner

The Code Cleaner is the Code Generator's counterpart — it removes generated code for types that are no longer in use. When you delete an event type or refactor your data structures, the Cleaner identifies orphaned generated files and removes them.

This might not sound exciting, but orphaned generated code is a real problem in long-running projects. It causes compilation warnings, clutters IntelliSense suggestions, and can even cause build errors if the original types change. The Cleaner keeps things tidy.

## Release Notes Panel

The dashboard includes a release notes section that shows what's new in your current version of GES. This is more useful than you might think — when you update the plugin, you can immediately see what changed without having to visit an external website or dig through changelogs.

Release notes typically cover:

- New features and tools
- Bug fixes
- Performance improvements
- Breaking changes (if any) with migration notes
- Known issues

I recommend glancing at this section after every update. It takes 30 seconds and can save you from stumbling into a known issue or missing a new feature that solves a problem you've been working around.

## Support and Community Access

![Support Community](/img/game-event-system/visual-workflow/game-event-system/support-community.png)

The bottom section of the dashboard provides direct links to support and community resources. This includes:

- **Documentation** — opens the online docs in your browser
- **Discord Community** — join the developer community for questions and discussion
- **YouTube Tutorials** — video walkthroughs and deep dives
- **Asset Store Page** — for reviews, ratings, and updates
- **Email Support** — direct line to the TinyGiants team
- **GitHub** — source access and issue tracking

Having these links in the editor might seem trivial, but it removes friction. When you're stuck on something, you don't have to go find a bookmark or remember a URL. You just click the link from the dashboard. That small reduction in friction makes it more likely you'll actually reach out for help instead of banging your head against a problem for an hour.

## Daily Workflow Recommendations

After using the dashboard extensively across several projects, here's the workflow pattern I've settled into:

### Start of Day

Open the dashboard first thing. Glance at the system info to make sure nothing changed overnight (especially if CI/CD updated your project). Check if code generation is needed — this happens a lot after pulling from the repo.

### Before Starting a New Feature

Check the event count and existing categories. Many times, an event you need already exists under a slightly different name. The dashboard's summary helps you avoid duplicating events.

### During Development

Keep the dashboard docked but minimized. Use the Quick Access buttons to jump between tools as needed. The most common flow is: Dashboard > Event Creator (make events) > Event Editor (verify) > Behavior Window (configure responses).

### Before Code Review / PR

Open the dashboard and verify:
1. No pending code generation
2. No orphaned generated code (run Cleaner)
3. Event count makes sense for the feature you're submitting

### Before Builds

The system info panel confirms your build target and scripting backend. Run the Code Cleaner to remove any dead code. This is especially important for IL2CPP builds where unused generic instantiations can bloat binary size.

## Making the Dashboard Work for Your Team

Here's a practical tip: if you're working on a team, establish a convention that the System Dashboard is the first thing everyone opens when they start Unity. Make it part of your team's "morning checklist."

You'd be surprised how many integration issues get caught early just by having everyone glance at the dashboard. "Hey, the event count jumped by 40 overnight — who added those?" is a much better conversation to have at 9 AM than "why are there 40 mystery events in the build?" at 5 PM.

The dashboard isn't glamorous. It's not the flashiest tool in the GES toolbox. But it's the one that keeps you oriented. It's the difference between knowing your project's event architecture and hoping you know it.

## Wrapping Up

The System Dashboard is designed to be your first stop and your constant companion when working with GES. It gives you environment awareness, tool access, and project health information in a single, always-available window.

If you've been using GES without spending much time on the dashboard, I'd encourage you to dock it somewhere visible for a week. You'll be surprised how often you glance at it — and how much faster you navigate the toolchain when everything is one click away.

In the next post, we'll dive into the Event Creator's batch wizard and show you how to create dozens of events in under a minute. If you've been creating events one at a time, that post is going to change your life.

---

🚀 Global Developer Service Matrix

**🇨🇳 China Developer Community**
- 🛒 [Unity China Asset Store](https://tinygiants.tech/ges/cn)
- 🎥 [Bilibili Video Tutorials](https://tinygiants.tech/bilibili)
- 📘 [Technical Documentation](https://tinygiants.tech/docs/ges)
- 💬 QQ Group (1071507578)

**🌐 Global Developer Community**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord Community](https://tinygiants.tech/discord)
- 🎥 [YouTube Channel](https://tinygiants.tech/youtube)
- 🎮 [Unity Forum Thread](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub](https://github.com/tinygiants-tech/TinyGiants)

**📧 Support & Collaboration**
- 🌐 [TinyGiants Studio](https://tinygiants.tech)
- ✉️ [Support Email](mailto:support@tinygiants.tech)
