---
slug: system-dashboard-guide
title: "System Dashboard Deep Dive: Your Event System's Mission Control Center"
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tools, tutorial]
description: "The GES System Dashboard gives you a bird's-eye view of your entire event architecture. Learn every panel and shortcut."
image: /img/home-page/game-event-system-preview.png
---

Pop quiz. How many events does your Unity project have right now? Not ballpark. Exactly. How many are parameterless? How many carry data? Which ones have receivers configured in the Behavior Window, and which ones are floating around with nothing listening? Which events are being raised but have zero responses? Which were created six months ago by someone who left the team and nobody knows if they're still used?

If you're being honest, the answer to most of those questions is "I have absolutely no idea." And here's the thing -- that's not your fault. It's a tooling gap that basically every Unity project falls into once it grows past a certain size.

<!-- truncate -->

I want to talk about a problem that doesn't get enough attention in Unity development: observability. Specifically, the complete lack of observability over your event architecture. We build these sophisticated event-driven systems, layer our entire game logic on top of them, and then have essentially zero visibility into what we've built. It's like constructing a building and then bricking over all the windows.

## Flying Blind: The Observability Problem in Unity

Let's set the scene. You're six months into a project. The codebase has grown organically, as codebases do. Different programmers have added events as they needed them. The combat team created their events. The UI team created theirs. The audio programmer set up a bunch of events for sound triggers. The AI team has their own set.

Now someone asks a simple question: "Can we get a list of all the events in the project?"

And the room goes quiet.

In Unity, what tools do you actually have for answering this question? You have the Project window. You can search for ScriptableObject assets if your events are asset-based. You can use Ctrl+F across your codebase to find event declarations. You can grep through files. And that's... basically it. There's no architectural overview. No bird's-eye view. No dashboard that says "here's everything, here's what's connected, here's what's orphaned."

This might sound manageable when you have 15 events. It becomes a nightmare at 150. And plenty of production games have 500+.

### The Hidden Costs of Not Seeing

The lack of event visibility creates problems that compound over time, and most teams don't even realize they're paying these costs because they've never had anything better.

**Duplicate events.** Without a central registry you can actually browse, different developers create events that do the same thing. You end up with `OnPlayerDied`, `OnPlayerDeath`, `PlayerDeathEvent`, and `OnPlayerKilled` -- four events for the same concept. Each has its own listeners, its own raise points, its own slightly different behavior. Merging them later is a refactoring nightmare.

**Orphaned events.** Features get cut, systems get refactored, but the events stick around. Nobody deletes them because nobody knows if something else depends on them. Over time, your project accumulates dead events that clutter searches, confuse new team members, and occasionally cause bugs when someone accidentally wires into an event that's no longer being raised.

**The "who's listening?" mystery.** An event fires. Something unexpected happens. You need to figure out what's responding to that event. In a traditional setup, this means searching the entire codebase for references -- and hoping that all listeners are registered in ways that are actually searchable. Dynamic listeners, reflection-based subscriptions, and Inspector-configured callbacks can all hide from a simple code search.

**Onboarding friction.** A new developer joins the team. "How does the damage system work?" Well, there's an event that fires when damage is dealt, and then various systems listen to it. Which event? Where is it? What listens to it? Good luck figuring that out from the Project window.

**Version control conflicts.** When multiple developers create events without knowing what already exists, you get merge conflicts, naming collisions, and duplicated work. A central overview would prevent most of these before they happen.

### The Traditional "Solutions" (That Don't Actually Work)

Teams try to solve this with process. Spreadsheets that track events. Wiki pages with event inventories. Naming conventions enforced through code review. README files in the events folder.

These all share the same fatal flaw: they go stale. The moment someone creates an event and forgets to update the spreadsheet -- which will be approximately the second time someone creates an event -- you have a single source of truth that's no longer true. Now you have something worse than no documentation: you have misleading documentation.

Code comments rot. Wikis get abandoned. Spreadsheets drift. The only documentation that stays accurate is documentation that's generated from the actual state of the system.

### What Other Domains Have Figured Out

Here's what frustrates me. This problem has been solved in virtually every other software domain.

Web developers have React DevTools, Vue DevTools, browser network panels. They can inspect their component tree, see what state lives where, watch events flow through the system in real-time.

DevOps engineers have Grafana, Datadog, New Relic. They build dashboards that show system health at a glance. If a service goes down or a metric spikes, they know within seconds.

Database administrators have admin panels that show table structures, query performance, index usage. They can see their entire data architecture from one screen.

Backend developers have message queue dashboards -- RabbitMQ Management, Kafka UI -- that show every topic, every consumer, every message in flight.

And game developers working with event systems have... the Project window and Ctrl+F.

We're building some of the most complex interactive software in existence, and our observability tooling for event architecture is basically nonexistent. That gap is what the GES System Dashboard exists to fill.

## The System Dashboard: A Central Command Center

The GES System Dashboard is a single editor window that acts as mission control for your entire event architecture. It's not where you create events or configure behaviors -- it's where you get oriented, assess project health, and jump to the right tool for whatever you need to do.

![System Dashboard Full](/img/game-event-system/visual-workflow/game-event-system/system-dashboard-full.png)

Think of it like the cockpit of an airplane. You don't stare at every instrument every second, but when you need information, it's right there at a glance. And when something's wrong, the instruments tell you before the passengers start screaming.

You access it through `Tools > TinyGiants > Game Event System`. I recommend docking it somewhere visible -- next to your Scene view or in a secondary tab. The more you see it, the more value it provides.

### Environment Info: Context That Actually Matters

