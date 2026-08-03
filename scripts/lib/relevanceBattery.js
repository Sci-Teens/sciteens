// Fixture corpus and query battery for scripts/eval-meilisearch-relevance.js,
// plus the metric functions it reports. Kept dependency-free and separate from
// the runner so the metrics can be unit tested without a Meilisearch instance.
//
// The corpus is synthetic but shaped like the real one: overlapping science
// vocabulary, abbreviations spelled out in abstracts, repeated authors, and a
// wide upvote spread. `relevant` on each query is a human judgement of what a
// visitor typing that query wants back, written before any setting was tuned.
// Some judgements are deliberately unreachable by lexical search (a "robot"
// query cannot find a prosthetic-hand project that never says "robot"), which
// is why the absolute numbers matter less than the delta between two runs.
'use strict'

const CORPUS = [
  {
    id: 'p01',
    title:
      'The Effect of Caffeine on the Heart Rate of Daphnia magna',
    abstract:
      'We measured how varying concentrations of caffeine change the cardiac rhythm of Daphnia magna. Heart rate was counted under a light microscope across five dose groups. Results show a dose dependent increase in beats per minute.',
    fields: ['Biology'],
    members: ['Ada Okafor', 'Liam Chen'],
    upvote_count: 41,
    date: '2024-03-11',
  },
  {
    id: 'p02',
    title:
      'A Study of Artificial Intelligence Models for Early Skin Cancer Detection',
    abstract:
      'We trained a convolutional neural network on dermoscopy images to classify melanoma versus benign lesions. Transfer learning from ResNet reached 91 percent accuracy on a held out test set.',
    fields: ['Computer Science', 'Medicine'],
    members: ['Priya Raman'],
    upvote_count: 128,
    date: '2024-09-02',
  },
  {
    id: 'p03',
    title:
      'Machine Learning Prediction of Air Quality Index in Urban Areas',
    abstract:
      'A gradient boosting model forecasts the air quality index using traffic density, humidity and temperature. We compare it against a linear baseline over two years of municipal sensor data.',
    fields: ['Computer Science', 'Environmental Science'],
    members: ['Diego Herrera'],
    upvote_count: 33,
    date: '2023-11-20',
  },
  {
    id: 'p04',
    title:
      'Low Cost Water Filtration Using Activated Charcoal and Sand',
    abstract:
      'We built a gravity fed filter from activated charcoal, sand and gravel and tested removal of turbidity, lead and coliform bacteria from river water samples.',
    fields: ['Environmental Science', 'Chemistry'],
    members: ['Amara Diallo', 'Tom Becker'],
    upvote_count: 57,
    date: '2024-01-15',
  },
  {
    id: 'p05',
    title:
      'Investigating Microplastic Concentration in Local Freshwater Streams',
    abstract:
      'Water samples from twelve stream sites were filtered and examined for microplastic particles. Concentration correlated strongly with proximity to storm drains.',
    fields: ['Environmental Science'],
    members: ['Nina Petrov'],
    upvote_count: 22,
    date: '2023-06-30',
  },
  {
    id: 'p06',
    title:
      'How Does Soil pH Affect the Germination Rate of Radish Seeds',
    abstract:
      'Radish seeds were germinated in soils buffered from pH 4 to pH 9. Germination rate peaked near neutral pH and dropped sharply in acidic conditions.',
    fields: ['Biology'],
    members: ['Ada Okafor'],
    upvote_count: 8,
    date: '2022-04-02',
  },
  {
    id: 'p07',
    title:
      'Deep Learning for Handwritten Digit Recognition on Low Power Devices',
    abstract:
      'We quantized a small neural network so it runs on a microcontroller. Accuracy loss was under two percent while inference energy dropped by an order of magnitude.',
    fields: ['Computer Science', 'Electrical Engineering'],
    members: ['Yusuf Karim'],
    upvote_count: 64,
    date: '2024-05-19',
  },
  {
    id: 'p08',
    title:
      'Solar Panel Efficiency Under Varying Angles of Incidence',
    abstract:
      'A photovoltaic panel was mounted on an adjustable rig and output power recorded across tilt angles. Peak efficiency occurred within ten degrees of perpendicular.',
    fields: ['Physics', 'Electrical Engineering'],
    members: ['Grace Lin'],
    upvote_count: 47,
    date: '2023-08-08',
  },
  {
    id: 'p09',
    title:
      'Building a Cost Effective Wind Turbine from Recycled Materials',
    abstract:
      'A vertical axis wind turbine built from PVC and aluminium cans generated measurable current at wind speeds above four meters per second.',
    fields: [
      'Mechanical Engineering',
      'Environmental Science',
    ],
    members: ['Tom Becker'],
    upvote_count: 19,
    date: '2022-10-01',
  },
  {
    id: 'p10',
    title:
      'CRISPR Cas9 Knockout of the Pigment Gene in Zebrafish Embryos',
    abstract:
      'Using guide RNA targeting a pigmentation gene we produced mosaic zebrafish embryos and scored the loss of melanophores under a stereo microscope.',
    fields: ['Biology', 'Medicine'],
    members: ['Priya Raman', 'Ada Okafor'],
    upvote_count: 96,
    date: '2024-07-22',
  },
  {
    id: 'p11',
    title:
      'Antibacterial Properties of Honey Against Escherichia coli',
    abstract:
      'Disk diffusion assays compared manuka honey, clover honey and a control. Manuka produced the largest zone of inhibition against E. coli cultures.',
    fields: ['Biology', 'Medicine'],
    members: ['Sofia Marino'],
    upvote_count: 30,
    date: '2023-02-14',
  },
  {
    id: 'p12',
    title:
      'The Effect of Music Tempo on Short Term Memory Recall',
    abstract:
      'Participants memorized word lists while listening to music at 60, 120 and 180 beats per minute. Recall accuracy declined at the highest tempo.',
    fields: ['Cognitive Science'],
    members: ['Liam Chen'],
    upvote_count: 15,
    date: '2023-05-05',
  },
  {
    id: 'p13',
    title:
      'Do Video Games Improve Reaction Time in Adolescents',
    abstract:
      'We measured simple visual reaction time in regular gamers versus non gamers using a browser based test. Gamers responded significantly faster.',
    fields: ['Cognitive Science'],
    members: ['Marcus Webb'],
    upvote_count: 26,
    date: '2022-12-11',
  },
  {
    id: 'p14',
    title:
      'Modeling the Spread of Infectious Disease with Differential Equations',
    abstract:
      'A SIR compartmental model was fit to reported case data. We explored how the basic reproduction number changes epidemic peak timing.',
    fields: ['Mathematics', 'Medicine'],
    members: ['Grace Lin', 'Diego Herrera'],
    upvote_count: 38,
    date: '2023-09-27',
  },
  {
    id: 'p15',
    title:
      'Prime Gaps and the Distribution of Twin Primes Below Ten Million',
    abstract:
      'We implemented a segmented sieve and analysed the empirical distribution of gaps between consecutive primes against the Hardy Littlewood conjecture.',
    fields: ['Mathematics'],
    members: ['Yusuf Karim'],
    upvote_count: 12,
    date: '2022-07-19',
  },
  {
    id: 'p16',
    title:
      'Measuring Light Pollution with a DIY Sky Quality Meter',
    abstract:
      'An Arduino and light sensor were used to log night sky brightness across urban and rural sites. Readings tracked closely with satellite estimates.',
    fields: ['Space Science', 'Environmental Science'],
    members: ['Nina Petrov', 'Marcus Webb'],
    upvote_count: 44,
    date: '2024-02-28',
  },
  {
    id: 'p17',
    title:
      'Classifying Galaxy Morphology with a Convolutional Neural Network',
    abstract:
      'Sloan Digital Sky Survey cutouts were used to train a CNN that separates spiral, elliptical and irregular galaxies. The model matched volunteer classifications on most examples.',
    fields: ['Space Science', 'Computer Science'],
    members: ['Priya Raman'],
    upvote_count: 71,
    date: '2024-06-14',
  },
  {
    id: 'p18',
    title:
      'Extracting DNA from Strawberries Using Household Materials',
    abstract:
      'A dish soap and salt lysis buffer plus cold ethanol precipitated visible DNA strands from mashed strawberries. Yield varied with ripeness.',
    fields: ['Biology', 'Chemistry'],
    members: ['Sofia Marino'],
    upvote_count: 5,
    date: '2021-11-03',
  },
  {
    id: 'p19',
    title:
      'Electrochemical Analysis of Lemon Battery Voltage Output',
    abstract:
      'Zinc and copper electrodes in citrus fruit produced a small potential difference. We measured how electrode spacing and fruit acidity affect voltage.',
    fields: ['Chemistry', 'Physics'],
    members: ['Tom Becker'],
    upvote_count: 9,
    date: '2022-02-20',
  },
  {
    id: 'p20',
    title:
      'Synthesis and Characterization of Bioplastic from Potato Starch',
    abstract:
      'Starch, glycerol and vinegar were combined to cast a biodegradable film. Tensile strength and degradation rate in soil were compared to polyethylene.',
    fields: ['Chemistry', 'Environmental Science'],
    members: ['Amara Diallo'],
    upvote_count: 53,
    date: '2024-04-09',
  },
  {
    id: 'p21',
    title:
      'Natural Language Processing for Detecting Misinformation in Headlines',
    abstract:
      'A transformer model fine tuned on labelled news headlines flags likely misinformation. We analysed which linguistic cues drove the predictions.',
    fields: ['Computer Science'],
    members: ['Marcus Webb'],
    upvote_count: 87,
    date: '2024-08-30',
  },
  {
    id: 'p22',
    title:
      'Thermal Conductivity of Common Insulation Materials',
    abstract:
      'We compared fiberglass, wool, foam and recycled denim by measuring temperature decay inside identical insulated boxes.',
    fields: ['Physics', 'Mechanical Engineering'],
    members: ['Grace Lin'],
    upvote_count: 11,
    date: '2023-01-25',
  },
  {
    id: 'p23',
    title:
      'Carbon Dioxide Absorption by Common Aquatic Plants',
    abstract:
      'Elodea and duckweed were sealed in bright and dark chambers while dissolved carbon dioxide was tracked with a pH indicator over six hours.',
    fields: ['Biology', 'Environmental Science'],
    members: ['Sofia Marino'],
    upvote_count: 24,
    date: '2023-10-17',
  },
  {
    id: 'p24',
    title:
      'Effects of Sleep Deprivation on Problem Solving Performance',
    abstract:
      'High school volunteers completed logic puzzles after normal and restricted sleep. Accuracy dropped and completion time rose after restriction.',
    fields: ['Cognitive Science', 'Medicine'],
    members: ['Liam Chen', 'Nina Petrov'],
    upvote_count: 35,
    date: '2024-10-05',
  },
  {
    id: 'p25',
    title:
      'An Autonomous Line Following Robot Using Infrared Sensors',
    abstract:
      'We designed a differential drive robot with a PID controller that tracks a taped line. Tuning the derivative term removed oscillation on tight curves.',
    fields: [
      'Mechanical Engineering',
      'Electrical Engineering',
    ],
    members: ['Yusuf Karim', 'Diego Herrera'],
    upvote_count: 62,
    date: '2024-11-11',
  },
  {
    id: 'p26',
    title:
      'Seismic Wave Attenuation in Layered Sedimentary Models',
    abstract:
      'A tabletop model with sand and clay layers was struck to generate waves recorded by geophones. Amplitude decay differed sharply between layers.',
    fields: ['Earth Science', 'Physics'],
    members: ['Amara Diallo'],
    upvote_count: 7,
    date: '2022-05-30',
  },
  {
    id: 'p27',
    title:
      'Predicting Coastal Erosion Rates from Satellite Imagery',
    abstract:
      'Landsat scenes across fifteen years were segmented to trace shoreline retreat. Erosion accelerated at sites without vegetation cover.',
    fields: ['Earth Science', 'Environmental Science'],
    members: ['Marcus Webb'],
    upvote_count: 29,
    date: '2024-01-30',
  },
  {
    id: 'p28',
    title:
      'Comparing Vitamin C Content in Fresh and Packaged Orange Juice',
    abstract:
      'Iodine titration quantified ascorbic acid in six juice samples. Fresh squeezed juice retained substantially more vitamin C after three days.',
    fields: ['Chemistry', 'Medicine'],
    members: ['Sofia Marino', 'Ada Okafor'],
    upvote_count: 18,
    date: '2023-03-22',
  },
  {
    id: 'p29',
    title:
      'A Reinforcement Learning Agent That Learns to Play Snake',
    abstract:
      'A deep Q network was trained in a custom game environment. Reward shaping around food distance produced the fastest convergence.',
    fields: ['Computer Science'],
    members: ['Yusuf Karim'],
    upvote_count: 74,
    date: '2024-12-01',
  },
  {
    id: 'p30',
    title:
      'The Effect of Fertilizer Runoff on Algal Bloom Growth',
    abstract:
      'Nitrogen and phosphorus were added to pond water microcosms. Algal density increased fastest in the high phosphorus treatment.',
    fields: ['Environmental Science', 'Biology'],
    members: ['Nina Petrov'],
    upvote_count: 21,
    date: '2023-07-07',
  },
  {
    id: 'p31',
    title:
      'Designing a Prosthetic Hand with 3D Printing and Servo Actuation',
    abstract:
      'A five digit prosthetic hand was printed in PLA and actuated by tendon cables. Grip force was measured across three finger designs.',
    fields: ['Mechanical Engineering', 'Medicine'],
    members: ['Diego Herrera'],
    upvote_count: 110,
    date: '2024-09-25',
  },
  // Adversarial pair for the `exactness` guard: a popular near-match whose
  // title is a longer word, against an unpopular exact match. Any ranking
  // rule order that lets popularity outrank exactness flips these.
  {
    id: 'p32',
    title: 'Robotics Club Outreach in Rural Middle Schools',
    abstract:
      'A survey of student interest before and after a term of visiting workshops run by our robotics club.',
    fields: ['Mechanical Engineering'],
    members: ['Grace Lin'],
    upvote_count: 120,
    date: '2024-02-02',
  },
  // Adversarial pair for attribute ranking: an author's own project against a
  // project that merely cites the same person in its abstract.
  {
    id: 'p33',
    title: 'A History of Programmable Computing Machines',
    abstract:
      'A literature review of early mechanical computing, covering the analytical engine and the notes of Priya Raman on modern reimplementations.',
    fields: ['Computer Science'],
    members: ['Tom Becker'],
    upvote_count: 90,
    date: '2024-04-04',
  },
  // Adversarial pair for the `renewable -> wind` synonym: "wind" appears
  // prominently in two projects that have nothing to do with renewable
  // energy, so any expansion that over-reaches shows up as a precision loss
  // on the renewable query rather than as an opinion in a code comment.
  {
    id: 'p34',
    title:
      'Solar Wind Impact on Satellite Communication Blackouts',
    abstract:
      'Geomagnetic storm indices were correlated with reported satellite link outages across one solar cycle.',
    fields: ['Space Science'],
    members: ['Nina Petrov'],
    upvote_count: 40,
    date: '2024-05-05',
  },
  {
    id: 'p35',
    title:
      'Wind Tunnel Testing of Low Speed Airfoil Profiles',
    abstract:
      'Lift and drag coefficients were measured for four printed airfoils across angles of attack in a homemade wind tunnel.',
    fields: ['Mechanical Engineering'],
    members: ['Tom Becker'],
    upvote_count: 35,
    date: '2024-06-06',
  },
]

