import { roomCount, validatePlan, type Adventure, type Room, type Setup, type Theme } from "./plan";

export const presets = [
  { topic: "Fractions", title: "The Clockwork Tower", type: "MATHEMATICS", theme: "tower", tagline: "Set a stalled clock back in motion." },
  { topic: "The water cycle", title: "The Glass Conservatory", type: "EARTH SCIENCE", theme: "greenhouse", tagline: "Follow a drop of water through the sky." },
  { topic: "Ancient Egypt", title: "The Scribe’s Archive", type: "HISTORY", theme: "archive", tagline: "Piece together the records of the Nile." },
] as const;

type Lesson = { title: string; setting: string; theme: Theme; premise: string; steps: string[]; facts: string[]; summary: string[]; practice: [string, string, string]; test: [string, string, string]; code: [string, string]; grid: [string, string, string]; };
const lessons: Lesson[] = [
  { title: "The Clockwork Tower", setting: "A forgotten clockmaker’s workshop", theme: "tower", premise: "The academy clock has stopped. The clockmaker left a trail of notes and brass parts through the tower. Restore the mechanism before the town misses another hour.", steps: ["¼", "½", "¾"], facts: ["One of four equal parts", "Two of four equal parts", "Three of four equal parts"], summary: ["The denominator counts equal parts in a whole. The numerator counts the parts you have.", "To compare fractions with the same denominator, compare their numerators.", "Two quarters and one half represent the same amount."], practice: ["Arrange the dial’s fractions from smallest to largest.", "The dial is divided into four equal sectors. ¼ covers one, ½ covers two, and ¾ covers three. Turn the dial from least to most coverage.", "The order is ¼, ½, ¾. Rewriting ½ as 2/4 gives all three fractions the same denominator."], test: ["Write the numerator when ½ + ¼ is expressed in quarters.", "The exit turns through ½ of a circle, then through ¼ more. ½ equals two quarters. Count the quarters altogether.", "3"], code: ["Three gauges show ½, ¼, and ¾. Write the number of quarters shown by each gauge in that exact order.", "213"], grid: ["The exit face has four equal plates. The mechanical sketch reads: northwest ¼, northeast 2/4, southwest ¾, southeast 4/4. Engage the plate equivalent to ½.", "NE", "2/4 simplifies to ½ because both numerator and denominator can be divided by two."] },
  { title: "The Glass Conservatory", setting: "A rain-starved botanical greenhouse", theme: "greenhouse", premise: "The conservatory’s rain engine is dry. Follow the custodian’s field notes to bring its miniature water cycle back to life.", steps: ["Evaporation", "Condensation", "Precipitation"], facts: ["Liquid becomes water vapor", "Water vapor becomes liquid droplets", "Water falls from clouds"], summary: ["Solar energy drives evaporation from water surfaces.", "Cooling water vapor can condense into tiny liquid droplets.", "Precipitation returns water from the atmosphere to the surface."], practice: ["Trace the stages from a sunny pond to falling rain.", "Sunlight warms pond water and some evaporates. The vapor cools and condenses into cloud droplets. When droplets grow large enough, they fall as precipitation.", "Water evaporates, condenses into cloud droplets, and returns as precipitation."], test: ["Vapor from a warmed pond cools and forms droplets. Name the stage you must activate before the droplets fall.", "The engine has already supplied heat for evaporation. Cooling turns vapor into droplets before precipitation begins.", "Condensation"], code: ["The first chamber holds 2 units of water, the next 4, and the third 1. Enter those readings in process order: evaporation, condensation, precipitation.", "241"], grid: ["Choose the plate for the stage that forms cloud droplets. The sketch reads northwest rain, northeast sunlight, southwest cooling vapor, southeast runoff.", "SW", "Cooling vapor forms droplets through condensation. Cloud droplets can later fall as precipitation."] },
  { title: "The Scribe’s Archive", setting: "A sealed gallery beside the Nile", theme: "archive", premise: "A sandstorm has sealed the academy’s Egyptian archive. Recover the scribe’s tablets and restore the farming calendar to lift the stone gate.", steps: ["Flood", "Planting", "Harvest"], facts: ["The Nile leaves fertile silt", "Farmers sow seeds in moist soil", "Farmers gather ripe grain"], summary: ["Annual floods deposited fertile silt along the Nile.", "The receding water gave farmers moist ground for planting.", "The agricultural cycle shaped the ancient Egyptian calendar."], practice: ["Put the three agricultural events in order, beginning with the rising Nile.", "The Nile flooded and deposited silt. After the water receded, farmers planted in the moist ground. They harvested the grain after it ripened.", "Floods came first, planting followed the retreat of the water, and the harvest came after the crops ripened."], test: ["The Nile has receded. Which farming stage follows before harvest?", "Floodwater left fertile silt. The next task, before grain can be gathered, is to sow seeds.", "Planting"], code: ["The flood tablet bears a 4, the planting tablet a 2, and the harvest tablet an 8. Enter the markings from first to last in an agricultural year beginning with the flood.", "428"], grid: ["The gallery sketch reads northwest threshing floor, northeast granary, southwest floodplain, southeast desert road. Choose the place where annual flooding leaves fertile silt for planting.", "SW", "Floodwater spread across the floodplain and deposited silt. After it receded, Egyptians could plant in the moist, fertile ground."] },
  { title: "The Airlock Laboratory", setting: "A quiet chemistry teaching lab", theme: "lab", premise: "The lab’s teaching airlock has jammed. Inspect the sample notes and use their observations to reset the phase-change controls.", steps: ["Solid", "Liquid", "Gas"], facts: ["Keeps its own shape", "Flows and takes a container’s shape", "Expands to fill its container"], summary: ["States of matter differ in how freely particles move.", "Melting changes a solid to a liquid.", "Evaporation changes a liquid to gas at its surface."], practice: ["Order the water samples from ice to steam as heat is added.", "Ice holds its shape until it melts to liquid water. Water molecules can then escape from the liquid surface as vapor.", "Adding heat can take water from solid to liquid to gas."], test: ["Ice has melted. Name the change that allows water molecules to leave the liquid surface as vapor.", "Melting has already turned the solid to liquid. At the surface some molecules can escape and become gas.", "Evaporation"], code: ["Ice is marked 3, liquid water 6, and vapor 2. Enter the markings in the order the samples appear when heating ice to steam.", "362"], grid: ["Select the container holding matter that expands to fill it. The sketch reads northwest ice cube, northeast water, southwest pebble, southeast water vapor.", "SE", "A gas expands to fill its container. A liquid keeps its volume while adapting to the container’s shape."] },
  { title: "The Living Greenhouse", setting: "A sealed ecosystem laboratory", theme: "greenhouse", premise: "The greenhouse’s ecosystem display has lost its power. Trace energy through the living exhibits to restart the model and open the gate.", steps: ["Grass", "Rabbit", "Fox"], facts: ["Makes sugars using light", "Gets energy by eating grass", "Gets energy by eating rabbits"], summary: ["Producers capture light energy and store it in sugars.", "Consumers obtain energy by eating other organisms.", "Food chains track energy transfer from food to eater."], practice: ["Arrange the organisms in the direction energy travels, starting with the producer.", "Grass captures sunlight. The rabbit eats the grass. The fox eats the rabbit.", "Energy flows from grass to rabbit to fox."], test: ["In a chain with grass, rabbits and foxes, which organism transfers energy from the producer to the fox?", "Grass makes sugars and the fox eats the animal that feeds on the grass.", "Rabbit"], code: ["Grass bears a 1, rabbit a 5, and fox a 7. Enter the digits in the direction energy travels.", "157"], grid: ["The exhibit sketch reads northwest fox, northeast rabbit, southwest grass, southeast hawk. Choose the organism that stores light energy and supplies it to a consumer.", "SW", "Grass is a producer. The rabbit obtains some of the energy grass stored by eating it."] },
];

