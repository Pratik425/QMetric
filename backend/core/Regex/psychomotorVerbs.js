// backend/core/Regex/psychomotorVerbs.js

const simpsonTaxonomyVerbs = {
  "perception": [
    "choose", "describe", "detect", "differentiate", "distinguish",
    "identify", "isolate", "notice", "recognize", "relate", "select",
    "sense"
  ],
  "set": [
    "begin", "display", "explain", "move", "prepare", "proceed",
    "react", "respond", "show", "start", "state", "volunteer"
  ],
  "guided_response": [
    "assemble", "attempt", "build", "calibrate", "copy", "dismantle",
    "fasten", "fix", "follow", "grind", "heat", "imitate", "manipulate",
    "measure", "mend", "mimic", "mix", "reproduce", "sketch", "trace"
  ],
  "mechanism": [
    "assemble", "calibrate", "construct", "dismantle", "display",
    "fasten", "fix", "grind", "heat", "manipulate", "measure", "mend",
    "mix", "operate", "organize", "sketch"
  ],
  "complex_overt_response": [
    "assemble", "build", "calibrate", "construct", "coordinate",
    "dismantle", "display", "fasten", "fix", "grind", "heat",
    "manipulate", "measure", "mend", "mix", "operate", "organize",
    "sketch"
  ],
  "adaptation": [
    "adapt", "alter", "change", "customize", "rearrange", "reorganize",
    "revise", "vary", "modify"
  ],
  "origination": [
    "arrange", "build", "combine", "compose", "construct", "create",
    "design", "devise", "initiate", "make", "originate"
  ]
};

const PROFICIENCY_QUALIFIERS = [
  "skillfully", "expertly", "efficiently", "proficiently", "smoothly",
  "confidently", "accurately", "with precision", "without hesitation",
  "automatically", "independently", "correctly", "flawlessly"
];

const GUIDANCE_QUALIFIERS = [
  "under supervision", "with guidance", "following instructions",
  "hesitantly", "with assistance", "as demonstrated", "step by step",
  "with help"
];

module.exports = {
  simpsonTaxonomyVerbs,
  PROFICIENCY_QUALIFIERS,
  GUIDANCE_QUALIFIERS
};
