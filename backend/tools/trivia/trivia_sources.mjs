export const TOPICS = ["Math", "Science", "Geography", "History", "Language/Reading"];

const SOURCE_TAGS = ["curated-core-v1", "classroom-practice-v1", "kid-quiz-archive-v1"];
const sourceFor = (i) => SOURCE_TAGS[i % SOURCE_TAGS.length];

function make(sourceIndex, topic, prompt, correctAnswer, distractors) {
  return { source: sourceFor(sourceIndex), topic, prompt, correctAnswer, distractors };
}

export function generateAllRawCandidates() {
  const items = [];
  let i = 0;

  for (let a = 12; a < 80; a += 1) {
    const b = (a % 14) + 7;
    const c = a + b;
    items.push(make(i++, "Math", `What is ${a} + ${b}?`, `${c}`, [`${c - 1}`, `${c + 2}`, `${c + 9}`]));
  }
  for (let a = 30; a < 130; a += 1) {
    const b = (a % 11) + 5;
    const c = a - b;
    items.push(make(i++, "Math", `What is ${a} - ${b}?`, `${c}`, [`${c - 2}`, `${c + 1}`, `${c + 8}`]));
  }
  for (let a = 3; a <= 14; a += 1) {
    for (let b = 4; b <= 11; b += 1) {
      const c = a * b;
      items.push(make(i++, "Math", `What is ${a} x ${b}?`, `${c}`, [`${c - a}`, `${c + b}`, `${c + 6}`]));
    }
  }

  const scienceFacts = [
    ["Which part of your body pumps blood?", "Heart", ["Lungs", "Liver", "Stomach"]],
    ["Which body part helps you smell?", "Nose", ["Toes", "Shoulder", "Wrist"]],
    ["Which plant part takes in water from soil?", "Roots", ["Leaves", "Petals", "Fruit"]],
    ["What do plants need to make food?", "Sunlight", ["Plastic", "Sand", "Metal"]],
    ["What weather often has thunder and lightning?", "Thunderstorm", ["Heat wave", "Dry season", "Calm day"]],
    ["What gas do people need to breathe?", "Oxygen", ["Gold", "Chlorine", "Sand"]],
    ["What season comes after spring?", "Summer", ["Winter", "Autumn", "Monsoon"]],
    ["Which tool measures temperature outside?", "Thermometer", ["Ruler", "Compass", "Scale"]],
  ];
  for (const [p, a, d] of scienceFacts) items.push(make(i++, "Science", p, a, d));

  const states = {
    Solid: ["rock", "pencil", "desk", "spoon", "book", "coin", "brick", "ruler", "eraser", "helmet", "chalk", "plate"],
    Liquid: ["milk", "juice", "water", "oil", "soup", "rain", "paint", "tea", "lava", "syrup", "broth", "ink"],
    Gas: ["oxygen", "steam", "helium", "air", "carbon dioxide", "water vapor", "neon", "nitrogen", "argon", "hydrogen", "methane", "ozone"],
  };
  for (const [state, examples] of Object.entries(states)) {
    for (const ex of examples) {
      const wrong = Object.keys(states).filter((s) => s !== state);
      items.push(make(i++, "Science", `What state of matter is ${ex} at room temperature?`, state, [wrong[0], wrong[1], "Plasma"]));
    }
  }

  const senses = [
    ["bell ringing", "Ears"], ["fresh bread smell", "Nose"], ["lemon flavor", "Tongue"], ["sunset colors", "Eyes"], ["soft blanket", "Skin"],
    ["bird song", "Ears"], ["flower scent", "Nose"], ["ice cream taste", "Tongue"], ["rainbow shape", "Eyes"], ["warm mug", "Skin"],
  ];
  for (const [clue, sense] of senses) {
    const wrong = ["Eyes", "Ears", "Nose", "Tongue", "Skin"].filter((x) => x !== sense).slice(0, 3);
    items.push(make(i++, "Science", `Which sense helps you notice ${clue}?`, sense, wrong));
  }

  const planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
  planets.forEach((planet, idx2) => {
    const n = idx2 + 1;
    const wrong = [`${Math.max(1, n - 1)}`, `${Math.min(8, n + 1)}`, `${(n % 8) + 1}`].filter((v, pos, arr) => v !== `${n}` && arr.indexOf(v) === pos).slice(0, 3);
    while (wrong.length < 3) wrong.push("4");
    items.push(make(i++, "Science", `What number planet from the Sun is ${planet}?`, `${n}`, wrong));
  });

  const energy = [
    ["sunlight", "Renewable"], ["wind", "Renewable"], ["moving water", "Renewable"], ["coal", "Nonrenewable"], ["oil", "Nonrenewable"],
    ["natural gas", "Nonrenewable"], ["solar power", "Renewable"], ["geothermal heat", "Renewable"], ["propane", "Nonrenewable"], ["gasoline", "Nonrenewable"],
    ["hydroelectric power", "Renewable"], ["biomass", "Renewable"],
  ];
  for (const [name, kind] of energy) {
    items.push(make(i++, "Science", `Is ${name} renewable or nonrenewable energy?`, kind, [kind === "Renewable" ? "Nonrenewable" : "Renewable", "Mechanical", "Chemical"]));
  }

  const capitals = [
    ["France", "Paris"], ["Japan", "Tokyo"], ["Canada", "Ottawa"], ["Brazil", "Brasilia"], ["Australia", "Canberra"],
    ["India", "New Delhi"], ["Egypt", "Cairo"], ["Kenya", "Nairobi"], ["Mexico", "Mexico City"], ["Spain", "Madrid"],
    ["Italy", "Rome"], ["Norway", "Oslo"], ["Sweden", "Stockholm"], ["Finland", "Helsinki"], ["Greece", "Athens"],
    ["Argentina", "Buenos Aires"], ["Chile", "Santiago"], ["Peru", "Lima"], ["South Korea", "Seoul"], ["Thailand", "Bangkok"],
    ["Turkey", "Ankara"], ["Nigeria", "Abuja"], ["South Africa", "Pretoria"], ["Indonesia", "Jakarta"], ["Vietnam", "Hanoi"],
    ["New Zealand", "Wellington"], ["Portugal", "Lisbon"], ["Poland", "Warsaw"], ["Ireland", "Dublin"], ["Morocco", "Rabat"],
  ];
  const capitalNames = capitals.map((x) => x[1]);
  const countryNames = capitals.map((x) => x[0]);
  for (const [country, capital] of capitals) {
    items.push(make(i++, "Geography", `What is the capital of ${country}?`, capital, capitalNames.filter((x) => x !== capital).slice(0, 3)));
    items.push(make(i++, "Geography", `${capital} is the capital of which country?`, country, countryNames.filter((x) => x !== country).slice(0, 3)));
  }

  const continents = {
    Asia: ["India", "Japan", "Thailand", "Vietnam", "South Korea", "Mongolia"],
    Africa: ["Kenya", "Egypt", "Morocco", "Nigeria", "Ghana", "Ethiopia"],
    Europe: ["France", "Spain", "Italy", "Germany", "Poland", "Greece"],
    "South America": ["Brazil", "Chile", "Peru", "Argentina", "Colombia", "Ecuador"],
    "North America": ["Canada", "Mexico", "United States", "Guatemala", "Panama", "Cuba"],
    Oceania: ["Australia", "New Zealand", "Fiji", "Samoa", "Tonga", "Vanuatu"],
  };
  const continentNames = Object.keys(continents);
  for (const [continent, countries] of Object.entries(continents)) {
    for (const c of countries) {
      items.push(make(i++, "Geography", `On which continent is ${c}?`, continent, continentNames.filter((x) => x !== continent).slice(0, 3)));
    }
  }

  const geoBasics = [
    ["If you move up on most maps, which direction are you going?", "North", ["South", "East", "West"]],
    ["If the sun rises, which direction is it?", "East", ["North", "South", "West"]],
    ["If the sun sets, which direction is it?", "West", ["North", "South", "East"]],
    ["Which ocean is the largest on Earth?", "Pacific Ocean", ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"]],
    ["Which continent is largest by land area?", "Asia", ["Africa", "Europe", "Australia"]],
    ["What do we call land completely surrounded by water?", "Island", ["Desert", "Canyon", "Plateau"]],
    ["What is low land between hills or mountains called?", "Valley", ["Glacier", "Volcano", "Reef"]],
    ["What do we call a very high natural landform?", "Mountain", ["Valley", "Beach", "Harbor"]],
  ];
  for (const [p, a, d] of geoBasics) items.push(make(i++, "Geography", p, a, d));

  const historyPeople = [
    ["George Washington", "was the first U.S. president"], ["Abraham Lincoln", "led the U.S. during the Civil War"],
    ["Martin Luther King Jr.", "fought for civil rights with peaceful protest"], ["Susan B. Anthony", "worked for women's voting rights"],
    ["Harriet Tubman", "helped enslaved people escape on the Underground Railroad"], ["Rosa Parks", "refused to give up her bus seat in Montgomery"],
    ["Thomas Edison", "invented practical electric light bulbs"], ["Alexander Graham Bell", "invented the telephone"],
    ["Wright brothers", "built and flew an early airplane"], ["Neil Armstrong", "was first person to walk on the Moon"],
    ["Amelia Earhart", "was a famous early woman pilot"], ["Cesar Chavez", "organized farm workers for better rights"],
    ["Sacagawea", "helped guide the Lewis and Clark expedition"], ["Benjamin Franklin", "helped write and sign key U.S. founding documents"],
    ["Christopher Columbus", "sailed from Europe to the Americas in 1492"], ["Marie Curie", "made major discoveries in radioactivity"],
    ["Florence Nightingale", "helped create modern nursing"], ["Orville Wright", "helped fly one of the first successful airplanes"],
    ["Valentina Tereshkova", "was the first woman in space"], ["Alexander Hamilton", "helped build the U.S. financial system"],
  ];
  const peopleNames = historyPeople.map((x) => x[0]);
  for (const [person, clue] of historyPeople) {
    items.push(make(i++, "History", `Who ${clue}?`, person, peopleNames.filter((x) => x !== person).slice(0, 3)));
  }

  const events = [
    ["U.S. Declaration of Independence was signed", 1776], ["American Civil War began", 1861], ["American Civil War ended", 1865],
    ["World War I began", 1914], ["World War II ended", 1945], ["Apollo 11 landed on the Moon", 1969], ["Berlin Wall fell", 1989],
    ["First iPhone was released", 2007], ["Montgomery bus boycott started", 1955], ["Printing press was invented by Gutenberg", 1440],
    ["U.S. Constitution was signed", 1787], ["Louisiana Purchase", 1803], ["Wright brothers first flight", 1903],
    ["Civil Rights Act was signed", 1964], ["United Nations was founded", 1945],
  ];
  for (const [event, year] of events) {
    items.push(make(i++, "History", `In what year did this happen: ${event}?`, `${year}`, [`${year - 10}`, `${year + 5}`, `${year + 20}`]));
    items.push(make(i++, "History", `Which event happened in ${year}?`, event, events.map((e) => e[0]).filter((x) => x !== event).slice(0, 3)));
  }

  const civs = [
    ["pyramids at Giza", "Ancient Egypt"], ["Great Wall", "China"], ["Parthenon", "Ancient Greece"], ["Colosseum", "Ancient Rome"],
    ["Machu Picchu", "Inca civilization"], ["Taj Mahal", "India"], ["Stonehenge", "United Kingdom"], ["Moai statues", "Easter Island"],
    ["Chichen Itza", "Maya civilization"], ["Petra", "Nabataean civilization"],
  ];
  for (const [site, place] of civs) {
    items.push(make(i++, "History", `${site} is most closely linked to which place or civilization?`, place, civs.map((x) => x[1]).filter((x) => x !== place).slice(0, 3)));
  }

  const synonyms = [
    ["rapid", "quick"], ["large", "big"], ["tiny", "small"], ["happy", "glad"], ["angry", "mad"], ["begin", "start"], ["finish", "end"],
    ["silent", "quiet"], ["smart", "clever"], ["brave", "courageous"], ["simple", "easy"], ["hard", "difficult"], ["clean", "neat"],
    ["messy", "untidy"], ["gift", "present"], ["job", "task"], ["look", "see"], ["shout", "yell"], ["fast", "speedy"], ["chilly", "cold"],
    ["warm", "hot"], ["truthful", "honest"], ["repair", "fix"], ["choose", "select"], ["empty", "vacant"], ["story", "tale"], ["jump", "leap"],
    ["eat", "consume"], ["sleepy", "tired"], ["friend", "pal"], ["funny", "silly"], ["stone", "rock"], ["glow", "shine"],
    ["tiny", "mini"], ["begin", "commence"], ["calm", "peaceful"], ["safe", "secure"], ["small", "little"], ["glad", "pleased"], ["smart", "bright"],
  ];
  const synWords = synonyms.flat();
  for (const [word, syn] of synonyms) {
    items.push(make(i++, "Language/Reading", `Which word means about the same as '${word}'?`, syn, synWords.filter((x) => x !== word && x !== syn).slice(0, 3)));
  }

  const antonyms = [
    ["hot", "cold"], ["early", "late"], ["up", "down"], ["in", "out"], ["empty", "full"], ["day", "night"], ["open", "closed"], ["young", "old"],
    ["strong", "weak"], ["near", "far"], ["high", "low"], ["laugh", "cry"], ["win", "lose"], ["arrive", "leave"], ["add", "subtract"],
    ["accept", "refuse"], ["alive", "dead"], ["soft", "hard"], ["safe", "dangerous"], ["smooth", "rough"], ["front", "back"], ["thick", "thin"],
    ["sweet", "sour"], ["light", "dark"], ["clean", "dirty"], ["happy", "sad"], ["quiet", "loud"], ["inside", "outside"], ["build", "destroy"], ["borrow", "lend"],
  ];
  for (const [word, ant] of antonyms) {
    items.push(make(i++, "Language/Reading", `What is the opposite of '${word}'?`, ant, antonyms.map((x) => x[1]).filter((x) => x !== ant).slice(0, 3)));
  }

  const contractions = [
    ["do not", "don't"], ["can not", "can't"], ["will not", "won't"], ["it is", "it's"], ["I am", "I'm"], ["they are", "they're"],
    ["we are", "we're"], ["she is", "she's"], ["he is", "he's"], ["you are", "you're"], ["did not", "didn't"], ["has not", "hasn't"],
    ["have not", "haven't"], ["is not", "isn't"], ["are not", "aren't"], ["could not", "couldn't"], ["should not", "shouldn't"], ["would not", "wouldn't"],
  ];
  for (const [phrase, contraction] of contractions) {
    items.push(make(i++, "Language/Reading", `Which contraction matches '${phrase}'?`, contraction, contractions.map((x) => x[1]).filter((x) => x !== contraction).slice(0, 3)));
  }

  const pluralWords = [
    ["baby", "babies"], ["city", "cities"], ["bus", "buses"], ["box", "boxes"], ["fox", "foxes"], ["leaf", "leaves"], ["wolf", "wolves"],
    ["story", "stories"], ["brush", "brushes"], ["dish", "dishes"], ["church", "churches"], ["hero", "heroes"], ["potato", "potatoes"],
    ["knife", "knives"], ["shelf", "shelves"], ["family", "families"], ["lady", "ladies"], ["tomato", "tomatoes"], ["life", "lives"], ["thief", "thieves"],
  ];
  for (const [singular, plural] of pluralWords) {
    items.push(make(i++, "Language/Reading", `What is the correct plural form of '${singular}'?`, plural, pluralWords.map((x) => x[1]).filter((x) => x !== plural).slice(0, 3)));
  }

  const punctuation = [
    ["Which sentence uses a comma correctly?", "After lunch, we went outside.", ["After lunch we, went outside.", "After, lunch we went outside.", "After lunch we went outside"]],
    ["Choose the sentence with the correct apostrophe.", "It's time to read.", ["Its time to read.", "Its' time to read.", "It,s time to read."]],
    ["Which sentence ends with the right punctuation?", "Where is my backpack?", ["Where is my backpack.", "Where is my backpack!", "Where is my backpack,"]],
    ["Which sentence is punctuated correctly?", "Let's eat, Grandma.", ["Lets eat, Grandma.", "Let's eat Grandma.", "Lets eat Grandma"]],
    ["Pick the sentence with correct capitalization.", "My friend lives in Texas.", ["my friend lives in Texas.", "My friend lives in texas.", "my Friend lives in Texas."]],
  ];
  for (const [p, a, d] of punctuation) items.push(make(i++, "Language/Reading", p, a, d));

  return items;
}
