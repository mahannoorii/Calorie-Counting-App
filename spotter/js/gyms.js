/* Spotter — gyms. A directory of gyms around Sydney with what each club and chain is known
   to have. Researched online on 2026-10-13: club pages, chain pages, reviews and club socials.
   Australian club pages list cardio, free weights and functional kit but rarely name
   individual machines, so each gym's equipment comes in layers:
     listed    on that club's own page
     typical   on most of that chain's pages
     STANDARD  nearly every commercial gym floor (assumed, so people can untick it)
     common    at many of that chain's clubs (offered, not assumed)
   Coordinates marked approx are estimated from the street address. */
(function () {
  'use strict';
  const D = window.SpotterData;

  const CHAINS = {
    "snap": {"name": "Snap Fitness","typical": ["treadmill","cross_trainer","bike","dumbbells","barbell","flat_bench","squat_rack","cable_station","kettlebells"],"common": ["leg_press","leg_extension","chest_press_machine","shoulder_press_machine","smith_machine","rower","assault_bike","lifting_platform","trx","plyo_box","medicine_ball","bands","battle_ropes","boxing_bag"],"classOnly": false,"confidence": "medium","brands": ["Matrix","Life Fitness","Hammer Strength","Technogym"]},
    "fitnessfirst": {"name": "Fitness First","typical": ["treadmill","cross_trainer","rower","spin_bike","dumbbells","kettlebells","medicine_ball","barbell","squat_rack","cable_station","cable_crossover","leg_press","lat_pulldown","chest_press_machine"],"common": ["smith_machine","leg_curl_lying","leg_curl_seated","hip_thrust_machine","lifting_platform","sled","battle_ropes","plyo_box","boxing_bag"],"classOnly": false,"confidence": "medium","brands": ["Technogym","Booty Builder"]},
    "plus": {"name": "Plus Fitness","typical": ["cross_trainer","rower","stairs","bike","spin_bike","assault_bike","dumbbells","barbell","squat_rack","kettlebells","trx","medicine_ball","bosu"],"common": ["treadmill","ski_erg","lifting_platform","battle_ropes","sled","boxing_bag","cable_station","cable_crossover","flat_bench","leg_press","lat_pulldown","chest_press_machine","ab_crunch_machine"],"classOnly": false,"confidence": "high","brands": ["Hammer Strength","Life Fitness","Technogym","Nautilus"]},
    "jetts": {"name": "Jetts","typical": ["treadmill","rower","bike","cross_trainer","dumbbells","barbell","squat_rack","cable_station","kettlebells","leg_press","lat_pulldown","seated_row_machine","mats"],"common": ["assisted_pullup","sled","battle_ropes","plyo_box"],"classOnly": false,"confidence": "medium","brands": []},
    "goodlife": {"name": "Goodlife Health Clubs","typical": ["dumbbells","squat_rack"],"common": ["smith_machine","lat_pulldown","kettlebells","sled","lifting_platform","spin_bike"],"classOnly": false,"confidence": "low","brands": []},
    "virgin": {"name": "Virgin Active","typical": ["treadmill","bike","rower","ski_erg","dumbbells","kettlebells","barbell","lifting_platform","mats"],"common": ["spin_bike","squat_rack","flat_bench"],"classOnly": false,"confidence": "medium","brands": ["Technogym","Eleiko"]},
    "worldgym": {"name": "World Gym","typical": ["dumbbells","barbell","squat_rack","lifting_platform","cable_station"],"common": ["kettlebells","battle_ropes","hip_thrust_machine"],"classOnly": false,"confidence": "medium","brands": ["Hammer Strength","Life Fitness","Panatta","Cybex","Matrix","Gym80","Booty Builder","NewTech"]},
    "pcyc": {"name": "PCYC","typical": ["dumbbells"],"common": ["barbell","squat_rack","flat_bench","cable_station","boxing_bag"],"classOnly": false,"confidence": "low","brands": []},
    "crunch": {"name": "Crunch Fitness","typical": ["treadmill","bike","rower","cross_trainer","stairs","assault_bike","ski_erg","dumbbells","barbell","squat_rack","lifting_platform","cable_station","kettlebells","battle_ropes","sled","trx","mats"],"common": ["smith_machine","hip_thrust_machine","leg_press","boxing_bag"],"classOnly": false,"confidence": "high","brands": ["Star Trac","Hammer Strength"]},
    "revo": {"name": "Revo Fitness","typical": ["squat_rack","dumbbells"],"common": [],"classOnly": false,"confidence": "low","brands": []},
    "evo": {"name": "EVO Fitness","typical": [],"common": [],"classOnly": false,"confidence": "none","brands": []},
    "genesis": {"name": "Genesis Health + Fitness","typical": [],"common": [],"classOnly": false,"confidence": "none","brands": []},
    "f45": {"name": "F45 Training","typical": ["dumbbells","kettlebells","plyo_box","medicine_ball","bands","rower"],"common": ["assault_bike","ski_erg","battle_ropes","barbell","sled"],"classOnly": true,"confidence": "unverified","brands": []},
    "orangetheory": {"name": "Orangetheory Fitness","typical": ["treadmill","rower","dumbbells","trx"],"common": ["bike","bosu","medicine_ball"],"classOnly": true,"confidence": "unverified","brands": []},
    "anytime": {"name": "Anytime Fitness","typical": ["treadmill","cross_trainer","bike","rower","spin_bike","stairs","squat_rack","barbell","dumbbells","medicine_ball","bosu","bands","jump_rope"],"common": ["kettlebells","trx","battle_ropes","plyo_box"],"classOnly": false,"confidence": "medium","brands": []},
    "independent": {"name": "Independent gym","typical": [],"common": [],"classOnly": false,"confidence": "none","brands": []}
  };

  // Equipment nearly every commercial gym has, whatever the chain lists.
  const STANDARD = ['treadmill', 'bike', 'cross_trainer', 'rower', 'dumbbells', 'flat_bench', 'adjustable_bench', 'mats',
    'cable_station', 'lat_pulldown', 'seated_row_machine', 'chest_press_machine', 'shoulder_press_machine', 'leg_press',
    'leg_extension', 'leg_curl_seated', 'pec_deck', 'hip_abduction', 'hip_adduction', 'smith_machine', 'pullup_bar',
    'ez_bar', 'barbell', 'squat_rack'];
  // A starting point for a home or apartment gym.
  const HOME = ['dumbbells', 'adjustable_bench', 'bands', 'mats'];

  const GYMS = [
    {"id": "anytime-fitness-rouse-hill-town-centre","chain": "anytime","name": "Anytime Fitness Rouse Hill Town Centre","short": "Rouse Hill Town Centre","suburb": "Rouse Hill","address": "Shop D-LS 109, Level 1, Rouse Hill Town Centre, cnr Main Street & Link Lane","lat": -33.6886,"lng": 150.9238,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/rouse-hill-town-centre-new-south-wales-au-1075"},
    {"id": "anytime-fitness-rouse-hill-north","chain": "anytime","name": "Anytime Fitness Rouse Hill North","short": "Rouse Hill North","suburb": "Rouse Hill","address": "Unit 4/593 Withers Rd, Rouse Hill NSW 2155","lat": -33.6734,"lng": 150.92056,"url": "https://www.anytimefitness.com/en-au/locations/rouse-hill-north-new-south-wales-au-1598/","legacy": "af-rhn","listed": ["treadmill","cross_trainer","bike","stairs","rower","spin_bike","squat_rack","barbell","dumbbells","kettlebells","trx","battle_ropes","medicine_ball","plyo_box","bosu","bands","jump_rope"],"extra": [["Hammer Strength plate-loaded machines","the club’s TikTok",["plate_loaded_chest","plate_loaded_row"]],["At least one cable machine","a member review",["cable_station"]]]},
    {"id": "anytime-fitness-north-kellyville","chain": "anytime","name": "Anytime Fitness North Kellyville","short": "North Kellyville","suburb": "North Kellyville","address": "Woolworths Kellyville North, cnr Hezlett & Withers Roads, North Kellyville NSW 2155","lat": -33.68594,"lng": 150.95191,"url": "https://www.anytimefitness.com/en-au/locations/north-kellyville-new-south-wales-au-1506","legacy": "af-nk","listed": ["treadmill","cross_trainer","bike","stairs","rower","spin_bike","squat_rack","barbell","dumbbells","kettlebells","trx","battle_ropes","medicine_ball","plyo_box","bosu","bands","jump_rope"]},
    {"id": "anytime-fitness-kellyville","chain": "anytime","name": "Anytime Fitness Kellyville","short": "Kellyville","suburb": "Kellyville","address": "Shop C1, Kellyville Grove, cnr Severn Vale Drive & Memorial Avenue","lat": -33.7168,"lng": 150.942,"approx": 1,"url": "https://www.anytimefitness.com.au/gyms/au-1673/kellyville-nsw-2155/"},
    {"id": "anytime-fitness-box-hill","chain": "anytime","name": "Anytime Fitness Box Hill","short": "Box Hill","suburb": "Box Hill","address": "Homestead Centre, 4 Terry Rd, Box Hill NSW 2765","lat": -33.6589,"lng": 150.894,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/box-hill-new-south-wales-au-1714","legacy": "af-bh","listed": ["treadmill","cross_trainer","bike","stairs","rower","spin_bike","squat_rack","barbell","dumbbells","kettlebells","trx","battle_ropes","medicine_ball","plyo_box","bosu","bands","jump_rope"]},
    {"id": "anytime-fitness-stanhope-gardens","chain": "anytime","name": "Anytime Fitness Stanhope Gardens","short": "Stanhope Gardens","suburb": "Stanhope Gardens","address": "Shop T21-22, Stanhope Village Shopping Centre, 2 Sentry Drive","lat": -33.7158,"lng": 150.9288,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/stanhope-gardens-new-south-wales-au-1786"},
    {"id": "anytime-fitness-norwest","chain": "anytime","name": "Anytime Fitness Norwest","short": "Norwest","suburb": "Norwest","address": "Shop 3, 1-3 Meridian Place","lat": -33.734,"lng": 150.9565,"approx": 1,"url": "https://www.anytimefitness.com.au/gyms/au-1448/norwest-nsw-2153/"},
    {"id": "anytime-fitness-castle-hill","chain": "anytime","name": "Anytime Fitness Castle Hill","short": "Castle Hill","suburb": "Castle Hill","address": "Unit 7, 10 Hudson Avenue","lat": -33.73142,"lng": 150.97338,"url": "https://www.anytimefitness.com.au/gyms/au-1090/castle-hill-nsw-2154/"},
    {"id": "anytime-fitness-castle-hill-central","chain": "anytime","name": "Anytime Fitness Castle Hill Central","short": "Castle Hill Central","suburb": "Castle Hill","address": "265 Old Northern Road","lat": -33.73414,"lng": 151.00405,"url": "https://www.anytimefitness.com.au/gyms/au-1449/castle-hill-nsw-2154/"},
    {"id": "anytime-fitness-baulkham-hills","chain": "anytime","name": "Anytime Fitness Baulkham Hills","short": "Baulkham Hills","suburb": "Baulkham Hills","address": "21-23 Old Northern Road","lat": -33.7608,"lng": 150.9958,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/baulkham-hills-new-south-wales-au-1114"},
    {"id": "anytime-fitness-quakers-hill","chain": "anytime","name": "Anytime Fitness Quakers Hill","short": "Quakers Hill","suburb": "Quakers Hill","address": "Shop 4, 216 Farnham Road","lat": -33.7332,"lng": 150.885,"approx": 1,"url": "https://www.anytimefitness.com.au/gyms/au-1132/quakers-hill-nsw-2763/"},
    {"id": "anytime-fitness-riverstone","chain": "anytime","name": "Anytime Fitness Riverstone","short": "Riverstone","suburb": "Riverstone","address": "cnr Pitt Street & Mill Street","lat": -33.6783,"lng": 150.8618,"approx": 1,"url": "https://www.anytimefitness.com.au/gyms/au-1557/riverstone-nsw-2765/"},
    {"id": "anytime-fitness-marsden-park","chain": "anytime","name": "Anytime Fitness Marsden Park","short": "Marsden Park","suburb": "Marsden Park","address": "17/43 Hollinsworth Road (HomeCo Marsden Park)","lat": -33.7012,"lng": 150.8405,"approx": 1,"url": "https://www.anytimefitness.com.au/gyms/au-1377/marsden-park-nsw-2765/"},
    {"id": "anytime-fitness-blacktown","chain": "anytime","name": "Anytime Fitness Blacktown","short": "Blacktown","suburb": "Blacktown","address": "Shop C1, Blacktown Mega Centre, 14 St Martins Crescent","lat": -33.7625,"lng": 150.911,"approx": 1,"url": "https://www.anytimefitness.com.au/gyms/au-1024/blacktown-nsw-2148/"},
    {"id": "anytime-fitness-parramatta-central","chain": "anytime","name": "Anytime Fitness Parramatta Central","short": "Parramatta Central","suburb": "Parramatta","address": "12 Union Street","lat": -33.817,"lng": 151.0028,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/parramatta-new-south-wales-au-1873"},
    {"id": "anytime-fitness-parramatta-south","chain": "anytime","name": "Anytime Fitness Parramatta South","short": "Parramatta South","suburb": "Parramatta","address": "37-39 Cowper Street","lat": -33.8262,"lng": 151.0048,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/parramatta-new-south-wales-au-1484"},
    {"id": "anytime-fitness-north-parramatta","chain": "anytime","name": "Anytime Fitness North Parramatta","short": "North Parramatta","suburb": "North Parramatta","address": "7-9 Victoria Road","lat": -33.8073,"lng": 151.002,"approx": 1,"url": "https://www.anytimefitness.com/en-au/locations/north-parramatta-new-south-wales-au-1110"},
    {"id": "snap-fitness-north-kellyville","chain": "snap","name": "Snap Fitness North Kellyville","short": "North Kellyville","suburb": "North Kellyville","address": "1/53 Indwarra Avenue","lat": -33.692,"lng": 150.9455,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/north-kellyville"},
    {"id": "snap-fitness-beaumont-hills","chain": "snap","name": "Snap Fitness Beaumont Hills","short": "Beaumont Hills","suburb": "Beaumont Hills","address": "Shop 15, Beaumont Village, 70 The Parkway","lat": -33.6995,"lng": 150.9395,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/beaumont-hills"},
    {"id": "snap-fitness-box-hill","chain": "snap","name": "Snap Fitness Box Hill","short": "Box Hill","suburb": "Box Hill","address": "Level 1, Shop 31, Carmel Village Shopping Centre, cnr Windsor Road & Mount Carmel Drive","lat": -33.666,"lng": 150.883,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/box-hill"},
    {"id": "snap-fitness-castle-hill","chain": "snap","name": "Snap Fitness Castle Hill","short": "Castle Hill","suburb": "Castle Hill","address": "Shop 126, Castle Mall, 2-16 Terminus Street","lat": -33.732,"lng": 151.0058,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/castle-hill"},
    {"id": "snap-fitness-marsden-park","chain": "snap","name": "Snap Fitness Marsden Park","short": "Marsden Park","suburb": "Marsden Park","address": "2 Ultimo Place","lat": -33.7045,"lng": 150.8445,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/marsden-park"},
    {"id": "snap-fitness-elara","chain": "snap","name": "Snap Fitness Elara","short": "Elara","suburb": "Marsden Park","address": "T11 Building 1, 111 Elara Boulevard","lat": -33.6935,"lng": 150.828,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/elara"},
    {"id": "snap-fitness-blacktown","chain": "snap","name": "Snap Fitness Blacktown","short": "Blacktown","suburb": "Blacktown","address": "92 Main Street","lat": -33.768,"lng": 150.9093,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/blacktown"},
    {"id": "snap-fitness-winston-hills","chain": "snap","name": "Snap Fitness Winston Hills","short": "Winston Hills","suburb": "Winston Hills","address": "Winston Hills Mall, 180-192 Caroline Chisholm Drive","lat": -33.7772,"lng": 150.9805,"approx": 1,"url": "https://www.winstonhillsmall.com.au/directory/snap-fitness"},
    {"id": "snap-fitness-seven-hills","chain": "snap","name": "Snap Fitness Seven Hills","short": "Seven Hills","suburb": "Seven Hills","address": "20 Distribution Place","lat": -33.7705,"lng": 150.944,"approx": 1,"url": "https://www.localfitness.com.au/snap-fitness-seven-hills"},
    {"id": "plus-fitness-kellyville","chain": "plus","name": "Plus Fitness Kellyville","short": "Kellyville","suburb": "Kellyville","address": "25 Windsor Road","lat": -33.7205,"lng": 150.963,"approx": 1,"url": "https://www.plusfitness.com.au/gyms/kellyville/"},
    {"id": "plus-fitness-castle-hill","chain": "plus","name": "Plus Fitness Castle Hill","short": "Castle Hill","suburb": "Castle Hill","address": "Shop 2, Super Centre North Building, 18 Victoria Avenue","lat": -33.7255,"lng": 150.9855,"approx": 1,"url": "https://www.plusfitness.com.au/gyms/castle-hill/"},
    {"id": "plus-fitness-blacktown","chain": "plus","name": "Plus Fitness Blacktown","short": "Blacktown","suburb": "Blacktown","address": "Level 1, 40 Third Avenue","lat": -33.7655,"lng": 150.9052,"approx": 1,"url": "https://www.plusfitness.com.au/gyms/blacktown/"},
    {"id": "plus-fitness-parramatta","chain": "plus","name": "Plus Fitness Parramatta","short": "Parramatta","suburb": "Parramatta","address": "181 Macquarie Street","lat": -33.815,"lng": 151.0078,"approx": 1,"url": "https://www.plusfitness.com.au/gyms/parramatta/"},
    {"id": "plus-fitness-north-parramatta","chain": "plus","name": "Plus Fitness North Parramatta","short": "North Parramatta","suburb": "North Parramatta","address": "Shop 9, 20c Victoria Road","lat": -33.807,"lng": 151.0032,"approx": 1,"url": "https://www.plusfitness.com.au/gyms/"},
    {"id": "fitness-first-castle-hill","chain": "fitnessfirst","name": "Fitness First Castle Hill","short": "Castle Hill","suburb": "Castle Hill","address": "Shop 701, Level 3, Castle Towers","lat": -33.731,"lng": 151.004,"approx": 1,"url": "https://www.fitnessfirst.com.au/clubs/castle-hill/"},
    {"id": "fitness-first-parramatta","chain": "fitnessfirst","name": "Fitness First Parramatta","short": "Parramatta","suburb": "Parramatta","address": "57 Macquarie Street","lat": -33.8158,"lng": 151.0005,"approx": 1,"url": "https://www.fitnessfirst.com.au/clubs/parramatta/"},
    {"id": "virgin-active-norwest","chain": "virgin","name": "Virgin Active Norwest","short": "Norwest","suburb": "Norwest","address": "2 Brookhollow Avenue","lat": -33.7315,"lng": 150.9625,"approx": 1,"url": "https://www.virginactive.com.au/locations/Norwest"},
    {"id": "crunch-fitness-parramatta","chain": "crunch","name": "Crunch Fitness Parramatta","short": "Parramatta","suburb": "Parramatta","address": "292 Church Street","lat": -33.8098,"lng": 151.0036,"approx": 1,"url": "https://www.crunch.com.au/our-clubs/parramatta/"},
    {"id": "world-gym-rouse-hill","chain": "worldgym","name": "World Gym Rouse Hill","short": "Rouse Hill","suburb": "Rouse Hill","address": "Unit 1, 2 Capital Place","lat": -33.677,"lng": 150.9165,"approx": 1,"url": "https://www.worldgym.com.au/gyms/rouse-hill"},
    {"id": "world-gym-castle-hill","chain": "worldgym","name": "World Gym Castle Hill","short": "Castle Hill","suburb": "Castle Hill","address": "31 Victoria Avenue","lat": -33.7265,"lng": 150.9825,"approx": 1,"url": "https://www.worldgym.com.au/gyms/castle-hill"},
    {"id": "world-gym-marsden-park","chain": "worldgym","name": "World Gym Marsden Park","short": "Marsden Park","suburb": "Marsden Park","address": "Building 1A, 11 Darling Street","lat": -33.703,"lng": 150.846,"approx": 1,"url": "https://www.worldgym.com.au/gyms/marsden-park"},
    {"id": "world-gym-north-parramatta","chain": "worldgym","name": "World Gym North Parramatta","short": "North Parramatta","suburb": "North Parramatta","address": "The Mills, 1-9 North Rocks Road","lat": -33.7975,"lng": 151.0055,"approx": 1,"url": "https://www.worldgym.com.au/gyms/north-parramatta"},
    {"id": "revo-fitness-castle-hill","chain": "revo","name": "Revo Fitness Castle Hill","short": "Castle Hill","suburb": "Castle Hill","address": "HomeCo Castle Hill, 16-18 Victoria Avenue","lat": -33.726,"lng": 150.985,"approx": 1,"url": "https://revofitness.com.au/?state=nsw"},
    {"id": "genesis-health-fitness-parramatta","chain": "genesis","name": "Genesis Health + Fitness Parramatta","short": "Parramatta","suburb": "North Parramatta","address": "91-95 Fennell Street","lat": -33.8052,"lng": 151.0018,"approx": 1,"url": "https://www.genesisfitness.com.au/gym/nsw/parramatta/contact"},
    {"id": "pcyc-blacktown","chain": "pcyc","name": "PCYC Blacktown","short": "Blacktown","suburb": "Blacktown","address": "30 Second Avenue","lat": -33.7662,"lng": 150.9075,"approx": 1,"url": "https://www.pcycnsw.org.au/blacktown/"},
    {"id": "club-lime-rouse-hill","chain": "independent","name": "Club Lime Rouse Hill","short": "Club Lime Rouse Hill","suburb": "Rouse Hill","address": "Shop 78, 10-14 Market Lane, Rouse Hill Town Centre","lat": -33.6894,"lng": 150.9247,"approx": 1,"url": "https://www.clublime.com.au/location/rouse-hill-gym/"},
    {"id": "live-well-health-clubs-rouse-hill","chain": "independent","name": "Live Well Health Clubs Rouse Hill","short": "Live Well Health Clubs Rouse Hill","suburb": "Rouse Hill","address": "Tenancy 2, 4-6 Commercial Road","lat": -33.6825,"lng": 150.915,"approx": 1,"url": "https://livewellhealthclubs.com.au/rouse-hill/"},
    {"id": "f45-training-the-ponds","chain": "f45","name": "F45 Training The Ponds","short": "The Ponds","suburb": "The Ponds","address": "The Ponds Shopping Centre","lat": -33.7035,"lng": 150.9095,"approx": 1,"classOnly": 1,"url": "https://www.yelp.com/search?cflt=gyms&find_loc=North+Kellyville+New+South+Wales+2155"},
    {"id": "anytime-fitness-circular-quay","chain": "anytime","name": "Anytime Fitness Circular Quay","short": "Circular Quay","suburb": "Sydney","address": "Level 1, 22 Pitt Street, Sydney NSW 2000","lat": -33.86208,"lng": 151.20935,"url": "https://www.anytimefitness.com/en-au/locations/sydney-circular-quay-new-south-wales-au-1476","legacy": "af-cq","listed": ["treadmill","cross_trainer","bike","stairs","rower","spin_bike","squat_rack","barbell","dumbbells","kettlebells","trx","battle_ropes","medicine_ball","plyo_box","bosu","bands","jump_rope"]},
    {"id": "fitness-first-bond-st-platinum","chain": "fitnessfirst","name": "Fitness First Bond St Platinum","short": "Bond St Platinum","suburb": "Sydney","address": "Bond Street","lat": -33.865,"lng": 151.2083,"approx": 1,"url": "https://www.fitnessfirst.com.au/clubs/bond-st-platinum/"},
    {"id": "virgin-active-bligh-street","chain": "virgin","name": "Virgin Active Bligh Street","short": "Bligh Street","suburb": "Sydney","address": "Bligh Street","lat": -33.8655,"lng": 151.211,"approx": 1,"url": "https://www.virginactive.com.au/locations/bligh-street"},
    {"id": "revo-fitness-pitt-st","chain": "revo","name": "Revo Fitness Pitt St","short": "Pitt St","suburb": "Sydney","address": "Shop 5001, Level 5, Westfield Sydney, 188 Pitt Street","lat": -33.8697,"lng": 151.2084,"approx": 1,"url": "https://revofitness.com.au/gyms/pitt-st/"},
    {"id": "world-gym-sydney-cbd","chain": "worldgym","name": "World Gym Sydney CBD","short": "Sydney CBD","suburb": "Sydney","address": "199 Castlereagh Street","lat": -33.8737,"lng": 151.2087,"approx": 1,"url": "https://www.worldgym.com/locations/new-south-wales/"},
    {"id": "snap-fitness-sydney-city","chain": "snap","name": "Snap Fitness Sydney City","short": "Sydney City","suburb": "Sydney","address": "541 George Street","lat": -33.876,"lng": 151.2066,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/sydney-city"},
    {"id": "snap-fitness-haberfield","chain": "snap","name": "Snap Fitness Haberfield","short": "Haberfield","suburb": "Haberfield","address": "155-157 Parramatta Road (car park entry via Rogers Avenue)","lat": -33.883,"lng": 151.137,"approx": 1,"url": "https://www.snapfitness.com/au/gyms/haberfield"}
  ];

  // Suburb centres, so "near Rouse Hill" works without location access (approximate).
  const SUBURBS = {
    "Sydney": [-33.8688, 151.2093],
    "Circular Quay": [-33.8615, 151.2108],
    "Surry Hills": [-33.8861, 151.2111],
    "Pyrmont": [-33.8705, 151.1945],
    "Ultimo": [-33.879, 151.197],
    "Newtown": [-33.8981, 151.179],
    "Enmore": [-33.9003, 151.1726],
    "Erskineville": [-33.903, 151.186],
    "Marrickville": [-33.911, 151.155],
    "Glebe": [-33.879, 151.186],
    "Leichhardt": [-33.8835, 151.1569],
    "Haberfield": [-33.88, 151.138],
    "Ashfield": [-33.888, 151.125],
    "Burwood": [-33.877, 151.104],
    "Strathfield": [-33.88, 151.083],
    "Bondi": [-33.8915, 151.2767],
    "Bondi Junction": [-33.892, 151.248],
    "Mascot": [-33.93, 151.187],
    "Chatswood": [-33.7969, 151.1832],
    "North Sydney": [-33.839, 151.207],
    "Manly": [-33.797, 151.285],
    "Ryde": [-33.815, 151.105],
    "Epping": [-33.772, 151.082],
    "Macquarie Park": [-33.776, 151.124],
    "Hornsby": [-33.702, 151.099],
    "Parramatta": [-33.815, 151.0011],
    "North Parramatta": [-33.799, 151.005],
    "Westmead": [-33.807, 150.987],
    "Winston Hills": [-33.7766, 150.98],
    "Seven Hills": [-33.7744, 150.9363],
    "Blacktown": [-33.771, 150.9063],
    "Baulkham Hills": [-33.76, 150.99],
    "Castle Hill": [-33.73, 151.004],
    "Norwest": [-33.733, 150.96],
    "Bella Vista": [-33.7414, 150.9547],
    "Kellyville": [-33.711, 150.956],
    "North Kellyville": [-33.695, 150.942],
    "Kellyville Ridge": [-33.7, 150.921],
    "Beaumont Hills": [-33.7, 150.94],
    "Rouse Hill": [-33.682, 150.915],
    "The Ponds": [-33.704, 150.907],
    "Stanhope Gardens": [-33.717, 150.929],
    "Glenwood": [-33.735, 150.924],
    "Quakers Hill": [-33.734, 150.885],
    "Schofields": [-33.698, 150.876],
    "Riverstone": [-33.678, 150.86],
    "Marsden Park": [-33.702, 150.838],
    "Box Hill": [-33.644, 150.9],
    "Gables": [-33.628, 150.911],
    "Vineyard": [-33.65, 150.85],
    "Penrith": [-33.751, 150.694],
    "Liverpool": [-33.92, 150.923],
    "Bankstown": [-33.917, 151.034],
    "Hurstville": [-33.967, 151.102],
    "Cronulla": [-34.055, 151.152]
  };

  D.GYMDB = { checked: '2026-10-13', CHAINS, STANDARD, HOME, GYMS, SUBURBS };
})();
