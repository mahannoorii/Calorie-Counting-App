# Spotter

A personal trainer in your pocket, for the gym you actually go to. Spotter is a prototype
of a fitness app for anyone from day one to year five: it asks a few questions, builds a
program around your experience, your week and your gym's equipment, walks you through every
session, tracks your records and sorts out what to eat (even when you eat out).

It runs as a web app (no App Store needed). On an iPhone you add it to the Home Screen
and it opens full screen like a normal app.

## How it's laid out

Four tabs, each with one job. Today only shows what matters right now; everything else is
one tap away, behind a row that opens (a "dropdown") or a sheet that slides up.

| Tab | What's there |
|---|---|
| **Today** | Your next session (start, preview, or move it), the coach's latest message with one-tap replies, this week as a barbell (a plate on the left for each session, on the right for each good food day), your goal countdown and the next reward. |
| **Train** | This week's sessions, the whole plan a week per dropdown, progress (sessions, weeks on target, personal records, awards), the exercise library, your gym and its equipment, and a pack-your-bag list. |
| **Eat** | A one-tap check-in for today, **Eating out** (type the restaurant and the menu comes up with three orders already picked), this week's five dinners from the food you eat, and short plans for big meals. |
| **Coach** | A message thread with your coach. It checks in first, every answer leads to a sensible follow-up, and replies can change the plan. The camera button sends a photo of a menu. |

**Search** sits at the top of Today, Train and Eat. It finds sessions, all 171 exercises (by
name, nickname, muscle or equipment), meals, restaurants, coach topics and settings.

### Onboarding that follows your answers

Experience comes second, and everything after it adapts:

- **Never / a little / on and off / I lift regularly.** Beginners get extra guidance and
  machines first; experienced lifters get a real program.
- **Goals** for lifters include building muscle and strength; "confidence in the gym" is only
  offered to beginners.
- **What gets in the way** changes with experience. Beginners see "working out the machines"
  and "feeling watched"; lifters see "not enough time", "getting the most out of a short
  session", "stuck at the same weights". Each option says what it will change.
- **Focus areas** (lifters): extra sets for, say, back and shoulders.
- **Days a week:** 2–3 for someone new, up to 6 for a lifter, with the split shown as you pick.
- **Session length:** up to 90 minutes for lifters.

The reveal shows **how your answers shaped the plan**: the split, your gym, supersets, lighter
weeks, new exercises every four weeks, a longer warm-up for asthma, and so on.

### Plans that fit you

| Days | New to the gym | Experienced |
|---|---|---|
| 2 | Full body A and B | Full body A and B |
| 3 | A and B alternating | Full body A, B and C |
| 4 | Upper and lower | Upper and lower |
| 5 | | Upper, lower, push, pull, legs |
| 6 | | Push, pull, legs, twice |

Each session is a list of movement patterns (squat, hinge, press, row, pulldown, and so on).
The builder fills each one with the best exercise **your gym has**, at your level, in your
style (mostly machines, a mix, or mostly free weights), spreading moves across sessions so
they don't repeat. Then:

- **Sets and reps** follow your goal: 4 × 4–6 for a strength-focused lifter, 4 × 6–10 for
  muscle, 3 × 10–12 to learn the machines.
- **Supersets** when time matters: two moves back to back (never two that need the same big
  station or the same muscle), and the guided session switches between them for you.
- **A lighter week every fourth week** for lifters, or anyone whose progress has stalled.
- **New exercises every four weeks** if the routine gets boring.

### Your gym

The gym step searches a directory of 52 gyms around Sydney (mostly the north-west, plus the
CBD), by name or suburb, or **near you** using your location, with a map of distances. You
can also add a gym that isn't listed, or choose "I train at home".

Equipment comes in layers, and the app is honest about which is which:

1. **Listed on the club's own page** (researched for the four Anytime Fitness clubs used so far:
   Rouse Hill North, North Kellyville, Box Hill and Circular Quay).
