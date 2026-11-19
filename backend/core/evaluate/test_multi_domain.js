// backend/core/evaluate/test_multi_domain.js
const assert = require('assert');
const { DOMAINS, LEVEL_TO_DOMAIN } = require('../config/domainRegistry');
const { buildLevelMap } = require('../utils/levelMapBuilder');
const { FindLevelInText, Structurize } = require('../Regex/Regex');
const { EvaluateDomain, EvaluateAllDomains, Evaluate } = require('./evaluate');
const { generateCORecommendations } = require('../recommendation/coWeightageRecommendation');

console.log('🧪 Starting Multi-Domain Evaluation Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`✅ [PASS] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`❌ [FAIL] ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

// Helper to construct sequence and coDetails
function parseSequenceHelper(sequenceArray) {
    const coDetails = {};
    const moduleHours = {};
    const usedLevelsByDomain = { cognitive: new Set(), affective: new Set(), psychomotor: new Set() };

    sequenceArray.forEach((item) => {
        const match = String(item.name).match(/\d+/);
        if (!match) return;
        const number = match[0];

        if (item.type === "CO") {
            const coKey = `CO${number}`;
            const weight = parseFloat(item.weight || 0);

            const rawBlooms = Array.isArray(item.blooms)
                ? item.blooms.filter((b) => typeof b === "string")
                : typeof item.blooms === "string"
                    ? [item.blooms]
                    : [];

            const levelsByDomain = { cognitive: null, affective: null, psychomotor: null };

            rawBlooms.forEach((raw) => {
                const level = raw.toLowerCase().trim().replace(/\s+/g, "_");
                const domain = LEVEL_TO_DOMAIN[level];
                if (!domain) return;
                if (levelsByDomain[domain] !== null) return;
                levelsByDomain[domain] = level;
                usedLevelsByDomain[domain].add(level);
            });

            coDetails[coKey] = {
                weight,
                blooms: levelsByDomain.cognitive ? [levelsByDomain.cognitive] : [],
                levelsByDomain
            };
        } else if (item.type === "Module") {
            moduleHours[`M${number}`] = parseFloat(item.hours || 0);
        }
    });

    const levelMaps = {};
    Object.values(DOMAINS).forEach((domainCfg) => {
        levelMaps[domainCfg.key] = buildLevelMap(domainCfg.naturalOrder, usedLevelsByDomain[domainCfg.key]);
    });

    return { coDetails, moduleHours, levelMaps };
}

// Helper to simulate question data extraction
function buildQuestions(questions, levelMaps) {
    return questions.map((q, idx) => {
        const text = q.text || q.Question || "";
        const cognitive = FindLevelInText(text, "cognitive", DOMAINS.cognitive.verbDictionary, levelMaps.cognitive);
        const affective = FindLevelInText(text, "affective", DOMAINS.affective.verbDictionary, levelMaps.affective);
        const psychomotor = FindLevelInText(text, "psychomotor", DOMAINS.psychomotor.verbDictionary, levelMaps.psychomotor);

        return {
            "Question No": idx + 1,
            "Question": text,
            "CO": q.co,
            "Marks": q.marks || 10,
            "Module": q.module || "1",
            "Bloom's Verbs": cognitive.words,
            "Bloom's Taxonomy Level": cognitive.matched ? cognitive.highestLevel : 6,
            "Bloom's Highest Verb": cognitive.highestVerb || "N/A",
            DomainLevels: { cognitive, affective, psychomotor }
        };
    });
}

// TEST CASE A: CO1: ["understand"] only
runTest('Test Case A: Cognitive only CO returns hasData:true for Cognitive, false for others', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO1", type: "CO", weight: 100, blooms: ["understand"] }
    ]);
    const questions = buildQuestions([
        { co: "CO1", text: "Explain the working principle of transformers.", marks: 20 }
    ], levelMaps);

    const { results, overview } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);

    assert.strictEqual(results.cognitive.hasData, true, 'Cognitive should have data');
    assert.strictEqual(results.affective.hasData, false, 'Affective should not have data');
    assert.strictEqual(results.psychomotor.hasData, false, 'Psychomotor should not have data');
    assert.strictEqual(overview.cognitive.hasData, true);
    assert.strictEqual(overview.affective.hasData, false);
    assert.strictEqual(overview.psychomotor.hasData, false);
    assert.strictEqual(overview.cognitive.coCount, 1);
    assert.strictEqual(overview.cognitive.questionCount, 1);
});

