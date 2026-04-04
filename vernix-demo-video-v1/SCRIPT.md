# Vernix Demo Video v1 — Script & Production Guide

_Target length: 45–50 seconds_
_Format: 1920x1080, 30fps_
_Voiceover + background music + on-screen text_

---

## Scene Breakdown

### Scene 1 — Hook (0:00–0:04)

**VO:** "What if your meetings just answered back?"

**Visual:** Hero screenshot (chat-answer) fades in BIG, fills ~85% of the frame. Subtle ken burns zoom. Small caption below.

**On-screen:** "Ask anything. Get real answers."

**No logo. Product first.**

---

### Scene 2 — How It Works (0:04–0:10)

**VO:** "Paste a link. Vernix joins as a participant. No plugins, no extensions."

**Visual:** screenshot-create-meeting crossfades to screenshot-active-call at 45%. Platform logos (Zoom, Google Meet, Teams, Webex) appear below.

**On-screen:** "Paste a link. Vernix joins."

---

### Scene 3 — Live Transcript (0:10–0:16)

**VO:** "Every word is transcribed in real time — with speaker names."

**Visual:** screenshot-transcript, large, with subtle zoom.

**On-screen:** "Who said what. Always."

---

### Scene 4 — Hero: Live Answers (0:16–0:26)

**VO:** "During the call, ask Vernix anything. It pulls answers straight from your connected tools. Sprint status from Linear. Customer history from your CRM. Nobody leaves the call."

**Visual:** screenshot-chat-answer with subtle ken burns zoom. Question text in accent color above.

**On-screen:** "What issues do I have on Linear?"

---

### Scene 5 — Integrations (0:26–0:32)

**VO:** "Connect Slack, Linear, GitHub — dozens of integrations. Set it up once."

**Visual:** screenshot-integrations crossfades to screenshot-integration-cloud.

**On-screen:** "Connect once. Use everywhere."

---

### Scene 6 — After the Call (0:32–0:40)

**VO:** "When the call ends — summaries, action items, and semantic search across every call."

**Visual:** Quick montage — screenshot-summary → screenshot-tasks → screenshot-search. Each ~2.5s with 10-frame crossfades.

**On-screen:** "Summaries. Tasks. Search."

---

### Scene 7 — CTA (0:40–0:45)

**VO:** "Try Vernix free."

**Visual:** Icon logo + "Try Vernix free" + "vernix.app". Accent glow. Hold.

---

## Full Voiceover Script

~100 words, ~45 seconds at conversational pace.

```
What if your meetings just answered back?

Paste a link. Vernix joins as a participant. No plugins, no extensions.

Every word is transcribed in real time — with speaker names.

During the call, ask Vernix anything. It pulls answers straight from
your connected tools. Sprint status from Linear. Customer history from
your CRM. Nobody leaves the call.

Connect Slack, Linear, GitHub — dozens of integrations. Set it up once.

When the call ends — summaries, action items, and semantic search
across every call.

Try Vernix free.
```

---

## On-Screen Text Reference

```
Scene 1: "Ask anything. Get real answers."
Scene 2: "Paste a link. Vernix joins."
Scene 3: "Who said what. Always."
Scene 4: "What issues do I have on Linear?"
Scene 5: "Connect once. Use everywhere."
Scene 6: "Summaries. Tasks. Search."
Scene 7: "Try Vernix free" / "vernix.app"
```

---

## Screenshot Checklist

| #   | Filename                           | Scene |
| --- | ---------------------------------- | ----- |
| 1   | `screenshot-chat-answer.png`       | 1, 4  |
| 2   | `screenshot-create-meeting.png`    | 2     |
| 3   | `screenshot-active-call.png`       | 2     |
| 4   | `screenshot-transcript.png`        | 3     |
| 5   | `screenshot-integrations.png`      | 5     |
| 6   | `screenshot-integration-cloud.png` | 5     |
| 7   | `screenshot-summary.png`           | 6     |
| 8   | `screenshot-tasks.png`             | 6     |
| 9   | `screenshot-search.png`            | 6     |

---

## Style

- Dark mode only (`#1a1a1a` bg)
- Geist Sans font
- `spring({ damping: 200 })` for all motion — no bounce
- `fade()` transitions between scenes (10 frames)
- Screenshots: 16px radius, card shadow, 8% top crop (hides browser chrome)
- Subtle ken burns zoom (1.0→1.03) on held screenshots
- Accent color (violet) for question text and CTA glow