const oceanLesson: Lesson = {
  title: "Below the Light",
  setting: "A research outpost on the edge of the twilight zone",
  theme: "ocean",
  premise: "An overnight power fault has sealed the outpost. Its instruments and observation records still work. Find a route back to the surface.",
  steps: ["Sunlight zone", "Twilight zone", "Midnight zone"],
  facts: ["Enough light for photosynthesis", "Dim sunlight, too weak for photosynthesis", "No sunlight reaches this layer"],
  summary: ["Sunlight fades as ocean depth increases.", "Bioluminescence is light produced by living organisms.", "Oxygen, light and pressure vary across the water column."],
  practice: ["Arrange the survey zones in the order encountered on a descent.", "Sunlight fades with depth. The twilight zone is dim, and the midnight zone gets no sunlight.", "A descent passes through the sunlight, twilight and midnight zones in that order."],
  test: ["An unpowered camera records a flash from a moving organism below the reach of sunlight. What produced the flash?", "The camera lamp was off, and there is no sunlight at the recorded depth. Some marine organisms generate their own light.", "Bioluminescence"],
  code: ["Three tagged sensors carried these badges: midnight 7, sunlight 4, twilight 9. The recorder stores the tags in descent order.", "497"],
  grid: ["The habitat map reads northwest: bright light, northeast: trace daylight, southwest: no daylight, southeast: surface reflections. Which quadrant is the midnight zone?", "SW", "The midnight zone lies below the reach of sunlight."],
};

