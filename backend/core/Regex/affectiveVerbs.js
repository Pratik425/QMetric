// backend/core/Regex/affectiveVerbs.js

const krathwohlTaxonomyVerbs = {
  "receiving": [
    "accept", "acknowledge", "attend", "ask", "choose", "describe",
    "erect", "follow", "give", "hold", "identify", "listen", "locate",
    "name", "notice", "observe", "point", "recognize", "reply", "select",
    "sit", "use"
  ],
  "responding": [
    "answer", "assist", "aid", "comply", "conform", "cooperate",
    "contribute", "discuss", "greet", "help", "label", "obey",
    "participate", "perform", "practice", "present", "read", "recite",
    "report", "respond", "tell", "volunteer", "write"
  ],
  "valuing": [
    "appreciate", "cherish", "commit", "complete", "demonstrate",
    "devote", "differentiate", "explain", "follow", "form", "initiate",
    "invite", "join", "justify", "prefer", "pursue", "propose", "seek",
    "share", "study", "subscribe", "support", "value", "work"
  ],
  "organizing": [
    "adhere", "alter", "arrange", "balance", "combine", "compare",
    "complete", "defend", "define", "explain", "formulate",
    "generalize", "identify", "integrate", "modify", "order",
    "organize", "prepare", "rank", "relate", "reconcile", "synthesize",
    "systematize", "weigh"
  ],
  "characterizing": [
    "act", "advocate", "discriminate", "display", "embody", "exemplify",
    "influence", "internalize", "model", "modify", "perform", "practice",
    "propose", "qualify", "question", "revise", "serve", "solve",
    "verify", "validate"
  ]
};

module.exports = { krathwohlTaxonomyVerbs };
