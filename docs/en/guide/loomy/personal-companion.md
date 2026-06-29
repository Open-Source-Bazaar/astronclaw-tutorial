# Hands-on: Build Your Personal AI Companion

People increasingly expect more from an AI assistant than one-off answers. They want a partner that gets to know them over time — one that remembers preferences, picks up the last conversation from any device, and proactively moves work forward based on their habits.

The good news: you don't need to build a complex memory system yourself. The **AstronClaw (cloud brain) + Loomy (desktop interface)** combo already provides the building blocks. This guide shows how to assemble them into a personal AI companion that's truly yours.

## What it's made of

| Role | Responsibility | Related docs |
| :--- | :--- | :--- |
| **AstronClaw (Cloud)** | An always-on brain that hosts models and skills, online 24/7 even when your computer is off | [Core Advantages](/en/guide/astronclaw/introduction), [Skills System](/en/guide/astronclaw/skills) |
| **Loomy (Desktop)** | The local interface that connects your files, apps, and messaging channels | [Introduction](/en/guide/loomy/introduction) |
| **AI Companion** | A collaboration persona with character that learns your rhythm | [AI Companions](/en/guide/loomy/companions) |
| **Knowledge Base** | Lets the companion securely access and remember your local materials | [Knowledge Base](/en/guide/loomy/knowledge-base) |
| **Scheduled Tasks** | Lets the companion proactively run workflows at set times | [Scheduled Tasks](/en/guide/loomy/scheduled-tasks) |
| **Remote Control** | Command it across devices via QQ / WeChat / Feishu / DingTalk | [Remote Control](/en/guide/loomy/remote-control) |

The three steps below assemble these capabilities into a companion that **remembers you, keeps up with you, and helps you proactively**.

## Step 1: Make it "remember" you

"Memory" isn't a single switch — it's an effect layered from three sources. Configure each layer and the companion will feel more and more like your own.

### 1. Lock in a collaboration style with a "Companion"

An AI companion gradually learns your rhythm through repeated collaboration. Pick one that fits how you work, or create a dedicated one:

> Create a "Daily Work Companion" for me: act as my personal assistant, speak concisely and directly, be results-oriented, know that I run a tech-content operation, and default to bullet points in replies.

Now you don't have to re-explain your context every time — the companion's persona is itself a long-lived profile "about you." See [AI Companions](/en/guide/loomy/companions) for how to create and adjust them.

### 2. Build up your materials with the "Knowledge Base"

Once you authorize your common folders, Loomy continuously scans and auto-categorizes your documents and images **locally** — effectively giving the companion a personal knowledge base it can consult anytime.

> Find last month's project retrospective in my knowledge base, and use its conclusions to help me draft this month's plan.

This way the companion's answers are grounded in your real history rather than generic advice.

> **Privacy note**: Scanning, categorization, and indexing all happen on your local device — content is never uploaded. See [Knowledge Base](/en/guide/loomy/knowledge-base).

### 3. Control cost and continuity with a "Custom Model"

If you already have a reliable model service, configure your own API Key in Loomy. With your own key, model calls usually don't consume Loomy points — a better deal for heavy long-term use. For setup and the points rules, see [Scheduled Tasks & Points](/en/guide/loomy/scheduled-tasks).

> **API Key safety**: Your key is stored only on your local device — Loomy never hosts or uploads it.

## Step 2: Continuity across devices

A personal companion proves its worth when "you leave but the work keeps going." This relies on AstronClaw's always-on cloud plus Loomy's remote control.

- **The cloud stays online**: AstronClaw runs 24/7 in the cloud, independent of whether your computer is on — the foundation for being "reachable anytime."
- **Drive it from messaging**: Connect QQ / WeChat / Feishu / DingTalk bots to Loomy, then trigger tasks, check progress, and retrieve results with a single message from your phone. See [Remote Control](/en/guide/loomy/remote-control).

A typical flow: in the morning you queue a tidy-up task from the desktop; after you leave at noon you ask via WeChat, "Did the tidy-up task finish? Send me the result," and the companion sends it back.

> **Prerequisite**: Both remote control and scheduled tasks require Loomy to **keep running in the background** on your local device. If the app is fully quit, tasks won't trigger.

## Step 3: Let it work proactively — a "Daily Digest & Planner"

Put the "memory" from the first two steps to work, combine it with scheduled tasks, and you get a companion that acts on its own. Here's a ready-to-copy example.

**Goal**: Every morning at 8:00, have the companion combine your knowledge base and yesterday's progress to produce today's digest and plan, then push it to you via a remote channel.

**Sample scheduled-task prompt**:

> Run every day at 8:00 AM:
> 1. Summarize today's weather for my city and 3 noteworthy tech headlines;
> 2. Look up my recent "weekly plan" document in the knowledge base and list what I should push forward today;
> 3. Scan unread emails and flag the ones that need a reply today;
> 4. Compile the above into a "Today's Digest" card and send it to me via the WeChat bot.

This chains several capabilities into one personalized workflow:

* **Proactive**: triggered on schedule — no need to ask every day.
* **Memory**: reads your real plans and history from the knowledge base.
* **Personalized**: the companion organizes output per the persona and preferences you set.
* **Cross-device**: the result is pushed straight to your phone, even away from your desk.

> **Tip for reliable runs**: For tasks with multiple steps or external tools, **run it manually once** first to confirm permissions and tools are ready, then turn it into a scheduled task. This significantly reduces drift during automated runs.

## Going further

* **Multiple companions**: keep different companions per scenario — a steady one for work retrospectives, a creative one for brainstorming. Switching companions means switching collaboration styles.
* **From manual to automated**: polish a workflow in everyday chat first, then freeze it into a scheduled task for the highest success rate.
* **Use the search popup**: summon the [search popup](/en/guide/loomy/knowledge-base) with a shortcut to hand a task to your companion from any screen.

## FAQ

**Does the companion really "remember" what I said?**
Its "memory" comes from three places: the persona settings (which lock in your collaboration preferences), the knowledge base (your authorized local materials), and task/conversation context. Configure the first two well and you'll reliably get the "knows you better over time" experience — without relying on any single memory switch.

**Does the knowledge base upload my files to the cloud?**
No. After authorization, scanning, categorization, and indexing all happen locally, and content is used only for local retrieval.

**Can I use it after leaving my computer?**
You can view and trigger tasks. AstronClaw's always-on cloud keeps it "reachable," but actual local task execution still requires Loomy running in the background on your device.

## Related reading

* [AI Companions](/en/guide/loomy/companions)
* [Knowledge Base](/en/guide/loomy/knowledge-base)
* [Scheduled Tasks & Points](/en/guide/loomy/scheduled-tasks)
* [Remote Control](/en/guide/loomy/remote-control)
* [Scenarios](/en/guide/loomy/scenarios)
* [AstronClaw Core Advantages](/en/guide/astronclaw/introduction)
