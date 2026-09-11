// backend/core/config/domainRegistry.js
const { bloomsTaxonomyVerbs } = require("../Regex/Regex");
const { krathwohlTaxonomyVerbs } = require("../Regex/affectiveVerbs");
const { simpsonTaxonomyVerbs } = require("../Regex/psychomotorVerbs");

const DOMAINS = {
  cognitive: {
    key: "cognitive",
    label: "Cognitive (Bloom's Taxonomy)",
    naturalOrder: ["create", "evaluate", "analyze", "apply", "understand", "remember"],
    verbDictionary: bloomsTaxonomyVerbs,
    applyModulePenalty: true
  },
  affective: {
    key: "affective",
    label: "Affective (Krathwohl's Taxonomy)",
    naturalOrder: ["characterizing", "organizing", "valuing", "responding", "receiving"],
    verbDictionary: krathwohlTaxonomyVerbs,
    applyModulePenalty: false
  },
  psychomotor: {
    key: "psychomotor",
    label: "Psychomotor (Simpson's Taxonomy)",
    naturalOrder: [
      "origination",
      "adaptation",
      "complex_overt_response",
      "mechanism",
      "guided_response",
      "set",
      "perception"
    ],
    verbDictionary: simpsonTaxonomyVerbs,
    applyModulePenalty: false
  }
};

// Build the reverse lookup: level name -> domain key.
// This is what makes a CO's `blooms` array "just work" without an explicit domain field.
const LEVEL_TO_DOMAIN = {};
Object.values(DOMAINS).forEach((domain) => {
  domain.naturalOrder.forEach((levelName) => {
    if (LEVEL_TO_DOMAIN[levelName]) {
      throw new Error(
        `Duplicate level name "${levelName}" found in both ` +
        `"${LEVEL_TO_DOMAIN[levelName]}" and "${domain.key}". ` +
        `Level names must be globally unique across all domains.`
      );
    }
    LEVEL_TO_DOMAIN[levelName] = domain.key;
  });
});

module.exports = { DOMAINS, LEVEL_TO_DOMAIN };