![System Environment Dashboard](/img/game-event-system/intro/installation/install-step-2-sysinfo.png)

The top section displays your project's technical environment: Unity version, render pipeline, scripting backend, and target platform.

This might seem trivial, but it's not. GES adapts its code generation and serialization strategies based on these settings. IL2CPP has stricter AOT compilation requirements that affect how generic event types get generated. Your target platform matters when debugging event timing issues. And when someone files a bug report, the first three questions are always about environment -- now you don't have to go check.

If you work across multiple projects (and who doesn't these days), this panel saves you from the "wait, is this the IL2CPP project or the Mono project?" confusion that costs surprisingly real time.

### Quick Access: One Click to Anywhere

![Quick Access](/img/game-event-system/visual-workflow/game-event-system/quick-access.png)

Below the environment info, you'll find Quick Access shortcuts that jump you directly to key directories in your GES project structure. One click opens the folder in Unity's Project window:

- **Documentation** -- opens the GES documentation folder
- **API Scripts** -- jumps to the core GES API scripts
- **Databases** -- your event database assets
- **Flow Graph** -- flow graph container assets
- **CodeGen** -- generated code folder (Basic/ and Custom/ subfolders)
- **Demo Scenes** -- example scenes

GES stores its data across a specific directory structure (`Assets/TinyGiants/TinyGiantsData/GameEventSystem/`), and navigating nested Unity folders gets old fast. But the real value is for new team members. "Where are the event databases?" Click Databases. "Where's the generated code?" Click CodeGen. No guessing, no Slack messages asking for paths.

### Core Tools Hub: Your Daily Drivers

![Core Tools](/img/game-event-system/visual-workflow/game-event-system/hub-core-tools.png)

The Core Tools section provides a visual overview of the four primary GES tools, each with a brief description and a launch button.

**Event Editor** -- your main workspace for browsing, searching, filtering, and organizing every event in the project. This is the "spreadsheet view" of your event architecture. When you need to find a specific event, verify what exists, or get an overview of your event landscape, this is where you go.

**Event Creator** -- where new events are born. The dashboard link takes you to the batch creation interface, which lets you queue up multiple events of different types and create them all at once. (We'll cover this in depth in the next post.)

**Behavior Window** -- the Inspector-side configuration tool where designers and gameplay programmers set up event responses without writing code. Binding actions, configuring delays, setting up repeat loops -- all visual.

**Flow Graph** -- the visual representation of your event architecture as a node-based graph. Which events connect to which behaviors, where chains form, what the big picture looks like. Incredibly useful for understanding complex systems where events trigger cascades of other events.

### Code Tools Hub: Keeping the Machine Clean

![Code Tools](/img/game-event-system/visual-workflow/game-event-system/hub-code-tools.png)

Below the Core Tools, you'll find the Code Tools section -- the automated code generation and maintenance utilities.

**Code Generator** -- a maintenance tool for managing the C# boilerplate that GES generates for custom event types. When you create events through the Creator (Editor > "+ New Event"), the Creator auto-generates all necessary code. The Code Generator is for maintenance: regenerating after version control merges, cleaning up after refactors, or resolving issues with generated files. After pulling from a repo, if generated files got out of sync, this is where you fix it.

**Code Cleaner** -- the Code Generator's counterpart. It identifies and removes generated code for types that are no longer in use. Orphaned generated code causes compilation warnings, clutters IntelliSense, and can bloat IL2CPP builds. The Cleaner keeps things tidy.

### Support and Community

![Support Community](/img/game-event-system/visual-workflow/game-event-system/support-community.png)

The bottom section provides direct links to documentation, Discord, YouTube tutorials, the Asset Store page, email support, and GitHub. Having these links in-editor removes friction. When you're stuck on something at 11 PM, you don't have to find a bookmark -- you just click from the dashboard.

## The Daily Workflow This Enables

Here's what changes when you actually have a dashboard for your event architecture.

**Start of session.** Open the dashboard. Glance at the environment info, especially after pulling from the repo. Check if code generation needs attention -- this is common after merges where generated files get out of sync.

**Before starting a new feature.** Check the event count and existing categories. You'd be surprised how often the event you need already exists under a slightly different name. The dashboard's overview prevents duplicate creation.

**During development.** Keep the dashboard docked but minimized. Use the Quick Access buttons and Core Tools launchers to jump between tools. The most common flow is: Dashboard > Event Creator (make events) > Event Editor (verify) > Behavior Window (configure responses).

**Before code review.** Open the dashboard and verify: no pending code generation, no orphaned generated code (run Cleaner), event count makes sense for the feature you're submitting.

**Before builds.** The environment panel confirms your build target and scripting backend. Run the Code Cleaner to remove dead code -- especially important for IL2CPP builds where unused generic instantiations bloat binary size.

## It's Not Glamorous. It's Essential.

The System Dashboard isn't flashy. It doesn't have a cool node graph or slick animations. It's a panel with information and buttons.

But it solves a problem that every Unity project with more than a handful of events eventually hits: the inability to see your own architecture. It's the difference between knowing your project's event system and hoping you know it. Between catching issues at 9 AM ("hey, the event count jumped by 40 overnight -- who added those?") and discovering them at 5 PM ("why are there 40 mystery events in the build?").

If you're working on a team, I'd recommend making the dashboard the first thing everyone opens when they start Unity. A quick daily glance catches integration issues early and keeps everyone oriented.

The dashboard gives you something Unity has never provided: observability over your event architecture. And once you've had it, going back to flying blind feels genuinely uncomfortable.

In the next post, we'll dive into the Event Creator and show you how to go from a design doc with 50 events to a fully configured event set in under a minute.

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
