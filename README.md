# Spotter

A personal trainer in your pocket, for the gym you actually go to. Spotter is a prototype
of a fitness app for anyone from day one to year five: it asks a few questions, builds a
program around your experience, your week and your gym's equipment, walks you through every
session, tracks your records and sorts out what to eat (even when you eat out).

It runs as a web app (no App Store needed). On an iPhone you add it to the Home Screen
and it opens full screen like a normal app.

## How it's laid out

Five tabs, each with one job. Today only shows what matters right now; everything else is
one tap away, behind a row that opens (a "dropdown") or a sheet that slides up.

| Tab | What's there |
|---|---|
| **Today** | Your next session (start, preview, or move it), the coach's latest message with one-tap replies, this week as a barbell (a plate on the left for each session, on the right for each good food day), the gym you're at (one tap to switch), and your body weight. |
| **Train** | This week's and next week's sessions, your sessions in the order they repeat, progress (sessions, weeks on target, personal records, your biggest gain, awards), the exercise library, your gyms and their equipment, and a pack-your-bag list. Training is continuous: there's no end date or countdown, and new weeks are added as you go. |
| **Eat** | A one-tap food check-in for any day (tap a day of the week, or step back a week, to log or change days you missed), **Eating out** (type a restaurant or a dish and your order comes up already picked; with Claude it's looked up on the web, anywhere in the world), and short plans for big meals. |
| **Body** | Your weigh-ins, a chart with a trend line that smooths out daily swings (1M, 3M, 6M, 1Y or all; touch it to read any day), how fast you're gaining or losing each week and whether that suits your goal, an optional goal weight with when you'll get there, and every weigh-in to edit or delete. |
| **Coach** | A message thread with your coach. It checks in first, every answer leads to a sensible follow-up, and replies can change the plan. The camera button sends a photo of a menu. |

Today also reminds you about food: until today's food is logged (or yesterday's, in the
morning), a one-tap card sits under your next session, and when you open the app with days
from the last week still unlogged, a check-in asks about each one. Dismissed, it waits until
there's a new day to ask about.

