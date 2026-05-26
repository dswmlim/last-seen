<!-- static badges, no network needed -->
![status](https://img.shields.io/badge/status-playable-ff5d8f)
![deps](https://img.shields.io/badge/dependencies-0-54e0c8)
![offline](https://img.shields.io/badge/offline-100%25-ffd36e)
![tone](https://img.shields.io/badge/tone-PG--13%20%26%20kind-ff86ac)
![license](https://img.shields.io/badge/license-MIT-f6eefb)

# 💬 LAST SEEN

> **You're back on the apps. Eight dates, one evening. Who actually clicks?**
> A tiny, warm, funny texting-sim dating game that runs entirely offline in one HTML file. No dependencies, no network, no nonsense — just good banter, real choices, and an ending you'll want to re-roll.

![screenshot](docs/demo.gif)

---

## ▶️ Run it (offline)

Just **double-click `index.html`**. That's the whole install.

```bash
git clone https://github.com/YOUR_USERNAME/last-seen.git
cd last-seen
open index.html        # macOS · xdg-open (Linux) · start (Windows)
```

No build step, no server, no internet. Everything — saves, badges, endings — lives in your browser's `localStorage`.

**Optional live demo:** Settings → Pages → deploy from `main` (root) →
`https://YOUR_USERNAME.github.io/last-seen/`.

---

## 🎮 How to play

A match texts you first. Over **eight little scenes** — the opener, the icebreaker, the overshare, making a plan, the actual date, a values moment, a wobble, and the goodnight — you reply by picking one of three options. Every reply nudges three meters:

- **✨ Chemistry** — the spark.
- **🔐 Trust** — the safety.
- **🎭 Vibe** — the fun.

Where those land (plus the flags you set along the way) decides which of **6 endings** you get, from *Genuine Connection* to *Left on Read*. A full run is **3–8 minutes**. Then you re-roll, because *what if you'd said the brave thing instead.*

**Spark fit:** before you start, choose your identity — a guy, a girl, or nonbinary. Each character has their own orientation, shown as a ✨ *spark potential* or 🤝 *friend energy* badge on the chat header. With a spark fit, Chemistry comes a little easier; without one, that warmth flows into Vibe instead and the evening naturally leans toward a genuine friendship. Either way you're never penalized — it's just a different, equally good story.

### Controls

| Action | Keyboard | Touch / Mouse |
| --- | --- | --- |
| Pick a reply | `1` `2` `3` | tap the option |
| Confirm seed / start | `Enter` | tap **Start** |
| Open badges & endings | — | 🏅 button |
| Close any panel | `Esc` | tap outside |
| Sound · Motion · Contrast | — | top-right toggles |

Every control is keyboard-reachable, choices auto-focus, and there are **high-contrast** and **reduced-motion** modes.

---

## ✨ Features

- 🗨️ **Texting-app feel** — chat bubbles, typing beats, a dusk-toned UI that looks like a phone you'd actually want to open.
- 🎲 **Seeded runs** — type a seed (or share one) and the *same evening* replays exactly. Great for "no way, watch THIS run."
- 🧑‍🤝‍🧑 **Play as you** — pick your identity (a guy, a girl, or nonbinary) and it actually matters: each of the six characters has their own orientation, so who sparks vs. who becomes a great friend shifts with your choice.
- 🌈 **Inclusive by default** — six dateable characters with their own pronouns and who-they're-into, all respected in the writing. A non-match is never a "fail" — it just leans toward friendship.
- 💞 **6 endings** — earned from your stats and choices, not luck.
- 🏅 **14 offline badges** — *Class Clown*, *Green Flag*, *Both Sides Now*, *Friend Energy*, *The Good Ending*, and more.
- 🪄 **Banter generator** — templated, tagged dialogue keeps runs feeling fresh without a novel's worth of script.
- ♿ **Accessible** — keyboard nav, ARIA labels, focus rings, 48px touch targets, contrast + motion toggles.
- 🔊 **Synth sound** — WebAudio blips, zero audio files, one-tap mute.
- 🌐 **100% offline** — no frameworks, no CDNs, no tracking. Your love life stays on your device.

---

## 💖 Consent-forward & kind by design

LAST SEEN is intentionally **PG-13, warm, and consent-forward**. The highest-scoring choices are the *emotionally healthy* ones: listening, repairing a misstep, being clear about what you want, and **leaving room for a no**. There's a whole badge (🟢 *Green Flag*) for it. No coercion, no harassment, no explicit content — just the genuinely good feeling of two people figuring out if they click.

---

## 🧬 Why it appeals to Gen X / Y / Z

**Gen X**
- Choose-your-own-adventure DNA: discrete choices, real consequences, a clean one-sitting story.
- No live-service nonsense — open it, play it, own your save. Done.

**Millennials (Gen Y)**
- The texting-sim format is peak nostalgia-meets-now (hello, every group chat you've ever agonized over).
- Snackable 5-minute runs with a "just one more" re-roll, like the Flash dating games you don't admit you played.

**Gen Z**
- Dry, self-aware humor and green-flag values baked into the *winning* path.
- Shareable seeds + badge brags = built-in "send this to the gc" energy.

---

## 🗺️ Roadmap

- [ ] Daily seed (everyone plays the same evening each day)
- [ ] 2 more characters + a "friends only" route expansion
- [ ] Choice-history recap on the result screen ("you were brave at the lull")
- [ ] Export your run as a sharable card (canvas → PNG)
- [ ] Localization-ready string table

---

## 🤝 Contributing

PRs welcome — the bar is **stay offline, stay kind**.

1. Fork → branch (`git checkout -b feat/new-ending`).
2. Add scenes/choices in the `SCENES` array, endings in `ENDINGS`, badges in `ACHIEVEMENTS` (all in `game.js`).
3. Keep the tone PG-13 and consent-forward; reward healthy choices.
4. Test keyboard + reduced-motion + contrast before opening the PR.

Great first issues: write new `BANK` banter lines, add a character, or design a new badge.

---

## 🛠️ Build notes (devlog)

- **Why texting?** It's the most universal romance UI on earth and it renders in plain DOM bubbles — no engine, no canvas, instant load. The medium *is* the nostalgia.
- **Banter generator over branching script.** Hard-branching every line explodes writing volume fast. Instead, choices carry a `react` tag (`warm`, `laugh`, `curious`…) and a small templated bank fills the response. Big variety, small word count, easy to extend.
- **Seeded RNG (mulberry32).** Same seed → same date → same banter order. It makes runs shareable and turns "luck" into something you can hand to a friend. Verified deterministic.
- **Delayed consequences.** Getting cold feet or doubling down quietly costs you Trust *next* scene, so choices echo instead of resolving instantly — it reads as emotional continuity.
- **Healthy = optimal, on purpose.** The math rewards listening, repair, and clarity. The "good ending" isn't a cheat code, it's just being a decent date. That was the whole design thesis.
- **Balance was tested, not vibed.** A script simulates best/worst/comedy playthroughs and checks that all 6 endings are reachable and every stat combination resolves — no dead ends.

---

## 📣 Social blurb

> 💬 LAST SEEN — a tiny offline dating sim where you text your way through eight little dates in one evening. Warm, funny, PG-13, green-flags-as-the-meta. Runs in one HTML file, zero dependencies. Share a seed, compare endings. What did you get? 👉 [repo link]

---

## 📄 License

[MIT](LICENSE) — fork it, reskin it, write your own dates. Just keep the notice and keep it kind.