function buildLesson(lesson: Lesson, setup: Setup): Adventure {
  const [a,b,c] = lesson.steps;
  const items = lesson.theme === "lab" ? ["Brass valve", "Calibration pin", "Sample cartridge", "Relay key"] : lesson.theme === "archive" ? ["Bronze stylus", "Stone seal", "Clay tablet", "Gate token"] : ["Brass gear", "Copper coupler", "Dial spindle", "Exit key"];
  const puzzles: Array<{name: string; note: string; otherClue?: string; puzzle: Room["puzzle"]}> = [
    { name: "The Workshop", note: lesson.practice[1], puzzle: { type: "order", name: "Sequence mechanism", prompt: lesson.practice[0], options: setup.level === "Expert" ? [c,b,a] : [b,c,a], labels: [], solution: [a,b,c], explanation: lesson.practice[2], hints: ["Read the field notes beside the mechanism.", "Find the first entry before placing the others.", "Begin with " + a + ", then place " + b + " before " + c + "."] }},
    { name: "The Study", note: lesson.steps.map((step,i) => step + " — " + lesson.facts[i] + ".").join("\n"), puzzle: { type: "match", name: "Mapping console", prompt: "Match each description to the entry it belongs to.", options: [c,a,b], labels: lesson.facts, solution: [a,b,c], explanation: lesson.summary.join(" "), hints: ["Read the field notes in this room.", "Start with the first description and work down.", "From top to bottom, select " + [a,b,c].join(", ") + "."] }},
    { name: "The Instrument Room", note: lesson.code[0], puzzle: { type: "code", name: "Instrument lock", prompt: "Enter the three-digit combination from the instrument readings.", options: [], labels: [], solution: [lesson.code[1]], explanation: "The three digits follow the order asked for in the instrument notes. " + lesson.practice[2], hints: ["Inspect the field notes for the three readings.", "Enter the digits in the order mentioned in the notes.", "The combination is " + lesson.code[1] + "."] }},
    setup.level === "Expert" || setup.minutes === 15
      ? { name: "The Exit Chamber", note: lesson.grid[0], puzzle: { type: "spatial", name: "Exit plate", prompt: "Choose the plate in the location identified by the sketch in your notes.", options: ["NW","NE","SW","SE"], labels: [], solution: [lesson.grid[1]], explanation: lesson.grid[2], hints: ["Read the sketch in the field notes.", "Find the description that satisfies the sketch’s instruction.", "Engage the " + lesson.grid[1] + " plate."] }}
      : { name: "The Exit Chamber", note: lesson.test[1], puzzle: { type: "text", name: "Exit mechanism", prompt: lesson.test[0], options: [], labels: [], solution: [lesson.test[2]], explanation: lesson.test[1] + " The answer is " + lesson.test[2] + ".", hints: ["Read the field notes and think back to the first mechanism.", "Use the last sentence of the notes to work out the next step.", "Enter " + lesson.test[2] + "."] }},
  ];
  if(lesson.theme==="ocean"){
    puzzles[0].otherClue="The sunlight zone is closest to the surface and has enough light for photosynthesis.";
    puzzles[1]={
      name:"Camera junction",
      note:"The twilight zone gets faint sunlight. The midnight zone gets none.",
      otherClue:"The light needed for photosynthesis reaches the sunlight zone. Only cameras can record a flash.",
      puzzle:{
        type:"switches",name:"Camera power panel",
        prompt:"Power every camera below the reach of enough sunlight for photosynthesis.",
        options:["Sunlight camera","Twilight camera","Midnight camera","Deep pressure gauge","Surface thermometer"],
        labels:[],solution:["Twilight camera","Midnight camera"],
        explanation:"The twilight and midnight zones get too little sunlight for photosynthesis. The gauges and thermometer cannot record a flash.",
        hints:["Read the notes about light in the water.","Look for two cameras below the sunlight zone.","Enable the twilight and midnight cameras."],
      },
    };
    puzzles[3]={
      name:"Ascent channel",
      note:"From the surface down, the water goes from bright to dim to dark.",
      otherClue:"The daylight cameras report light levels. Pumps, gauges, and valves are used for repairs.",
      puzzle:{
        type:"route",name:"Survey router",
        prompt:"Connect the dock to the ascent lock through three daylight cameras in descent order. Skip maintenance equipment.",
        options:["Dock","Bright camera","Dim camera","Pump","Pressure gauge","Dark camera","Spare valve","Battery rack","Ascent lock"],
        labels:[],solution:["Dock","Bright camera","Dim camera","Dark camera","Ascent lock"],
        explanation:"Sunlight gets weaker as water gets deeper, so the survey passes from bright to dim to dark.",
        hints:["Follow the notes on daylight during descent.","Start by going right from the dock.","From the dock, go right, right, down, down."],
      },
    };
  } else if(lesson.theme==="tower"){
    puzzles[3]={
      name:"Counterweight route",
      note:"Equivalent fractions represent the same part of a whole.",
      otherClue:"Divide a fraction’s top and bottom numbers by the same number to simplify it.",
      puzzle:{
        type:"route",name:"Weight transfer grid",
        prompt:"Connect the drive to the exit. Use only plates that equal one half.",
        options:["Drive","2/4","1/6","1/4","3/6","4/8","7/8","2/3","Exit coupling"],
        labels:[],solution:["Drive","2/4","3/6","4/8","Exit coupling"],
        explanation:"The three plates simplify to one half. They form a continuous route from the drive to the exit.",
        hints:["Look for numerators that are half their denominators.","The plate marked 2/4 is next to the drive.","From the drive, choose 2/4, 3/6, 4/8, then Exit coupling."],
      },
    };
  }
  const middle = setup.minutes === 15 ? [puzzles[1],puzzles[2]]
    : setup.minutes === 10 ? [setup.level === "Explorer" && lesson.theme !== "ocean" ? puzzles[2] : puzzles[1]] : [];
  return validatePlan({
    title: lesson.title, setting: lesson.setting, premise: lesson.premise, theme: lesson.theme,
    objectives: lesson.summary, review: [lesson.practice[2], lesson.summary[1]],
    rooms: [puzzles[0], ...middle, puzzles[3]].map((p,i) => ({
      name: p.name, objective: i === roomCount(setup.minutes) - 1 ? "Restore the exit mechanism and escape." : "Find the notes and repair the room’s mechanism.",
      clues: [{ name: "Field notes", text: p.note }, { name: "Mechanic’s log", text:p.otherClue??"The "+items[i].toLowerCase()+" fits the "+p.puzzle.name.toLowerCase()+"." }],
      item: { name: items[i], text: "A missing part for the " + p.puzzle.name.toLowerCase() + "." }, use: "Fit the " + items[i].toLowerCase() + " into the mechanism.",
      stationQuestions: [
        {prompt:`Which entry matches: ${lesson.facts[0]}?`,options:[b,a,c],answer:a,explanation:`${a}: ${lesson.facts[0]}.`},
        {prompt:`Which entry matches: ${lesson.facts[1]}?`,options:[c,b,a],answer:b,explanation:`${b}: ${lesson.facts[1]}.`},
        {prompt:`Which entry matches: ${lesson.facts[2]}?`,options:[a,c,b],answer:c,explanation:`${c}: ${lesson.facts[2]}.`},
        {prompt:`${lesson.practice[0]} Which entry comes first?`,options:[c,a,b],answer:a,explanation:`${a} comes first.`},
      ],
      puzzle: p.puzzle,
    })),
  }, setup.minutes);
}

export function sampleFor(setup: Setup) {
  const t = setup.topic.toLowerCase();
  if(t === "ocean zones")return { plan:buildLesson(oceanLesson,setup),matched:true };
  const index = [/fraction|math/, /water\s*cycle|weather|rain/, /egypt|nile/, /chemistry|phase change|states of matter/, /ecology|ecosystem|food chain|biology/].findIndex(re => re.test(t));
  return { plan: buildLesson(lessons[Math.max(index,0)],setup), matched: index >= 0 };
}
export const defaultSetup: Setup = { topic: "Fractions", level: "Adventurer", minutes: 10 };
