/* Spotter — content and reference data: onboarding options, food, restaurant menus and
   awards. Exercises are in exercises.js, gyms in gyms.js and the coach's conversations in
   coach.js. */
(function () {
  'use strict';

  const COOLDOWN = [
    { name: 'Front of thigh stretch', how: 'Hold a machine for balance and pull one heel toward your glute.', secs: 30 },
    { name: 'Hamstring stretch', how: 'Sit with one leg straight and reach toward your toes.', secs: 30 },
    { name: 'Chest stretch', how: 'Forearm on a doorway or upright, turn gently away.', secs: 30 },
    { name: 'Child’s pose', how: 'Knees wide on a mat, sit back on your heels, arms long.', secs: 30 },
  ];

  // ── Onboarding options ────────────────────────────────────────────────────
  // lvl: who sees it (1 = new to the gym, 3 = lifts regularly); no lvl means everyone.
  const GOALS = [
    { id: 'event', label: 'A holiday or big event', icon: 'plane' },
    { id: 'muscle', label: 'Building muscle', icon: 'dumbbell' },
    { id: 'strong', label: 'Getting stronger', icon: 'bolt' },
    { id: 'fat', label: 'Losing some body fat', icon: 'flame' },
    { id: 'energy', label: 'More energy', icon: 'sun' },
    { id: 'confidence', label: 'Confidence in the gym', icon: 'shield', upTo: 1 },
    { id: 'health', label: 'Looking after my health', icon: 'heart' },
  ];
  const FEELS = ['Confident', 'Strong', 'Energetic', 'Proud of myself', 'Comfortable in my clothes', 'Relaxed', 'Healthy', 'Ready for anything'];
  const EXPERIENCE = [
    { id: 'never', label: 'Never', sub: 'This is all new to me', lvl: 1 },
    { id: 'little', label: 'A little', sub: 'I’ve tried, but it never stuck', lvl: 1 },
    { id: 'regular', label: 'On and off', sub: 'I know my way around the main machines', lvl: 2 },
    { id: 'lifter', label: 'I lift regularly', sub: 'I train most weeks and know the big lifts', lvl: 3 },
  ];
  // What gets in the way depends on how long you've been at it.
  const WORRIES = {
    1: [
      { id: 'what', label: 'Not knowing what to do' },
      { id: 'machines', label: 'Working out the machines' },
      { id: 'watched', label: 'Feeling watched' },
      { id: 'busy', label: 'Machines being taken' },
      { id: 'motivation', label: 'Staying motivated' },
      { id: 'time', label: 'Finding the time' },
      { id: 'food', label: 'Knowing what to eat' },
    ],
    2: [
      { id: 'program', label: 'No real plan, I just wing it' },
      { id: 'time', label: 'Not enough time' },
      { id: 'consistency', label: 'Staying consistent' },
      { id: 'plateau', label: 'My progress has stalled' },
      { id: 'bored', label: 'Bored of the same routine' },
      { id: 'form', label: 'Not sure my form is right' },
      { id: 'busy', label: 'Equipment taken at peak times' },
      { id: 'food', label: 'Eating to match my training' },
    ],
    3: [
      { id: 'time', label: 'Not enough time' },
      { id: 'efficient', label: 'Getting the most out of a short session' },
      { id: 'plateau', label: 'Stuck at the same weights' },
      { id: 'program', label: 'Need a proper program to follow' },
      { id: 'bored', label: 'Same routine for too long' },
      { id: 'busy', label: 'Equipment taken at peak times' },
      { id: 'recovery', label: 'Recovering between sessions' },
      { id: 'food', label: 'Eating to match my training' },
    ],
  };
  // Areas an experienced lifter can bring up.
  const FOCUS = [
    { id: 'glutes', label: 'Glutes' }, { id: 'legs', label: 'Legs' }, { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back' },
    { id: 'shoulders', label: 'Shoulders' }, { id: 'arms', label: 'Arms' }, { id: 'core', label: 'Core' },
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
  // What to ask for when ordering each pick.
  const MODS = {
    "Grilled chicken, rocket and parmesan salad": ["Dressing on the side", "Go easy on the parmesan", "Add grilled veg"],
    "Spaghetti marinara": ["Half serve of pasta", "Extra seafood", "Side salad instead of bread"],
    "Minestrone": ["No extra parmesan", "Skip the bread basket"],
    "Thin-crust margherita, shared": ["Thin base", "Light on the cheese", "Rocket on top"],
    "Chicken and rocket salad": ["Dressing on the side", "Extra chicken"],
    "Prosciutto and rocket thin crust": ["Thin base", "Light on the cheese"],
    "Sashimi set with salad": ["Small rice on the side", "Dressing on the side"],
    "Chicken teriyaki bento": ["Sauce on the side", "Half rice, extra salad"],
    "Edamame": ["Light on the salt"],
    "Shio or shoyu ramen with chicken": ["Extra greens", "Half noodles", "No extra fat or butter"],
    "Chicken karaage, small serve": ["Lemon instead of mayo"],
    "Chicken larb": ["Rice on the side", "Extra lettuce cups"],
    "Tom yum with prawns": ["Clear soup, not creamy", "Extra prawns"],
    "Chicken and vegetable stir-fry": ["Less oil", "Steamed rice, not fried", "Extra veg"],
    "Steamed fish with ginger and shallot": ["Steamed rice, not fried", "Light on the oil"],
    "Steamed dumplings": ["Steamed, not pan-fried", "Vinegar instead of chilli oil"],
    "Chicken pho": ["Extra herbs and sprouts", "Breast meat", "Go easy on the hoisin"],
    "Fresh rice paper rolls": ["Sauce on the side", "Extra prawn or chicken"],
    "Lemongrass chicken vermicelli salad": ["Dressing on the side", "No spring roll on top"],
    "Tandoori chicken with salad": ["Raita instead of a creamy sauce", "Extra salad"],
    "Dal with plain rice": ["Plain rice, not pilau", "Small rice serve"],
    "Plain roti": ["No butter on top"],
    "Chicken burrito bowl": ["No sour cream", "Extra salsa", "Half rice, extra beans"],
    "Grilled fish tacos": ["Grilled, not fried", "Light on the mayo"],
    "Chicken fajitas": ["Extra veg", "Salsa instead of cheese"],
    "Chicken shish plate with salad": ["Tabouli instead of chips", "Garlic sauce on the side", "Half the bread"],
    "Chicken shawarma salad bowl": ["Garlic sauce on the side", "Extra salad", "No chips"],
    "Tabouli and hummus": ["Veg sticks instead of extra bread"],
    "Chicken souvlaki plate with Greek salad": ["One pita", "Tzatziki instead of chips", "Light on the oil"],
    "Grilled octopus or fish": ["Salad instead of chips", "Lemon instead of butter"],
    "Horiatiki (Greek salad)": ["Half the feta", "Dressing on the side"],
    "Bibimbap": ["Gochujang on the side", "Half rice", "Extra veg"],
    "Bulgogi with lettuce wraps": ["Extra lettuce", "Small rice"],
    "Soft tofu stew": ["Small rice", "Mild if you like"],
    "Grilled barramundi with salad": ["Salad or veg instead of chips", "Sauce on the side"],
    "Chicken Caesar salad": ["Dressing on the side", "Hold the croutons", "Extra chicken"],
    "Steak with vegetables": ["Sauce on the side", "Veg instead of chips"],
    "Grilled chicken burger": ["No mayo", "Extra salad", "Salad instead of fries"],
    "Burger in a lettuce wrap": ["No bun", "Extra tomato and pickles"],
    "Single beef burger with a side salad": ["Single patty", "One slice of cheese", "Salad instead of fries"],
    "Quarter chicken with salad": ["Breast quarter", "Salad instead of chips", "Skip the skin"],
    "Chicken breast and tabouli": ["Garlic sauce on the side", "Extra tabouli"],
    "Chicken wrap": ["Extra salad", "Light sauce", "No chips inside"],
    "Eggs on sourdough with spinach": ["Poached", "Light on the butter", "Add avocado"],
    "Smashed avo with poached eggs": ["An extra egg", "Hold the feta"],
    "Greek yoghurt, berries and granola": ["Granola on the side", "Extra berries"],
  };
  Object.keys(MENUS).forEach((k) => MENUS[k].items.forEach((it) => { if (it.t === 'pick' && MODS[it.n]) it.mods = MODS[it.n]; }));
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
    { id: 'stronger', name: 'First PR', desc: 'Beat your best on an exercise.', icon: 'up', metal: 'silver' },
    { id: 'pr10', name: 'Record Breaker', desc: 'Ten personal records.', icon: 'bolt', metal: 'gold' },
    { id: 'dialled', name: 'Dialled In', desc: 'Saved your settings on a machine.', icon: 'sliders', metal: 'silver' },
    { id: 'smartorder', name: 'Smart Order', desc: 'Ate out with a plan.', icon: 'fork', metal: 'silver' },
    { id: 'streak3', name: 'Three-Week Streak', desc: 'Three weeks in a row on target.', icon: 'flame', metal: 'gold' },
    { id: 'ten', name: '10 Sessions', desc: 'Ten sessions done.', icon: 'trophy', metal: 'gold' },
    { id: 'halfway', name: 'Halfway', desc: 'Half your plan done.', icon: 'flag', metal: 'silver' },
    { id: 'finish', name: 'Finish Line', desc: 'Every session in your plan.', icon: 'trophy', metal: 'platinum' },
  ];

  const DEFAULT_REWARDS = { 2: 'Your favourite coffee and cake', 4: 'A movie night, your pick', 6: 'New gym shoes' };

  window.SpotterData = {
    COOLDOWN, GOALS, FEELS, EXPERIENCE, WORRIES, FOCUS, TIMES,
    CUISINES, DERAILERS, MEALS, MENUS, CUISINE_KEYS, MOMENTS, SCREENING, AWARDS, DEFAULT_REWARDS,
  };
})();