// TEST CASE B: CO1: ["understand", "valuing"]
runTest('Test Case B: Multi-domain CO with dual-matching question participates in both reports', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO1", type: "CO", weight: 100, blooms: ["understand", "valuing"] }
    ]);
    // "explain" is cognitive understand; "justify" is affective valuing
    const questions = buildQuestions([
        { co: "CO1", text: "Explain the ethical framework and justify your decision.", marks: 20 }
    ], levelMaps);

    const { results, overview } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);

    assert.strictEqual(results.cognitive.hasData, true, 'Cognitive should have data');
    assert.strictEqual(results.affective.hasData, true, 'Affective should have data');
    assert.strictEqual(results.psychomotor.hasData, false, 'Psychomotor should not have data');

    assert.strictEqual(results.cognitive.QuestionData.length, 1);
    assert.strictEqual(results.affective.QuestionData.length, 1);
    assert(typeof results.cognitive.FinalScore === 'number');
    assert(typeof results.affective.FinalScore === 'number');
    assert.strictEqual(overview.cognitive.questionCount, 1);
    assert.strictEqual(overview.affective.questionCount, 1);
});

// TEST CASE C: Psychomotor Proficiency Qualifier (Rule 1)
runTest('Test Case C: Psychomotor proficiency qualifier resolves to complex_overt_response', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO2", type: "CO", weight: 100, blooms: ["mechanism"] }
    ]);
    const questions = buildQuestions([
        { co: "CO2", text: "Assemble the circuit skillfully within 10 minutes.", marks: 25 }
    ], levelMaps);

    const q = questions[0];
    const psycho = q.DomainLevels.psychomotor;
    assert.strictEqual(psycho.matched, true);
    assert.strictEqual(psycho.matchedLevelName, 'complex_overt_response');
    assert.strictEqual(psycho.ambiguityResolution, 'proficiency');

    const { results } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);
    assert.strictEqual(results.psychomotor.hasData, true);
    assert.strictEqual(results.psychomotor.QuestionData[0].DomainLevels.psychomotor.matchedLevelName, 'complex_overt_response');
});

// TEST CASE D: Psychomotor Guidance Qualifier (Rule 2)
runTest('Test Case D: Psychomotor guidance qualifier resolves to guided_response', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO2", type: "CO", weight: 100, blooms: ["mechanism"] }
    ]);
    const questions = buildQuestions([
        { co: "CO2", text: "Assemble the circuit under supervision following instructions.", marks: 25 }
    ], levelMaps);

    const q = questions[0];
    const psycho = q.DomainLevels.psychomotor;
    assert.strictEqual(psycho.matched, true);
    assert.strictEqual(psycho.matchedLevelName, 'guided_response');
    assert.strictEqual(psycho.ambiguityResolution, 'guidance');

    const { results } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);
    assert.strictEqual(results.psychomotor.hasData, true);
});

// TEST CASE E: Psychomotor Plain Default (Rule 3)
runTest('Test Case E: Psychomotor ambiguous verb without qualifiers defaults to mechanism', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO2", type: "CO", weight: 100, blooms: ["mechanism"] }
    ]);
    const questions = buildQuestions([
        { co: "CO2", text: "Assemble the circuit and record output.", marks: 25 }
    ], levelMaps);

    const q = questions[0];
    const psycho = q.DomainLevels.psychomotor;
    assert.strictEqual(psycho.matched, true);
    assert.strictEqual(psycho.matchedLevelName, 'mechanism');
    assert.strictEqual(psycho.ambiguityResolution, 'default');

    const { results } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);
    assert.strictEqual(results.psychomotor.hasData, true);
});

// TEST CASE F: CO declared domain but 0 questions match that domain
runTest('Test Case F: Question with 0 affective verbs excluded; domain returns hasData:false if none match', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO3", type: "CO", weight: 100, blooms: ["organizing"] }
    ]);
    // "Calculate" is cognitive apply, zero affective verbs
    const questions = buildQuestions([
        { co: "CO3", text: "Calculate the total impedance of the network.", marks: 15 }
    ], levelMaps);

    const { results } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);
    assert.strictEqual(results.affective.hasData, false, 'Affective should return hasData: false (second early-exit)');
    assert(results.affective.message.includes('no questions contained matching affective verbs'));
});

