// Built-in exercise library. [name, equipment]
const CATEGORIES = ["Chest","Back","Shoulders","Biceps","Triceps","Forearms","Quads","Hamstrings","Glutes","Calves","Abs","Cardio"];

const RAW = {
  Chest: [
    ["Barbell Bench Press","Barbell"],["Incline Barbell Bench Press","Barbell"],["Decline Barbell Bench Press","Barbell"],
    ["Dumbbell Bench Press","Dumbbell"],["Incline Dumbbell Press","Dumbbell"],["Decline Dumbbell Press","Dumbbell"],
    ["Dumbbell Fly","Dumbbell"],["Incline Dumbbell Fly","Dumbbell"],["Cable Crossover","Cable"],["Low-to-High Cable Fly","Cable"],
    ["High-to-Low Cable Fly","Cable"],["Pec Deck Fly","Machine"],["Machine Chest Press","Machine"],["Smith Machine Bench Press","Machine"],
    ["Push-Up","Bodyweight"],["Chest Dip","Bodyweight"],["Svend Press","Plate"],["Landmine Press","Barbell"]
  ],
  Back: [
    ["Deadlift","Barbell"],["Barbell Row","Barbell"],["Pendlay Row","Barbell"],["T-Bar Row","Barbell"],["One-Arm Dumbbell Row","Dumbbell"],
    ["Chest-Supported Row","Dumbbell"],["Pull-Up","Bodyweight"],["Chin-Up","Bodyweight"],["Wide-Grip Lat Pulldown","Cable"],
    ["Close-Grip Lat Pulldown","Cable"],["Reverse-Grip Lat Pulldown","Cable"],["Seated Cable Row","Cable"],["Straight-Arm Pulldown","Cable"],
    ["Machine Row","Machine"],["Assisted Pull-Up","Machine"],["Hyperextension","Bodyweight"],["Rack Pull","Barbell"],["Face Pull","Cable"],
    ["Dumbbell Pullover","Dumbbell"],["Inverted Row","Bodyweight"],["Meadows Row","Barbell"]
  ],
  Shoulders: [
    ["Overhead Press","Barbell"],["Seated Dumbbell Shoulder Press","Dumbbell"],["Arnold Press","Dumbbell"],["Machine Shoulder Press","Machine"],
    ["Smith Machine Shoulder Press","Machine"],["Dumbbell Lateral Raise","Dumbbell"],["Cable Lateral Raise","Cable"],["Machine Lateral Raise","Machine"],
    ["Dumbbell Front Raise","Dumbbell"],["Plate Front Raise","Plate"],["Rear Delt Fly","Dumbbell"],["Reverse Pec Deck","Machine"],
    ["Cable Rear Delt Fly","Cable"],["Upright Row","Barbell"],["Barbell Shrug","Barbell"],["Dumbbell Shrug","Dumbbell"],["Push Press","Barbell"],["Pike Push-Up","Bodyweight"]
  ],
  Biceps: [
    ["Barbell Curl","Barbell"],["EZ-Bar Curl","Barbell"],["Dumbbell Curl","Dumbbell"],["Alternating Dumbbell Curl","Dumbbell"],["Hammer Curl","Dumbbell"],
    ["Incline Dumbbell Curl","Dumbbell"],["Preacher Curl","Barbell"],["Machine Preacher Curl","Machine"],["Concentration Curl","Dumbbell"],["Cable Curl","Cable"],
    ["Rope Hammer Curl","Cable"],["Spider Curl","Dumbbell"],["Bayesian Cable Curl","Cable"],["Drag Curl","Barbell"],["Zottman Curl","Dumbbell"]
  ],
  Triceps: [
    ["Close-Grip Bench Press","Barbell"],["Skull Crusher","Barbell"],["Dumbbell Skull Crusher","Dumbbell"],["Overhead Dumbbell Extension","Dumbbell"],
    ["Overhead Cable Extension","Cable"],["Triceps Pushdown (Bar)","Cable"],["Triceps Pushdown (Rope)","Cable"],["Reverse-Grip Pushdown","Cable"],
    ["Single-Arm Cable Pushdown","Cable"],["Triceps Dip","Bodyweight"],["Bench Dip","Bodyweight"],["Machine Dip","Machine"],["Dumbbell Kickback","Dumbbell"],
    ["Diamond Push-Up","Bodyweight"],["JM Press","Barbell"]
  ],
  Forearms: [
    ["Wrist Curl","Barbell"],["Reverse Wrist Curl","Barbell"],["Reverse Barbell Curl","Barbell"],["Farmer's Walk","Dumbbell"],["Plate Pinch","Plate"],["Dead Hang","Bodyweight"]
  ],
  Quads: [
    ["Barbell Back Squat","Barbell"],["Barbell Front Squat","Barbell"],["Goblet Squat","Dumbbell"],["Hack Squat","Machine"],["Leg Press","Machine"],
    ["Leg Extension","Machine"],["Bulgarian Split Squat","Dumbbell"],["Walking Lunge","Dumbbell"],["Reverse Lunge","Dumbbell"],["Step-Up","Dumbbell"],
    ["Smith Machine Squat","Machine"],["Sissy Squat","Bodyweight"],["Pendulum Squat","Machine"],["Belt Squat","Machine"],["Box Squat","Barbell"]
  ],
  Hamstrings: [
    ["Romanian Deadlift","Barbell"],["Stiff-Leg Deadlift","Barbell"],["Dumbbell Romanian Deadlift","Dumbbell"],["Lying Leg Curl","Machine"],["Seated Leg Curl","Machine"],
    ["Standing Leg Curl","Machine"],["Nordic Curl","Bodyweight"],["Good Morning","Barbell"],["Glute-Ham Raise","Bodyweight"],["Cable Pull-Through","Cable"]
  ],
  Glutes: [
    ["Barbell Hip Thrust","Barbell"],["Machine Hip Thrust","Machine"],["Glute Bridge","Bodyweight"],["Cable Kickback","Cable"],["Hip Abduction Machine","Machine"],
    ["Sumo Deadlift","Barbell"],["Curtsy Lunge","Dumbbell"],["Frog Pump","Bodyweight"],["Back Extension (Glute Focus)","Bodyweight"]
  ],
  Calves: [
    ["Standing Calf Raise","Machine"],["Seated Calf Raise","Machine"],["Leg Press Calf Raise","Machine"],["Smith Machine Calf Raise","Machine"],
    ["Donkey Calf Raise","Machine"],["Single-Leg Calf Raise","Bodyweight"],["Tibialis Raise","Bodyweight"]
  ],
  Abs: [
    ["Crunch","Bodyweight"],["Cable Crunch","Cable"],["Machine Crunch","Machine"],["Hanging Leg Raise","Bodyweight"],["Hanging Knee Raise","Bodyweight"],
    ["Lying Leg Raise","Bodyweight"],["Ab Wheel Rollout","Equipment"],["Plank","Bodyweight"],["Side Plank","Bodyweight"],["Russian Twist","Bodyweight"],
    ["Cable Woodchop","Cable"],["Decline Sit-Up","Bodyweight"],["Bicycle Crunch","Bodyweight"],["Pallof Press","Cable"],["Dead Bug","Bodyweight"],["Mountain Climber","Bodyweight"]
  ],
  Cardio: [
    ["Treadmill Run","Machine"],["Incline Walk","Machine"],["Stationary Bike","Machine"],["Rowing Machine","Machine"],["Elliptical","Machine"],
    ["Stair Climber","Machine"],["Jump Rope","Equipment"],["Battle Ropes","Equipment"],["Burpee","Bodyweight"],["Kettlebell Swing","Kettlebell"],["Sled Push","Equipment"]
  ]
};

const EXERCISES = [];
for (const cat of CATEGORIES) {
  for (const [name, equipment] of RAW[cat]) {
    EXERCISES.push({
      id: cat.toLowerCase() + ":" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      name, category: cat, equipment
    });
  }
}
