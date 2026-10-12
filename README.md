# Spotter

A personal trainer in your pocket, for the gym you actually go to. Spotter is a prototype
of a beginner-friendly fitness app: it asks a few questions, builds a plan around your
week, walks you through every machine, sorts out what to eat (even when you eat out), and
checks in like a real coach would.

It runs as a web app (no App Store needed). On an iPhone you add it to the Home Screen
and it opens full screen like a normal app.

## How it's laid out

Four tabs, each with one job. Today only shows what matters right now; everything else is
one tap away, behind a row that opens (a "dropdown") or a sheet that slides up.

| Tab | What's there |
|---|---|
| **Today** | Your next session (start, preview, or move it), the coach's latest message with one-tap replies, this week's two rings (train and eat well), your goal countdown and the next reward. |
| **Train** | This week's sessions, the whole plan a week per dropdown, progress (sessions, weeks on target, your biggest lift jump, awards), the exercise guide, your gym and a pack-your-bag list. |
| **Eat** | A one-tap check-in for today, **Eating out** (type the restaurant and the menu comes up with three orders already picked), this week's five dinners from the food you eat, and short plans for big meals (family events, parties, takeaway, weekends). |
| **Coach** | A message thread with your coach. It checks in first (session day, the evening, Friday, Sunday, a missed session), every answer leads to a sensible follow-up, and replies can change the plan: move, shorten or ease a session, log food, pick an order. |

**Search** sits at the top of Today, Train and Eat. Before you type, it suggests what you're
likely after right now (today's session, eating out in the evening, the weekend on a
Friday) and what you use most. It finds sessions, exercises, meals, restaurants, coach
topics and settings, and if nothing matches it offers to pick your order at that place or
ask your coach.

### Eating out

Type a place ("Italian Bowl Newtown") on the Eat tab, in search, or to the coach ("I'm going
to Italian Bowl in Newtown for dinner"). Spotter works out the cuisine and shows the
menu with three picks, why each one works and a tip for ordering it, plus what else is fine
and what to save for a treat. **Lock it in** and the coach checks how it went that night.
Picks come from a typical menu for that cuisine (16 covered: Italian, pizza, Japanese,
ramen, Thai, Chinese, Vietnamese, Indian, Mexican, Middle Eastern, Greek, Korean, pub,
burgers, charcoal chicken, cafe). In the claude.ai preview you can also **scan their menu**:
snap a photo and Claude picks the three best dishes from what that restaurant actually serves.

### The guided session

Full screen, one step at a time: a checklist (puffer reminder for asthma), a warm-up timer,
then each machine with today's weight and the reason, set-up steps behind a dropdown, one-tap
set logging, a rest timer that stays out of the way, "machine taken?" swaps, saved seat
settings and your own machine photos. After the sets, "how did that feel?" sets next time's
weight. The coach rides along: the chat button knows which machine you're on.

### Keeping you going

The two weekly rings close as you train and eat well; a perfect week closes both. Awards are
metal medals earned for real milestones (first session, first week, stronger, smart order,
ten sessions, halfway, finish line). Rewards set by someone close to you unlock at weeks 2, 4
and 6. Sounds are soft, short chimes (they can be turned off), with iPhone haptics on taps.

### Placeholders (coming with the full app)

- **Machine photos and their exact spot in each gym.** These arrive once a gym is mapped in person. Until then each machine shows a drawing, and you can add your own photo.
- **Real restaurant menus** for places you name (menu scanning works in the claude.ai preview).
- **A live human coach**, notifications, accounts and syncing between phones (everything is stored on the phone for now).
- **Progress that travels between gyms**: matching machines across gyms so your progress carries over.

## Open it on an iPhone

1. Open the GitHub Pages link in **Safari** (see *Publishing* below).
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open Spotter from the Home Screen.

Adding it to the Home Screen matters: Safari can clear data for websites you haven't
opened in a while, but not for Home Screen apps. You can also copy a backup code from
*Profile → Your data*. Anyone who tried the first prototype keeps their profile and history:
it's carried over automatically.

## Trying it out quickly

- **Try it with example answers** on the welcome screen fills in a sample profile.
- In *Profile → Prototype tools*:
  - **Fill in two weeks** pretends the plan started two weeks ago.
  - **Pretend today is** jumps ahead a few days so you can see how the plan and the coach react.
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
  (`dist/spotter-preview.html`) for a claude.ai preview link. There, anything the coach
  doesn't have a conversation for goes to Claude, and menu scanning is switched on.

## Where things live

```
spotter/
  index.html             App page
  css/app.css            Design system (light and dark) and every screen
  js/data.js             Content: exercises and set-up steps, gyms, cuisines, dinners,
                         restaurant menus, meal plans, screening questions, awards
  js/core.js             State, dates, icons, machine drawings, rings, medals, sheets,
                         sounds and haptics
  js/engine.js           Plan builder, weight suggestions, weekly goals, what's up next,
                         when the coach checks in, restaurant matching, search
  js/coach.js            The coach's conversations, the actions replies can take, and
                         Claude in the preview
  js/onboarding.js       Onboarding questions and the plan build and reveal
  js/views.js            The four tabs, search and the sheets
  js/session.js          The guided gym session
  js/app.js              Boot, navigation, awards and actions
  manifest.webmanifest   Home Screen app details
  service-worker.js      Offline support (bump CACHE_VERSION after changes)
tools/
  make_icons.py          Regenerates the app icons (needs Pillow)
  build_preview.py       Single-file bundle for the claude.ai preview
```

Most changes after a coach review or a gym-mapping visit only touch `spotter/js/data.js`
(exercise cues, which machines a gym has, dinners and menus) or `spotter/js/coach.js`
(what the coach says).

## Notes

- General fitness and healthy-eating guidance only. It doesn't replace advice from a GP.
  Screening questions follow the Adult Pre-Exercise Screening System (APSS V2, 2019).
- The earlier calorie counter (CalTrack) is kept in `CalTrackapp.zip`.