// TEST CASE G: Domain-local normalization
runTest('Test Case G: Domain-local weight normalization computes totalWeight only over domain COs', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO4", type: "CO", weight: 30, blooms: ["origination"] },
        { name: "CO5", type: "CO", weight: 70, blooms: ["analyze"] }
    ]);
    const questions = buildQuestions([
        { co: "CO4", text: "Design a new protocol for sensor networks.", marks: 30 },
        { co: "CO5", text: "Analyze the time complexity of the algorithm.", marks: 70 }
    ], levelMaps);

    const { results } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);
    assert.strictEqual(results.psychomotor.hasData, true);
    assert.strictEqual(results.cognitive.hasData, true);

    // In Psychomotor report, only CO4 is relevant, so expected is 100%
    const psychoCORec = results.psychomotor.CORecommendations;
    assert.strictEqual(psychoCORec.length, 1);
    assert.strictEqual(psychoCORec[0].co, 'CO4');
    assert.strictEqual(psychoCORec[0].expected, 100, 'CO4 expected percentage should be 100% domain-local');
});

// TEST CASE H: Module Hours Penalty Gating (Cognitive only)
runTest('Test Case H: Module penalty applies only to Cognitive; Affective/Psychomotor have empty ModuleData', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO1", type: "CO", weight: 50, blooms: ["understand"] },
        { name: "CO2", type: "CO", weight: 50, blooms: ["valuing"] },
        { name: "Module1", type: "Module", hours: 10 },
        { name: "Module2", type: "Module", hours: 20 }
    ]);
    const questions = buildQuestions([
        { co: "CO1", text: "Explain the concept of encapsulation.", marks: 20, module: "1" },
        { co: "CO2", text: "Justify the importance of data privacy in modern apps.", marks: 20, module: "2" }
    ], levelMaps);

    const { results } = EvaluateAllDomains(questions, coDetails, moduleHours, levelMaps);
    assert.strictEqual(results.cognitive.hasData, true);
    assert.strictEqual(results.affective.hasData, true);

    assert(results.cognitive.ModuleData.length > 0, 'Cognitive should have ModuleData');
    assert.deepStrictEqual(results.affective.ModuleData, [], 'Affective ModuleData must be empty');
    assert.deepStrictEqual(results.affective.ModuleRecommendations, [], 'Affective ModuleRecommendations must be empty');
});

// TEST CASE I: Backward Compatibility with Legacy Evaluation
runTest('Test Case I: Backward-compatible Evaluate function still produces valid Cognitive results', () => {
    const bloomLevelMap = {
        create: 1,
        evaluate: 2,
        analyze: 3,
        apply: 4,
        understand: 5,
        remember: 6
    };
    const legacyPreData = {
        CO1: { weight: 100, blooms: ["understand"] }
    };
    const questions = [
        {
            "Question No": 1,
            "Question": "Explain binary search trees.",
            "CO": "CO1",
            "Marks": 100,
            "Bloom's Taxonomy Level": 5,
            "Bloom's Verbs": "explain",
            "Bloom's Highest Verb": "explain",
            DomainLevels: {
                cognitive: {
                    matched: true,
                    highestLevel: 5,
                    highestVerb: "explain",
                    words: "explain"
                }
            }
        }
    ];

    const result = Evaluate(questions, legacyPreData, {}, bloomLevelMap);
    assert.strictEqual(result.hasData, true);
    assert(result.FinalScore > 0);
    assert(result.BloomsData !== undefined);
    assert(result.QuestionData.length === 1);
});

// TEST CASE J: Whitespace & Casing Normalization in Level Names
runTest('Test Case J: Casing and whitespace ("Guided Response") normalizes to "guided_response"', () => {
    const { coDetails, moduleHours, levelMaps } = parseSequenceHelper([
        { name: "CO1", type: "CO", weight: 100, blooms: [" Guided Response "] }
    ]);
    assert.strictEqual(coDetails.CO1.levelsByDomain.psychomotor, "guided_response");
    assert(levelMaps.psychomotor.guided_response !== undefined);
});

console.log(`\n-----------------------------------------`);
console.log(`Test Results: ${passedTests} / ${totalTests} passed`);
console.log(`-----------------------------------------\n`);
if (passedTests === totalTests) {
    console.log('🎉 ALL 10 TEST CASES PASSED SUCCESSFULLY!');
} else {
    process.exit(1);
}
