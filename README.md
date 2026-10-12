# Spotter

A personal trainer for the gym you actually go to. Spotter is a first prototype of a
beginner-friendly fitness app: it asks a few questions, builds a plan around your life,
walks you through every machine at your gym, keeps food simple, and celebrates every step.

It runs as a web app (no App Store needed). On an iPhone you add it to the Home Screen
and it opens full screen like a normal app.

## What's in the prototype

| Area | What it does |
|---|---|
| **Onboarding** | About three minutes, one question per screen. Goal and date (e.g. *Holiday in Turkey, 17 Dec*), your "why", experience, worries, the standard Australian pre-exercise screening (APSS), asthma, gym, days, time, cooking and food habits. The coach explains why it asks each question. |
| **Your plan** | Built from your answers: Session A and B on machines, scheduled on your days up to your goal date. Weeks 1–2 "learn the machines", then "build the habit", then "get stronger". |
| **Today** | One screen that always shows your **next step**: today's session, a missed session to catch up on, tonight's food check-in, Friday's weekend plan, Sunday's check-in, or a rest day. It changes with the day, the time and what you've logged. |
| **Guided sessions** | Full screen, one step at a time: checklist (puffer reminder for asthma), warm-up timer, each machine with set-up steps, what you should feel and what to avoid, suggested weight with the reason, one-tap set logging, rest timer, "machine taken?" swaps, saved seat settings, your own machine photos, and a "how did that feel?" rating that sets next time's weight. |
| **Food** | Simple daily check-in (on track, partly, off track), a weekly target of 5 on-track days, game plans for family gatherings, eating out, takeaway and weekends, lighter versions of the dishes you love (Persian and everyday) and a hand-portion guide. No calorie counting. |
| **Journey** | Countdown to your goal, plate levels (5 kg white → 25 kg red → gold), the road ahead with every session and your partner's rewards at weeks 2, 4 and 6, badges, and a progress line for every machine. |
| **Coach** | "Ask Spotter" on every screen. It knows where you are (e.g. on the leg press) and suggests the right questions. Pre-written answers on GitHub; real AI answers in the claude.ai preview. |
| **Rewards** | XP for every set, session, check-in and plan; badges; level-ups; five different celebration styles so it never gets stale; gentle sounds (can be turned off). |

### Placeholders (coming with the full app)

- **Machine photos and their exact spot in each gym.** These arrive once a gym is mapped in person. Until then each machine shows a drawing, and you can add your own photo.
- **Live human coach** and a fully open AI coach on the public site.
- **Notifications/reminders**, accounts and syncing between phones (everything is stored on the phone for now).
- **Progress that travels between gyms**: matching machines across gyms so your progress carries over.

## Open it on an iPhone

1. Open the GitHub Pages link in **Safari** (see *Publishing* below).
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open Spotter from the Home Screen.

Adding it to the Home Screen matters: Safari can clear data for websites you haven't
opened in a while, but not for Home Screen apps. You can also copy a backup code from
*You → Back up your progress*.

## Trying it out quickly

- **Preview with example answers** on the welcome screen fills in a sample profile.
- In *You → Prototype tools*:
  - **Fill example progress** pretends the plan started two weeks ago.
  - **Pretend today is** jumps ahead a few days so you can see how the next step changes.
  - **Start over** resets everything.

## Publishing

The app is plain HTML, CSS and JavaScript in `spotter/`. There is no build step.

- **GitHub Pages:** `.github/workflows/pages.yml` publishes `spotter/` whenever `main`
  changes. One-time setup: repo **Settings → Pages → Build and deployment → Source:
  GitHub Actions**. The site then lives at
  `https://mahannoorii.github.io/Calorie-Counting-App/`.
- **Run it locally:** `python3 -m http.server 8080 --directory spotter`, then open
  <http://localhost:8080>.
- **claude.ai preview:** `python3 tools/build_preview.py` bundles everything into one page
  (`dist/spotter-preview.html`) for a claude.ai preview link, where the coach can use real AI.

## Where things live

```
spotter/
  index.html             App page
  css/app.css            Design system (light and dark), screens and animations
  js/data.js             Content: exercises and set-up steps, gyms, food, game plans,
                         badges, levels, screening questions, coach answers
  js/core.js             State, dates, icons, machine drawings, sheets, sounds, confetti
  js/engine.js           Plan builder, weight suggestions, next-step prediction, rewards
  js/coach.js            Coach chat (pre-written answers, AI when available)
  js/onboarding.js       Onboarding questions and the plan build/reveal
  js/views.js            Today, Journey, Food, sheets and celebrations
  js/session.js          The guided gym session
  js/app.js              Boot, navigation and actions
  manifest.webmanifest   Home Screen app details
  service-worker.js      Offline support (bump CACHE_VERSION after changes)
tools/
  make_icons.py          Regenerates the app icons (needs Pillow)
  build_preview.py       Single-file bundle for the claude.ai preview
```

Most changes after a coach review or a gym-mapping visit only touch `spotter/js/data.js`:
exercise cues, which machines a gym has, food tips and coach answers.

## Notes

- General fitness and healthy-eating guidance only. It doesn't replace advice from a GP.
  Screening questions follow the Adult Pre-Exercise Screening System (APSS V2, 2019).
- The earlier calorie counter (CalTrack) is kept in `CalTrackapp.zip`.