**Search** sits at the top of Today, Train, Eat and Body. It finds sessions, all 171 exercises (by
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

You confirm it with one tap per item. In a session, "Machine taken?" has **Not at this gym**.

**More than one gym.** Tap the gym under your next session on Today (or *Your gyms* on
Train) to switch where you're training. Each gym keeps its own equipment, and your plan
never changes when you switch: on the day, anything the gym you're at doesn't have is stood
in for by the closest move it does have, and the preview, the session and Today say so
("Instead of the hip thrust machine, not at this gym"). Back at a gym that has it, the
original is back.

**Finding gyms and checking them, with Claude.** *Find gyms near me* uses your location and
Claude searches the web: every Anytime Fitness nearby first, then other gyms with a proper
weights floor, with address, hours and distance. Pick one and Claude checks what it has: it
reads the club's page, posts, reviews and gym listings, gives each piece of equipment a
status (seen at this club, probably there, not there), names the machines it spots, and
shows how your next session fits ("Leg press: seen at this club", "Hip thrust machine: not
possible here"). Equipment you've unticked yourself stays unticked. A check takes 30 to 60
seconds and costs roughly 10 to 30¢. Without Claude, you can still search Spotter's list of
Sydney gyms, find the nearest, or add a gym by hand.

### The guided session

Full screen, one step at a time: a checklist (puffer reminder for asthma), a warm-up timer,
then each exercise with today's weight and the reason, set-up steps, one-tap set logging and a
rest timer. **Type any weight exactly** (tap the number: 42.25 kg works) or use the steppers,
whose jump you set per machine (0.25 kg to 5 kg). Beat your best, even by 0.25 kg or one rep,
and a **personal record** lands with a stamp, a burst of light and the gain. Records show in
the summary, the coach's debrief, Progress and each exercise's page.

### The coach, powered by Claude

Out of the box the coach is a script: it checks in, and it understands a handful of phrases
("I'm sore", "can't make it", a restaurant name). Add your own Anthropic API key in
*Profile → Coach → Claude coach* and it becomes a real trainer:

- **It knows your training.** Every message carries your program, the next two weeks of
  sessions, your last ten sessions set by set, a line for every exercise you've logged (last
  session, best, estimated one-rep max and its trend over eight weeks), your gym's
  equipment and the last fortnight of eating. For deeper questions it pulls a lift's full
  history.
- **It reshapes your program.** Tell it your situation (an injury, a physio's advice, a new
  schedule, different equipment) and it adjusts everything to suit: renames sessions,
  changes their exercises, order, sets, reps and rest, caps a weight ("leg curl, 45 kg max")
  or adds a note shown during the session, adds or removes sessions, changes your training
  days and rotation, adds exercises the library doesn't have, updates your gym's equipment
  and switches which of your gyms you're at. It can also move, skip, ease or shorten one day, set next time's
  weight and reps, log food and weigh-ins, set a goal weight and put a restaurant's picks on
  screen.
- **It searches the web** when you ask about a specific restaurant, dish or place it doesn't
  know, finds the real menu and shows sources under its answer.
- **Every change shows** as a line in the chat, with an **Undo changes** button for the round.
- **It remembers.** Injuries, physio advice, limits and preferences go into notes it keeps
  between chats (listed, and removable, in *Profile → Coach → Claude coach*).
- If the coach has tailored your plan, *Change my plan* warns before rebuilding it from your
  answers.
- **It reads menu photos** on the live app too, not just in the claude.ai preview.
- **Replies stream in** like a text, with quick-reply chips when they help.

It runs on Claude Opus 5.5 by default (Sonnet 5.5 and Haiku 5.5 are options), with adaptive
thinking at medium effort, prompt caching and Anthropic's server-side fallback switched on.
Settings show this month's messages and roughly what they've cost. The key is stored only on
the phone, in its own storage slot, and is never part of a backup code; requests go straight
from the phone to Anthropic. That suits one person's own phone. Sharing the app with
others needs a small server to hold the key instead.

### Eating out

Type a place on the Eat tab, in search or to the coach, and the menu comes up with three picks,
why each one works and **what to ask for** (dressing on the side, grilled not fried, salad
instead of chips).

**With Claude switched on, it works anywhere.** Type a restaurant (or a dish you don't know,
like iskender, kumpir or bitterballen) and Claude searches the web for that exact place in
the city you're in, reads its menu (its own site, delivery apps, menu photos and reviews,
in the local language too) and picks your order: three best dishes with calorie ranges and
protein, what to ask for, other good choices and what to save for a treat, with links to
where it found them. You see each search as it happens; a look-up takes 20 to 40 seconds and
costs roughly 5 to 15¢. Where you are comes from the phone's time zone, which changes when
you travel (Istanbul, London, Amsterdam), or a city you type, or your location for a few
hours if you share it. Places you've looked up stay under Recent, so opening one again is
free, and *Search again* refreshes it.

You can also **send a photo of the menu** (the camera button in the chat, or *Scan their
menu* on the order). Claude picks the three best dishes from what that restaurant actually
serves, translated if the menu isn't in English, with calorie estimates and the requests to
make when you order.

### iPhone Duo, folded or unfolded

- **Folded** (the outer screen, about 466 × 678 pt): the same one-column app. The screen is
  short, so in a session the photo shrinks and your sets stay in view without scrolling.
- **Open like a book** (about 951 × 669 pt): Today, Train and Eat go to two columns, and the
  guided session puts the machine and how-to on the left and your sets on the right. Sheets
  float in the middle like on an iPad.
- **Open and held upright** (about 669 × 951 pt): one roomier column.
- **Folding or unfolding mid-session** just reflows the screen; nothing reloads. Every edge
  respects the side safe areas (the status bar can sit in a column on the camera side), the
  Home Screen app turns with the phone, and when Safari's viewport segments are turned on, the
  two columns meet at the fold.

### Keeping you going

The weekly barbell loads as you train and eat well; a fully loaded bar locks for a perfect
week. Awards are metal medals for real milestones (first session, first PR, ten records,
streaks). *Biggest gain* compares your usual working weight on a lift in your first few
sessions with your last few, so one warm-up-only day can't inflate it.