const QUERIES = [
  {
    q: 'machine learning',
    relevant: ['p03', 'p29', 'p02', 'p07', 'p17', 'p21'],
  },
  {
    q: 'AI',
    relevant: ['p02', 'p03', 'p07', 'p17', 'p21', 'p29'],
  },
  {
    q: 'neural network',
    relevant: ['p02', 'p07', 'p17', 'p29'],
  },
  {
    q: 'the effect of caffeine on heart rate',
    relevant: ['p01'],
  },
  {
    q: 'water pollution',
    relevant: ['p04', 'p05', 'p30', 'p27'],
  },
  { q: 'Priya Raman', relevant: ['p02', 'p10', 'p17'] },
  {
    q: 'Yusuf Karim',
    relevant: ['p07', 'p15', 'p25', 'p29'],
  },
  { q: 'DNA', relevant: ['p18', 'p10'] },
  { q: 'CO2', relevant: ['p23'] },
  {
    // p33 is a Computer Science project, so it belongs here on its own
    // merits, independent of how any setting happens to rank it.
    q: 'comp sci',
    relevant: [
      'p02',
      'p03',
      'p07',
      'p17',
      'p21',
      'p29',
      'p33',
    ],
  },
  {
    q: 'how does sleep affect performance',
    relevant: ['p24'],
  },
  { q: 'maths', relevant: ['p14', 'p15'] },
  {
    q: 'renewable energy solar wind',
    relevant: ['p08', 'p09'],
  },
  { q: 'robot', relevant: ['p25', 'p31'] },
]