2. **Mentioned online** (for example, the club's socials mention Hammer Strength plate-loaded machines).
3. **Typical for the chain** (14 chains researched: Anytime, Snap, Plus, Fitness First, Jetts,
   World Gym, Crunch, Virgin Active and more).
4. **Assumed**: the machines nearly every gym floor has, because Australian club pages list
   cardio and free weights but rarely individual machines.

You confirm it with one tap per item. In a session, "Machine taken?" has **Not at this gym**,
and the plan swaps that machine out everywhere.

### The guided session

Full screen, one step at a time: a checklist (puffer reminder for asthma), a warm-up timer,
then each exercise with today's weight and the reason, set-up steps, one-tap set logging and a
rest timer. **Type any weight exactly** (tap the number: 42.25 kg works) or use the steppers,
whose jump you set per machine (0.25 kg to 5 kg). Beat your best, even by 0.25 kg or one rep,
and a **personal record** lands with a stamp, a burst of light and the gain. Records show in
the summary, the coach's debrief, Progress and each exercise's page.

### Eating out

Type a place on the Eat tab, in search or to the coach, and the menu comes up with three picks,
why each one works and **what to ask for** (dressing on the side, grilled not fried, salad
instead of chips). In the claude.ai preview you can **send a photo of the menu in the chat**
(the camera button, or "Send a photo of the menu" when the coach asks where you're going).
Claude picks the three best dishes for your goals from what that restaurant actually serves,
with the requests to make when you order.

### Keeping you going

The weekly barbell loads as you train and eat well; a fully loaded bar locks for a perfect
week. Awards are metal medals for real milestones (first session, first PR, ten records,
streaks, halfway). Rewards set by someone close to you unlock at weeks 2, 4 and 6.

### Placeholders (coming with the full app)

- **Live research for any gym.** The 52 gyms and 14 chains here were researched online on
  13 October 2026. A backend would run the same search the moment someone picks a new gym.
- **A real map.** The gym map is a schematic of real distances and directions, so it works offline.
- **Machine photos and their spot on the floor**, once a gym is mapped. Until then each
  exercise shows a drawing, and you can add your own photo.
- **Menu photos outside the preview** need a vision model behind the app.
- **A live human coach**, notifications, accounts and syncing between phones.

## Open it on an iPhone

1. Open the GitHub Pages link in **Safari** (see *Publishing* below).
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open Spotter from the Home Screen.

Adding it to the Home Screen matters: Safari can clear data for websites you haven't
opened in a while, but not for Home Screen apps. You can also copy a backup code from
*Profile → Your data*. Anyone already using Spotter keeps their plan and history: their gym
gets its researched equipment (plus anything they've already used there), and records are
worked out from the sessions they've logged.

## Trying it out quickly

- **Try it with example answers** on the welcome screen: as someone new to the gym, or as an
  experienced lifter.
- **Coming from Iron Log?** On the welcome screen (or *Profile → Your data*), pick an Iron Log
  backup file. Every logged session comes across with its weights, reps and personal
  records, and you can keep running your own program: it carries on from the session after
  your last one.
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
  doesn't have a conversation for goes to Claude, and menu photos are switched on.

## Where things live

```
spotter/
  index.html             App page
  css/app.css            Design system (light and dark) and every screen
  js/data.js             Content: onboarding options, cuisines, dinners, restaurant menus
                         (with what to ask for), meal plans, screening questions, awards
  js/exercises.js        171 exercises: the equipment each needs, movement pattern, level,
                         cues; the order the plan builder prefers them in
  js/gyms.js             52 Sydney gyms, 14 chains and what each is known to have,
                         suburb centres for "near me" (researched 13 Oct 2026)
  js/core.js             State, dates, icons, machine drawings, the weekly barbell, medals,
                         sheets, sounds and haptics
  js/engine.js           Your gym's equipment, the plan builder, weight suggestions,
                         personal records, weekly goals, coach check-ins, search
  js/coach.js            The coach's conversations, the actions replies can take, and
                         Claude in the preview (chat and menu photos)
  js/onboarding.js       Onboarding, the gym finder and map, the equipment check, the reveal
  js/views.js            The four tabs, search and the sheets
  js/session.js          The guided gym session, supersets and record celebrations
  js/import.js           Bringing history and a program over from Iron Log
  js/app.js              Boot, migration, navigation, awards and actions
  manifest.webmanifest   Home Screen app details
  service-worker.js      Offline support (bump CACHE_VERSION after changes)
tools/
  make_icons.py          Regenerates the app icons (needs Pillow)
  build_preview.py       Single-file bundle for the claude.ai preview
```

Most changes after a coach review or a gym visit only touch `spotter/js/exercises.js`
(exercise cues and preferences), `spotter/js/gyms.js` (what a gym has) or
`spotter/js/data.js` (food and menus).

## Notes

- General fitness and healthy-eating guidance only. It doesn't replace advice from a GP.
  Screening questions follow the Adult Pre-Exercise Screening System (APSS V2, 2019).
- Gym equipment comes from public pages, chain listings and member posts, checked on
  13 October 2026. Coordinates marked approximate are estimated from street addresses.
- The earlier calorie counter (CalTrack) is kept in `CalTrackapp.zip`.
