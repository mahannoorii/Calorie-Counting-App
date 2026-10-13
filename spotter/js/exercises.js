/* Spotter — the exercise library and the equipment it needs.
   Every move lists the gear it needs (eq: all of these), its movement pattern (what the
   plan builder fills a slot with), its level (1 new, 2 some experience, 3 experienced)
   and short cues. The plan only uses what's at your gym; search finds everything. */
(function () {
  'use strict';
  const D = window.SpotterData;

  // ── Equipment, grouped the way a gym floor is ─────────────────────────────
  const EQUIP = {
    cardio: { name: 'Cardio', items: { treadmill: 'Treadmills', bike: 'Exercise bikes', spin_bike: 'Spin bikes', cross_trainer: 'Cross trainers', rower: 'Rowing machines', stairs: 'Stair climbers', ski_erg: 'Ski ergs', assault_bike: 'Air bikes' } },
    machines: { name: 'Machines', items: {
      leg_press: 'Leg press', hack_squat: 'Hack squat', pendulum_squat: 'Pendulum squat', belt_squat: 'Belt squat', leg_extension: 'Leg extension', leg_curl_seated: 'Seated leg curl', leg_curl_lying: 'Lying leg curl',
      hip_thrust_machine: 'Hip thrust machine', glute_machine: 'Glute kickback machine', hip_abduction: 'Hip abduction', hip_adduction: 'Hip adduction', calf_raise_machine: 'Calf raise machine',
      chest_press_machine: 'Chest press', incline_chest_press_machine: 'Incline chest press', plate_loaded_chest: 'Plate-loaded chest press', pec_deck: 'Pec deck / rear delt',
      shoulder_press_machine: 'Shoulder press', lateral_raise_machine: 'Lateral raise machine', lat_pulldown: 'Lat pulldown', plate_loaded_pulldown: 'Plate-loaded pulldown', assisted_pullup: 'Assisted pull-up / dip',
      seated_row_machine: 'Seated cable row', machine_row: 'Chest-supported row', plate_loaded_row: 'Plate-loaded row', t_bar_row: 'T-bar row',
      bicep_curl_machine: 'Biceps curl machine', tricep_machine: 'Triceps machine', ab_crunch_machine: 'Ab crunch machine', back_extension: 'Back extension bench',
    } },
    cables: { name: 'Cables', items: { cable_station: 'Adjustable cable station', cable_crossover: 'Cable crossover' } },
    free: { name: 'Free weights', items: {
      dumbbells: 'Dumbbells', kettlebells: 'Kettlebells', barbell: 'Barbells and plates', ez_bar: 'EZ curl bar', trap_bar: 'Trap bar', squat_rack: 'Squat or power rack', smith_machine: 'Smith machine',
      flat_bench: 'Flat bench', adjustable_bench: 'Adjustable bench', preacher_bench: 'Preacher bench', landmine: 'Landmine', pullup_bar: 'Pull-up bar', dip_station: 'Dip station / captain’s chair',
    } },
    functional: { name: 'Functional', items: { trx: 'TRX straps', battle_ropes: 'Battle ropes', medicine_ball: 'Medicine balls', plyo_box: 'Plyo boxes', bosu: 'BOSU', bands: 'Resistance bands', jump_rope: 'Skipping ropes', sled: 'Sled', boxing_bag: 'Boxing bags', lifting_platform: 'Lifting platforms', ab_wheel: 'Ab wheel', mats: 'Mats and stretch area' } },
  };
  const EQUIP_NAME = {}; Object.keys(EQUIP).forEach((g) => Object.assign(EQUIP_NAME, EQUIP[g].items));

  const MUSCLES = {
    quads: 'Front of thighs', hams: 'Back of thighs', glutes: 'Glutes', calves: 'Calves', hips: 'Outer hips', adductors: 'Inner thighs',
    chest: 'Chest', back: 'Upper back', lats: 'Sides of back', lower_back: 'Lower back', traps: 'Traps',
    shoulders: 'Shoulders', rear: 'Back of shoulders', biceps: 'Biceps', triceps: 'Back of arms', forearms: 'Forearms',
    core: 'Core', obliques: 'Obliques',
  };

  // Movement patterns the plan builder fills.
  const PATTERNS = {
    squat: 'Squat', hinge: 'Hip hinge', lunge: 'Single leg', knee_ext: 'Quads', knee_flex: 'Hamstrings', glute: 'Glutes', adduct: 'Inner thighs', calf: 'Calves',
    h_push: 'Chest press', fly: 'Chest fly', v_push: 'Shoulder press', lateral: 'Side shoulders', rear: 'Rear shoulders', traps: 'Traps',
    v_pull: 'Pulldown', h_pull: 'Row', biceps: 'Biceps', triceps: 'Triceps',
    core: 'Core', carry: 'Carry', cond: 'Conditioning', cardio: 'Cardio',
  };

  const EX = {};
  // X(id, name, spec). kind: machine | plate | cable | free | barbell | smith | body | cardio
  function X(id, name, o) { EX[id] = Object.assign({ id, name, unit: 'kg', reps: [10, 12], rest: 75, lvl: 1, muscles2: [], aka: [], avoid: [] }, o); }

  // ── Legs: squat pattern ───────────────────────────────────────────────────
  X('leg_press', 'Leg press', { eq: ['leg_press'], kind: 'machine', pat: 'squat', art: 'legpress', muscles: ['quads', 'glutes'], muscles2: ['hams'], focus: 'Legs and glutes', step: 5, start: 30, rest: 90, aka: ['45 degree leg press', 'sled press'],
    setup: ['Sit with your back and head flat against the pad.', 'Feet hip-width apart in the middle of the platform.', 'Move the seat so your knees start bent at about 90 degrees.', 'Hold the side handles and release the safety catch if there is one.'],
    move: ['Push through your whole foot until your legs are almost straight.', 'Stop just before your knees lock.', 'Lower slowly for 2 seconds until your knees are back near 90 degrees.'],
    feel: 'Front of your thighs and your glutes.', avoid: ['Locking your knees at the top', 'Letting your lower back or hips lift off the pad', 'Heels lifting off the platform'] });
  X('hack_squat_machine', 'Hack squat', { eq: ['hack_squat'], kind: 'plate', pat: 'squat', art: 'hack', muscles: ['quads', 'glutes'], muscles2: ['hams'], focus: 'Legs and glutes', step: 5, start: 20, rest: 90, aka: ['hack squat machine'],
    setup: ['Shoulders under the pads, back flat against the backrest.', 'Feet hip-width in the middle of the platform.', 'Release the safety handles once you’re set.'],
    move: ['Bend your knees and lower slowly until your thighs are about parallel.', 'Push back up through your whole foot.'],
    feel: 'Front of your thighs and glutes.', avoid: ['Heels lifting', 'Locking your knees', 'Lower back peeling off the pad'] });
  X('pendulum_squat', 'Pendulum squat', { eq: ['pendulum_squat'], kind: 'plate', pat: 'squat', lvl: 2, art: 'hack', muscles: ['quads'], muscles2: ['glutes'], focus: 'Front of thighs', step: 5, start: 20, rest: 90,
    setup: ['Back against the pad, shoulders under the pads.', 'Feet in the middle of the platform, hip-width.'],
    move: ['Sink down deep under control, knees travelling forward.', 'Drive back up without locking out hard.'],
    feel: 'The front of your thighs, a lot.', avoid: ['Bouncing out of the bottom'] });
  X('belt_squat', 'Belt squat', { eq: ['belt_squat'], kind: 'plate', pat: 'squat', lvl: 2, art: 'hack', muscles: ['quads', 'glutes'], focus: 'Legs without loading your back', step: 5, start: 20, rest: 90,
    setup: ['Clip the belt around your hips and step onto the platform.', 'Hold the handles for balance.'],
    move: ['Squat down with your chest up.', 'Stand up by driving through your feet.'],
    feel: 'Thighs and glutes, with no load on your spine.', avoid: ['Leaning forward onto the handles'] });
  X('smith_squat', 'Smith machine squat', { eq: ['smith_machine'], kind: 'smith', pat: 'squat', art: 'smith', muscles: ['quads', 'glutes'], muscles2: ['hams'], focus: 'Legs and glutes', step: 2.5, start: 20, rest: 90, aka: ['smith squat'],
    setup: ['Set the bar just below shoulder height and rest it across your upper back.', 'Step your feet slightly forward of the bar, hip-width.', 'Twist the bar to unhook it.'],
    move: ['Sit down and back until your thighs are about parallel.', 'Push the floor away to stand up.', 'Twist the bar back onto the hooks when you finish.'],
    feel: 'Front of your thighs and glutes.', avoid: ['Knees caving in', 'Heels lifting'] });
  X('goblet_squat', 'Goblet squat', { eq: ['dumbbells'], kind: 'free', pat: 'squat', art: 'kettlebell', muscles: ['quads', 'glutes'], muscles2: ['core'], focus: 'Legs and glutes', step: 2, start: 6, rest: 75, aka: ['kettlebell squat', 'dumbbell squat'],
    setup: ['Hold one dumbbell or kettlebell upright against your chest.', 'Feet a little wider than your hips, toes slightly out.'],
    move: ['Sit down between your heels, chest up.', 'Elbows track inside your knees.', 'Stand back up through your whole foot.'],
    feel: 'Front of your thighs and glutes.', avoid: ['Heels lifting', 'Knees caving in'] });
  X('back_squat', 'Barbell back squat', { eq: ['barbell', 'squat_rack'], kind: 'barbell', pat: 'squat', lvl: 3, art: 'rack', muscles: ['quads', 'glutes'], muscles2: ['hams', 'lower_back', 'core'], focus: 'Whole legs and trunk', step: 2.5, start: 20, rest: 150, reps: [5, 8], aka: ['squat', 'back squat'],
    setup: ['Set the J-hooks at mid-chest and the safety arms just below your bottom position.', 'Bar across your upper back, hands just outside your shoulders.', 'Walk it out two or three steps, feet shoulder-width.'],
    move: ['Brace your stomach, then sit down between your hips to at least parallel.', 'Drive up, keeping your chest and hips rising together.'],
    feel: 'Thighs, glutes and a solid trunk.', avoid: ['Knees caving in', 'Hips shooting up first', 'Squatting without the safeties set'] });
  X('front_squat', 'Front squat', { eq: ['barbell', 'squat_rack'], kind: 'barbell', pat: 'squat', lvl: 3, art: 'rack', muscles: ['quads'], muscles2: ['glutes', 'core', 'back'], focus: 'Front of thighs and upper back', step: 2.5, start: 20, rest: 150, reps: [5, 8],
    setup: ['Bar resting on the front of your shoulders, elbows high.', 'Safety arms just below your bottom position.'],
    move: ['Stay tall and sit straight down.', 'Drive up leading with your elbows.'],
    feel: 'Front of your thighs and your upper back.', avoid: ['Elbows dropping', 'Rounding forward'] });
  X('landmine_squat', 'Landmine squat', { eq: ['landmine', 'barbell'], kind: 'barbell', pat: 'squat', lvl: 2, art: 'landmine', muscles: ['quads', 'glutes'], muscles2: ['core'], focus: 'Legs and glutes', step: 2.5, start: 10, rest: 90,
    setup: ['Hold the end of the bar at your chest with both hands.', 'Lean into the bar slightly, feet shoulder-width.'],
    move: ['Squat down, keeping the bar close.', 'Stand up through your whole foot.'],
    feel: 'Thighs and glutes.', avoid: ['Letting the bar drift away from your chest'] });
  X('bodyweight_squat', 'Bodyweight squat', { eq: [], kind: 'body', pat: 'squat', art: 'mat', unit: 'reps', muscles: ['quads', 'glutes'], focus: 'Legs, anywhere', step: 1, start: 12, reps: [12, 20], rest: 45, aka: ['air squat'],
    setup: ['Feet a little wider than hips, arms out in front for balance.'],
    move: ['Sit down as low as is comfortable.', 'Stand up and squeeze your glutes.'],
    feel: 'Thighs and glutes.', avoid: ['Heels lifting'] });

  // ── Legs: hinge pattern ───────────────────────────────────────────────────
  X('romanian_deadlift', 'Romanian deadlift', { eq: ['barbell'], kind: 'barbell', pat: 'hinge', lvl: 2, art: 'barbell', muscles: ['hams', 'glutes'], muscles2: ['lower_back', 'forearms'], focus: 'Back of thighs and glutes', step: 2.5, start: 20, rest: 120, reps: [8, 10], aka: ['RDL', 'stiff leg deadlift'],
    setup: ['Hold the bar at your hips, hands just outside your legs.', 'Soft knees, feet hip-width.'],
    move: ['Push your hips back and slide the bar down your thighs.', 'Stop when you feel a strong stretch, usually just below your knees.', 'Squeeze your glutes to stand back up.'],
    feel: 'A big stretch in the back of your thighs.', avoid: ['Rounding your back', 'Bending your knees into a squat'] });
  X('db_romanian_deadlift', 'Dumbbell Romanian deadlift', { eq: ['dumbbells'], kind: 'free', pat: 'hinge', art: 'dumbbell', muscles: ['hams', 'glutes'], muscles2: ['lower_back'], focus: 'Back of thighs and glutes', step: 2, start: 8, rest: 90, aka: ['DB RDL', 'dumbbell RDL'],
    setup: ['A dumbbell in each hand at the front of your thighs.', 'Soft knees, feet hip-width.'],
    move: ['Push your hips back, sliding the dumbbells down your legs.', 'Feel the stretch, then squeeze your glutes to stand.'],
    feel: 'The back of your thighs.', avoid: ['Rounding your back'] });
  X('deadlift', 'Deadlift', { eq: ['barbell'], kind: 'barbell', pat: 'hinge', lvl: 3, art: 'barbell', muscles: ['glutes', 'hams', 'lower_back'], muscles2: ['back', 'traps', 'forearms', 'quads'], focus: 'Whole back side of your body', step: 2.5, start: 40, rest: 180, reps: [3, 6], aka: ['conventional deadlift'],
    setup: ['Bar over the middle of your feet, feet hip-width.', 'Hinge down and grip just outside your legs.', 'Shins to the bar, chest up, back flat.'],
    move: ['Brace, then push the floor away until you’re standing tall.', 'Lower by pushing your hips back first.'],
    feel: 'Glutes, hamstrings and your whole back working together.', avoid: ['Rounding your lower back', 'Jerking the bar off the floor'] });
  X('sumo_deadlift', 'Sumo deadlift', { eq: ['barbell'], kind: 'barbell', pat: 'hinge', lvl: 3, art: 'barbell', muscles: ['glutes', 'adductors', 'hams'], muscles2: ['quads', 'lower_back'], focus: 'Glutes and inner thighs', step: 2.5, start: 40, rest: 180, reps: [3, 6],
    setup: ['Wide stance, toes turned out, hands inside your knees.', 'Hips low, chest up.'],
    move: ['Push your knees out and stand up tall.', 'Lower under control.'],
    feel: 'Glutes and inner thighs.', avoid: ['Knees caving in'] });
  X('trap_bar_deadlift', 'Trap bar deadlift', { eq: ['trap_bar'], kind: 'barbell', pat: 'hinge', lvl: 2, art: 'trapbar', muscles: ['glutes', 'quads', 'hams'], muscles2: ['back', 'traps'], focus: 'Whole body strength, easy on the back', step: 2.5, start: 30, rest: 150, reps: [5, 8], aka: ['hex bar deadlift'],
    setup: ['Step inside the bar, handles beside the middle of your feet.', 'Grip the handles, hips down, chest up.'],
    move: ['Stand up tall in one smooth push.', 'Lower under control.'],
    feel: 'Legs, glutes and back.', avoid: ['Rounding your back'] });
  X('hip_thrust', 'Hip thrust machine', { eq: ['hip_thrust_machine'], kind: 'machine', pat: 'hinge', art: 'hipthrust', muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes', step: 5, start: 20, rest: 75, aka: ['glute drive'],
    setup: ['Sit with your upper back against the pad.', 'Position the pad or belt across your hips.', 'Feet flat, about hip-width apart.'],
    move: ['Drive through your heels and lift your hips until your body is straight from shoulders to knees.', 'Squeeze your glutes at the top for a second.', 'Lower slowly.'],
    feel: 'Your glutes most of all, a little in the back of your thighs.', avoid: ['Over-arching your lower back at the top', 'Pushing through your toes'] });
  X('barbell_hip_thrust', 'Barbell hip thrust', { eq: ['barbell', 'flat_bench'], kind: 'barbell', pat: 'hinge', lvl: 2, art: 'hipthrust', muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes', step: 2.5, start: 20, rest: 90, aka: ['hip thrust'],
    setup: ['Upper back against the side of a bench, bar over your hips with a pad.', 'Feet flat, hip-width.'],
    move: ['Drive up until your body is flat from shoulders to knees.', 'Squeeze, then lower slowly.'],
    feel: 'Glutes.', avoid: ['Arching your lower back', 'Pushing through your toes'] });
  X('smith_hip_thrust', 'Smith machine hip thrust', { eq: ['smith_machine', 'flat_bench'], kind: 'smith', pat: 'hinge', lvl: 2, art: 'smith', muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes', step: 2.5, start: 20, rest: 90,
    setup: ['Bench behind you, bar at hip height with a pad.', 'Upper back on the bench, feet flat.'],
    move: ['Unhook and drive your hips up.', 'Squeeze at the top, lower slowly.'],
    feel: 'Glutes.', avoid: ['Arching your lower back'] });
  X('glute_bridge', 'Glute bridge', { eq: [], kind: 'body', pat: 'hinge', art: 'mat', unit: 'reps', muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes', step: 1, start: 12, reps: [12, 15], rest: 45,
    setup: ['Lie on your back on a mat, knees bent, feet flat and hip-width apart.'],
    move: ['Push through your heels and lift your hips.', 'Squeeze your glutes at the top.', 'Lower slowly.'],
    feel: 'Your glutes.', avoid: ['Arching your lower back at the top'] });
  X('back_extension', 'Back extension', { eq: ['back_extension'], kind: 'machine', pat: 'hinge', art: 'backext', unit: 'reps', muscles: ['glutes', 'lower_back'], muscles2: ['hams'], focus: 'Glutes and lower back', step: 1, start: 10, reps: [10, 15], rest: 60, aka: ['45 degree hyperextension', 'hyperextension'],
    setup: ['Set the pad just below your hip bones.', 'Heels pressed into the foot plate, arms crossed.'],
    move: ['Lower your upper body with a flat back.', 'Squeeze your glutes to rise until your body is straight.'],
    feel: 'Glutes and lower back.', avoid: ['Swinging up past straight'] });
  X('cable_pull_through', 'Cable pull-through', { eq: ['cable_station'], kind: 'cable', pat: 'hinge', lvl: 2, art: 'cable', muscles: ['glutes', 'hams'], focus: 'Glutes', step: 2.5, start: 10, rest: 60,
    setup: ['Rope on a low cable. Face away, holding the rope between your legs.', 'Walk forward two steps.'],
    move: ['Push your hips back, letting the rope pull through.', 'Snap your hips forward and squeeze your glutes.'],
    feel: 'Glutes and the back of your thighs.', avoid: ['Pulling with your arms'] });
  X('kettlebell_swing', 'Kettlebell swing', { eq: ['kettlebells'], kind: 'free', pat: 'hinge', lvl: 2, art: 'kettlebell', muscles: ['glutes', 'hams'], muscles2: ['core', 'back'], focus: 'Hips and fitness', step: 4, start: 8, rest: 60, reps: [12, 20],
    setup: ['Kettlebell a step in front of you, feet shoulder-width.', 'Hinge and grab the handle.'],
    move: ['Hike it back between your legs.', 'Snap your hips forward so the bell floats to chest height.', 'Let it fall back and repeat.'],
    feel: 'Glutes and hamstrings doing the work, not your arms.', avoid: ['Squatting it up', 'Lifting with your arms'] });
  X('good_morning', 'Good morning', { eq: ['barbell', 'squat_rack'], kind: 'barbell', pat: 'hinge', lvl: 3, art: 'rack', muscles: ['hams', 'lower_back'], muscles2: ['glutes'], focus: 'Hamstrings and lower back', step: 2.5, start: 20, rest: 90, reps: [8, 10],
    setup: ['Bar on your upper back like a squat, soft knees.'],
    move: ['Push your hips back with a flat back until you feel the stretch.', 'Squeeze your glutes to stand.'],
    feel: 'The back of your thighs.', avoid: ['Rounding your back', 'Going too heavy'] });
  X('single_leg_rdl', 'Single-leg Romanian deadlift', { eq: ['dumbbells'], kind: 'free', pat: 'hinge', lvl: 2, art: 'dumbbell', perSide: true, muscles: ['hams', 'glutes'], muscles2: ['core'], focus: 'Hamstrings and balance', step: 2, start: 6, rest: 60, aka: ['single leg RDL'],
    setup: ['A dumbbell in the opposite hand to your standing leg.'],
    move: ['Hinge forward, back leg lifting behind you.', 'Return to standing. Do all reps, then switch.'],
    feel: 'Back of the standing thigh and glute.', avoid: ['Twisting your hips open'] });

  // ── Legs: single leg ──────────────────────────────────────────────────────
  X('reverse_lunge', 'Reverse lunge', { eq: ['dumbbells'], kind: 'free', pat: 'lunge', art: 'dumbbell', perSide: true, muscles: ['quads', 'glutes'], muscles2: ['hams'], focus: 'Legs and glutes', step: 2, start: 4, rest: 60, reps: [8, 12],
    setup: ['A dumbbell in each hand, standing tall.'],
    move: ['Step one foot back and lower your back knee toward the floor.', 'Push through your front foot to stand.', 'All reps on one side, then switch.'],
    feel: 'Front leg thigh and glute.', avoid: ['Front knee caving in'] });
  X('walking_lunge', 'Walking lunge', { eq: ['dumbbells'], kind: 'free', pat: 'lunge', lvl: 2, art: 'dumbbell', perSide: true, muscles: ['quads', 'glutes'], muscles2: ['hams', 'core'], focus: 'Legs and glutes', step: 2, start: 6, rest: 75, reps: [8, 12],
    setup: ['A dumbbell in each hand, clear path in front of you.'],
    move: ['Step forward and lower your back knee toward the floor.', 'Drive through the front foot into the next step.'],
    feel: 'Thighs and glutes.', avoid: ['Short, choppy steps'] });
  X('split_squat', 'Split squat', { eq: ['dumbbells'], kind: 'free', pat: 'lunge', art: 'dumbbell', perSide: true, muscles: ['quads', 'glutes'], focus: 'Legs and glutes', step: 2, start: 4, rest: 60, reps: [8, 12],
    setup: ['Long stride stance, dumbbells by your sides.'],
    move: ['Drop your back knee straight down.', 'Push up through the front foot. Switch sides after your reps.'],
    feel: 'Front thigh and glute.', avoid: ['Leaning forward a lot'] });
  X('bulgarian_split_squat', 'Bulgarian split squat', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'lunge', lvl: 2, art: 'bench', perSide: true, muscles: ['quads', 'glutes'], muscles2: ['adductors'], focus: 'Legs and glutes', step: 2, start: 4, rest: 75, reps: [8, 12], aka: ['BSS', 'rear foot elevated split squat'],
    setup: ['Back foot laces-down on a bench, front foot a big step forward.', 'Dumbbells by your sides.'],
    move: ['Lower straight down until your front thigh is near parallel.', 'Drive up through your front heel.'],
    feel: 'Front thigh and glute, a lot.', avoid: ['Front heel lifting'] });
  X('step_up', 'Step-up', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'lunge', art: 'bench', perSide: true, muscles: ['quads', 'glutes'], focus: 'Legs and glutes', step: 2, start: 4, rest: 60, reps: [8, 12], aka: ['box step up'],
    setup: ['A bench or box about knee height.', 'Dumbbells by your sides.'],
    move: ['Plant your whole foot on the box and stand up on it.', 'Step down slowly. All reps, then switch.'],
    feel: 'The working leg’s thigh and glute.', avoid: ['Pushing off the back foot'] });
  X('smith_split_squat', 'Smith machine split squat', { eq: ['smith_machine'], kind: 'smith', pat: 'lunge', art: 'smith', perSide: true, muscles: ['quads', 'glutes'], focus: 'Legs and glutes, steady', step: 2.5, start: 10, rest: 75, reps: [8, 12],
    setup: ['Bar on your upper back, long split stance.'],
    move: ['Lower your back knee straight down.', 'Drive up through the front foot.'],
    feel: 'Front thigh and glute.', avoid: ['Front knee caving in'] });
  X('single_leg_press', 'Single-leg leg press', { eq: ['leg_press'], kind: 'machine', pat: 'lunge', lvl: 2, art: 'legpress', perSide: true, muscles: ['quads', 'glutes'], focus: 'One leg at a time', step: 5, start: 15, rest: 60,
    setup: ['One foot in the middle of the platform.'],
    move: ['Lower slowly and press back up. Switch legs after your reps.'],
    feel: 'The working leg.', avoid: ['Hips twisting'] });
  X('lateral_lunge', 'Lateral lunge', { eq: ['dumbbells'], kind: 'free', pat: 'lunge', lvl: 2, art: 'kettlebell', perSide: true, muscles: ['adductors', 'glutes', 'quads'], focus: 'Inner thighs and glutes', step: 2, start: 4, rest: 60, aka: ['side lunge'],
    setup: ['Hold a dumbbell at your chest, feet together.'],
    move: ['Step wide to one side and sit back into that hip.', 'Push back to the start.'],
    feel: 'Inner thigh of the straight leg, glute of the bent one.', avoid: ['Knee caving in'] });

  // ── Legs: isolation ───────────────────────────────────────────────────────
  X('leg_extension', 'Leg extension', { eq: ['leg_extension'], kind: 'machine', pat: 'knee_ext', art: 'legext', muscles: ['quads'], focus: 'Front of thighs', step: 2.5, start: 10, rest: 60,
    setup: ['Move the back pad so your knees line up with the pivot point.', 'Set the ankle pad on your lower shins, just above your feet.', 'Hold the side handles.'],
    move: ['Straighten your legs and pause for a second at the top.', 'Lower slowly for 2 seconds.'],
    feel: 'The front of your thighs.', avoid: ['Kicking the weight up fast', 'Lifting your hips off the seat'] });
  X('leg_curl', 'Seated leg curl', { eq: ['leg_curl_seated'], kind: 'machine', pat: 'knee_flex', art: 'legcurl', muscles: ['hams'], muscles2: ['calves'], focus: 'Back of thighs', step: 2.5, start: 10, rest: 60, aka: ['hamstring curl'],
    setup: ['Move the back pad so your knees line up with the machine’s pivot point.', 'Rest the lower pad just above your heels.', 'Bring the thigh pad down so it sits snugly on your thighs.'],
    move: ['Curl your heels down and back as far as is comfortable.', 'Pause for a second.', 'Let your legs return slowly.'],
    feel: 'The back of your thighs.', avoid: ['Lifting your hips off the seat', 'Letting the weight drop back quickly'] });
  X('lying_leg_curl', 'Lying leg curl', { eq: ['leg_curl_lying'], kind: 'machine', pat: 'knee_flex', art: 'legcurl', muscles: ['hams'], muscles2: ['calves'], focus: 'Back of thighs', step: 2.5, start: 10, rest: 60, aka: ['prone leg curl'],
    setup: ['Lie face down with your knees just off the end of the bench.', 'Pad just above your heels.'],
    move: ['Curl your heels toward your glutes.', 'Lower slowly.'],
    feel: 'The back of your thighs.', avoid: ['Lifting your hips off the bench'] });
  X('hip_abduction', 'Hip abduction machine', { eq: ['hip_abduction'], kind: 'machine', pat: 'glute', art: 'abduction', muscles: ['hips', 'glutes'], focus: 'Outer hips and glutes', step: 5, start: 20, rest: 60, reps: [12, 15], aka: ['abductor', 'outer thigh machine'],
    setup: ['Set the start position so your legs begin close together.', 'Sit tall with the pads on the outside of your knees.'],
    move: ['Push your knees out as wide as is comfortable.', 'Pause for a second.', 'Bring them back in slowly, without letting the weights touch.'],
    feel: 'The outside of your hips and your glutes.', avoid: ['Bouncing the weight', 'Slumping in the seat'] });
  X('hip_adduction', 'Hip adduction machine', { eq: ['hip_adduction'], kind: 'machine', pat: 'adduct', art: 'abduction', muscles: ['adductors'], focus: 'Inner thighs', step: 5, start: 20, rest: 60, reps: [12, 15], aka: ['adductor', 'inner thigh machine'],
    setup: ['Set the start position to a comfortable stretch.', 'Pads on the inside of your knees.'],
    move: ['Squeeze your knees together.', 'Open slowly to the start.'],
    feel: 'Your inner thighs.', avoid: ['Starting too wide'] });
  X('cable_kickback', 'Cable glute kickback', { eq: ['cable_station'], kind: 'cable', pat: 'glute', art: 'cable', perSide: true, muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes', step: 2.5, start: 5, rest: 45,
    setup: ['Attach the ankle strap to a low cable.', 'Hold the frame and lean forward slightly.'],
    move: ['Kick your leg straight back, squeezing your glute.', 'Return slowly. Do all reps, then switch legs.'],
    feel: 'Your glute on the working side.', avoid: ['Swinging', 'Arching your lower back'] });
  X('glute_kickback_machine', 'Glute kickback machine', { eq: ['glute_machine'], kind: 'machine', pat: 'glute', art: 'hipthrust', perSide: true, muscles: ['glutes'], focus: 'Glutes', step: 5, start: 10, rest: 45,
    setup: ['Chest or forearms on the pad, one foot on the plate.'],
    move: ['Push the plate back until your hip is straight.', 'Squeeze, then return slowly.'],
    feel: 'Your glute.', avoid: ['Arching your lower back'] });
  X('cable_hip_abduction', 'Cable hip abduction', { eq: ['cable_station'], kind: 'cable', pat: 'glute', lvl: 2, art: 'cable', perSide: true, muscles: ['hips', 'glutes'], focus: 'Outer hips', step: 2.5, start: 5, rest: 45,
    setup: ['Ankle strap on a low cable, stand side-on.'],
    move: ['Lift the outside leg out to the side.', 'Return slowly.'],
    feel: 'The side of your hip.', avoid: ['Leaning away'] });
  X('banded_lateral_walk', 'Banded side walk', { eq: ['bands'], kind: 'body', pat: 'glute', art: 'mat', unit: 'reps', perSide: true, muscles: ['hips', 'glutes'], focus: 'Outer hips', step: 1, start: 10, reps: [10, 15], rest: 45, aka: ['monster walk', 'crab walk'],
    setup: ['Band just above your knees, half squat.'],
    move: ['Step sideways, keeping tension on the band.'],
    feel: 'The side of your hips.', avoid: ['Feet snapping together'] });
  X('calf_raise_machine', 'Standing calf raise', { eq: ['calf_raise_machine'], kind: 'machine', pat: 'calf', art: 'calf', muscles: ['calves'], focus: 'Calves', step: 5, start: 20, rest: 45, reps: [12, 15],
    setup: ['Shoulders under the pads, balls of your feet on the step.'],
    move: ['Rise up as high as you can.', 'Lower slowly into a deep stretch.'],
    feel: 'Your calves.', avoid: ['Bouncing'] });
  X('leg_press_calf_raise', 'Calf press on the leg press', { eq: ['leg_press'], kind: 'machine', pat: 'calf', art: 'legpress', muscles: ['calves'], focus: 'Calves', step: 5, start: 30, rest: 45, reps: [12, 15],
    setup: ['Balls of your feet on the bottom edge of the platform, legs straight.'],
    move: ['Push the platform with your toes.', 'Let your heels come back slowly.'],
    feel: 'Your calves.', avoid: ['Bending your knees'] });
  X('smith_calf_raise', 'Smith machine calf raise', { eq: ['smith_machine'], kind: 'smith', pat: 'calf', art: 'smith', muscles: ['calves'], focus: 'Calves', step: 2.5, start: 20, rest: 45, reps: [12, 15],
    setup: ['Bar on your upper back, toes on a plate or step.'],
    move: ['Rise up high, lower slowly.'],
    feel: 'Your calves.', avoid: ['Bouncing'] });
  X('db_calf_raise', 'Dumbbell calf raise', { eq: ['dumbbells'], kind: 'free', pat: 'calf', art: 'dumbbell', muscles: ['calves'], focus: 'Calves', step: 2, start: 8, rest: 45, reps: [12, 15],
    setup: ['Dumbbells by your sides, balls of your feet on a step.'],
    move: ['Rise up high, lower slowly.'],
    feel: 'Your calves.', avoid: ['Bouncing'] });

  // ── Chest ─────────────────────────────────────────────────────────────────
  X('chest_press', 'Chest press machine', { eq: ['chest_press_machine'], kind: 'machine', pat: 'h_push', art: 'chestpress', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Chest and arms', step: 2.5, start: 10, rest: 75,
    setup: ['Set the seat so the handles line up with the middle of your chest.', 'Sit with your back flat against the pad and feet flat on the floor.', 'Grip the handles with your wrists straight.'],
    move: ['Breathe out and push the handles forward until your arms are almost straight.', 'Return slowly until you feel a light stretch across your chest.', 'Keep the weights from touching down between reps.'],
    feel: 'Chest, front of the shoulders and the back of your arms.', avoid: ['Shrugging your shoulders up to your ears', 'Arching your back off the pad', 'Snapping your elbows straight'] });
  X('incline_chest_press', 'Incline chest press machine', { eq: ['incline_chest_press_machine'], kind: 'machine', pat: 'h_push', art: 'chestpress', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Upper chest', step: 2.5, start: 10, rest: 75,
    setup: ['Set the seat so the handles line up with your upper chest.', 'Back flat against the pad.'],
    move: ['Press up and forward until your arms are almost straight.', 'Return slowly.'],
    feel: 'Upper chest and shoulders.', avoid: ['Arching your back'] });
  X('plate_chest_press', 'Plate-loaded chest press', { eq: ['plate_loaded_chest'], kind: 'plate', pat: 'h_push', art: 'chestpress', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Chest and arms', step: 2.5, start: 10, rest: 75, aka: ['hammer strength chest press', 'iso lateral chest press'],
    setup: ['Seat so the handles are at mid-chest. Load the same plates both sides.'],
    move: ['Press forward until your arms are almost straight.', 'Return slowly to a light stretch.'],
    feel: 'Chest and triceps.', avoid: ['Uneven plates'] });
  X('bench_press', 'Barbell bench press', { eq: ['barbell', 'flat_bench'], kind: 'barbell', pat: 'h_push', lvl: 2, art: 'bench', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Chest, shoulders and arms', step: 2.5, start: 20, rest: 150, reps: [5, 8], aka: ['bench', 'flat bench'],
    setup: ['Eyes under the bar, feet planted, shoulder blades pinched together.', 'Grip a little wider than your shoulders.', 'Use the safeties, or ask for a spot on heavy sets.'],
    move: ['Lower the bar to your lower chest.', 'Press up and slightly back over your shoulders.'],
    feel: 'Chest, shoulders and triceps.', avoid: ['Bouncing the bar off your chest', 'Hips lifting off the bench'] });
  X('incline_bench_press', 'Incline barbell bench press', { eq: ['barbell', 'adjustable_bench'], kind: 'barbell', pat: 'h_push', lvl: 2, art: 'bench', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Upper chest', step: 2.5, start: 20, rest: 120, reps: [6, 10], aka: ['incline bench'],
    setup: ['Bench at about 30 degrees, eyes under the bar.'],
    move: ['Lower to your upper chest, press back up.'],
    feel: 'Upper chest and shoulders.', avoid: ['Too steep an angle'] });
  X('db_bench_press', 'Dumbbell bench press', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'h_push', art: 'bench', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Chest and arms', step: 2, start: 6, rest: 90, reps: [8, 12], aka: ['DB bench'],
    setup: ['Sit with the dumbbells on your thighs, then lie back, bringing them to your chest.', 'Feet flat, shoulder blades pinched.'],
    move: ['Press up until your arms are almost straight.', 'Lower slowly to chest level.'],
    feel: 'Chest and triceps.', avoid: ['Flaring your elbows straight out'] });
  X('incline_db_press', 'Incline dumbbell press', { eq: ['dumbbells', 'adjustable_bench'], kind: 'free', pat: 'h_push', lvl: 2, art: 'bench', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Upper chest', step: 2, start: 6, rest: 90, reps: [8, 12], aka: ['incline DB press'],
    setup: ['Bench at 30 degrees, dumbbells at your upper chest.'],
    move: ['Press up, lower slowly.'],
    feel: 'Upper chest.', avoid: ['Too steep an angle'] });
  X('smith_bench_press', 'Smith machine bench press', { eq: ['smith_machine', 'flat_bench'], kind: 'smith', pat: 'h_push', art: 'smith', muscles: ['chest'], muscles2: ['shoulders', 'triceps'], focus: 'Chest, steady', step: 2.5, start: 20, rest: 90, reps: [8, 12],
    setup: ['Bench under the bar so it lines up with your lower chest.'],
    move: ['Unhook, lower to your chest, press up.'],
    feel: 'Chest and triceps.', avoid: ['Bench too far up or down'] });
  X('smith_incline_press', 'Smith machine incline press', { eq: ['smith_machine', 'adjustable_bench'], kind: 'smith', pat: 'h_push', art: 'smith', muscles: ['chest'], muscles2: ['shoulders'], focus: 'Upper chest, steady', step: 2.5, start: 20, rest: 90, reps: [8, 12],
    setup: ['Bench at 30 degrees, bar over your upper chest.'],
    move: ['Unhook, lower to your upper chest, press up.'],
    feel: 'Upper chest.', avoid: ['Too steep an angle'] });
  X('push_up', 'Push-up', { eq: [], kind: 'body', pat: 'h_push', art: 'mat', unit: 'reps', muscles: ['chest'], muscles2: ['shoulders', 'triceps', 'core'], focus: 'Chest and arms, anywhere', step: 1, start: 6, reps: [6, 15], rest: 60, aka: ['press up', 'pushup'],
    setup: ['Hands a little wider than your shoulders, body straight.', 'On your knees is fine.'],
    move: ['Lower your chest toward the floor.', 'Push back up, body staying straight.'],
    feel: 'Chest and triceps.', avoid: ['Hips sagging'] });
  X('incline_push_up', 'Incline push-up', { eq: ['flat_bench'], kind: 'body', pat: 'h_push', art: 'bench', unit: 'reps', muscles: ['chest'], muscles2: ['triceps'], focus: 'Chest, beginner friendly', step: 1, start: 8, reps: [8, 15], rest: 60,
    setup: ['Hands on a bench or the Smith bar, body straight.'],
    move: ['Lower your chest to the bench, push back up.'],
    feel: 'Chest and arms.', avoid: ['Hips sagging'] });
  X('cable_chest_press', 'Cable chest press', { eq: ['cable_station'], kind: 'cable', pat: 'h_push', lvl: 2, art: 'cable', muscles: ['chest'], muscles2: ['triceps'], focus: 'Chest', step: 2.5, start: 5, rest: 75,
    setup: ['Handles at chest height, stand in a split stance facing away.'],
    move: ['Press both handles forward.', 'Return slowly.'],
    feel: 'Chest.', avoid: ['Arching your back'] });
  X('dips', 'Dips', { eq: ['dip_station'], kind: 'body', pat: 'h_push', lvl: 3, art: 'dips', unit: 'reps', muscles: ['chest', 'triceps'], muscles2: ['shoulders'], focus: 'Chest and triceps', step: 1, start: 6, reps: [6, 12], rest: 90, aka: ['parallel bar dips'],
    setup: ['Support yourself on straight arms.'],
    move: ['Lower until your upper arms are about parallel.', 'Press back up.'],
    feel: 'Chest and back of your arms.', avoid: ['Dropping too deep'] });
  X('assisted_dip', 'Assisted dip machine', { eq: ['assisted_pullup'], kind: 'machine', pat: 'triceps', art: 'dips', assist: true, muscles: ['triceps', 'chest'], focus: 'Triceps and chest', step: 5, start: 40, rest: 75,
    setup: ['Choose the help weight. More weight means more help.', 'Kneel on the pad and grip the dip handles.'],
    move: ['Lower until your upper arms are about parallel.', 'Press back up.'],
    feel: 'Back of your arms and chest.', avoid: ['Shrugging'] });
  X('pec_deck', 'Pec deck', { eq: ['pec_deck'], kind: 'machine', pat: 'fly', art: 'pecdeck', muscles: ['chest'], muscles2: ['shoulders'], focus: 'Chest', step: 2.5, start: 10, rest: 60, reps: [12, 15], aka: ['chest fly machine', 'butterfly'],
    setup: ['Set the seat so the handles are at chest height.', 'Sit tall with your back against the pad.'],
    move: ['Bring the handles together in front of your chest, elbows slightly bent.', 'Squeeze for a second.', 'Open slowly to a light stretch.'],
    feel: 'Across your chest.', avoid: ['Letting the arms fly back too far', 'Rounding your shoulders forward'] });
  X('cable_fly', 'Cable fly', { eq: ['cable_station'], kind: 'cable', pat: 'fly', lvl: 2, art: 'cable', muscles: ['chest'], focus: 'Chest', step: 2.5, start: 5, rest: 60, reps: [12, 15], aka: ['cable crossover', 'cable flies'],
    setup: ['Handles at shoulder height, step forward into a split stance.'],
    move: ['Hug the handles together in front of you.', 'Open slowly to a stretch.'],
    feel: 'Across your chest.', avoid: ['Bending your elbows into a press'] });
  X('low_cable_fly', 'Low-to-high cable fly', { eq: ['cable_station'], kind: 'cable', pat: 'fly', lvl: 2, art: 'cable', muscles: ['chest'], muscles2: ['shoulders'], focus: 'Upper chest', step: 2.5, start: 5, rest: 60, reps: [12, 15],
    setup: ['Handles on low pulleys, stand in the middle.'],
    move: ['Sweep the handles up and together to chin height.', 'Lower slowly.'],
    feel: 'Upper chest.', avoid: ['Shrugging'] });
  X('db_fly', 'Dumbbell fly', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'fly', lvl: 2, art: 'bench', muscles: ['chest'], focus: 'Chest', step: 2, start: 4, rest: 60, reps: [10, 15],
    setup: ['Lie on a bench, dumbbells above your chest, elbows soft.'],
    move: ['Open your arms wide to a stretch.', 'Hug them back together.'],
    feel: 'Across your chest.', avoid: ['Going too heavy or too deep'] });

  // ── Shoulders ─────────────────────────────────────────────────────────────
  X('shoulder_press', 'Shoulder press machine', { eq: ['shoulder_press_machine'], kind: 'machine', pat: 'v_push', art: 'shoulderpress', muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders and arms', step: 2.5, start: 5, rest: 75,
    setup: ['Set the seat so the handles start at about shoulder height.', 'Sit with your back against the pad and feet flat.'],
    move: ['Breathe out and press up until your arms are almost straight.', 'Lower slowly back to shoulder height.'],
    feel: 'Your shoulders and the back of your arms.', avoid: ['Arching your lower back', 'Shrugging', 'Locking your elbows hard'] });
  X('db_shoulder_press', 'Seated dumbbell shoulder press', { eq: ['dumbbells', 'adjustable_bench'], kind: 'free', pat: 'v_push', art: 'bench', muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders and arms', step: 2, start: 4, rest: 75, aka: ['DB shoulder press', 'dumbbell overhead press'],
    setup: ['Sit on a bench with an upright back.', 'Hold a dumbbell in each hand at shoulder height.'],
    move: ['Press both up until your arms are almost straight.', 'Lower slowly to shoulder height.'],
    feel: 'Your shoulders.', avoid: ['Arching your back'] });
  X('overhead_press', 'Standing overhead press', { eq: ['barbell', 'squat_rack'], kind: 'barbell', pat: 'v_push', lvl: 3, art: 'rack', muscles: ['shoulders'], muscles2: ['triceps', 'core'], focus: 'Shoulders and trunk', step: 2.5, start: 20, rest: 120, reps: [5, 8], aka: ['OHP', 'military press', 'strict press'],
    setup: ['Bar at shoulder height in the rack, hands just outside your shoulders.', 'Squeeze your glutes and brace.'],
    move: ['Press straight up, moving your head back out of the way.', 'Finish with the bar over your mid-foot.'],
    feel: 'Shoulders and triceps.', avoid: ['Leaning back a lot'] });
  X('smith_shoulder_press', 'Smith machine shoulder press', { eq: ['smith_machine', 'adjustable_bench'], kind: 'smith', pat: 'v_push', art: 'smith', muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders, steady', step: 2.5, start: 10, rest: 75,
    setup: ['Upright bench under the bar so it lowers in front of your face.'],
    move: ['Unhook, press up, lower to chin height.'],
    feel: 'Shoulders.', avoid: ['Lowering behind your head'] });
  X('arnold_press', 'Arnold press', { eq: ['dumbbells', 'adjustable_bench'], kind: 'free', pat: 'v_push', lvl: 2, art: 'bench', muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders', step: 2, start: 4, rest: 75,
    setup: ['Seated, dumbbells in front of your shoulders, palms facing you.'],
    move: ['Rotate your palms forward as you press up.', 'Reverse on the way down.'],
    feel: 'All of your shoulders.', avoid: ['Arching your back'] });
  X('landmine_press', 'Landmine press', { eq: ['landmine', 'barbell'], kind: 'barbell', pat: 'v_push', lvl: 2, art: 'landmine', perSide: true, muscles: ['shoulders', 'chest'], muscles2: ['triceps', 'core'], focus: 'Shoulders, shoulder friendly', step: 2.5, start: 5, rest: 60,
    setup: ['Hold the end of the bar at your shoulder, split stance.'],
    move: ['Press up and forward until your arm is straight.', 'Lower slowly. Switch sides after your reps.'],
    feel: 'Shoulder and upper chest.', avoid: ['Twisting'] });
  X('lateral_raise', 'Dumbbell lateral raise', { eq: ['dumbbells'], kind: 'free', pat: 'lateral', art: 'dumbbell', muscles: ['shoulders'], focus: 'Side shoulders', step: 1, start: 2, rest: 45, reps: [12, 15], aka: ['side raise', 'lateral raises'],
    setup: ['Light dumbbells by your sides, slight lean forward.'],
    move: ['Raise them out to the side to shoulder height.', 'Lower slowly.'],
    feel: 'The sides of your shoulders.', avoid: ['Swinging', 'Shrugging'] });
  X('cable_lateral_raise', 'Cable lateral raise', { eq: ['cable_station'], kind: 'cable', pat: 'lateral', lvl: 2, art: 'cable', perSide: true, muscles: ['shoulders'], focus: 'Side shoulders', step: 1.25, start: 2.5, rest: 45, reps: [12, 15],
    setup: ['Handle on a low cable, stand side-on.'],
    move: ['Raise your arm out to shoulder height.', 'Lower slowly. Switch sides.'],
    feel: 'The side of your shoulder.', avoid: ['Leaning away'] });
  X('machine_lateral_raise', 'Lateral raise machine', { eq: ['lateral_raise_machine'], kind: 'machine', pat: 'lateral', art: 'shoulderpress', muscles: ['shoulders'], focus: 'Side shoulders', step: 2.5, start: 5, rest: 45, reps: [12, 15],
    setup: ['Seat so your shoulders line up with the pivot, pads on your upper arms.'],
    move: ['Lift your elbows out to shoulder height.', 'Lower slowly.'],
    feel: 'The sides of your shoulders.', avoid: ['Shrugging'] });
  X('rear_delt_machine', 'Rear delt fly machine', { eq: ['pec_deck'], kind: 'machine', pat: 'rear', art: 'pecdeck', muscles: ['rear'], muscles2: ['back'], focus: 'Back of shoulders and posture', step: 2.5, start: 5, rest: 45, reps: [12, 15], aka: ['reverse pec deck', 'rear delt fly'],
    setup: ['Sit facing the pad, handles set to the back position.'],
    move: ['Open your arms out and back.', 'Return slowly.'],
    feel: 'The back of your shoulders.', avoid: ['Shrugging'] });
  X('face_pull', 'Face pull', { eq: ['cable_station'], kind: 'cable', pat: 'rear', art: 'cable', muscles: ['rear', 'back'], muscles2: ['traps'], focus: 'Back of shoulders and posture', step: 2.5, start: 5, rest: 45, reps: [12, 15],
    setup: ['Rope at face height, thumbs pointing back.'],
    move: ['Pull the rope to your face, hands finishing beside your ears.', 'Return slowly.'],
    feel: 'Back of your shoulders and upper back.', avoid: ['Leaning back'] });
  X('db_rear_delt_fly', 'Dumbbell rear delt fly', { eq: ['dumbbells'], kind: 'free', pat: 'rear', lvl: 2, art: 'dumbbell', muscles: ['rear'], focus: 'Back of shoulders', step: 1, start: 2, rest: 45, reps: [12, 15], aka: ['bent over reverse fly'],
    setup: ['Hinge forward with a flat back, light dumbbells hanging.'],
    move: ['Raise them out to the side.', 'Lower slowly.'],
    feel: 'The back of your shoulders.', avoid: ['Using momentum'] });
  X('db_shrug', 'Dumbbell shrug', { eq: ['dumbbells'], kind: 'free', pat: 'traps', art: 'dumbbell', muscles: ['traps'], focus: 'Traps', step: 2, start: 10, rest: 60, reps: [10, 15],
    setup: ['Heavy dumbbells by your sides.'],
    move: ['Lift your shoulders straight up toward your ears.', 'Pause, lower slowly.'],
    feel: 'The top of your shoulders.', avoid: ['Rolling your shoulders'] });
  X('barbell_shrug', 'Barbell shrug', { eq: ['barbell'], kind: 'barbell', pat: 'traps', lvl: 2, art: 'barbell', muscles: ['traps'], focus: 'Traps', step: 2.5, start: 30, rest: 60, reps: [10, 15],
    setup: ['Bar at arm’s length, hands shoulder-width.'],
    move: ['Shrug straight up, pause, lower.'],
    feel: 'Your traps.', avoid: ['Rolling your shoulders'] });

  // ── Back: pulldowns and pull-ups ──────────────────────────────────────────
  X('lat_pulldown', 'Lat pulldown', { eq: ['lat_pulldown'], kind: 'cable', pat: 'v_pull', art: 'pulldown', muscles: ['lats'], muscles2: ['biceps', 'back'], focus: 'Back and arms', step: 2.5, start: 15, rest: 75, aka: ['pulldown', 'wide grip pulldown'],
    setup: ['Adjust the knee pad so your thighs are held snugly.', 'Stand up, grab the bar a little wider than your shoulders, and sit back down.'],
    move: ['Lean back slightly and pull the bar to your upper chest.', 'Lead with your elbows: down and back.', 'Let the bar rise slowly until your arms are straight.'],
    feel: 'The sides of your back and your biceps.', avoid: ['Pulling the bar behind your neck', 'Swinging your body to move the weight'] });
  X('close_grip_pulldown', 'Close-grip pulldown', { eq: ['lat_pulldown'], kind: 'cable', pat: 'v_pull', art: 'pulldown', muscles: ['lats'], muscles2: ['biceps'], focus: 'Back and arms', step: 2.5, start: 15, rest: 75, aka: ['v bar pulldown', 'neutral grip pulldown'],
    setup: ['Attach the V-handle. Thighs under the pad.'],
    move: ['Pull the handle to your upper chest, elbows close.', 'Return slowly.'],
    feel: 'The sides of your back.', avoid: ['Leaning back a lot'] });
  X('single_arm_pulldown', 'Single-arm cable pulldown', { eq: ['cable_station'], kind: 'cable', pat: 'v_pull', lvl: 2, art: 'cable', perSide: true, muscles: ['lats'], focus: 'One side of your back at a time', step: 2.5, start: 5, rest: 60,
    setup: ['Handle on a high cable, kneel or sit facing it.'],
    move: ['Pull your elbow down to your side.', 'Return slowly.'],
    feel: 'The side of your back.', avoid: ['Twisting'] });
  X('plate_pulldown', 'Plate-loaded pulldown', { eq: ['plate_loaded_pulldown'], kind: 'plate', pat: 'v_pull', art: 'pulldown', muscles: ['lats'], muscles2: ['biceps'], focus: 'Back and arms', step: 2.5, start: 10, rest: 75, aka: ['iso lateral pulldown'],
    setup: ['Thighs under the pad, grab both handles.'],
    move: ['Pull down to your chest, elbows to your sides.', 'Return slowly.'],
    feel: 'The sides of your back.', avoid: ['Swinging'] });
  X('assisted_pullup', 'Assisted pull-up machine', { eq: ['assisted_pullup'], kind: 'machine', pat: 'v_pull', art: 'pulldown', assist: true, muscles: ['lats'], muscles2: ['biceps'], focus: 'Back and arms', step: 5, start: 40, rest: 90, reps: [6, 10], aka: ['assisted chin up'],
    setup: ['Choose the help weight. More weight means more help.', 'Kneel or stand on the pad and grab the handles.'],
    move: ['Pull your chest up toward the handles.', 'Lower slowly until your arms are straight.'],
    feel: 'The sides of your back.', avoid: ['Dropping down fast'] });
  X('pull_up', 'Pull-up', { eq: ['pullup_bar'], kind: 'body', pat: 'v_pull', lvl: 3, art: 'pullupbar', unit: 'reps', muscles: ['lats'], muscles2: ['biceps', 'back'], focus: 'Back and arms', step: 1, start: 3, reps: [3, 8], rest: 120, aka: ['pullup', 'chin up bar'],
    setup: ['Hands a little wider than your shoulders, palms facing away.'],
    move: ['Pull your chest up to the bar.', 'Lower all the way down slowly.'],
    feel: 'The sides of your back.', avoid: ['Kipping or swinging'] });
  X('chin_up', 'Chin-up', { eq: ['pullup_bar'], kind: 'body', pat: 'v_pull', lvl: 3, art: 'pullupbar', unit: 'reps', muscles: ['lats', 'biceps'], focus: 'Back and biceps', step: 1, start: 3, reps: [3, 8], rest: 120, aka: ['chinup'],
    setup: ['Hands shoulder-width, palms facing you.'],
    move: ['Pull your chin over the bar.', 'Lower slowly.'],
    feel: 'Back and biceps.', avoid: ['Half reps'] });
  X('straight_arm_pulldown', 'Straight-arm pulldown', { eq: ['cable_station'], kind: 'cable', pat: 'v_pull', lvl: 2, art: 'cable', muscles: ['lats'], focus: 'Sides of your back', step: 2.5, start: 5, rest: 60, reps: [12, 15], aka: ['lat pushdown', 'pullover'],
    setup: ['Bar or rope on a high cable, step back and hinge slightly.'],
    move: ['Keep your arms straight and sweep the bar to your thighs.', 'Return slowly.'],
    feel: 'The sides of your back.', avoid: ['Bending your elbows'] });

  // ── Back: rows ────────────────────────────────────────────────────────────
  X('seated_row', 'Seated cable row', { eq: ['seated_row_machine'], kind: 'cable', pat: 'h_pull', art: 'row', muscles: ['back', 'lats'], muscles2: ['biceps', 'rear'], focus: 'Back and posture', step: 2.5, start: 15, rest: 75, aka: ['seated row', 'cable row', 'low row'],
    setup: ['Sit tall with your feet on the footplates and knees slightly bent.', 'Hold the handle with your arms straight and chest up.'],
    move: ['Pull the handle to your belly button, elbows close to your sides.', 'Squeeze your shoulder blades together for a second.', 'Let your arms straighten slowly while you stay tall.'],
    feel: 'The middle of your back and the back of your shoulders.', avoid: ['Leaning back to swing the weight', 'Rounding your back as you reach forward', 'Shrugging your shoulders'] });
  X('machine_row', 'Chest-supported row machine', { eq: ['machine_row'], kind: 'machine', pat: 'h_pull', art: 'row', muscles: ['back', 'lats'], muscles2: ['biceps'], focus: 'Back and posture', step: 2.5, start: 15, rest: 75,
    setup: ['Set the seat so the chest pad sits at the middle of your chest.', 'Grab the handles with arms straight.'],
    move: ['Pull the handles back, elbows close to your sides.', 'Squeeze your shoulder blades.', 'Return slowly.'],
    feel: 'The middle of your back.', avoid: ['Lifting your chest off the pad'] });
  X('plate_row', 'Plate-loaded row', { eq: ['plate_loaded_row'], kind: 'plate', pat: 'h_pull', art: 'row', muscles: ['back', 'lats'], muscles2: ['biceps'], focus: 'Back', step: 2.5, start: 10, rest: 75, aka: ['iso lateral row', 'hammer strength row'],
    setup: ['Chest on the pad, same plates both sides.'],
    move: ['Row the handles back, squeeze, return slowly.'],
    feel: 'Your upper back.', avoid: ['Chest leaving the pad'] });
  X('one_arm_db_row', 'One-arm dumbbell row', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'h_pull', art: 'bench', perSide: true, muscles: ['lats', 'back'], muscles2: ['biceps'], focus: 'Back', step: 2, start: 8, rest: 60, aka: ['single arm row', 'DB row'],
    setup: ['One knee and hand on a bench, back flat.', 'Dumbbell hanging under your shoulder.'],
    move: ['Pull the dumbbell to your hip.', 'Lower slowly. Switch sides after your reps.'],
    feel: 'The side of your back.', avoid: ['Twisting your torso'] });
  X('chest_supported_db_row', 'Chest-supported dumbbell row', { eq: ['dumbbells', 'adjustable_bench'], kind: 'free', pat: 'h_pull', art: 'bench', muscles: ['back', 'rear'], muscles2: ['biceps'], focus: 'Upper back', step: 2, start: 6, rest: 60, aka: ['seal row', 'incline row'],
    setup: ['Lie face down on an incline bench, dumbbells hanging.'],
    move: ['Row both dumbbells up, squeeze your shoulder blades.', 'Lower slowly.'],
    feel: 'Upper back.', avoid: ['Lifting your chest off'] });
  X('barbell_row', 'Barbell row', { eq: ['barbell'], kind: 'barbell', pat: 'h_pull', lvl: 3, art: 'barbell', muscles: ['back', 'lats'], muscles2: ['biceps', 'lower_back'], focus: 'Back thickness', step: 2.5, start: 30, rest: 120, reps: [6, 10], aka: ['bent over row', 'pendlay row'],
    setup: ['Hinge forward to about 45 degrees, flat back.', 'Bar hanging at arm’s length.'],
    move: ['Row the bar to your lower ribs.', 'Lower under control.'],
    feel: 'Your whole upper back.', avoid: ['Standing up as you row', 'Rounding your back'] });
  X('t_bar_row', 'T-bar row', { eq: ['t_bar_row'], kind: 'plate', pat: 'h_pull', lvl: 2, art: 'landmine', muscles: ['back', 'lats'], muscles2: ['biceps'], focus: 'Back', step: 2.5, start: 10, rest: 90,
    setup: ['Chest on the pad or hinge over the bar, handles in hand.'],
    move: ['Row up to your chest, squeeze, lower slowly.'],
    feel: 'Your upper back.', avoid: ['Jerking the weight'] });
  X('landmine_row', 'Landmine row', { eq: ['landmine', 'barbell'], kind: 'barbell', pat: 'h_pull', lvl: 2, art: 'landmine', muscles: ['back', 'lats'], focus: 'Back', step: 2.5, start: 10, rest: 90,
    setup: ['Straddle the bar, V-handle under the plates, hinge forward.'],
    move: ['Row to your chest, lower slowly.'],
    feel: 'Your upper back.', avoid: ['Rounding your back'] });
  X('inverted_row', 'Inverted row', { eq: ['smith_machine'], kind: 'body', pat: 'h_pull', lvl: 2, art: 'smith', unit: 'reps', muscles: ['back', 'rear'], muscles2: ['biceps', 'core'], focus: 'Back, bodyweight', step: 1, start: 6, reps: [6, 12], rest: 75, aka: ['australian pull up', 'body row'],
    setup: ['Smith bar at hip height, hang underneath with straight body.'],
    move: ['Pull your chest to the bar.', 'Lower slowly.'],
    feel: 'Upper back.', avoid: ['Hips sagging'] });
  X('trx_row', 'TRX row', { eq: ['trx'], kind: 'body', pat: 'h_pull', art: 'trx', unit: 'reps', muscles: ['back', 'rear'], muscles2: ['biceps', 'core'], focus: 'Back, adjustable', step: 1, start: 8, reps: [8, 15], rest: 60,
    setup: ['Hold the straps and lean back with a straight body.', 'Walk your feet forward to make it harder.'],
    move: ['Pull your chest to your hands.', 'Lower slowly.'],
    feel: 'Upper back.', avoid: ['Hips sagging'] });

  // ── Arms ──────────────────────────────────────────────────────────────────
  X('db_curl', 'Dumbbell curl', { eq: ['dumbbells'], kind: 'free', pat: 'biceps', art: 'dumbbell', muscles: ['biceps'], muscles2: ['forearms'], focus: 'Biceps', step: 1, start: 4, rest: 45, reps: [10, 12], aka: ['bicep curl', 'biceps curl'],
    setup: ['Dumbbells by your sides, palms forward.'],
    move: ['Curl them up without moving your elbows.', 'Lower slowly.'],
    feel: 'Your biceps.', avoid: ['Swinging'] });
  X('hammer_curl', 'Hammer curl', { eq: ['dumbbells'], kind: 'free', pat: 'biceps', art: 'dumbbell', muscles: ['biceps', 'forearms'], focus: 'Biceps and forearms', step: 1, start: 4, rest: 45, reps: [10, 12],
    setup: ['Dumbbells by your sides, palms facing in.'],
    move: ['Curl up, thumbs leading.', 'Lower slowly.'],
    feel: 'Biceps and forearms.', avoid: ['Swinging'] });
  X('ez_bar_curl', 'EZ-bar curl', { eq: ['ez_bar'], kind: 'barbell', pat: 'biceps', art: 'barbell', muscles: ['biceps'], focus: 'Biceps', step: 2.5, start: 10, rest: 60, reps: [8, 12], aka: ['barbell curl'],
    setup: ['Grip the angled part of the bar, elbows by your sides.'],
    move: ['Curl up, lower slowly.'],
    feel: 'Your biceps.', avoid: ['Leaning back'] });
  X('cable_curl', 'Cable curl', { eq: ['cable_station'], kind: 'cable', pat: 'biceps', art: 'cable', muscles: ['biceps'], focus: 'Biceps', step: 2.5, start: 5, rest: 45, reps: [10, 15],
    setup: ['Straight bar or rope on a low cable.'],
    move: ['Curl up without moving your elbows.', 'Lower slowly.'],
    feel: 'Your biceps.', avoid: ['Leaning back'] });
  X('preacher_curl', 'Preacher curl', { eq: ['preacher_bench', 'ez_bar'], kind: 'barbell', pat: 'biceps', lvl: 2, art: 'barbell', muscles: ['biceps'], focus: 'Biceps', step: 2.5, start: 5, rest: 60, reps: [8, 12],
    setup: ['Upper arms flat on the pad.'],
    move: ['Curl up, lower slowly until your arms are nearly straight.'],
    feel: 'Your biceps.', avoid: ['Dropping fast at the bottom'] });
  X('machine_curl', 'Biceps curl machine', { eq: ['bicep_curl_machine'], kind: 'machine', pat: 'biceps', art: 'abcrunch', muscles: ['biceps'], focus: 'Biceps', step: 2.5, start: 5, rest: 45, reps: [10, 15],
    setup: ['Seat so your elbows line up with the pivot.'],
    move: ['Curl up, lower slowly.'],
    feel: 'Your biceps.', avoid: ['Lifting your elbows'] });
  X('incline_db_curl', 'Incline dumbbell curl', { eq: ['dumbbells', 'adjustable_bench'], kind: 'free', pat: 'biceps', lvl: 2, art: 'bench', muscles: ['biceps'], focus: 'Biceps, full stretch', step: 1, start: 4, rest: 45, reps: [10, 12],
    setup: ['Lie back on a 45-degree bench, arms hanging.'],
    move: ['Curl up, lower all the way.'],
    feel: 'A stretch then a squeeze in your biceps.', avoid: ['Swinging'] });
  X('cable_pushdown', 'Triceps pushdown', { eq: ['cable_station'], kind: 'cable', pat: 'triceps', art: 'cable', muscles: ['triceps'], focus: 'Back of arms', step: 2.5, start: 10, rest: 45, reps: [10, 15], aka: ['rope pushdown', 'tricep pushdown'],
    setup: ['Rope or bar on a high cable, elbows by your sides.'],
    move: ['Push down until your arms are straight.', 'Return slowly to 90 degrees.'],
    feel: 'The back of your arms.', avoid: ['Elbows drifting forward'] });
  X('overhead_cable_extension', 'Overhead cable triceps extension', { eq: ['cable_station'], kind: 'cable', pat: 'triceps', lvl: 2, art: 'cable', muscles: ['triceps'], focus: 'Back of arms', step: 2.5, start: 5, rest: 45, reps: [10, 15],
    setup: ['Rope on a low or mid cable, face away, rope behind your head.'],
    move: ['Straighten your arms overhead.', 'Lower slowly into a stretch.'],
    feel: 'The back of your arms.', avoid: ['Arching your back'] });
  X('skull_crusher', 'Skull crusher', { eq: ['ez_bar', 'flat_bench'], kind: 'barbell', pat: 'triceps', lvl: 2, art: 'bench', muscles: ['triceps'], focus: 'Back of arms', step: 2.5, start: 5, rest: 60, reps: [8, 12], aka: ['lying triceps extension'],
    setup: ['Lie on a bench, bar straight above your chest.'],
    move: ['Bend your elbows to lower the bar toward your forehead.', 'Straighten your arms.'],
    feel: 'The back of your arms.', avoid: ['Elbows flaring'] });
  X('db_overhead_extension', 'Dumbbell overhead extension', { eq: ['dumbbells'], kind: 'free', pat: 'triceps', art: 'dumbbell', muscles: ['triceps'], focus: 'Back of arms', step: 2, start: 6, rest: 45, reps: [10, 12],
    setup: ['Hold one dumbbell overhead with both hands.'],
    move: ['Lower it behind your head.', 'Straighten your arms.'],
    feel: 'The back of your arms.', avoid: ['Arching your back'] });
  X('tricep_machine', 'Triceps machine', { eq: ['tricep_machine'], kind: 'machine', pat: 'triceps', art: 'dips', muscles: ['triceps'], focus: 'Back of arms', step: 2.5, start: 10, rest: 45, reps: [10, 15], aka: ['dip machine', 'seated dip'],
    setup: ['Seat so the handles are at your sides.'],
    move: ['Press down until your arms are straight.', 'Return slowly.'],
    feel: 'The back of your arms.', avoid: ['Shrugging'] });
  X('close_grip_bench', 'Close-grip bench press', { eq: ['barbell', 'flat_bench'], kind: 'barbell', pat: 'triceps', lvl: 3, art: 'bench', muscles: ['triceps', 'chest'], focus: 'Triceps and chest', step: 2.5, start: 20, rest: 90, reps: [6, 10],
    setup: ['Hands shoulder-width on the bar.'],
    move: ['Lower to your lower chest, elbows tucked.', 'Press up.'],
    feel: 'Back of your arms.', avoid: ['Grip too narrow'] });
  X('bench_dip', 'Bench dip', { eq: ['flat_bench'], kind: 'body', pat: 'triceps', art: 'bench', unit: 'reps', muscles: ['triceps'], focus: 'Back of arms', step: 1, start: 8, reps: [8, 15], rest: 45,
    setup: ['Hands on the edge of a bench behind you, legs out.'],
    move: ['Bend your elbows to lower.', 'Press back up.'],
    feel: 'The back of your arms.', avoid: ['Going too deep'] });

  // ── Core ──────────────────────────────────────────────────────────────────
  X('dead_bug', 'Dead bug', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'reps', perSide: true, muscles: ['core'], focus: 'Deep core', step: 1, start: 6, reps: [6, 10], rest: 45,
    setup: ['Grab a mat in a quiet corner of the stretching area.', 'Lie on your back, arms pointing at the ceiling.', 'Lift your knees above your hips, bent at 90 degrees.', 'Gently press your lower back into the mat.'],
    move: ['Breathe out and slowly lower your right arm and left leg toward the floor.', 'Keep your lower back pressed down the whole time.', 'Bring them back and switch sides. One each side is one rep.'],
    feel: 'Deep in your stomach, not your lower back.', avoid: ['Letting your lower back arch off the mat', 'Rushing'] });
  X('plank', 'Plank', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'sec', muscles: ['core'], muscles2: ['shoulders'], focus: 'Whole core', step: 5, start: 20, reps: [20, 40], rest: 45,
    setup: ['On a mat, rest on your forearms with elbows under your shoulders.', 'Step your feet back so your body is straight from head to heels.', 'New to it? Keep your knees down. That counts.'],
    move: ['Squeeze your glutes and tighten your stomach.', 'Breathe slowly and hold.', 'Stop when your hips start to sag.'],
    feel: 'Your stomach and shoulders. Not your lower back.', avoid: ['Hips sagging or piking up', 'Holding your breath'] });
  X('side_plank', 'Side plank', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'sec', perSide: true, muscles: ['obliques', 'core'], focus: 'Sides of your core', step: 5, start: 15, reps: [15, 30], rest: 45,
    setup: ['On your side, elbow under your shoulder, knees bent or straight.'],
    move: ['Lift your hips so your body is straight. Hold, then switch.'],
    feel: 'The side of your waist.', avoid: ['Hips dropping'] });
  X('bird_dog', 'Bird dog', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'reps', perSide: true, muscles: ['core', 'lower_back'], focus: 'Core and back health', step: 1, start: 6, reps: [6, 10], rest: 45,
    setup: ['On hands and knees, back flat.'],
    move: ['Reach one arm forward and the opposite leg back.', 'Hold a second, return, switch.'],
    feel: 'Core and lower back working gently.', avoid: ['Hips rotating'] });
  X('pallof_press', 'Pallof press', { eq: ['cable_station'], kind: 'cable', pat: 'core', art: 'cable', perSide: true, muscles: ['obliques', 'core'], focus: 'Core, anti-twist', step: 2.5, start: 5, rest: 45, reps: [10, 12],
    setup: ['Handle at chest height, stand side-on, holding it at your chest.'],
    move: ['Press straight out and hold for two seconds without twisting.', 'Bring it back. Switch sides.'],
    feel: 'Your whole core resisting the pull.', avoid: ['Rotating toward the machine'] });
  X('cable_crunch', 'Cable crunch', { eq: ['cable_station'], kind: 'cable', pat: 'core', lvl: 2, art: 'cable', muscles: ['core'], focus: 'Abs', step: 2.5, start: 10, rest: 45, reps: [12, 15],
    setup: ['Rope on a high cable, kneel facing it, rope beside your head.'],
    move: ['Crunch your ribs toward your hips.', 'Return slowly.'],
    feel: 'Your abs.', avoid: ['Pulling with your arms'] });
  X('ab_crunch_machine', 'Ab crunch machine', { eq: ['ab_crunch_machine'], kind: 'machine', pat: 'core', art: 'abcrunch', muscles: ['core'], focus: 'Core', step: 2.5, start: 10, rest: 45, reps: [12, 15],
    setup: ['Set the seat so the pads sit comfortably on your chest or shoulders.'],
    move: ['Breathe out and curl your chest toward your hips.', 'Return slowly.'],
    feel: 'Your stomach.', avoid: ['Pulling with your arms'] });
  X('knee_raise', 'Captain’s chair knee raise', { eq: ['dip_station'], kind: 'body', pat: 'core', lvl: 2, art: 'dips', unit: 'reps', muscles: ['core'], focus: 'Lower abs', step: 1, start: 8, reps: [8, 15], rest: 60, aka: ['hanging knee raise', 'vertical knee raise'],
    setup: ['Forearms on the pads, back against the backrest.'],
    move: ['Lift your knees toward your chest.', 'Lower slowly.'],
    feel: 'Your lower stomach.', avoid: ['Swinging'] });
  X('hanging_leg_raise', 'Hanging leg raise', { eq: ['pullup_bar'], kind: 'body', pat: 'core', lvl: 3, art: 'pullupbar', unit: 'reps', muscles: ['core'], muscles2: ['forearms'], focus: 'Abs and grip', step: 1, start: 6, reps: [6, 12], rest: 60,
    setup: ['Hang from the bar, shoulders engaged.'],
    move: ['Raise your legs, curling your pelvis up.', 'Lower slowly without swinging.'],
    feel: 'Your abs.', avoid: ['Swinging'] });
  X('ab_wheel', 'Ab wheel rollout', { eq: ['ab_wheel'], kind: 'body', pat: 'core', lvl: 3, art: 'mat', unit: 'reps', muscles: ['core'], focus: 'Whole core', step: 1, start: 5, reps: [5, 12], rest: 60,
    setup: ['Kneel holding the wheel under your shoulders.'],
    move: ['Roll out as far as you can with a flat back.', 'Pull back using your abs.'],
    feel: 'Your whole stomach.', avoid: ['Lower back sagging'] });
  X('crunch', 'Crunch', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'reps', muscles: ['core'], focus: 'Abs', step: 1, start: 12, reps: [12, 20], rest: 45,
    setup: ['On your back, knees bent, hands lightly by your ears.'],
    move: ['Curl your shoulders off the mat.', 'Lower slowly.'],
    feel: 'Your abs.', avoid: ['Pulling your head'] });
  X('reverse_crunch', 'Reverse crunch', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'reps', muscles: ['core'], focus: 'Lower abs', step: 1, start: 10, reps: [10, 15], rest: 45,
    setup: ['On your back, knees bent up over your hips.'],
    move: ['Curl your hips off the mat toward your chest.', 'Lower slowly.'],
    feel: 'Your lower stomach.', avoid: ['Swinging your legs'] });
  X('woodchop', 'Cable woodchop', { eq: ['cable_station'], kind: 'cable', pat: 'core', lvl: 2, art: 'cable', perSide: true, muscles: ['obliques', 'core'], focus: 'Rotation', step: 2.5, start: 5, rest: 45, reps: [10, 12],
    setup: ['Handle on a high cable, stand side-on.'],
    move: ['Pull diagonally down across your body, turning through your hips.', 'Return slowly. Switch sides.'],
    feel: 'The sides of your waist.', avoid: ['Using only your arms'] });
  X('mountain_climber', 'Mountain climbers', { eq: [], kind: 'body', pat: 'cond', art: 'mat', unit: 'sec', muscles: ['core'], muscles2: ['shoulders', 'quads'], focus: 'Core and fitness', step: 5, start: 20, reps: [20, 40], rest: 45,
    setup: ['Push-up position.'], move: ['Drive your knees to your chest one at a time, quickly.'],
    feel: 'Core and heart rate up.', avoid: ['Hips bouncing'] });
  X('farmer_carry', 'Farmer’s carry', { eq: ['dumbbells'], kind: 'free', pat: 'carry', art: 'dumbbell', unit: 'sec', muscles: ['forearms', 'traps', 'core'], focus: 'Grip and core', step: 5, start: 30, reps: [30, 45], rest: 60, aka: ['farmers walk'],
    setup: ['A heavy dumbbell in each hand, stand tall.'],
    move: ['Walk with short, steady steps for the time.'],
    feel: 'Grip, shoulders and core.', avoid: ['Leaning to one side'] });
  X('suitcase_carry', 'Suitcase carry', { eq: ['dumbbells'], kind: 'free', pat: 'carry', lvl: 2, art: 'dumbbell', unit: 'sec', perSide: true, muscles: ['obliques', 'forearms'], focus: 'Core and grip', step: 5, start: 20, reps: [20, 40], rest: 60,
    setup: ['One heavy dumbbell in one hand.'],
    move: ['Walk tall without leaning. Switch hands.'],
    feel: 'The side of your core opposite the weight.', avoid: ['Leaning'] });

  // ── Cardio and conditioning ───────────────────────────────────────────────
  X('bike', 'Exercise bike', { eq: ['bike'], kind: 'cardio', pat: 'cardio', art: 'bike', unit: 'min', muscles: [], focus: 'Warm-up and fitness', aka: ['stationary bike', 'cycling'],
    setup: ['Set the seat so your knee is slightly bent at the bottom of each pedal turn.'],
    move: ['Start at an easy pace you could hold a chat at.', 'Build up a little every couple of minutes.'],
    feel: 'Warm and breathing a bit faster, but able to talk.' });
  X('cross_trainer', 'Cross trainer', { eq: ['cross_trainer'], kind: 'cardio', pat: 'cardio', art: 'crosstrainer', unit: 'min', muscles: [], focus: 'Warm-up and fitness', aka: ['elliptical'],
    setup: ['Step on, hold the moving handles.'], move: ['Start easy and build up gradually.'], feel: 'Warm and breathing a bit faster.' });
  X('treadmill', 'Treadmill walk', { eq: ['treadmill'], kind: 'cardio', pat: 'cardio', art: 'treadmill', unit: 'min', muscles: [], focus: 'Warm-up and fitness', aka: ['incline walk', 'walking', 'running'],
    setup: ['Clip the safety key to your top before you start.'], move: ['Walk briskly. Add a small incline if you like.'], feel: 'Warm and breathing a bit faster.' });
  X('rower', 'Rowing machine', { eq: ['rower'], kind: 'cardio', pat: 'cardio', art: 'rower', unit: 'min', muscles: [], focus: 'Whole-body fitness', aka: ['rowing', 'erg', 'concept 2'],
    setup: ['Feet strapped in, damper around 4 to 6.'], move: ['Push with your legs, then lean back slightly and pull the handle to your ribs.', 'Return arms, body, then legs.'], feel: 'Legs, back and lungs.' });
  X('stair_climber', 'Stair climber', { eq: ['stairs'], kind: 'cardio', pat: 'cardio', art: 'stairs', unit: 'min', muscles: [], focus: 'Legs and fitness', aka: ['stairmaster', 'stepmill'],
    setup: ['Hold the rails lightly for balance only.'], move: ['Steady steps, whole foot on each stair.'], feel: 'Glutes, legs and lungs.' });
  X('ski_erg', 'Ski erg', { eq: ['ski_erg'], kind: 'cardio', pat: 'cardio', lvl: 2, art: 'rower', unit: 'min', muscles: [], focus: 'Upper body fitness', setup: ['Stand tall holding the handles overhead.'], move: ['Pull down, hinging at the hips, then rise.'], feel: 'Lats, core and lungs.' });
  X('assault_bike', 'Air bike', { eq: ['assault_bike'], kind: 'cardio', pat: 'cardio', lvl: 2, art: 'bike', unit: 'min', muscles: [], focus: 'Hard intervals', aka: ['assault bike', 'echo bike'], setup: ['Seat so your knee is slightly bent at the bottom.'], move: ['Push and pull the handles while you pedal.'], feel: 'Everything, fast.' });
  X('sled_push', 'Sled push', { eq: ['sled'], kind: 'cardio', pat: 'cond', lvl: 2, art: 'sled', unit: 'sec', muscles: ['quads', 'glutes'], focus: 'Legs and fitness', step: 5, start: 20, reps: [20, 30], rest: 90, setup: ['Hands on the posts, lean in.'], move: ['Drive with short, powerful steps.'], feel: 'Legs and lungs.', avoid: ['Standing too upright'] });
  X('battle_ropes', 'Battle ropes', { eq: ['battle_ropes'], kind: 'cardio', pat: 'cond', lvl: 2, art: 'ropes', unit: 'sec', muscles: ['shoulders', 'core'], focus: 'Conditioning', step: 5, start: 20, reps: [20, 30], rest: 60, setup: ['Half squat, a rope end in each hand.'], move: ['Make fast alternating waves.'], feel: 'Shoulders and heart rate.', avoid: ['Standing straight up'] });

  // ── More moves people see around the gym (searchable; the plan uses some) ──
  X('kettlebell_deadlift', 'Kettlebell deadlift', { eq: ['kettlebells'], kind: 'free', pat: 'hinge', art: 'kettlebell', muscles: ['glutes', 'hams'], muscles2: ['lower_back'], focus: 'Learning to hinge', step: 4, start: 8, rest: 75,
    setup: ['Kettlebell between your feet, feet hip-width.'],
    move: ['Push your hips back, flat back, and grab the handle.', 'Stand up tall by driving your hips forward.', 'Lower it the same way.'],
    feel: 'Glutes and the back of your thighs.', avoid: ['Rounding your back', 'Squatting it up'] });
  X('sumo_squat', 'Sumo squat', { eq: ['dumbbells'], kind: 'free', pat: 'squat', art: 'kettlebell', muscles: ['glutes', 'adductors', 'quads'], focus: 'Glutes and inner thighs', step: 2, start: 8, rest: 75, aka: ['plie squat'],
    setup: ['Wide stance, toes turned out, one dumbbell hanging between your legs.'],
    move: ['Sit straight down, knees tracking over your toes.', 'Stand up and squeeze your glutes.'],
    feel: 'Glutes and inner thighs.', avoid: ['Knees caving in'] });
  X('wall_sit', 'Wall sit', { eq: [], kind: 'body', pat: 'squat', art: 'mat', unit: 'sec', muscles: ['quads'], focus: 'Front of thighs, anywhere', step: 5, start: 20, reps: [20, 45], rest: 45,
    setup: ['Back flat against a wall, slide down until your knees are at about 90 degrees.'],
    move: ['Hold, breathing steadily.'], feel: 'The front of your thighs, burning.', avoid: ['Pushing your hands on your knees'] });
  X('curtsy_lunge', 'Curtsy lunge', { eq: ['dumbbells'], kind: 'free', pat: 'lunge', lvl: 2, art: 'dumbbell', perSide: true, muscles: ['glutes', 'quads'], muscles2: ['hips'], focus: 'Glutes and outer hips', step: 2, start: 4, rest: 60,
    setup: ['Dumbbells by your sides, standing tall.'],
    move: ['Step one leg behind and across, like a curtsy.', 'Lower, then push back up. Switch sides after your reps.'],
    feel: 'The glute of your front leg.', avoid: ['Twisting your hips a lot'] });
  X('single_leg_glute_bridge', 'Single-leg glute bridge', { eq: [], kind: 'body', pat: 'glute', art: 'mat', unit: 'reps', perSide: true, muscles: ['glutes'], muscles2: ['hams'], focus: 'Glutes, one side at a time', step: 1, start: 8, reps: [8, 15], rest: 45,
    setup: ['On your back, one foot flat, the other leg straight in the air.'],
    move: ['Push through the planted heel and lift your hips.', 'Lower slowly. Switch sides.'],
    feel: 'The glute of the planted leg.', avoid: ['Hips tilting'] });
  X('clamshell', 'Banded clamshell', { eq: ['bands'], kind: 'body', pat: 'glute', art: 'mat', unit: 'reps', perSide: true, muscles: ['hips', 'glutes'], focus: 'Outer hips', step: 1, start: 12, reps: [12, 20], rest: 30,
    setup: ['Lie on your side, knees bent, band just above your knees.'],
    move: ['Keep your feet together and open your top knee.', 'Close slowly. Switch sides.'],
    feel: 'The side of your hip.', avoid: ['Rolling your hips back'] });
  X('nordic_curl', 'Nordic curl', { eq: ['mats'], kind: 'body', pat: 'knee_flex', lvl: 3, art: 'mat', unit: 'reps', muscles: ['hams'], focus: 'Hamstrings, very hard', step: 1, start: 3, reps: [3, 8], rest: 120,
    setup: ['Kneel on a mat with your heels anchored under a pad or held by a partner.'],
    move: ['Lower your body forward as slowly as you can, hips straight.', 'Catch yourself with your hands, push back up.'],
    feel: 'The back of your thighs, a lot.', avoid: ['Bending at the hips'] });
  X('single_arm_cable_row', 'Single-arm cable row', { eq: ['cable_station'], kind: 'cable', pat: 'h_pull', art: 'cable', perSide: true, muscles: ['lats', 'back'], muscles2: ['biceps'], focus: 'One side of your back at a time', step: 2.5, start: 5, rest: 60,
    setup: ['Handle at chest height, split stance facing the machine.'],
    move: ['Row your elbow back past your ribs.', 'Reach forward slowly. Switch sides.'],
    feel: 'The side of your back.', avoid: ['Twisting'] });
  X('meadows_row', 'Meadows row', { eq: ['landmine', 'barbell'], kind: 'barbell', pat: 'h_pull', lvl: 3, art: 'landmine', perSide: true, muscles: ['lats', 'back'], muscles2: ['rear', 'forearms'], focus: 'Back, one side at a time', step: 2.5, start: 10, rest: 75,
    setup: ['Stand side-on to the end of a landmine bar, staggered stance, hinge forward.'],
    move: ['Grip the bar end and row it up to your hip.', 'Lower under control. Switch sides.'],
    feel: 'The side of your back.', avoid: ['Rounding your back'] });
  X('band_pull_apart', 'Band pull-apart', { eq: ['bands'], kind: 'body', pat: 'rear', art: 'mat', unit: 'reps', muscles: ['rear', 'back'], focus: 'Posture, anywhere', step: 1, start: 15, reps: [15, 25], rest: 30,
    setup: ['Hold a light band at shoulder height, arms straight.'],
    move: ['Pull the band apart until it touches your chest.', 'Return slowly.'],
    feel: 'Between your shoulder blades.', avoid: ['Shrugging'] });
  X('cable_rear_delt_fly', 'Cable rear delt fly', { eq: ['cable_station'], kind: 'cable', pat: 'rear', lvl: 2, art: 'cable', muscles: ['rear'], focus: 'Back of shoulders', step: 1.25, start: 2.5, rest: 45, reps: [12, 15],
    setup: ['Cables crossed at shoulder height, hold the opposite handles or cable ends.'],
    move: ['Sweep your arms out and back.', 'Return slowly.'], feel: 'The back of your shoulders.', avoid: ['Shrugging'] });
  X('y_raise', 'Incline Y raise', { eq: ['dumbbells', 'adjustable_bench'], kind: 'free', pat: 'rear', lvl: 2, art: 'bench', muscles: ['rear', 'traps'], focus: 'Upper back and shoulder health', step: 1, start: 2, rest: 45, reps: [10, 15],
    setup: ['Lie face down on an incline bench, light dumbbells hanging.'],
    move: ['Raise your arms up and out into a Y, thumbs up.', 'Lower slowly.'], feel: 'Upper back and the back of your shoulders.', avoid: ['Going heavy'] });
  X('front_raise', 'Front raise', { eq: ['dumbbells'], kind: 'free', pat: 'lateral', art: 'dumbbell', muscles: ['shoulders'], focus: 'Front of shoulders', step: 1, start: 2, rest: 45, reps: [10, 15],
    setup: ['Light dumbbells in front of your thighs.'],
    move: ['Raise them in front to shoulder height.', 'Lower slowly.'], feel: 'The front of your shoulders.', avoid: ['Swinging'] });
  X('cable_upright_row', 'Cable upright row', { eq: ['cable_station'], kind: 'cable', pat: 'lateral', lvl: 2, art: 'cable', muscles: ['shoulders', 'traps'], focus: 'Shoulders and traps', step: 2.5, start: 10, rest: 60, reps: [10, 12],
    setup: ['Straight bar on a low cable, hands a little wider than shoulders.'],
    move: ['Pull the bar up to your lower chest, elbows leading.', 'Lower slowly.'], feel: 'Sides of your shoulders and traps.', avoid: ['Pulling too high if it pinches'] });
  X('push_press', 'Push press', { eq: ['barbell', 'squat_rack'], kind: 'barbell', pat: 'v_push', lvl: 3, art: 'rack', muscles: ['shoulders', 'triceps'], muscles2: ['quads', 'core'], focus: 'Shoulders with leg drive', step: 2.5, start: 20, rest: 120, reps: [4, 6],
    setup: ['Bar on the front of your shoulders, hands just outside them.'],
    move: ['Dip a few centimetres at the knees.', 'Drive up through your legs and press the bar overhead.', 'Lower to your shoulders.'],
    feel: 'Shoulders, triceps and legs.', avoid: ['A deep squat dip', 'Leaning back'] });
  X('pike_push_up', 'Pike push-up', { eq: [], kind: 'body', pat: 'v_push', lvl: 2, art: 'mat', unit: 'reps', muscles: ['shoulders'], muscles2: ['triceps'], focus: 'Shoulders, bodyweight', step: 1, start: 5, reps: [5, 12], rest: 60,
    setup: ['Hands on the floor, hips high in an upside-down V.'],
    move: ['Bend your elbows to lower your head toward the floor.', 'Press back up.'], feel: 'Your shoulders.', avoid: ['Hips dropping'] });
  X('kettlebell_press', 'Kettlebell clean and press', { eq: ['kettlebells'], kind: 'free', pat: 'v_push', lvl: 2, art: 'kettlebell', perSide: true, muscles: ['shoulders'], muscles2: ['glutes', 'core', 'triceps'], focus: 'Shoulders and whole body', step: 4, start: 8, rest: 75, reps: [6, 10],
    setup: ['Kettlebell between your feet.'],
    move: ['Clean it to your shoulder in one smooth pull.', 'Press it overhead, lower to your shoulder, then the floor.', 'Switch sides after your reps.'],
    feel: 'Shoulder, hips and core.', avoid: ['Banging your wrist'] });
  X('concentration_curl', 'Concentration curl', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'biceps', art: 'dumbbell', perSide: true, muscles: ['biceps'], focus: 'Biceps', step: 1, start: 4, rest: 45, reps: [10, 12],
    setup: ['Sit on a bench, elbow braced on the inside of your thigh.'],
    move: ['Curl up, squeeze, lower slowly. Switch sides.'], feel: 'Your biceps.', avoid: ['Swinging'] });
  X('reverse_curl', 'Reverse curl', { eq: ['ez_bar'], kind: 'barbell', pat: 'biceps', art: 'barbell', muscles: ['forearms', 'biceps'], focus: 'Forearms and biceps', step: 2.5, start: 5, rest: 45, reps: [10, 15],
    setup: ['Hold the bar palms down, elbows by your sides.'],
    move: ['Curl up, lower slowly.'], feel: 'Forearms and biceps.', avoid: ['Wrists bending back'] });
  X('db_kickback', 'Dumbbell triceps kickback', { eq: ['dumbbells', 'flat_bench'], kind: 'free', pat: 'triceps', art: 'bench', perSide: true, muscles: ['triceps'], focus: 'Back of arms', step: 1, start: 3, rest: 45, reps: [10, 15], aka: ['tricep kickback'],
    setup: ['One hand and knee on a bench, upper arm tucked by your side.'],
    move: ['Straighten your arm back.', 'Return slowly. Switch sides.'], feel: 'The back of your arm.', avoid: ['Swinging the elbow'] });
  X('close_grip_push_up', 'Close-grip push-up', { eq: [], kind: 'body', pat: 'triceps', lvl: 2, art: 'mat', unit: 'reps', muscles: ['triceps', 'chest'], focus: 'Back of arms, bodyweight', step: 1, start: 6, reps: [6, 15], rest: 60, aka: ['diamond push up'],
    setup: ['Push-up position, hands under your shoulders or closer.'],
    move: ['Lower with elbows tucked to your sides.', 'Press back up.'], feel: 'Back of your arms.', avoid: ['Elbows flaring'] });
  X('russian_twist', 'Russian twist', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'reps', muscles: ['obliques', 'core'], focus: 'Sides of your core', step: 1, start: 12, reps: [12, 20], rest: 45,
    setup: ['Sit, knees bent, lean back slightly. Hold a light weight if you like.'],
    move: ['Turn your shoulders side to side. Each side is one rep.'], feel: 'The sides of your waist.', avoid: ['Rounding your back'] });
  X('bicycle_crunch', 'Bicycle crunch', { eq: [], kind: 'body', pat: 'core', art: 'mat', unit: 'reps', muscles: ['core', 'obliques'], focus: 'Abs and obliques', step: 1, start: 12, reps: [12, 20], rest: 45,
    setup: ['On your back, hands lightly by your ears, knees up.'],
    move: ['Bring one elbow toward the opposite knee as the other leg straightens.', 'Switch sides in a slow pedal.'], feel: 'Your abs and sides.', avoid: ['Pulling your head'] });
  X('hollow_hold', 'Hollow hold', { eq: [], kind: 'body', pat: 'core', lvl: 2, art: 'mat', unit: 'sec', muscles: ['core'], focus: 'Whole core', step: 5, start: 15, reps: [15, 40], rest: 45,
    setup: ['On your back, press your lower back into the floor.'],
    move: ['Lift your shoulders and legs a little off the floor, arms overhead, and hold.'], feel: 'Your whole stomach.', avoid: ['Lower back lifting'] });
  X('hanging_knee_raise', 'Hanging knee raise', { eq: ['pullup_bar'], kind: 'body', pat: 'core', lvl: 2, art: 'pullupbar', unit: 'reps', muscles: ['core'], muscles2: ['forearms'], focus: 'Lower abs and grip', step: 1, start: 8, reps: [8, 15], rest: 60,
    setup: ['Hang from a bar, shoulders engaged.'],
    move: ['Lift your knees toward your chest.', 'Lower slowly without swinging.'], feel: 'Your lower stomach.', avoid: ['Swinging'] });
  X('landmine_rotation', 'Landmine rotation', { eq: ['landmine', 'barbell'], kind: 'barbell', pat: 'core', lvl: 2, art: 'landmine', muscles: ['obliques', 'core'], muscles2: ['shoulders'], focus: 'Rotation', step: 2.5, start: 5, rest: 45, reps: [8, 12],
    setup: ['Hold the end of the bar at arm’s length in front of your chest.'],
    move: ['Rotate the bar down to one hip, then arc it across to the other.', 'Turn through your hips and keep your arms long.'],
    feel: 'The sides of your waist.', avoid: ['Bending your arms'] });
  X('turkish_get_up', 'Turkish get-up', { eq: ['kettlebells'], kind: 'free', pat: 'core', lvl: 3, art: 'kettlebell', unit: 'reps', perSide: true, muscles: ['core', 'shoulders'], muscles2: ['glutes'], focus: 'Whole-body control', step: 1, start: 2, reps: [2, 5], rest: 75,
    setup: ['Lie on your back, kettlebell pressed up in one hand, same-side knee bent.'],
    move: ['Roll to your elbow, then hand, lift your hips, sweep your leg through and stand up, eyes on the bell.', 'Reverse it to lie back down. Switch sides.'],
    feel: 'Shoulder stability and your whole core.', avoid: ['Rushing', 'Going heavy too soon'] });
  X('dead_hang', 'Dead hang', { eq: ['pullup_bar'], kind: 'body', pat: 'carry', art: 'pullupbar', unit: 'sec', muscles: ['forearms', 'lats'], focus: 'Grip and shoulders', step: 5, start: 20, reps: [20, 45], rest: 60,
    setup: ['Grab the bar shoulder-width.'], move: ['Hang with relaxed shoulders, breathing steadily.'], feel: 'Grip and a stretch through your shoulders.', avoid: ['Kicking or swinging'] });
  X('burpee', 'Burpee', { eq: [], kind: 'body', pat: 'cond', art: 'mat', unit: 'reps', muscles: ['quads', 'chest'], muscles2: ['core', 'shoulders'], focus: 'Whole-body fitness', step: 1, start: 6, reps: [6, 15], rest: 60,
    setup: ['Stand tall.'], move: ['Squat, hands down, jump your feet back.', 'Jump your feet in, stand and jump up.'], feel: 'Everything, and your lungs.', avoid: ['Hips sagging at the bottom'] });
  X('box_jump', 'Box jump', { eq: ['plyo_box'], kind: 'body', pat: 'cond', lvl: 2, art: 'bench', unit: 'reps', muscles: ['quads', 'glutes'], muscles2: ['calves'], focus: 'Power', step: 1, start: 5, reps: [5, 8], rest: 75,
    setup: ['Stand a short step from a box you can land on comfortably.'], move: ['Swing your arms, jump and land softly with your whole foot on the box.', 'Step down, don’t jump down.'],
    feel: 'Legs, fast.', avoid: ['A box that’s too high', 'Jumping down'] });
  X('jump_squat', 'Jump squat', { eq: [], kind: 'body', pat: 'cond', lvl: 2, art: 'mat', unit: 'reps', muscles: ['quads', 'glutes'], muscles2: ['calves'], focus: 'Power and fitness', step: 1, start: 8, reps: [8, 15], rest: 60,
    setup: ['Feet shoulder-width.'], move: ['Squat down, then jump up.', 'Land softly and go straight into the next one.'], feel: 'Thighs and glutes.', avoid: ['Landing stiff-legged'] });
  X('wall_ball', 'Wall ball', { eq: ['medicine_ball'], kind: 'body', pat: 'cond', lvl: 2, art: 'mat', unit: 'reps', muscles: ['quads', 'shoulders'], muscles2: ['glutes', 'core'], focus: 'Whole-body fitness', step: 1, start: 10, reps: [10, 20], rest: 60,
    setup: ['Stand an arm’s length from a wall, medicine ball at your chest.'], move: ['Squat, then drive up and throw the ball to a target above you.', 'Catch it and go straight into the next squat.'],
    feel: 'Legs, shoulders and lungs.', avoid: ['Catching it with straight arms'] });
  X('med_ball_slam', 'Medicine ball slam', { eq: ['medicine_ball'], kind: 'body', pat: 'cond', art: 'mat', unit: 'reps', muscles: ['core', 'shoulders'], muscles2: ['lats'], focus: 'Power and stress relief', step: 1, start: 10, reps: [10, 15], rest: 45, aka: ['slam ball'],
    setup: ['Hold a slam ball overhead.'], move: ['Slam it into the floor in front of you, hinging at the hips.', 'Pick it up and repeat.'], feel: 'Core, shoulders and lungs.', avoid: ['Using a bouncy ball'] });
  X('dumbbell_thruster', 'Dumbbell thruster', { eq: ['dumbbells'], kind: 'free', pat: 'cond', lvl: 2, art: 'dumbbell', muscles: ['quads', 'shoulders'], muscles2: ['glutes', 'triceps'], focus: 'Whole-body fitness', step: 2, start: 4, rest: 75, reps: [8, 12],
    setup: ['Dumbbells at your shoulders, feet shoulder-width.'], move: ['Squat down.', 'Drive up and press the dumbbells overhead in one movement.'], feel: 'Legs, shoulders and lungs.', avoid: ['Pressing before you stand'] });
  X('power_clean', 'Power clean', { eq: ['barbell'], kind: 'barbell', pat: 'cond', lvl: 3, art: 'barbell', muscles: ['glutes', 'hams', 'traps'], muscles2: ['quads', 'back'], focus: 'Explosive power', step: 2.5, start: 20, rest: 150, reps: [3, 5],
    setup: ['Bar over mid-foot, grip just outside your legs, chest up.'], move: ['Push off the floor, then jump hard as the bar passes your thighs.', 'Pull yourself under and catch it on your shoulders.'],
    feel: 'Hips snapping, the bar floating up.', avoid: ['Pulling with your arms early', 'Learning it without a coach'] });
  X('skipping', 'Skipping', { eq: ['jump_rope'], kind: 'cardio', pat: 'cardio', art: 'ropes', unit: 'min', muscles: [], focus: 'Fitness and footwork', aka: ['jump rope', 'skipping rope'],
    setup: ['Handles at hip height, rope just touching the floor behind you.'], move: ['Small, light bounces on the balls of your feet. Turn the rope from your wrists.'], feel: 'Calves and lungs.' });
  X('bag_work', 'Boxing bag rounds', { eq: ['boxing_bag'], kind: 'cardio', pat: 'cardio', art: 'ropes', unit: 'min', muscles: [], focus: 'Fitness and stress relief', aka: ['boxing', 'punching bag'],
    setup: ['Wraps or gloves on, stand side-on to the bag.'], move: ['Rounds of one or two minutes: jab, cross, move, breathe.'], feel: 'Shoulders, core and lungs.' });

  // The order the plan builder tries moves in, per pattern and training style:
  // m = mostly machines, x = a mix, f = mostly free weights. Core goes by level instead
  // (m = new, x = some experience, f = experienced). Anything a list leaves out is still a
  // fallback, and only moves your gym has, at your level, are ever picked.
  const PREF = {
    squat: { m: ['leg_press', 'hack_squat_machine', 'smith_squat', 'pendulum_squat', 'belt_squat', 'goblet_squat', 'bodyweight_squat'],
      x: ['back_squat', 'hack_squat_machine', 'leg_press', 'goblet_squat', 'smith_squat', 'pendulum_squat', 'belt_squat', 'front_squat'],
      f: ['back_squat', 'front_squat', 'goblet_squat', 'landmine_squat', 'smith_squat', 'hack_squat_machine', 'leg_press'] },
    hinge: { m: ['hip_thrust', 'back_extension', 'kettlebell_deadlift', 'db_romanian_deadlift', 'smith_hip_thrust', 'glute_bridge'],
      x: ['romanian_deadlift', 'hip_thrust', 'db_romanian_deadlift', 'barbell_hip_thrust', 'trap_bar_deadlift', 'kettlebell_deadlift', 'back_extension', 'cable_pull_through'],
      f: ['deadlift', 'romanian_deadlift', 'trap_bar_deadlift', 'barbell_hip_thrust', 'db_romanian_deadlift', 'sumo_deadlift', 'good_morning', 'kettlebell_swing'] },
    lunge: { m: ['smith_split_squat', 'single_leg_press', 'step_up', 'reverse_lunge', 'split_squat'],
      x: ['bulgarian_split_squat', 'reverse_lunge', 'walking_lunge', 'step_up', 'smith_split_squat'],
      f: ['bulgarian_split_squat', 'walking_lunge', 'reverse_lunge', 'step_up', 'split_squat'] },
    knee_ext: { m: ['leg_extension'], x: ['leg_extension'], f: ['leg_extension'] },
    knee_flex: { m: ['leg_curl', 'lying_leg_curl'], x: ['leg_curl', 'lying_leg_curl'], f: ['lying_leg_curl', 'leg_curl', 'nordic_curl'] },
    glute: { m: ['hip_abduction', 'glute_kickback_machine', 'cable_kickback', 'single_leg_glute_bridge', 'banded_lateral_walk'],
      x: ['hip_abduction', 'cable_kickback', 'glute_kickback_machine', 'cable_hip_abduction', 'single_leg_glute_bridge'],
      f: ['cable_kickback', 'hip_abduction', 'cable_hip_abduction', 'glute_kickback_machine', 'banded_lateral_walk'] },
    adduct: { m: ['hip_adduction', 'lateral_lunge'], x: ['hip_adduction', 'lateral_lunge'], f: ['lateral_lunge', 'hip_adduction'] },
    calf: { m: ['calf_raise_machine', 'leg_press_calf_raise', 'smith_calf_raise', 'db_calf_raise'], x: ['calf_raise_machine', 'leg_press_calf_raise', 'smith_calf_raise', 'db_calf_raise'], f: ['calf_raise_machine', 'smith_calf_raise', 'db_calf_raise', 'leg_press_calf_raise'] },
    h_push: { m: ['chest_press', 'plate_chest_press', 'incline_chest_press', 'smith_bench_press', 'db_bench_press', 'incline_push_up', 'push_up'],
      x: ['bench_press', 'db_bench_press', 'chest_press', 'incline_db_press', 'plate_chest_press', 'incline_chest_press', 'smith_bench_press'],
      f: ['bench_press', 'incline_bench_press', 'db_bench_press', 'incline_db_press', 'dips', 'push_up'] },
    fly: { m: ['pec_deck', 'cable_fly', 'low_cable_fly', 'db_fly'], x: ['pec_deck', 'cable_fly', 'low_cable_fly', 'db_fly'], f: ['cable_fly', 'db_fly', 'low_cable_fly', 'pec_deck'] },
    v_push: { m: ['shoulder_press', 'smith_shoulder_press', 'db_shoulder_press', 'landmine_press'],
      x: ['db_shoulder_press', 'shoulder_press', 'overhead_press', 'arnold_press', 'landmine_press'],
      f: ['overhead_press', 'db_shoulder_press', 'arnold_press', 'push_press', 'landmine_press', 'smith_shoulder_press'] },
    lateral: { m: ['machine_lateral_raise', 'lateral_raise', 'cable_lateral_raise'], x: ['lateral_raise', 'cable_lateral_raise', 'machine_lateral_raise'], f: ['lateral_raise', 'cable_lateral_raise', 'machine_lateral_raise'] },
    rear: { m: ['rear_delt_machine', 'face_pull', 'band_pull_apart', 'db_rear_delt_fly'], x: ['face_pull', 'rear_delt_machine', 'db_rear_delt_fly', 'cable_rear_delt_fly'], f: ['face_pull', 'db_rear_delt_fly', 'cable_rear_delt_fly', 'y_raise', 'rear_delt_machine'] },
    traps: { m: ['db_shrug', 'barbell_shrug'], x: ['db_shrug', 'barbell_shrug'], f: ['barbell_shrug', 'db_shrug'] },
    v_pull: { m: ['lat_pulldown', 'assisted_pullup', 'plate_pulldown', 'close_grip_pulldown', 'single_arm_pulldown'],
      x: ['lat_pulldown', 'pull_up', 'assisted_pullup', 'chin_up', 'close_grip_pulldown', 'single_arm_pulldown', 'straight_arm_pulldown'],
      f: ['pull_up', 'chin_up', 'lat_pulldown', 'assisted_pullup', 'straight_arm_pulldown'] },
    h_pull: { m: ['seated_row', 'machine_row', 'plate_row', 'single_arm_cable_row', 'chest_supported_db_row', 'one_arm_db_row'],
      x: ['one_arm_db_row', 'seated_row', 'chest_supported_db_row', 'barbell_row', 't_bar_row', 'machine_row', 'plate_row'],
      f: ['barbell_row', 'one_arm_db_row', 't_bar_row', 'chest_supported_db_row', 'meadows_row', 'landmine_row', 'inverted_row'] },
    biceps: { m: ['machine_curl', 'cable_curl', 'db_curl', 'hammer_curl'], x: ['db_curl', 'cable_curl', 'ez_bar_curl', 'hammer_curl', 'incline_db_curl', 'preacher_curl'], f: ['ez_bar_curl', 'db_curl', 'hammer_curl', 'incline_db_curl', 'preacher_curl'] },
    triceps: { m: ['tricep_machine', 'cable_pushdown', 'assisted_dip', 'db_kickback'], x: ['cable_pushdown', 'overhead_cable_extension', 'db_overhead_extension', 'skull_crusher', 'tricep_machine'], f: ['skull_crusher', 'close_grip_bench', 'cable_pushdown', 'overhead_cable_extension', 'db_overhead_extension'] },
    core: { m: ['dead_bug', 'plank', 'bird_dog', 'side_plank', 'ab_crunch_machine', 'pallof_press', 'crunch', 'reverse_crunch'],
      x: ['pallof_press', 'cable_crunch', 'knee_raise', 'side_plank', 'plank', 'ab_crunch_machine', 'woodchop', 'hanging_knee_raise'],
      f: ['hanging_leg_raise', 'ab_wheel', 'cable_crunch', 'pallof_press', 'knee_raise', 'woodchop', 'landmine_rotation'] },
  };
  // Unlisted moves fall in after the list, steadiest kit first.
  const KIND_RANK = {
    m: { machine: 0, plate: 1, cable: 1, smith: 2, body: 3, free: 4, barbell: 9 },
    x: { free: 0, machine: 1, plate: 1, cable: 1, smith: 2, barbell: 2, body: 3 },
    f: { barbell: 0, free: 1, cable: 2, body: 2, smith: 3, plate: 3, machine: 4 },
  };

  Object.assign(D, { EX, EQUIP, EQUIP_NAME, MUSCLES, PATTERNS, PREF, KIND_RANK });
})();