// Rank-1 checks that a scalar average would hide. Each names the one document
// that MUST come back first, and why the ordering is load-bearing.
const RANK_ONE_EXPECTATIONS = [
  {
    q: 'Priya Raman',
    expect: 'p02',
    why: 'a project she authored must outrank one that only cites her in its abstract (p33)',
  },
  {
    q: 'robot',
    expect: 'p25',
    why: 'the exact term must outrank a more popular near-match (p32 "Robotics")',
  },
]

const PRECISION_AT = 5

function precisionAtK(
  returnedIds,
  relevantIds,
  k = PRECISION_AT
) {
  const relevant = new Set(relevantIds)
  const top = returnedIds.slice(0, k)
  // Normalised by the reachable ceiling, so a query with two relevant
  // documents can still score 1.0 at k=5.
  const ceiling = Math.max(
    1,
    Math.min(k, relevantIds.length)
  )
  return (
    top.filter((id) => relevant.has(id)).length / ceiling
  )
}

function recall(returnedIds, relevantIds) {
  if (relevantIds.length === 0) return 0
  const relevant = new Set(relevantIds)
  return (
    returnedIds.filter((id) => relevant.has(id)).length /
    relevantIds.length
  )
}

function reciprocalRank(returnedIds, relevantIds) {
  const relevant = new Set(relevantIds)
  const first = returnedIds.findIndex((id) =>
    relevant.has(id)
  )
  return first === -1 ? 0 : 1 / (first + 1)
}

function summarize(rows) {
  if (rows.length === 0) {
    return { 'P@5': 0, recall: 0, MRR: 0 }
  }
  const mean = (key) =>
    Number(
      (
        rows.reduce((total, row) => total + row[key], 0) /
        rows.length
      ).toFixed(3)
    )
  return {
    'P@5': mean('P@5'),
    recall: mean('recall'),
    MRR: mean('MRR'),
  }
}

module.exports = {
  CORPUS,
  QUERIES,
  RANK_ONE_EXPECTATIONS,
  PRECISION_AT,
  precisionAtK,
  recall,
  reciprocalRank,
  summarize,
}
