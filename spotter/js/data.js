/* Spotter — content and reference data.
   Exercises, gyms, food, restaurant menus and awards live here, so a gym-mapping visit
   or a coach review only has to touch this file. The coach's conversations are in coach.js. */
(function () {
  'use strict';

  // ── Muscles (plain-language names for beginners) ──────────────────────────
  const MUSCLES = {
    quads: 'Front of thighs', hams: 'Back of thighs', glutes: 'Glutes', calves: 'Calves',
    chest: 'Chest', back: 'Upper back', lats: 'Sides of back', shoulders: 'Shoulders',
    biceps: 'Biceps', triceps: 'Back of arms', core: 'Core', hips: 'Outer hips',
  };

  // ── Exercises ─────────────────────────────────────────────────────────────
  // unit: kg (weight × reps), reps (bodyweight), sec (hold), min (cardio)
  // step: smallest usual jump on that machine · start: cautious first-day guess
  const EX = {
    leg_press: {
      name: 'Leg press', kind: 'machine', art: 'legpress', unit: 'kg', reps: [10, 12], step: 5, start: 30, rest: 90,
      muscles: ['quads', 'glutes'], muscles2: ['hams'], focus: 'Legs and glutes',
      setup: [
        'Sit with your back and head flat against the pad.',
        'Feet hip-width apart in the middle of the platform.',
        'Move the seat so your knees start bent at about 90 degrees.',
        'Hold the side handles and release the safety catch if there is one.',
      ],
      move: [
        'Push through your whole foot until your legs are almost straight.',
        'Stop just before your knees lock.',
        'Lower slowly for 2 seconds until your knees are back near 90 degrees.',
      ],
      feel: 'Front of your thighs and your glutes.',
      avoid: ['Locking your knees at the top', 'Letting your lower back or hips lift off the pad', 'Heels lifting off the platform'],
      alts: ['hack_squat_machine', 'goblet_squat'],
    },
    chest_press: {
      name: 'Chest press machine', kind: 'machine', art: 'chestpress', unit: 'kg', reps: [10, 12], step: 2.5, start: 10, rest: 75,
      muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Chest and arms',
      setup: [
        'Set the seat so the handles line up with the middle of your chest.',
        'Sit with your back flat against the pad and feet flat on the floor.',
        'Grip the handles with your wrists straight.',
      ],
      move: [
        'Breathe out and push the handles forward until your arms are almost straight.',
        'Return slowly until you feel a light stretch across your chest.',
        'Keep the weights from touching down between reps.',
      ],
      feel: 'Chest, front of the shoulders and the back of your arms.',
      avoid: ['Shrugging your shoulders up to your ears', 'Arching your back off the pad', 'Snapping your elbows straight'],
      alts: ['incline_chest_press', 'pec_deck'],
    },
    seated_row: {
      name: 'Seated row', kind: 'cable', art: 'row', unit: 'kg', reps: [10, 12], step: 2.5, start: 15, rest: 75,
      muscles: ['back', 'lats'], muscles2: ['biceps', 'shoulders'], focus: 'Back and posture',
      setup: [
        'Sit tall with your feet on the footplates and knees slightly bent.',
        'Hold the handle with your arms straight and chest up.',
      ],
      move: [
        'Pull the handle to your belly button, elbows close to your sides.',
        'Squeeze your shoulder blades together for a second.',
        'Let your arms straighten slowly while you stay tall.',
      ],
      feel: 'The middle of your back and the back of your shoulders.',
      avoid: ['Leaning back to swing the weight', 'Rounding your back as you reach forward', 'Shrugging your shoulders'],
      alts: ['machine_row', 'lat_pulldown'],
    },
    leg_curl: {
      name: 'Seated leg curl', kind: 'machine', art: 'legcurl', unit: 'kg', reps: [10, 12], step: 2.5, start: 10, rest: 60,
      muscles: ['hams'], muscles2: ['calves'], focus: 'Back of thighs',
      setup: [
        'Move the back pad so your knees line up with the machine’s pivot point (often marked with a dot).',
        'Rest the lower pad just above your heels.',
        'Bring the thigh pad down so it sits snugly on top of your thighs.',
      ],
      move: [
        'Curl your heels down and back as far as is comfortable.',
        'Pause for a second.',
        'Let your legs return slowly.',
      ],
      feel: 'The back of your thighs.',
      avoid: ['Lifting your hips off the seat', 'Letting the weight drop back quickly'],
      alts: ['lying_leg_curl', 'glute_bridge'],
    },
    dead_bug: {
      name: 'Dead bug', kind: 'mat', art: 'mat', unit: 'reps', perSide: true, reps: [6, 10], step: 1, start: 6, rest: 45,
      muscles: ['core'], muscles2: [], focus: 'Deep core',
      setup: [
        'Grab a mat in a quiet corner of the stretching area.',
        'Lie on your back, arms pointing at the ceiling.',
        'Lift your knees above your hips, bent at 90 degrees.',
        'Gently press your lower back into the mat.',
      ],
      move: [
        'Breathe out and slowly lower your right arm and left leg toward the floor.',
        'Keep your lower back pressed down the whole time.',
        'Bring them back and switch sides. One each side is one rep.',
      ],
      feel: 'Deep in your stomach, not your lower back.',
      avoid: ['Letting your lower back arch off the mat', 'Rushing'],
      alts: ['plank', 'ab_crunch_machine'],
    },
    hip_abduction: {
      name: 'Hip abduction machine', kind: 'machine', art: 'abduction', unit: 'kg', reps: [12, 15], step: 5, start: 20, rest: 60,
      muscles: ['hips', 'glutes'], muscles2: [], focus: 'Outer hips and glutes',
      setup: [
        'Set the start position so your legs begin close together.',
        'Sit tall with the pads on the outside of your knees.',
      ],
      move: [
        'Push your knees out as wide as is comfortable.',
        'Pause for a second.',
        'Bring them back in slowly, without letting the weights touch.',
      ],
      feel: 'The outside of your hips and your glutes.',
      avoid: ['Bouncing the weight', 'Slumping in the seat'],
      alts: ['cable_kickback', 'glute_bridge'],
    },
    hip_thrust: {
      name: 'Hip thrust machine', kind: 'machine', art: 'hipthrust', unit: 'kg', reps: [10, 12], step: 5, start: 20, rest: 75,
      muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes',
      setup: [
        'Sit with your upper back against the pad.',
        'Position the pad or belt across your hips.',
        'Feet flat, about hip-width apart.',
      ],
      move: [
        'Drive through your heels and lift your hips until your body is straight from shoulders to knees.',
        'Squeeze your glutes at the top for a second.',
        'Lower slowly.',
      ],
      feel: 'Your glutes most of all, a little in the back of your thighs.',
      avoid: ['Over-arching your lower back at the top', 'Pushing through your toes'],
      alts: ['glute_bridge', 'cable_kickback'],
    },
    lat_pulldown: {
      name: 'Lat pulldown', kind: 'cable', art: 'pulldown', unit: 'kg', reps: [10, 12], step: 2.5, start: 15, rest: 75,
      muscles: ['lats'], muscles2: ['biceps', 'back'], focus: 'Back and arms',
      setup: [
        'Adjust the knee pad so your thighs are held snugly.',
        'Stand up, grab the bar a little wider than your shoulders, and sit back down.',
      ],
      move: [
        'Lean back slightly and pull the bar to your upper chest.',
        'Lead with your elbows: down and back.',
        'Let the bar rise slowly until your arms are straight.',
      ],
      feel: 'The sides of your back and your biceps.',
      avoid: ['Pulling the bar behind your neck', 'Swinging your body to move the weight'],
      alts: ['assisted_pullup', 'machine_row'],
    },
    shoulder_press: {
      name: 'Shoulder press machine', kind: 'machine', art: 'shoulderpress', unit: 'kg', reps: [10, 12], step: 2.5, start: 5, rest: 75,
      muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders and arms',
      setup: [
        'Set the seat so the handles start at about shoulder height.',
        'Sit with your back against the pad and feet flat.',
      ],
      move: [
        'Breathe out and press up until your arms are almost straight.',
        'Lower slowly back to shoulder height.',
      ],
      feel: 'Your shoulders and the back of your arms.',
      avoid: ['Arching your lower back', 'Shrugging', 'Locking your elbows hard'],
      alts: ['db_shoulder_press', 'chest_press'],
    },
    leg_extension: {
      name: 'Leg extension', kind: 'machine', art: 'legext', unit: 'kg', reps: [10, 12], step: 2.5, start: 10, rest: 60,
      muscles: ['quads'], muscles2: [], focus: 'Front of thighs',
      setup: [
        'Move the back pad so your knees line up with the pivot point.',
        'Set the ankle pad on your lower shins, just above your feet.',
        'Hold the side handles.',
      ],
      move: [
        'Straighten your legs and pause for a second at the top.',
        'Lower slowly for 2 seconds.',
      ],
      feel: 'The front of your thighs.',
      avoid: ['Kicking the weight up fast', 'Lifting your hips off the seat'],
      alts: ['leg_press', 'goblet_squat'],
    },
    plank: {
      name: 'Plank', kind: 'mat', art: 'mat', unit: 'sec', reps: [20, 40], step: 5, start: 20, rest: 45,
      muscles: ['core'], muscles2: ['shoulders'], focus: 'Whole core',
      setup: [
        'On a mat, rest on your forearms with elbows under your shoulders.',
        'Step your feet back so your body is straight from head to heels.',
        'New to it? Keep your knees down. That counts.',
      ],
      move: [
        'Squeeze your glutes and tighten your stomach.',
        'Breathe slowly and hold.',
        'Stop when your hips start to sag.',
      ],
      feel: 'Your stomach and shoulders. Not your lower back.',
      avoid: ['Hips sagging or piking up', 'Holding your breath'],
      alts: ['dead_bug', 'ab_crunch_machine'],
    },
    pec_deck: {
      name: 'Pec deck', kind: 'machine', art: 'pecdeck', unit: 'kg', reps: [12, 15], step: 2.5, start: 10, rest: 60,
      muscles: ['chest'], muscles2: ['shoulders'], focus: 'Chest',
      setup: [
        'Set the seat so the handles are at chest height.',
        'Sit tall with your back against the pad.',
      ],
      move: [
        'Bring the handles together in front of your chest, elbows slightly bent.',
        'Squeeze for a second.',
        'Open slowly to a light stretch.',
      ],
      feel: 'Across your chest.',
      avoid: ['Letting the arms fly back too far', 'Rounding your shoulders forward'],
      alts: ['chest_press', 'incline_chest_press'],
    },

    // ── Alternatives used by swaps ──
    glute_bridge: {
      name: 'Glute bridge', kind: 'mat', art: 'mat', unit: 'reps', reps: [12, 15], step: 1, start: 12, rest: 45,
      muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes',
      setup: ['Lie on your back on a mat, knees bent, feet flat and hip-width apart.'],
      move: ['Push through your heels and lift your hips.', 'Squeeze your glutes at the top.', 'Lower slowly.'],
      feel: 'Your glutes.', avoid: ['Arching your lower back at the top'], alts: ['hip_thrust', 'cable_kickback'],
    },
    machine_row: {
      name: 'Chest-supported row machine', kind: 'machine', art: 'row', unit: 'kg', reps: [10, 12], step: 2.5, start: 15, rest: 75,
      muscles: ['back', 'lats'], muscles2: ['biceps'], focus: 'Back and posture',
      setup: ['Set the seat so the chest pad sits at the middle of your chest.', 'Grab the handles with arms straight.'],
      move: ['Pull the handles back, elbows close to your sides.', 'Squeeze your shoulder blades.', 'Return slowly.'],
      feel: 'The middle of your back.', avoid: ['Lifting your chest off the pad'], alts: ['seated_row', 'lat_pulldown'],
    },
    assisted_pullup: {
      name: 'Assisted pull-up machine', kind: 'machine', art: 'pulldown', unit: 'kg', reps: [6, 10], step: 5, start: 40, rest: 90, assist: true,
      muscles: ['lats'], muscles2: ['biceps'], focus: 'Back and arms',
      setup: ['Choose the help weight. More weight means more help.', 'Kneel or stand on the pad and grab the handles.'],
      move: ['Pull your chest up toward the handles.', 'Lower slowly until your arms are straight.'],
      feel: 'The sides of your back.', avoid: ['Dropping down fast'], alts: ['lat_pulldown', 'machine_row'],
    },
    lying_leg_curl: {
      name: 'Lying leg curl', kind: 'machine', art: 'legcurl', unit: 'kg', reps: [10, 12], step: 2.5, start: 10, rest: 60,
      muscles: ['hams'], muscles2: ['calves'], focus: 'Back of thighs',
      setup: ['Lie face down with your knees just off the end of the bench.', 'Pad just above your heels.'],
      move: ['Curl your heels toward your glutes.', 'Lower slowly.'],
      feel: 'The back of your thighs.', avoid: ['Lifting your hips off the bench'], alts: ['leg_curl', 'glute_bridge'],
    },
    cable_kickback: {
      name: 'Cable glute kickback', kind: 'cable', art: 'cable', unit: 'kg', perSide: true, reps: [10, 12], step: 2.5, start: 5, rest: 45,
      muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes',
      setup: ['Attach the ankle strap to a low cable.', 'Hold the frame and lean forward slightly.'],
      move: ['Kick your leg straight back, squeezing your glute.', 'Return slowly. Do all reps, then switch legs.'],
      feel: 'Your glute on the working side.', avoid: ['Swinging', 'Arching your lower back'], alts: ['hip_thrust', 'glute_bridge'],
    },
    incline_chest_press: {
      name: 'Incline chest press machine', kind: 'machine', art: 'chestpress', unit: 'kg', reps: [10, 12], step: 2.5, start: 10, rest: 75,
      muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Upper chest',
      setup: ['Set the seat so the handles line up with your upper chest.', 'Back flat against the pad.'],
      move: ['Press up and forward until your arms are almost straight.', 'Return slowly.'],
      feel: 'Upper chest and shoulders.', avoid: ['Arching your back'], alts: ['chest_press', 'pec_deck'],
    },
    db_shoulder_press: {
      name: 'Seated dumbbell shoulder press', kind: 'free', art: 'dumbbell', unit: 'kg', reps: [10, 12], step: 1, start: 4, rest: 75,
      muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders and arms',
      setup: ['Sit on a bench with an upright back.', 'Hold a dumbbell in each hand at shoulder height.'],
      move: ['Press both up until your arms are almost straight.', 'Lower slowly to shoulder height.'],
      feel: 'Your shoulders.', avoid: ['Arching your back'], alts: ['shoulder_press'],
    },
    ab_crunch_machine: {
      name: 'Ab crunch machine', kind: 'machine', art: 'abcrunch', unit: 'kg', reps: [12, 15], step: 2.5, start: 10, rest: 45,
      muscles: ['core'], muscles2: [], focus: 'Core',
      setup: ['Set the seat so the pads sit comfortably on your chest or shoulders.'],
      move: ['Breathe out and curl your chest toward your hips.', 'Return slowly.'],
      feel: 'Your stomach.', avoid: ['Pulling with your arms'], alts: ['dead_bug', 'plank'],
    },
    hack_squat_machine: {
      name: 'Hack squat machine', kind: 'machine', art: 'legpress', unit: 'kg', reps: [10, 12], step: 5, start: 20, rest: 90,
      muscles: ['quads', 'glutes'], muscles2: ['hams'], focus: 'Legs and glutes',
      setup: ['Shoulders under the pads, back flat against the backrest.', 'Feet hip-width in the middle of the platform.'],
      move: ['Bend your knees and lower slowly.', 'Push back up through your whole foot.'],
      feel: 'Front of your thighs and glutes.', avoid: ['Heels lifting', 'Locking your knees'], alts: ['leg_press', 'goblet_squat'],
    },
    goblet_squat: {
      name: 'Goblet squat', kind: 'free', art: 'dumbbell', unit: 'kg', reps: [10, 12], step: 2, start: 6, rest: 75,
      muscles: ['quads', 'glutes'], muscles2: ['core'], focus: 'Legs and glutes',
      setup: ['Hold one dumbbell upright against your chest.', 'Feet a little wider than your hips.'],
      move: ['Sit down between your heels, chest up.', 'Stand back up through your whole foot.'],
      feel: 'Front of your thighs and glutes.', avoid: ['Heels lifting', 'Knees caving in'], alts: ['leg_press'],
    },

    // ── Warm-up and cool-down cardio ──
    bike: {
      name: 'Exercise bike', kind: 'cardio', art: 'bike', unit: 'min',
      setup: ['Set the seat so your knee is slightly bent at the bottom of each pedal turn.'],
      move: ['Start at an easy pace you could hold a chat at.', 'Build up a little every couple of minutes.'],
      feel: 'Warm and breathing a bit faster, but able to talk.', alts: ['cross_trainer', 'treadmill'],
    },
    cross_trainer: {
      name: 'Cross trainer', kind: 'cardio', art: 'crosstrainer', unit: 'min',
      setup: ['Step on, hold the moving handles.'], move: ['Start easy and build up gradually.'],
      feel: 'Warm and breathing a bit faster.', alts: ['bike', 'treadmill'],
    },
    treadmill: {
      name: 'Treadmill walk', kind: 'cardio', art: 'treadmill', unit: 'min',
      setup: ['Clip the safety key to your top before you start.'], move: ['Walk briskly. Add a small incline if you like.'],
      feel: 'Warm and breathing a bit faster.', alts: ['bike', 'cross_trainer'],
    },
  };

  // Base program slots, in priority order. Session length decides how many are used.
  const PROGRAM = {
    A: { name: 'Session A', title: 'Legs, chest and back', ex: ['leg_press', 'chest_press', 'seated_row', 'leg_curl', 'dead_bug', 'hip_abduction'] },
    B: { name: 'Session B', title: 'Glutes, back and shoulders', ex: ['hip_thrust', 'lat_pulldown', 'shoulder_press', 'leg_extension', 'plank', 'pec_deck'] },
  };

  const COOLDOWN = [
    { name: 'Front of thigh stretch', how: 'Hold a machine for balance and pull one heel toward your glute.', secs: 30 },
    { name: 'Hamstring stretch', how: 'Sit with one leg straight and reach toward your toes.', secs: 30 },
    { name: 'Chest stretch', how: 'Forearm on a doorway or upright, turn gently away.', secs: 30 },
    { name: 'Child’s pose', how: 'Knees wide on a mat, sit back on your heels, arms long.', secs: 30 },
  ];

  // ── Gyms ──────────────────────────────────────────────────────────────────
  // Equipment lists are a typical setup until each gym is mapped in person.
  const FULL_KIT = ['leg_press', 'chest_press', 'seated_row', 'leg_curl', 'hip_abduction', 'hip_thrust', 'lat_pulldown',
    'shoulder_press', 'leg_extension', 'pec_deck', 'machine_row', 'assisted_pullup', 'lying_leg_curl', 'cable_kickback',
    'incline_chest_press', 'ab_crunch_machine', 'hack_squat_machine', 'bike', 'cross_trainer', 'treadmill',
    'dead_bug', 'plank', 'glute_bridge', 'goblet_squat', 'db_shoulder_press'];
  const GYMS = [
    { id: 'af-rhn', brand: 'Anytime Fitness', branch: 'Rouse Hill North', area: 'Rouse Hill', kit: FULL_KIT, mapped: false },
    { id: 'af-nk', brand: 'Anytime Fitness', branch: 'North Kellyville', area: 'North Kellyville', kit: FULL_KIT, mapped: false },
    { id: 'af-bh', brand: 'Anytime Fitness', branch: 'Box Hill', area: 'Box Hill', kit: FULL_KIT, mapped: false },
    { id: 'af-cq', brand: 'Anytime Fitness', branch: 'Circular Quay', area: 'Sydney CBD', kit: FULL_KIT, mapped: false },
    { id: 'other', brand: 'My gym', branch: 'isn’t listed yet', area: 'Any gym with machines', kit: FULL_KIT, mapped: false, generic: true },
  ];

  // ── Onboarding options ────────────────────────────────────────────────────
  const GOALS = [
    { id: 'event', label: 'A holiday or big event', icon: 'plane' },
    { id: 'strong', label: 'Feeling stronger', icon: 'bolt' },
    { id: 'energy', label: 'More energy', icon: 'sun' },
    { id: 'fat', label: 'Losing some body fat', icon: 'flame' },
    { id: 'confidence', label: 'Confidence in the gym', icon: 'shield' },
    { id: 'health', label: 'Looking after my health', icon: 'heart' },
  ];
  const FEELS = ['Confident', 'Strong', 'Energetic', 'Proud of myself', 'Comfortable in my clothes', 'Relaxed', 'Healthy', 'Ready for anything'];
  const EXPERIENCE = [
    { id: 'never', label: 'Never', sub: 'This is all new to me' },
    { id: 'little', label: 'A little', sub: 'I’ve tried, but it never stuck' },
    { id: 'regular', label: 'Yes, regularly', sub: 'I’ve trained consistently before' },
  ];
  const WORRIES = [
    { id: 'what', label: 'Not knowing what to do' },
    { id: 'machines', label: 'Working out the machines' },
    { id: 'watched', label: 'Feeling watched' },
    { id: 'busy', label: 'Machines being taken' },
    { id: 'motivation', label: 'Staying motivated' },
    { id: 'food', label: 'Knowing what to eat' },
  ];
  const TIMES = [
    { id: 'morning', label: 'Morning', hour: 7, at: '7:00 am' },
    { id: 'lunch', label: 'Lunchtime', hour: 12, at: '12:30 pm' },
    { id: 'afternoon', label: 'After work', hour: 17, at: '5:30 pm' },
    { id: 'evening', label: 'Evening', hour: 19, at: '7:00 pm' },
  ];

  // ── Food: cuisines people actually eat in Sydney ──────────────────────────
  const CUISINES = [
    { id: 'aussie', name: 'Australian' },
    { id: 'italian', name: 'Italian' },
    { id: 'greek', name: 'Greek' },
    { id: 'middleeast', name: 'Middle Eastern' },
    { id: 'indian', name: 'Indian' },
    { id: 'chinese', name: 'Chinese' },
    { id: 'japanese', name: 'Japanese' },
    { id: 'thai', name: 'Thai' },
    { id: 'vietnamese', name: 'Vietnamese' },
    { id: 'korean', name: 'Korean' },
    { id: 'mexican', name: 'Mexican' },
    { id: 'filipino', name: 'Filipino' },
  ];
  const DERAILERS = [
    { id: 'eatingout', label: 'Eating out' },
    { id: 'takeaway', label: 'Takeaway' },
    { id: 'gatherings', label: 'Family events and celebrations' },
    { id: 'sweets', label: 'Sweet tooth' },
    { id: 'weekends', label: 'Weekends' },
    { id: 'latenight', label: 'Late-night snacking' },
    { id: 'busy', label: 'Busy days' },
  ];

  // Weeknight dinners: lighter versions of home cooking, two practical tweaks each.
  const MEALS = [
    { id: 'm1', c: 'aussie', name: 'Chicken and roast veg traybake', tips: ['One tray: chicken thighs, pumpkin, capsicum, onion.', 'A light spray of oil, not a pour.'] },
    { id: 'm2', c: 'aussie', name: 'Salmon, greens and baby potatoes', tips: ['Bake the salmon with lemon.', 'Half the plate greens.'] },
    { id: 'm3', c: 'aussie', name: 'Homemade burgers with salad', tips: ['Lean mince patties, one bun.', 'Load it with salad, skip the chips.'] },
    { id: 'm4', c: 'italian', name: 'Spaghetti bolognese', tips: ['Lean mince with grated carrot and zucchini.', 'About 75 g of dry pasta per person.'] },
    { id: 'm5', c: 'italian', name: 'Chicken cacciatore', tips: ['Tomato-based, so it’s light already.', 'Serve with greens instead of extra bread.'] },
    { id: 'm6', c: 'italian', name: 'Minestrone with crusty bread', tips: ['Beans and veg make it filling.', 'One slice of bread on the side.'] },
    { id: 'm7', c: 'greek', name: 'Chicken souvlaki and Greek salad', tips: ['Marinate in lemon, garlic and oregano.', 'One pita, plenty of salad.'] },
    { id: 'm8', c: 'greek', name: 'Lamb kofta with tzatziki', tips: ['Lean lamb mince, grilled.', 'Tzatziki instead of creamy sauces.'] },
    { id: 'm9', c: 'greek', name: 'Lemon fish with potatoes and beans', tips: ['Bake everything on one tray.', 'Go easy on the oil.'] },
    { id: 'm10', c: 'middleeast', name: 'Chicken shawarma bowl', tips: ['Grilled chicken, tabouli and a spoon of hummus.', 'Half a pita, not two.'] },
    { id: 'm11', c: 'middleeast', name: 'Lentils and rice with yoghurt', tips: ['Mujadara: lentils add protein and fibre.', 'Easy on the fried onion on top.'] },
    { id: 'm12', c: 'middleeast', name: 'Herb stew with rice', tips: ['Lean meat, lots of herbs and beans.', 'One cupped handful of rice.'] },
    { id: 'm13', c: 'indian', name: 'Chicken tikka with salad and roti', tips: ['Yoghurt marinade, grilled or baked.', 'One roti instead of naan.'] },
    { id: 'm14', c: 'indian', name: 'Dal with rice and greens', tips: ['Lentils are protein-rich and cheap.', 'Add spinach in the last minutes.'] },
    { id: 'm15', c: 'indian', name: 'Chickpea curry', tips: ['Tomato base rather than cream.', 'Serve with rice and a cucumber salad.'] },
    { id: 'm16', c: 'chinese', name: 'Steamed fish with ginger and greens', tips: ['Ginger, shallot and a splash of soy.', 'Steamed rice and bok choy on the side.'] },
    { id: 'm17', c: 'chinese', name: 'Chicken and vegetable stir-fry', tips: ['One tablespoon of oil for the whole pan.', 'Twice as much veg as noodles.'] },
    { id: 'm18', c: 'chinese', name: 'Tomato and egg with rice', tips: ['Quick, cheap and high in protein.', 'Add greens on the side.'] },
    { id: 'm19', c: 'japanese', name: 'Teriyaki salmon with rice and greens', tips: ['Brush the sauce on, don’t pour it.', 'Edamame on the side.'] },
    { id: 'm20', c: 'japanese', name: 'Chicken and egg rice bowl', tips: ['Oyakodon: chicken, egg and onion.', 'Add a side of greens.'] },
    { id: 'm21', c: 'japanese', name: 'Miso soup with tofu and soba', tips: ['Light but filling.', 'Add an egg for extra protein.'] },
    { id: 'm22', c: 'thai', name: 'Thai basil chicken with rice', tips: ['Less oil than the takeaway version.', 'Add green beans.'] },
    { id: 'm23', c: 'thai', name: 'Chicken larb with lettuce cups', tips: ['Lean mince, lime, herbs.', 'Rice on the side if you’re hungry.'] },
    { id: 'm24', c: 'thai', name: 'Tom yum soup with prawns', tips: ['A clear broth, not creamy.', 'Bulk it up with mushrooms.'] },
    { id: 'm25', c: 'vietnamese', name: 'Chicken pho', tips: ['Plenty of herbs and bean sprouts.', 'Go easy on the hoisin.'] },
    { id: 'm26', c: 'vietnamese', name: 'Rice paper rolls with prawns', tips: ['Fresh, light and fun to make together.', 'Peanut sauce as a dip, not a pour.'] },
    { id: 'm27', c: 'vietnamese', name: 'Lemongrass chicken noodle salad', tips: ['Grilled chicken on vermicelli and salad.', 'Dressing on the side.'] },
    { id: 'm28', c: 'korean', name: 'Bibimbap', tips: ['Rice, veg, egg and lean beef or tofu.', 'A little gochujang goes a long way.'] },
    { id: 'm29', c: 'korean', name: 'Bulgogi with lettuce wraps', tips: ['Wrap in lettuce, rice on the side.', 'Lean cut of beef.'] },
    { id: 'm30', c: 'korean', name: 'Soft tofu stew', tips: ['Sundubu: warm and high in protein.', 'Small bowl of rice with it.'] },
    { id: 'm31', c: 'mexican', name: 'Chicken burrito bowl', tips: ['Beans, salsa, lettuce and chicken.', 'Skip the sour cream, add avocado.'] },
    { id: 'm32', c: 'mexican', name: 'Fish tacos with slaw', tips: ['Grill the fish instead of frying.', 'Two tacos plus a side of slaw.'] },
    { id: 'm33', c: 'mexican', name: 'Bean and veg chilli', tips: ['Kidney beans and lean mince.', 'Top with yoghurt instead of cheese.'] },
    { id: 'm34', c: 'filipino', name: 'Chicken adobo with greens', tips: ['Skin-off chicken pieces.', 'Rice and a big serve of greens.'] },
    { id: 'm35', c: 'filipino', name: 'Sinigang with fish', tips: ['Sour tamarind broth with veg.', 'Light and filling.'] },
    { id: 'm36', c: 'filipino', name: 'Chicken tinola', tips: ['Ginger soup with chicken and greens.', 'Comforting on a cold night.'] },
  ];

  // Typical menus when eating out. "pick" = coach's choice, "ok" = fine, "treat" = enjoy now and then.
  // Real restaurant menus come later; these cover what most places of each kind serve.
  const MENUS = {
    italian: { name: 'Italian', items: [
      { n: 'Grilled chicken, rocket and parmesan salad', t: 'pick', why: 'Lean protein and greens.', tip: 'Ask for the dressing on the side.' },
      { n: 'Spaghetti marinara', t: 'pick', why: 'Seafood in tomato sauce. Protein without the cream.', tip: 'Eat the seafood first, leave a few forkfuls of pasta.' },
      { n: 'Minestrone', t: 'pick', why: 'Filling and full of vegetables.', tip: 'Have it to start, then share a main.' },
      { n: 'Penne arrabbiata', t: 'ok' },
      { n: 'Margherita pizza', t: 'ok', tip: 'Share it and add a salad.' },
      { n: 'Lasagne', t: 'treat' },
      { n: 'Fettuccine carbonara', t: 'treat' },
      { n: 'Garlic bread', t: 'treat' },
      { n: 'Tiramisu', t: 'treat' },
    ] },
    pizza: { name: 'Pizza', items: [
      { n: 'Thin-crust margherita, shared', t: 'pick', why: 'The lightest pizza on the menu.', tip: 'Two slices and a side salad.' },
      { n: 'Chicken and rocket salad', t: 'pick', why: 'Protein to keep you full.', tip: 'Order it alongside your slices.' },
      { n: 'Prosciutto and rocket thin crust', t: 'pick', why: 'Big flavour, thin base.', tip: 'Share it between two.' },
      { n: 'Supreme', t: 'ok' },
      { n: 'Chicken wings', t: 'ok' },
      { n: 'Meat lovers', t: 'treat' },
      { n: 'Cheesy garlic bread', t: 'treat' },
    ] },
    japanese: { name: 'Japanese', items: [
      { n: 'Sashimi set with salad', t: 'pick', why: 'Almost pure protein.', tip: 'Add a small rice if you’re hungry.' },
      { n: 'Chicken teriyaki bento', t: 'pick', why: 'Protein, rice and veg in one box.', tip: 'Ask for the sauce on the side.' },
      { n: 'Edamame', t: 'pick', why: 'Protein-packed starter.', tip: 'Share a bowl to start.' },
      { n: 'Miso soup', t: 'ok' },
      { n: 'Salmon nigiri', t: 'ok' },
      { n: 'Agedashi tofu', t: 'ok' },
      { n: 'Chicken katsu curry', t: 'treat' },
      { n: 'Tempura udon', t: 'treat' },
    ] },
    ramen: { name: 'Ramen', items: [
      { n: 'Shio or shoyu ramen with chicken', t: 'pick', why: 'Lighter broth than tonkotsu.', tip: 'Leave some of the broth.' },
      { n: 'Edamame', t: 'pick', why: 'Protein to start.', tip: 'Share it.' },
      { n: 'Chicken karaage, small serve', t: 'pick', why: 'Satisfying if you share.', tip: 'Split it between two.' },
      { n: 'Gyoza', t: 'ok' },
      { n: 'Tonkotsu ramen', t: 'treat' },
      { n: 'Extra noodles', t: 'treat' },
    ] },
    thai: { name: 'Thai', items: [
      { n: 'Chicken larb', t: 'pick', why: 'Lean, zesty and full of herbs.', tip: 'Rice on the side.' },
      { n: 'Tom yum with prawns', t: 'pick', why: 'Clear broth, high protein.', tip: 'Go for the clear version, not creamy.' },
      { n: 'Chicken and vegetable stir-fry', t: 'pick', why: 'Protein and veg with steamed rice.', tip: 'Ask for less oil.' },
      { n: 'Green curry', t: 'ok', tip: 'Coconut milk is rich, so share it.' },
      { n: 'Pad thai', t: 'ok' },
      { n: 'Pad see ew', t: 'treat' },
      { n: 'Massaman curry', t: 'treat' },
      { n: 'Spring rolls', t: 'treat' },
    ] },
    chinese: { name: 'Chinese', items: [
      { n: 'Steamed fish with ginger and shallot', t: 'pick', why: 'Light and high in protein.', tip: 'Steamed rice, not fried.' },
      { n: 'Chicken and vegetable stir-fry', t: 'pick', why: 'Balanced plate.', tip: 'Ask for the sauce light.' },
      { n: 'Steamed dumplings', t: 'pick', why: 'Steamed beats fried.', tip: 'Six is a good serve.' },
      { n: 'Wonton soup', t: 'ok' },
      { n: 'Beef and broccoli', t: 'ok' },
      { n: 'Sweet and sour pork', t: 'treat' },
      { n: 'Honey chicken', t: 'treat' },
      { n: 'Special fried rice', t: 'treat' },
      { n: 'Salt and pepper squid', t: 'treat' },
    ] },
    vietnamese: { name: 'Vietnamese', items: [
      { n: 'Chicken pho', t: 'pick', why: 'Lean protein in a light broth.', tip: 'Load it with herbs and sprouts.' },
      { n: 'Fresh rice paper rolls', t: 'pick', why: 'Fresh and light.', tip: 'Dip lightly in the sauce.' },
      { n: 'Lemongrass chicken vermicelli salad', t: 'pick', why: 'Protein, salad and noodles.', tip: 'Dressing on the side.' },
      { n: 'Beef pho', t: 'ok' },
      { n: 'Banh mi', t: 'ok' },
      { n: 'Crispy pork belly', t: 'treat' },
      { n: 'Fried spring rolls', t: 'treat' },
    ] },
    indian: { name: 'Indian', items: [
      { n: 'Tandoori chicken with salad', t: 'pick', why: 'Grilled, not swimming in sauce.', tip: 'Add a side of raita.' },
      { n: 'Dal with plain rice', t: 'pick', why: 'Protein and fibre from lentils.', tip: 'Plain rice, not pilau.' },
      { n: 'Plain roti', t: 'pick', why: 'Lighter than naan.', tip: 'One per person.' },
      { n: 'Chicken tikka masala', t: 'ok', tip: 'Share it.' },
      { n: 'Raita', t: 'ok' },
      { n: 'Butter chicken', t: 'treat' },
      { n: 'Lamb korma', t: 'treat' },
      { n: 'Garlic naan', t: 'treat' },
      { n: 'Samosas', t: 'treat' },
    ] },
    mexican: { name: 'Mexican', items: [
      { n: 'Chicken burrito bowl', t: 'pick', why: 'Protein, beans and salad.', tip: 'Skip the sour cream, add extra salsa.' },
      { n: 'Grilled fish tacos', t: 'pick', why: 'Lean and fresh.', tip: 'Two tacos is a good serve.' },
      { n: 'Chicken fajitas', t: 'pick', why: 'Build it yourself, go heavy on the veg.', tip: 'Two tortillas.' },
      { n: 'Beef burrito', t: 'ok' },
      { n: 'Quesadilla', t: 'treat' },
      { n: 'Loaded nachos', t: 'treat' },
      { n: 'Churros', t: 'treat' },
    ] },
    middleeast: { name: 'Middle Eastern', items: [
      { n: 'Chicken shish plate with salad', t: 'pick', why: 'Charcoal-grilled protein.', tip: 'Swap the chips for tabouli.' },
      { n: 'Chicken shawarma salad bowl', t: 'pick', why: 'All the flavour, no wrap.', tip: 'Garlic sauce on the side.' },
      { n: 'Tabouli and hummus', t: 'pick', why: 'Fresh sides that fill you up.', tip: 'Share as a starter.' },
      { n: 'Falafel wrap', t: 'ok' },
      { n: 'Mixed grill, shared', t: 'ok' },
      { n: 'Halal snack pack', t: 'treat' },
      { n: 'Lamb doner wrap with garlic sauce', t: 'treat' },
      { n: 'Baklava', t: 'treat' },
    ] },
    greek: { name: 'Greek', items: [
      { n: 'Chicken souvlaki plate with Greek salad', t: 'pick', why: 'Grilled protein and salad.', tip: 'One pita, not two.' },
      { n: 'Grilled octopus or fish', t: 'pick', why: 'Lean and light.', tip: 'Add a side salad.' },
      { n: 'Horiatiki (Greek salad)', t: 'pick', why: 'Fresh side to share.', tip: 'Go easy on the feta.' },
      { n: 'Lamb gyros', t: 'ok' },
      { n: 'Spanakopita', t: 'ok' },
      { n: 'Moussaka', t: 'treat' },
      { n: 'Loukoumades', t: 'treat' },
    ] },
    korean: { name: 'Korean', items: [
      { n: 'Bibimbap', t: 'pick', why: 'Rice, veg, egg and protein.', tip: 'Add the gochujang a little at a time.' },
      { n: 'Bulgogi with lettuce wraps', t: 'pick', why: 'Lean beef, lots of greens.', tip: 'Wrap it in lettuce.' },
      { n: 'Soft tofu stew', t: 'pick', why: 'Warm, filling, high in protein.', tip: 'Small bowl of rice.' },
      { n: 'Japchae', t: 'ok' },
      { n: 'Korean barbecue, shared', t: 'ok', tip: 'More lettuce wraps, fewer sides.' },
      { n: 'Korean fried chicken', t: 'treat' },
      { n: 'Kimchi pancake', t: 'treat' },
    ] },
    pub: { name: 'Pub', items: [
      { n: 'Grilled barramundi with salad', t: 'pick', why: 'Lean fish, light sides.', tip: 'Swap chips for salad or veg.' },
      { n: 'Chicken Caesar salad', t: 'pick', why: 'Protein-heavy.', tip: 'Dressing on the side.' },
      { n: 'Steak with vegetables', t: 'pick', why: 'Protein and veg.', tip: 'Pepper sauce on the side.' },
      { n: 'Steak sandwich', t: 'ok' },
      { n: 'Chicken parmigiana', t: 'treat', tip: 'Share the chips.' },
      { n: 'Fish and chips', t: 'treat' },
      { n: 'Sticky date pudding', t: 'treat' },
    ] },
    burgers: { name: 'Burgers', items: [
      { n: 'Grilled chicken burger', t: 'pick', why: 'Grilled, not fried.', tip: 'Skip the mayo, add salad.' },
      { n: 'Burger in a lettuce wrap', t: 'pick', why: 'All the taste, no bun.', tip: 'Ask for it "naked".' },
      { n: 'Single beef burger with a side salad', t: 'pick', why: 'A normal burger is fine.', tip: 'Salad instead of fries.' },
      { n: 'Small fries, shared', t: 'ok' },
      { n: 'Double cheeseburger', t: 'treat' },
      { n: 'Loaded fries', t: 'treat' },
      { n: 'Milkshake', t: 'treat' },
    ] },
    chicken: { name: 'Charcoal chicken', items: [
      { n: 'Quarter chicken with salad', t: 'pick', why: 'Charcoal-grilled protein.', tip: 'Salad instead of chips.' },
      { n: 'Chicken breast and tabouli', t: 'pick', why: 'Lean and fresh.', tip: 'Garlic sauce on the side.' },
      { n: 'Chicken wrap', t: 'pick', why: 'Easy and filling.', tip: 'Extra salad, light sauce.' },
      { n: 'Coleslaw', t: 'ok' },
      { n: 'Chips', t: 'treat' },
      { n: 'Half chicken with chips and gravy', t: 'treat' },
    ] },
    cafe: { name: 'Café', items: [
      { n: 'Eggs on sourdough with spinach', t: 'pick', why: 'Protein to start the day.', tip: 'Poached or scrambled.' },
      { n: 'Smashed avo with poached eggs', t: 'pick', why: 'Good fats plus protein.', tip: 'Make sure there’s an egg on it.' },
      { n: 'Greek yoghurt, berries and granola', t: 'pick', why: 'Protein-rich and light.', tip: 'Granola on the side.' },
      { n: 'Big breakfast', t: 'ok', tip: 'Share the hash brown.' },
      { n: 'Açaí bowl', t: 'ok' },
      { n: 'Eggs Benedict', t: 'treat' },
      { n: 'Banana bread with butter', t: 'treat' },
    ] },
  };
  // Words in a place's name that give away its cuisine. Checked in order.
  const CUISINE_KEYS = [
    ['pizza', ['pizza', 'pizzeria', 'crust', 'domino']],
    ['ramen', ['ramen']],
    ['italian', ['italian', 'trattoria', 'osteria', 'ristorante', 'pasta', 'italia', 'nonna']],
    ['japanese', ['sushi', 'japanese', 'izakaya', 'teriyaki', 'bento', 'donburi', 'sashimi', 'tokyo']],
    ['thai', ['thai', 'siam', 'bangkok', 'chat thai']],
    ['vietnamese', ['pho', 'viet', 'banh mi', 'saigon', 'hanoi', "roll'd", 'roll’d']],
    ['korean', ['korean', 'bibimbap', 'seoul', 'k-bbq', 'kbbq']],
    ['chinese', ['chinese', 'dumpling', 'yum cha', 'dim sum', 'szechuan', 'sichuan', 'cantonese', 'noodle', 'wok']],
    ['indian', ['indian', 'curry', 'tandoori', 'masala', 'biryani', 'punjab', 'dosa', 'tikka']],
    ['mexican', ['mexican', 'taco', 'burrito', 'cantina', 'guzman', 'gyg', 'zambrero', 'mexicano', 'nacho']],
    ['chicken', ['charcoal chicken', 'chicken shop', 'oporto', 'el jannah', 'red rooster', 'nando', 'kfc']],
    ['middleeast', ['kebab', 'lebanese', 'turkish', 'persian', 'shawarma', 'falafel', 'mezze', 'charcoal']],
    ['greek', ['greek', 'souvlaki', 'gyro', 'taverna', 'yiros']],
    ['burgers', ['burger', 'grill’d', "grill'd", 'mcdonald', 'hungry jack', 'five guys']],
    ['pub', ['pub', 'hotel', 'tavern', 'bistro', 'inn', 'brewery', 'bar & grill']],
    ['cafe', ['cafe', 'café', 'coffee', 'brunch', 'bakery', 'espresso', 'roasters', 'starbucks']],
  ];

  // Short plans for the meals that usually knock a week off course.
  const MOMENTS = {
    gathering: { title: 'Family event', icon: 'people', lines: ['Eat normally earlier in the day so you don’t arrive starving.', 'Start with the protein and salad, then one serve of everything else.', 'Pick the one dessert you love most and enjoy it.'] },
    party: { title: 'Party or drinks', icon: 'sparkle', lines: ['Have a proper meal before you go.', 'Alternate every drink with a glass of water.', 'Decide how many drinks you’ll have before you arrive.'] },
    takeaway: { title: 'Takeaway night', icon: 'bag', lines: ['Choose the order before you’re hungry.', 'Grilled over fried, and add a salad.', 'Serve it on a plate and put the rest away.'] },
    weekend: { title: 'The weekend', icon: 'calendar', lines: ['Pick one fun meal and keep the rest normal.', 'Plan one active thing, like a long walk.', 'Keep breakfast the same both days.'] },
  };

  // ── Health screening (APSS V2 2019, Stage 1) ──────────────────────────────
  const SCREENING = [
    'Has your medical practitioner ever told you that you have a heart condition or have you ever suffered a stroke?',
    'Do you ever experience unexplained pains or discomfort in your chest at rest or during physical activity/exercise?',
    'Do you ever feel faint, dizzy or lose balance during physical activity/exercise?',
    'Have you had an asthma attack requiring immediate medical attention at any time over the last 12 months?',
    'If you have diabetes (type 1 or 2) have you had trouble controlling your blood sugar (glucose) in the last 3 months?',
    'Do you have any other conditions that may require special consideration for you to exercise?',
  ];

  // ── Awards (earned, never bought) ─────────────────────────────────────────
  const AWARDS = [
    { id: 'first', name: 'First Session', desc: 'You walked in and did it.', icon: 'dumbbell', metal: 'gold' },
    { id: 'week1', name: 'First Week', desc: 'Every session in your first week.', icon: 'calendar', metal: 'gold' },
    { id: 'perfect', name: 'Perfect Week', desc: 'Training and food goals both met in one week.', icon: 'star', metal: 'gold' },
    { id: 'stronger', name: 'Stronger', desc: 'You lifted more than last time.', icon: 'up', metal: 'silver' },
    { id: 'dialled', name: 'Dialled In', desc: 'Saved your settings on a machine.', icon: 'sliders', metal: 'silver' },
    { id: 'smartorder', name: 'Smart Order', desc: 'Ate out with a plan.', icon: 'fork', metal: 'silver' },
    { id: 'streak3', name: 'Three-Week Streak', desc: 'Three weeks in a row on target.', icon: 'flame', metal: 'gold' },
    { id: 'ten', name: '10 Sessions', desc: 'Ten sessions done.', icon: 'trophy', metal: 'gold' },
    { id: 'halfway', name: 'Halfway', desc: 'Half your plan done.', icon: 'flag', metal: 'silver' },
    { id: 'finish', name: 'Finish Line', desc: 'Every session in your plan.', icon: 'trophy', metal: 'platinum' },
  ];

  const DEFAULT_REWARDS = { 2: 'Your favourite coffee and cake', 4: 'A movie night, your pick', 6: 'New gym shoes' };

  window.SpotterData = {
    MUSCLES, EX, PROGRAM, COOLDOWN, GYMS, GOALS, FEELS, EXPERIENCE, WORRIES, TIMES,
    CUISINES, DERAILERS, MEALS, MENUS, CUISINE_KEYS, MOMENTS, SCREENING, AWARDS, DEFAULT_REWARDS,
  };
})();
