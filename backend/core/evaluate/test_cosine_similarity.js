// backend/core/evaluate/test_cosine_similarity.js
const assert = require('assert');
const { FindLevelInText } = require('../Regex/Regex');
const { DOMAINS } = require('../config/domainRegistry');
const { EvaluateAllDomains } = require('./evaluate');

console.log('🧪 Starting Cosine Similarity Bloom Taxonomy Test Suite...\n');

let totalTests = 0;
let passedTests = 0;

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

const levelMap = {
    remember: 1,
    understand: 2,
    apply: 3,
    analyze: 4,
    evaluate: 5,
    create: 6
};

// TEST 1: Exact match precedence - dictionary word matches directly without cosine similarity
runTest('Test 1: Exact dictionary verbs match directly without cosine fallback', () => {
    const res = FindLevelInText(
        "Calculate the electric field at the given point.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, true, 'Should match exact verb');
    assert.strictEqual(res.highestLevel, 3, 'Calculate should map to level 3 (apply)');
    assert.strictEqual(res.highestVerb.toLowerCase(), 'calculate');
    assert.strictEqual(res.similarityMatch, null, 'Exact match must NOT have similarityMatch');
});

// TEST 2: Exact match takes precedence even if sentence has potential unseen verbs
runTest('Test 2: Exact dictionary word "transfer" takes precedence over unseen verb "derive"', () => {
    const res = FindLevelInText(
        "Derive the transfer function of the low-pass filter.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.similarityMatch, null, 'Because "transfer" is in dictionary, exact match was used');
    assert.strictEqual(res.highestVerb.toLowerCase(), 'transfer');
});

// TEST 3: Cosine similarity for "compute" -> "calculate" (apply)
runTest('Test 3: Unseen verb "Compute" matches to "calculate" under "apply" via cosine similarity', () => {
    const res = FindLevelInText(
        "Compute the eigenvalues of matrix A.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, true, 'Should match via cosine similarity');
    assert.strictEqual(res.highestLevel, 3, 'Compute should map to level 3 (apply)');
    assert(res.highestVerb.includes('compute'), 'highestVerb should mention compute');
    assert(res.highestVerb.includes('calculate'), 'highestVerb should mention calculate');
    assert(res.similarityMatch !== null, 'similarityMatch must be populated');
    assert.strictEqual(res.similarityMatch.original_verb, 'compute');
    assert.strictEqual(res.similarityMatch.similar_verb, 'calculate');
    assert(res.similarityMatch.similarity >= 0.65, 'Similarity should exceed threshold');
});

// TEST 4: Cosine similarity for "derive" -> "solve" (apply)
runTest('Test 4: Unseen verb "Derive" matches to "solve" under "apply" via cosine similarity', () => {
    const res = FindLevelInText(
        "Derive the characteristic equation of the RC circuit.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, true, 'Should match via cosine similarity');
    assert.strictEqual(res.highestLevel, 3, 'Derive should map to level 3 (apply)');
    assert(res.highestVerb.includes('derive'));
    assert(res.similarityMatch !== null);
    assert.strictEqual(res.similarityMatch.level, 'apply');
});

// TEST 5: Cosine similarity for "scrutinize" -> "analyze" (analyze)
runTest('Test 5: Unseen verb "Scrutinize" matches to "analyze" under "analyze" via cosine similarity', () => {
    const res = FindLevelInText(
        "Scrutinize the anomalies in the dataset.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, true, 'Should match via cosine similarity');
    assert.strictEqual(res.highestLevel, 4, 'Scrutinize should map to level 4 (analyze)');
    assert(res.highestVerb.includes('scrutinize'));
    assert.strictEqual(res.similarityMatch.level, 'analyze');
});

// TEST 6: Cosine similarity for "plot" -> "draw" (apply)
runTest('Test 6: Unseen verb "Plot" matches to "draw" under "apply" via cosine similarity', () => {
    const res = FindLevelInText(
        "Plot the Nyquist curve for the open-loop system.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, true, 'Should match via cosine similarity');
    assert.strictEqual(res.highestLevel, 3, 'Plot should map to level 3 (apply)');
    assert(res.highestVerb.includes('plot'));
});

// TEST 7: Unrelated sentence is rejected by threshold
runTest('Test 7: Non-action/unrelated sentence is rejected below threshold', () => {
    const res = FindLevelInText(
        "The brown fox jumps over the lazy dog.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );

    assert.strictEqual(res.matched, false, 'Unrelated sentence must not match');
    assert.strictEqual(res.highestLevel, null);
    assert.strictEqual(res.highestVerb, null);
});

// TEST 8: In-memory caching works and returns identical result quickly
runTest('Test 8: Repeated unseen verb utilizes in-memory cache', () => {
    const start = Date.now();
    const resCached = FindLevelInText(
        "Compute the determinant of matrix B.",
        "cognitive",
        DOMAINS.cognitive.verbDictionary,
        levelMap
    );
    const duration = Date.now() - start;

    assert.strictEqual(resCached.matched, true);
    assert.strictEqual(resCached.highestLevel, 3);
    console.log(`   (Cache execution time: ${duration}ms)`);
});

// TEST 9: Full pipeline integration with EvaluateAllDomains
runTest('Test 9: End-to-end evaluation successfully scores cosine-mapped question', () => {
    const coDetails = {
        CO1: {
            weight: 100,
            blooms: ["apply"],
            levelsByDomain: { cognitive: "apply", affective: null, psychomotor: null }
        }
    };
    const levelMaps = { cognitive: levelMap, affective: {}, psychomotor: {} };
    const questions = [
        {
            "Question No": 1,
            "Question": "Compute the Fast Fourier Transform of the signal x(t).",
            "CO": "CO1",
            "Marks": 20,
            "Module": "1",
            "Bloom's Verbs": "compute",
            "Bloom's Taxonomy Level": 3,
            "Bloom's Highest Verb": "compute (≈ calculate)",
            DomainLevels: {
                cognitive: FindLevelInText(
                    "Compute the Fast Fourier Transform of the signal x(t).",
                    "cognitive",
                    DOMAINS.cognitive.verbDictionary,
                    levelMap
                )
            }
        }
    ];

    const { results, overview } = EvaluateAllDomains(questions, coDetails, {}, levelMaps);
    assert.strictEqual(results.cognitive.hasData, true);
    assert.strictEqual(results.cognitive.QuestionData.length, 1);
    assert(typeof results.cognitive.FinalScore === 'number');
    assert.strictEqual(results.cognitive.QuestionRecommendations[0].extractedVerb, 'compute');
    assert(results.cognitive.QuestionRecommendations[0].highestVerb.includes('calculate'));
    assert.strictEqual(overview.cognitive.questionCount, 1);
});

console.log('\n-----------------------------------------');
console.log(`Test Results: ${passedTests} / ${totalTests} passed`);
console.log('-----------------------------------------');
if (passedTests === totalTests) {
    console.log('🎉 ALL COSINE SIMILARITY TESTS PASSED SUCCESSFULLY!\n');
}