### Placeholders (coming with the full app)

- **Live research for any gym without your own key.** With Claude switched on, any gym is
  looked up when you pick it; without it, the 52 gyms and 14 chains here (researched online
  on 13 October 2026) are the list.
- **A real map.** The gym map is a schematic of real distances and directions, so it works offline.
- **Machine photos and their spot on the floor**, once a gym is mapped. Until then each
  exercise shows a drawing, and you can add your own photo.
- **The Claude coach** needs your own API key (see above); without one it's the script.
- **A live human coach**, notifications, accounts and syncing between phones.

### Built to stay put

The page itself never scrolls. The app is a fixed frame the size of the visible screen: the
content scrolls inside it, and the coach's message box and the tab bar are rows underneath,
so they can't drift when you scroll, bounce at the ends, open the keyboard or fold the phone.
Sheets, search and the guided session follow the visible area the same way. Folding or
unfolding keeps your place (the coach stays on the latest message), sheets can be dragged
down to close, and in a session you can tap the step name to go back to any step.

## Open it on an iPhone

1. Open the GitHub Pages link in **Safari** (see *Publishing* below).
2. Tap **Share** (the square with the arrow, or in the ••• menu), then **Add to Home Screen**.
   Leave **Open as Web App** on, then tap **Add**.
3. Open Spotter from the Home Screen, and bring your Iron Log history in from there. The Home
   Screen app keeps its own data, separate from Safari.

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
- **Using both apps for a while?** Export a fresh backup from Iron Log and tap **Update from
  Iron Log** (*Train → More*, or *Profile → Your data*). Only sessions that are new come in;
  a session you logged in both apps on the same day counts once. Sessions done in Iron Log
  tick off that day's plan, and the sessions still ahead carry on from the last one you did,
  wherever you logged it.
- In *Profile → Prototype tools*:
  - **Fill in two weeks** pretends the plan started two weeks ago.
  - **Pretend today is** jumps ahead a few days so you can see how the plan and the coach react.
  - **Start over** resets everything.

## Publishing

The app is plain HTML, CSS and JavaScript in `spotter/`. There is no build step.

- **GitHub Pages:** Pages for this repo publishes straight from `main`, so once this is merged
  Spotter is at `https://mahannoorii.github.io/Calorie-Counting-App/spotter/` (the site's root
  forwards there). Nothing else to set up. `.github/workflows/pages.yml` is only for a later
  switch to **Source: GitHub Actions**, which would put Spotter at the root instead.
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
  js/data.js             Content: onboarding options, cuisines, restaurant menus
                         (with what to ask for), meal plans, screening questions, awards
  js/exercises.js        171 exercises: the equipment each needs, movement pattern, level,
                         cues; the order the plan builder prefers them in
  js/gyms.js             52 Sydney gyms, 14 chains and what each is known to have,
                         suburb centres for "near me" (researched 13 Oct 2026)
  js/core.js             State, dates, icons, machine drawings, the weekly barbell, medals,
                         sheets, sounds and haptics
  js/engine.js           Your gym's equipment, the plan builder, weight suggestions,
                         personal records, weekly goals, coach check-ins, search
  js/ai.js               The Claude coach: what it knows, its tools, streaming replies,
                         web search, restaurant look-ups, menu photos, the key and cost
  js/coach.js            The coach's conversations, the actions replies can take, and
                         Claude in the preview (chat and menu photos)
  js/onboarding.js       Onboarding, the gym finder and map, the equipment check, the reveal
  js/views.js            The tabs, search and the sheets
  js/body.js             Body weight: weigh-ins, the trend, the chart and the goal
  js/gym.js              Your gyms: switching, finding gyms near you and checking their
                         equipment online with Claude
  js/session.js          The guided gym session, supersets and record celebrations
  js/import.js           Bringing history, a program and weigh-ins over from Iron Log
  js/app.js              Boot, migration, navigation, awards and actions
  vendor/                The Anthropic SDK (1.4.0) bundled for the browser, and its licence
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
