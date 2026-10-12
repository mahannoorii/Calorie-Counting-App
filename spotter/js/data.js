/* Spotter — content and reference data.
   Everything the app knows about exercises, gyms, food, rewards and the coach lives here,
   so a gym-mapping pass or a coach review only has to touch this file. */
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
    { id: 'little', label: 'A little', sub: 'I’ve tried, but never stuck with it' },
    { id: 'regular', label: 'Yes, regularly', sub: 'I’ve trained consistently before' },
  ];
  const WORRIES = [
    { id: 'what', label: 'Not knowing what to do' },
    { id: 'machines', label: 'Working out the machines' },
    { id: 'watched', label: 'Feeling watched' },
    { id: 'busy', label: 'Busy gym, machines taken' },
    { id: 'motivation', label: 'Staying motivated' },
    { id: 'food', label: 'Knowing what to eat' },
  ];
  const TIMES = [
    { id: 'morning', label: 'Morning', hour: 7 },
    { id: 'lunch', label: 'Lunchtime', hour: 12 },
    { id: 'afternoon', label: 'After work', hour: 17 },
    { id: 'evening', label: 'Evening', hour: 19 },
  ];
  const COOKS = [
    { id: 'me', label: 'Mostly me' },
    { id: 'partner', label: 'My partner' },
    { id: 'both', label: 'We share it' },
    { id: 'little', label: 'Not much cooking' },
  ];

  // ── Food ──────────────────────────────────────────────────────────────────
  // General healthy-eating ideas (Australian Dietary Guidelines territory), not meal plans.
  const DISHES = [
    { id: 'ghormeh', name: 'Ghormeh sabzi', cuisine: 'Persian',
      lighter: ['Use lean beef or chicken and trim visible fat.', 'Fry the herbs in a tablespoon or two of oil, not a cupful.', 'The kidney beans already add fibre, so add an extra handful.'],
      plate: 'A palm of the stew’s meat, a cupped handful of rice, two fists of salad shirazi.' },
    { id: 'koobideh', name: 'Kabab koobideh', cuisine: 'Persian',
      lighter: ['Make it with lean mince, or half beef and half chicken mince.', 'Grill rather than pan-fry.', 'Fill the plate with grilled tomatoes and salad.'],
      plate: 'One or two skewers, a cupped handful of rice or one piece of bread, plenty of salad.' },
    { id: 'joojeh', name: 'Joojeh kabab', cuisine: 'Persian',
      lighter: ['Already a great choice: lean chicken marinated in yoghurt, saffron and lemon.', 'Go easy on the butter on the rice.'],
      plate: 'A palm or two of chicken, a cupped handful of rice, mast-o-khiar and salad.' },
    { id: 'zereshk', name: 'Zereshk polo ba morgh', cuisine: 'Persian',
      lighter: ['The chicken is perfect as is.', 'Halve the butter in the rice; the barberries carry the flavour.', 'Add a big salad on the side.'],
      plate: 'A palm of chicken, a cupped handful of rice, two fists of salad.' },
    { id: 'adas', name: 'Adas polo', cuisine: 'Persian',
      lighter: ['Lentils add protein and fibre, a great base.', 'Cut back the butter and fried onion topping.', 'Serve with yoghurt or chicken for extra protein.'],
      plate: 'A cupped handful or two of adas polo, a palm of protein, salad.' },
    { id: 'lubia', name: 'Lubia polo', cuisine: 'Persian',
      lighter: ['Use lean mince.', 'Double the green beans.', 'Measure the rice before it goes in the pot.'],
      plate: 'A generous serve with extra beans, and a side salad.' },
    { id: 'ash', name: 'Ash reshteh', cuisine: 'Persian',
      lighter: ['The legumes and greens are the good stuff.', 'Go light on the kashk and fried mint and onion on top. That’s where the calories hide.'],
      plate: 'A big bowl, with toppings as a drizzle rather than a layer.' },
    { id: 'kuku', name: 'Kuku sabzi', cuisine: 'Persian',
      lighter: ['Bake it in the oven instead of frying.', 'Eggs and herbs make it high in protein.'],
      plate: 'Two pieces with yoghurt, salad and a little bread.' },
    { id: 'mirza', name: 'Mirza ghasemi', cuisine: 'Persian',
      lighter: ['Roast the eggplant whole, then use just a little oil.', 'The eggs add protein.'],
      plate: 'A generous serve with one piece of bread and some fresh herbs.' },
    { id: 'fesenjan', name: 'Fesenjan', cuisine: 'Persian',
      lighter: ['Walnuts and pomegranate are rich, so make it a special occasion dish.', 'More chicken, less sauce on the plate.'],
      plate: 'A palm of chicken with a few spoons of sauce, a cupped handful of rice, salad.' },
    { id: 'bolognese', name: 'Spaghetti bolognese', cuisine: 'Everyday',
      lighter: ['Lean mince, and grate in carrot and zucchini.', 'Weigh the pasta: about 75 g dry per person.'],
      plate: 'A cupped handful or two of pasta, plenty of sauce, side salad.' },
    { id: 'stirfry', name: 'Stir-fry', cuisine: 'Everyday',
      lighter: ['Lots of vegetables, lean protein, one tablespoon of oil.', 'Go easy on sweet sauces.'],
      plate: 'Half the plate vegetables, a palm of protein, a cupped handful of rice or noodles.' },
    { id: 'curry', name: 'Chicken curry', cuisine: 'Everyday',
      lighter: ['Use light coconut milk or a yoghurt base.', 'Add spinach or peas.'],
      plate: 'A palm of chicken, a cupped handful of rice, vegetables.' },
    { id: 'wraps', name: 'Wraps or tacos', cuisine: 'Everyday',
      lighter: ['Grilled chicken or lean mince.', 'Load up the salad, go light on cheese and sour cream.'],
      plate: 'Two wraps or tacos with plenty of salad.' },
    { id: 'burgers', name: 'Homemade burgers', cuisine: 'Everyday',
      lighter: ['Make lean patties at home.', 'One bun, lots of salad, skip the chips or share them.'],
      plate: 'One burger and a side salad.' },
    { id: 'pizza', name: 'Homemade pizza', cuisine: 'Everyday',
      lighter: ['Thin base, plenty of vegetables, a lighter hand with cheese.'],
      plate: 'Two or three slices with a big salad.' },
  ];

  const DERAILERS = [
    { id: 'gatherings', label: 'Family gatherings' },
    { id: 'eatingout', label: 'Eating out' },
    { id: 'takeaway', label: 'Takeaway' },
    { id: 'sweets', label: 'Sweet treats' },
    { id: 'weekends', label: 'Weekends' },
    { id: 'latenight', label: 'Late-night snacking' },
    { id: 'stress', label: 'Busy or stressful days' },
  ];

  const HAND_PORTIONS = [
    { part: 'Palm', food: 'Protein', eg: 'Chicken, kabab, fish, eggs, lentils', per: '1 per meal' },
    { part: 'Fist', food: 'Vegetables', eg: 'Salad shirazi, greens, grilled veg', per: '2 per meal' },
    { part: 'Cupped hand', food: 'Carbs', eg: 'Rice, bread, pasta, potato', per: '1 per meal' },
    { part: 'Thumb', food: 'Fats', eg: 'Oil, butter, nuts, cheese', per: '1 per meal' },
  ];

  // Game plans. {persian} lines are shown when the person cooks or eats Persian food.
  const GAMEPLANS = {
    gathering: {
      title: 'Family gathering', icon: 'people', color: 'red',
      intro: 'Go, enjoy it, and still have a good week. One big meal doesn’t undo anything.',
      parts: [
        { h: 'Before you go', items: ['Eat a normal breakfast and a protein-rich lunch, so you don’t arrive starving.', 'Drink a big glass of water before you leave.'] },
        { h: 'At the table', items: ['Start with protein and salad.', 'Have one serve of rice, then wait ten minutes before deciding on more.', 'Slow down. Talk more, eat slower.'],
          persian: ['Start with kabab or joojeh, salad shirazi and mast-o-khiar.', 'One serve of rice with a small piece of tahdig. Tahdig is the richest part, so enjoy one good piece.'] },
        { h: 'Sweets', items: ['Pick the one sweet you love most and enjoy it slowly.', 'Tea with it is perfect.'], sweets: true },
        { h: 'After', items: ['Offer to go for a short walk with the family.', 'Next meal is back to normal. No skipping meals to "make up" for it.'] },
      ],
    },
    eatingout: {
      title: 'Eating out', icon: 'fork', color: 'blue',
      intro: 'Decide before you’re hungry and the menu does the rest.',
      parts: [
        { h: 'Before', items: ['Look at the menu online and choose before you arrive.', 'Don’t skip lunch to save up. You’ll over-order.'] },
        { h: 'Ordering', items: ['Grilled over fried.', 'Ask for sauces and dressings on the side.', 'Swap chips for salad or veg if you can.', 'Share an entrée or dessert.'] },
        { h: 'At the table', items: ['Water alongside any drinks.', 'Stop when you’re satisfied, not stuffed.'] },
      ],
    },
    takeaway: {
      title: 'Takeaway night', icon: 'bag', color: 'yellow',
      intro: 'Takeaway can fit. Pick your order while you’re not hungry.',
      parts: [
        { h: 'Choose ahead', items: ['Decide what you’ll order earlier in the day.', 'Keep a short list of go-to orders from your usual places.'] },
        { h: 'Better picks', items: ['Kebab or chicken plate with salad instead of chips.', 'Stir-fry with steamed rice instead of fried rice.', 'Thin-crust pizza shared, with a salad.', 'Skip the extras: garlic bread, extra sauces, upsized drinks.'] },
        { h: 'Serve it on a plate', items: ['Eat from a plate, not the container. You’ll eat less without trying.'] },
      ],
    },
    weekend: {
      title: 'Weekend game plan', icon: 'calendar', color: 'green',
      intro: 'Weekends are where most weeks slip. A two-minute plan fixes most of it.',
      parts: [
        { h: 'Pick your fun meal', items: ['Choose one meal this weekend to enjoy fully. Everything else stays normal.'] },
        { h: 'Keep the anchors', items: ['Normal breakfast both days.', 'Protein at every meal.', 'Plan one walk or active outing.'] },
        { h: 'Sunday', items: ['Cook one or two go-to meals together for the week ahead.'] },
      ],
    },
  };

  const CHECKIN_REASONS = ['Family gathering', 'Eating out', 'Takeaway', 'Sweets', 'Late snacking', 'Busy day', 'Tired'];

  // ── Health screening (APSS V2 2019, Stage 1) ──────────────────────────────
  const SCREENING = [
    'Has your medical practitioner ever told you that you have a heart condition or have you ever suffered a stroke?',
    'Do you ever experience unexplained pains or discomfort in your chest at rest or during physical activity/exercise?',
    'Do you ever feel faint, dizzy or lose balance during physical activity/exercise?',
    'Have you had an asthma attack requiring immediate medical attention at any time over the last 12 months?',
    'If you have diabetes (type 1 or 2) have you had trouble controlling your blood sugar (glucose) in the last 3 months?',
    'Do you have any other conditions that may require special consideration for you to exercise?',
  ];

  // ── Rewards ───────────────────────────────────────────────────────────────
  // Levels are bumper plates: 5 kg white → 25 kg red, then gold.
  const LEVELS = [
    { xp: 0, kg: 5, name: 'White plate', color: 'plate-white' },
    { xp: 250, kg: 10, name: 'Green plate', color: 'plate-green' },
    { xp: 700, kg: 15, name: 'Yellow plate', color: 'plate-yellow' },
    { xp: 1400, kg: 20, name: 'Blue plate', color: 'plate-blue' },
    { xp: 2300, kg: 25, name: 'Red plate', color: 'plate-red' },
    { xp: 3400, kg: 0, name: 'Gold plate', color: 'plate-gold' },
  ];
  const XP = { set: 5, exercise: 10, session: 60, food: 10, foodOn: 15, weekend: 20, gathering: 20, checkin: 30, coach: 5, settings: 5 };

  const BADGES = [
    { id: 'plan', name: 'Plan made', desc: 'You built your plan. Day one starts here.', icon: 'map', tone: 'blue' },
    { id: 'first', name: 'First session', desc: 'Your first session at the gym is done.', icon: 'dumbbell', tone: 'red' },
    { id: 'week1', name: 'Week one', desc: 'Every planned session in your first week.', icon: 'calendar', tone: 'green' },
    { id: 'fullweek', name: 'Full week', desc: 'Hit your training target for a week.', icon: 'check', tone: 'blue' },
    { id: 'streak2', name: 'Two in a row', desc: 'Two weeks in a row on target.', icon: 'flame', tone: 'red' },
    { id: 'up', name: 'Going up', desc: 'You lifted more weight than last time.', icon: 'up', tone: 'yellow' },
    { id: 'settings', name: 'Dialled in', desc: 'Saved your seat settings on a machine.', icon: 'sliders', tone: 'blue' },
    { id: 'honest', name: 'Honest check-in', desc: 'Your first food check-in.', icon: 'leaf', tone: 'green' },
    { id: 'five', name: 'Five good days', desc: 'Five on-track food days in one week.', icon: 'star', tone: 'yellow' },
    { id: 'weekend', name: 'Weekend ready', desc: 'Planned a weekend ahead of time.', icon: 'calendar', tone: 'green' },
    { id: 'feast', name: 'Feast ready', desc: 'Made a game plan for a family gathering.', icon: 'people', tone: 'red' },
    { id: 'coach', name: 'Asked the coach', desc: 'Asked Spotter your first question.', icon: 'chat', tone: 'blue' },
    { id: 'checkin', name: 'Sunday check-in', desc: 'Finished your first weekly check-in.', icon: 'clipboard', tone: 'yellow' },
    { id: 'halfway', name: 'Halfway there', desc: 'Half your planned sessions done.', icon: 'flag', tone: 'green' },
    { id: 'all', name: 'Every session', desc: 'Finished every session in your plan.', icon: 'trophy', tone: 'gold' },
  ];

  const DEFAULT_REWARDS = { 2: 'Your favourite coffee and cake', 4: 'A movie night, your pick', 6: 'New gym shoes' };

  // ── Coach knowledge (pre-written answers) ─────────────────────────────────
  // ctx: where the question is suggested · keys: words that point to it
  const KB = [
    // Getting started
    { id: 'weight', q: 'How do I pick my weight?', ctx: ['exercise', 'ready'], keys: ['weight', 'heavy', 'light', 'pick', 'choose', 'kg', 'start'],
      a: 'Start lighter than you think. Pick a weight you could lift about 15 times, then do your 10–12 reps.\n\nThe last two or three reps should feel challenging, but your form stays clean. If set 1 felt easy, go up one step for set 2. I’ll suggest the next weight for you each time.' },
    { id: 'reps', q: 'What do sets and reps mean?', ctx: ['ready', 'exercise', 'onboarding'], keys: ['set', 'sets', 'rep', 'reps', 'mean', 'repetition'],
      a: 'A rep is one full movement, like one push of the leg press. A set is a group of reps done in a row.\n\n"2 sets × 10–12" means: do 10 to 12 reps, rest, then do another 10 to 12.' },
    { id: 'rest', q: 'How long should I rest?', ctx: ['exercise', 'rest'], keys: ['rest', 'long', 'break', 'wait', 'between'],
      a: 'About 60 to 90 seconds between sets. I start a timer for you after each set. If you need a little longer, that’s fine. Just keep it under 2 minutes so the session flows.' },
    { id: 'breathe', q: 'How should I breathe?', ctx: ['exercise', 'warmup'], keys: ['breathe', 'breath', 'breathing'],
      a: 'Breathe out as you push or pull (the hard part) and breathe in as you return. The main thing: don’t hold your breath.' },
    { id: 'taken', q: 'What if the machine is taken?', ctx: ['exercise', 'ready'], keys: ['taken', 'busy', 'someone', 'using', 'occupied', 'wait'],
      a: 'Two easy options:\n\n1. Ask "Mind if I work in?" People swap sets all the time.\n2. Tap Swap and I’ll give you a machine that works the same muscles.\n\nBoth are completely normal gym moves.' },
    { id: 'find', q: 'Where is this machine?', ctx: ['exercise'], keys: ['where', 'find', 'location', 'located', 'which machine'],
      a: 'Exact locations and photos of each machine arrive once your gym is mapped. Until then, the picture shows the type of machine, and the staff at reception are happy to point it out.' },
    { id: 'form', q: 'How do I know my form is right?', ctx: ['exercise'], keys: ['form', 'technique', 'right', 'correct', 'doing it'],
      a: 'Three checks:\n\n1. You feel it in the muscles listed on this screen.\n2. You can control the weight on the way back. No dropping or swinging.\n3. Nothing pinches or hurts in your joints.\n\nIf any of those are off, drop the weight a step.' },
    { id: 'sore', q: 'Is it normal to be sore?', ctx: ['today', 'complete', 'warmup'], keys: ['sore', 'soreness', 'ache', 'stiff', 'doms'],
      a: 'Yes. Muscle soreness 1 to 3 days after training is normal, especially in the first few weeks. It fades as your body adapts. A walk and stretching help.\n\nSharp pain, or pain in a joint, is different. Stop that exercise and let me or your GP know.' },
    { id: 'pain', q: 'Something hurts. What should I do?', ctx: ['exercise', 'warmup', 'today'], keys: ['hurt', 'hurts', 'pain', 'painful', 'injury', 'injured', 'sharp', 'pinch'],
      a: 'Stop that exercise now. Mild muscle burning during a set is normal, but sharp, pinching or joint pain isn’t.\n\nSkip it for today and tell your GP or a physio if it doesn’t settle. You can swap to another exercise that doesn’t hurt.' },
    { id: 'asthma', q: 'My asthma is playing up', ctx: ['exercise', 'warmup', 'ready', 'rest'], keys: ['asthma', 'wheeze', 'wheezy', 'breathless', 'puffer', 'inhaler', 'chest tight', 'tight chest', 'cough'],
      a: 'Stop and take your reliever, as your asthma action plan says. Sit and rest until your breathing settles.\n\nIf symptoms come back a second time, that’s it for today. Head home and rest.\n\nIf your reliever isn’t helping or breathing is getting worse, follow your asthma action plan and call 000.', urgent: true },
    { id: 'dizzy', q: 'I feel dizzy or faint', ctx: ['exercise', 'warmup', 'rest'], keys: ['dizzy', 'faint', 'lightheaded', 'light-headed', 'chest pain', 'nausea', 'sick'],
      a: 'Stop now and sit down. Sip some water and rest.\n\nChest pain, or dizziness that doesn’t pass, needs medical help. Call 000 in an emergency. Either way, mention it to your GP before your next session.', urgent: true },
    { id: 'warmup', q: 'Why do I need to warm up?', ctx: ['warmup', 'ready'], keys: ['warm', 'warmup', 'warm-up', 'why'],
      a: 'A warm-up raises your heart rate and temperature gradually, so your muscles and joints are ready. With asthma it matters even more: a gradual start helps your airways settle in before the harder work.' },
    { id: 'wear', q: 'What should I bring and wear?', ctx: ['ready', 'today'], keys: ['wear', 'bring', 'clothes', 'shoes', 'bag', 'pack'],
      a: 'Comfortable clothes you can move in, closed shoes, a water bottle and a small towel. With asthma, your reliever puffer goes in the bag every time.' },
    { id: 'etiquette', q: 'Any gym etiquette I should know?', ctx: ['ready', 'today'], keys: ['etiquette', 'rules', 'manners', 'wipe', 'polite'],
      a: 'The basics:\n\n- Wipe the seat and handles after you use a machine.\n- Put weights back where they came from.\n- If someone’s waiting, let them work in between your sets.\n\nThat’s it. Nobody expects you to know more.' },
    { id: 'watched', q: 'I feel like people are watching me', ctx: ['ready', 'exercise', 'today'], keys: ['watch', 'watched', 'watching', 'judge', 'judged', 'embarrassed', 'nervous', 'anxious', 'scared', 'look'],
      a: 'Almost everyone feels this at first. The truth: people are busy with their own sets, their music and their mirror.\n\nHeadphones help. So does having a plan, which you do. You’ll look like you know what you’re doing, because you will.' },
    { id: 'motivation', q: 'I don’t feel like going today', ctx: ['today'], keys: ['motivation', 'motivated', 'lazy', 'tired', 'skip', 'don’t feel', 'dont feel', 'cant be bothered', 'can’t be bothered'],
      a: 'Try the 10-minute deal: go, do the warm-up and one exercise. If you still want to leave after that, leave.\n\nMost of the time you’ll finish the session. And a short session still counts.' },
    { id: 'missed', q: 'I missed a session. What now?', ctx: ['today'], keys: ['missed', 'miss', 'skipped', 'behind'],
      a: 'No stress. Do it on the next free day and carry on. Don’t try to double up. Consistency over weeks beats any single session.' },
    { id: 'enough', q: 'Are two days a week enough?', ctx: ['today', 'onboarding', 'journey'], keys: ['enough', 'two days', '2 days', 'more days', 'how often'],
      a: 'Yes. Australia’s physical activity guidelines recommend strength training on at least two days a week, and most adults don’t do any. Two days you actually do beats four you skip.' },
    { id: 'machines', q: 'Why machines and not free weights?', ctx: ['onboarding', 'exercise', 'today'], keys: ['machine', 'machines', 'free weights', 'dumbbell', 'barbell'],
      a: 'Machines guide the movement, so you can learn how each exercise should feel without worrying about balance. They’re quick to set up and safe to push. Free weights can come later if you want them.' },
    { id: 'bulky', q: 'Will lifting weights make me bulky?', ctx: ['today', 'onboarding'], keys: ['bulky', 'bulk', 'big', 'manly', 'huge'],
      a: 'No. You’ll get stronger and more toned. Building a lot of muscle takes years of very specific training and eating. This plan is about strength, energy and confidence.' },
    { id: 'results', q: 'When will I see results?', ctx: ['today', 'journey'], keys: ['results', 'when', 'see', 'change', 'progress', 'long'],
      a: 'Most people feel it first: more energy and lifting a little more within 2 to 4 weeks. Visible changes usually take 6 to 8 weeks of steady training and steady food. Your weights going up is the earliest proof, and I track that for you.' },
    { id: 'increase', q: 'When do I add weight?', ctx: ['exercise', 'complete'], keys: ['increase', 'add', 'more weight', 'heavier', 'progress'],
      a: 'When you hit the top of the rep range on every set (12 out of 12) with good form, go up one step next time. I work this out from what you log and suggest it before each set.' },
    { id: 'settings', q: 'Why save my seat settings?', ctx: ['exercise'], keys: ['seat', 'setting', 'settings', 'adjust', 'height', 'pin'],
      a: 'Every machine has adjustments like seat height and start position. Save yours once and next time you’ll set it up in seconds, without guessing.' },
    { id: 'swap', q: 'Can I swap an exercise?', ctx: ['exercise'], keys: ['swap', 'change', 'replace', 'different', 'instead', 'alternative'],
      a: 'Yes. Tap Swap and pick one of the alternatives. They work the same muscles, so your plan still holds together.' },
    { id: 'cooldown', q: 'Do I really need to stretch?', ctx: ['cooldown', 'complete'], keys: ['stretch', 'stretching', 'cool', 'cooldown'],
      a: 'A few minutes of easy movement and stretching helps you leave the gym feeling good and lets your breathing settle. It’s quick, and it’s a nice way to finish.' },
    // Food
    { id: 'before', q: 'What should I eat before training?', ctx: ['food', 'ready', 'today'], keys: ['before', 'pre', 'eat before'],
      a: 'A light snack 1 to 2 hours before is plenty: a banana, yoghurt, or toast with peanut butter. Training on a full stomach isn’t fun.' },
    { id: 'after', q: 'What should I eat after?', ctx: ['food', 'complete'], keys: ['after', 'post', 'eat after', 'recover'],
      a: 'Your next normal meal, with a palm-sized serve of protein. No shakes needed.' },
    { id: 'protein', q: 'How much protein do I need?', ctx: ['food'], keys: ['protein', 'meat', 'chicken'],
      a: 'A simple guide: a palm-sized serve of protein at each meal. Chicken, kabab, fish, eggs, lentils or Greek yoghurt all count.' },
    { id: 'gathering', q: 'How do I handle a family gathering?', ctx: ['food', 'today'], keys: ['gathering', 'family', 'party', 'mehmooni', 'mehmuni', 'dinner', 'event', 'feast'],
      a: 'Enjoy it, with a plan:\n\n- Don’t arrive starving. Normal breakfast and lunch.\n- Start with kabab, salad shirazi and mast-o-khiar.\n- One serve of rice with one good piece of tahdig.\n- Pick the one sweet you love most.\n- Back to normal at your next meal.\n\nOpen the Food tab to make a game plan for it.' },
    { id: 'tahdig', q: 'Can I still have tahdig?', ctx: ['food'], keys: ['tahdig', 'rice', 'polo'],
      a: 'Yes. Tahdig is the richest part of the rice because of the oil or butter, so have one good piece and enjoy it. Nothing is banned.' },
    { id: 'sweets', q: 'I have a sweet tooth. Help?', ctx: ['food'], keys: ['sweet', 'sweets', 'dessert', 'chocolate', 'sugar', 'cake', 'baklava', 'zoolbia', 'bamieh'],
      a: 'Keep sweets, just make them deliberate. Choose the one you love most, have it slowly with tea, and skip the ones you’re only eating because they’re there.' },
    { id: 'eatingout', q: 'Tips for eating out?', ctx: ['food'], keys: ['restaurant', 'eating out', 'eat out', 'out'],
      a: 'Choose from the menu before you arrive, go for grilled over fried, ask for sauces on the side, and share dessert. The Food tab has a full game plan.' },
    { id: 'takeaway', q: 'What’s a better takeaway order?', ctx: ['food'], keys: ['takeaway', 'take away', 'uber', 'delivery', 'order', 'hsp', 'kebab'],
      a: 'A kebab or chicken plate with salad instead of chips, stir-fry with steamed rice, or a shared thin-crust pizza with salad. Decide what you’ll order before you’re hungry.' },
    { id: 'offtrack', q: 'I went off track. Now what?', ctx: ['food', 'today'], keys: ['off track', 'blew', 'binge', 'overate', 'ate too much', 'ruined', 'failed', 'bad day'],
      a: 'Nothing is ruined. One meal or one day doesn’t undo a week. Don’t skip meals to make up for it. Just make your next meal a normal one. Your weekly target leaves room for this.' },
    { id: 'calories', q: 'Should I count calories?', ctx: ['food'], keys: ['calorie', 'calories', 'count', 'counting', 'macros'],
      a: 'Not for now. We’re keeping food simple: steady weekdays, planned weekends, and an honest one-tap check-in each night. If you want more detail later, that can come.' },
    { id: 'water', q: 'How much water should I drink?', ctx: ['food', 'ready'], keys: ['water', 'drink', 'hydrate', 'hydration'],
      a: 'Drink regularly through the day and bring a bottle to the gym. Pale yellow urine is a good sign you’re drinking enough.' },
    // App
    { id: 'why', q: 'Why do you ask about my health?', ctx: ['onboarding'], keys: ['health', 'questions', 'screening', 'why ask'],
      a: 'These are the standard pre-exercise screening questions Australian gyms use. If any answer is yes, it’s worth a quick chat with your GP before you start. That’s the normal step for everyone.' },
    { id: 'data', q: 'Where is my information kept?', ctx: ['onboarding', 'me'], keys: ['data', 'private', 'privacy', 'information', 'stored', 'saved'],
      a: 'In this prototype, everything stays on your phone. Nothing is sent anywhere. Add Spotter to your Home Screen so your iPhone keeps it safely.' },
    { id: 'rewards', q: 'How do rewards work?', ctx: ['journey', 'today', 'complete'], keys: ['reward', 'rewards', 'xp', 'level', 'plate', 'badge', 'points'],
      a: 'Everything you do earns XP: sets, sessions, food check-ins and plans. XP moves you up the plates, from a 5 kg white plate to a 25 kg red, and then gold. Badges mark firsts, and real rewards unlock at weeks 2, 4 and 6.' },
  ];

  window.SpotterData = {
    MUSCLES, EX, PROGRAM, COOLDOWN, GYMS, GOALS, FEELS, EXPERIENCE, WORRIES, TIMES, COOKS,
    DISHES, DERAILERS, HAND_PORTIONS, GAMEPLANS, CHECKIN_REASONS, SCREENING, LEVELS, XP, BADGES, DEFAULT_REWARDS, KB,
  };
})();
