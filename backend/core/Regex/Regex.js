// //Version-2
// const fs = require('fs');
// const xlsx = require('xlsx');
// const { spawnSync } = require('child_process');

// // Bloom's taxonomy verbs by category
// const bloomsTaxonomyVerbs = {
//     "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
//     "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
//     "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
//     "analyze": ["analyze", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
//     "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
//     "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate"]
// };

// function extractVerbsPython(text) {
//     const result = spawnSync('python', ['extraction_logic.py', text], { encoding: 'utf-8' });
//     if (result.error) {
//         console.error('Python error:', result.error);
//         return [];
//     }
//     return result.stdout.trim().split(',').filter(Boolean);
// }

// // Function to structurize and process the Excel data
// exports.Structurize = (data, inputFile, bloomLevelMap) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const workbook = xlsx.readFile(inputFile);
//             const sheetName = workbook.SheetNames[0];
//             const sheet = workbook.Sheets[sheetName];

//             // Convert the sheet into a JSON array
//             const tableData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

//             const StructurizedData = tableData.map(row => {
//                 const questionText = row.question || row.Question || row.QUESTION || '';
                
//                 if (!questionText) {
//                     console.warn(`Missing question text for row: ${JSON.stringify(row)}`);
//                     return null; // Skip this row if no question text is found
//                 }

//                 const bloom = exports.FindBloomLevelsInText(questionText, bloomLevelMap);

//                 const moduleNumber = row.Module !== undefined && row.Module !== null
//                 ? String(row.Module).trim()
//                 : 'N/A';

//                 // Return structured data for each row, ensuring no null values
//                 return questionText ? {
//                     ...row,
//                     "Bloom's Verbs": bloom.words,
//                     "Bloom's Taxonomy Level": bloom.highestLevel,
//                     "Bloom's Highest Verb": bloom.highestVerb,
//                     "Module": moduleNumber 
//                 } : null;
//             }).filter(row => row !== null); 

//             resolve(StructurizedData);
//         } catch (error) {
//             reject(`Error processing the file: ${error.message}`);
//         }
//     });
// };

// // Helper to find level name from verb
// function findBloomLevel(word, bloomLevelMap) {
//     for (const level in bloomsTaxonomyVerbs) {
//         if (bloomsTaxonomyVerbs[level].includes(word)) {
//             return level;
//         }
//     }
//     return "Not Found";
// }

// // Public method to analyze Bloom level in a sentence
// exports.FindBloomLevelsInText = (text, bloomLevelMap) => {
//     const words = text.split(/\W+/); // Simple tokenization
//     const wordResult = [];
//     const levelResult = [];
//     let highestLevel = Infinity; // Start with the highest possible value

//     let highestVerb = null;

//     for (const word of words) {
//         const lowerWord = word.toLowerCase();
//         const level = findBloomLevel(lowerWord, bloomLevelMap);

//         if (level !== "Not Found") {
//             const levelIndex = getBloomLevelIndex(level, bloomLevelMap);
//             wordResult.push(word);
//             levelResult.push(levelIndex);
//             if(levelIndex < highestLevel){
//                 highestVerb = word;
//             }
//             highestLevel = Math.min(highestLevel, levelIndex);

//             // Check if this word is a verb and if it has the highest bloom level so far
            
//         }
//     }

//     return {
//         words: wordResult.join(", "),
//         levels: levelResult.join(", "),
//         highestLevel,
//         highestVerb,
//     };
// };


// // Helper to convert level to number using bloomLevelMap
// function getBloomLevelIndex(level, bloomLevelMap) {
//     return bloomLevelMap[level] || Infinity; 
// }



// // curl -X POST http://qmetric-2.onrender.com/upload/totext ^ -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODY0MWNiMGFjYTk4ZTc5NzRhYzhhZjYiLCJpYXQiOjE3NjA4OTE2NjAsImV4cCI6MTc2MTE1MDg2MH0.Lt5uC8PGMZCqUkwc3xst8iUSsn2JA2Y-MIYDyY95MBg" ^ -F "file=@C:\Users\user\Downloads\sample.xlsx" ^ -F "Sequence=[{\"name\":\"CO1\",\"type\":\"CO\",\"weight\":50,\"blooms\":[\"understand\"]},{\"name\":\"CO2\",\"type\":\"CO\",\"weight\":30,\"blooms\":[\"Apply\"]},{\"name\":\"CO3\",\"type\":\"CO\",\"weight\":20,\"blooms\":[\"Analyse\"]},{\"name\":\"Module1\",\"type\":\"Module\",\"hours\":10},{\"name\":\"Module2\",\"type\":\"Module\",\"hours\":15}]" ^ -F "FormData={\"College Name\":\"XYZ College\",\"Branch\":\"Computer Science\",\"Year Of Study\":\"2nd Year\",\"Semester\":\"3rd\",\"Course Name\":\"Data Structures\",\"Course Code\":\"CS201\",\"Course Teacher\":\"Dr. Smith\"}"


// //Version-3
// const fs = require('fs');
// const xlsx = require('xlsx');
// const { spawnSync } = require('child_process');

// // Bloom's taxonomy verbs by category
// const bloomsTaxonomyVerbs = {
//     "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
//     "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
//     "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
//     "analyze": ["analyze", "analyse", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
//     "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
//     "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate", "create"]
// };

// // Helper: Extract verbs from text using Python spaCy
// function extractVerbsPython(text) {
//     const result = spawnSync('python', ['extraction_logic.py', text], { encoding: 'utf-8' });
//     if (result.error) {
//         console.error('Python error:', result.error);
//         return [];
//     }
//     return result.stdout.trim().split(',').filter(Boolean);
// }

// // Function to structurize and process the Excel data
// exports.Structurize = (data, inputFile, bloomLevelMap) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const workbook = xlsx.readFile(inputFile);
//             const sheetName = workbook.SheetNames[0];
//             const sheet = workbook.Sheets[sheetName];

//             // Convert the sheet into a JSON array
//             const tableData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

//             const StructurizedData = tableData.map(row => {
//                 const questionText = row.question || row.Question || row.QUESTION || '';
                
//                 if (!questionText) {
//                     console.warn(`Missing question text for row: ${JSON.stringify(row)}`);
//                     return null; // Skip this row if no question text is found
//                 }

//                 const bloom = exports.FindBloomLevelsInText(questionText, bloomLevelMap);

//                 const moduleNumber = row.Module !== undefined && row.Module !== null
//                     ? String(row.Module).trim()
//                     : 'N/A';

//                 // Extract verbs using Python spaCy
//                 const extractedVerbs = extractVerbsPython(questionText);

//                 // Return structured data for each row, ensuring no null values
//                 return questionText ? {
//                     ...row,
//                     "Bloom's Verbs": bloom.words,
//                     "Bloom's Taxonomy Level": bloom.highestLevel,
//                     "Bloom's Highest Verb": bloom.highestVerb,
//                     "Module": moduleNumber,
//                     "Extracted Verbs": extractedVerbs.join(', ')
//                 } : null;
//             }).filter(row => row !== null); 

//             resolve(StructurizedData);
//         } catch (error) {
//             reject(`Error processing the file: ${error.message}`);
//         }
//     });
// };

// // Helper to find level name from verb
// function findBloomLevel(word, bloomLevelMap) {
//     for (const level in bloomsTaxonomyVerbs) {
//         if (bloomsTaxonomyVerbs[level].includes(word)) {
//             return level;
//         }
//     }
//     return "Not Found";
// }

// // Public method to analyze Bloom level in a sentence
// exports.FindBloomLevelsInText = (text, bloomLevelMap) => {
//     const words = text.split(/\W+/); // Simple tokenization
//     const wordResult = [];
//     const levelResult = [];
//     let highestLevel = Infinity; // Start with the highest possible value

//     let highestVerb = null;

//     for (const word of words) {
//         const lowerWord = word.toLowerCase();
//         const level = findBloomLevel(lowerWord, bloomLevelMap);

//         if (level !== "Not Found") {
//             const levelIndex = getBloomLevelIndex(level, bloomLevelMap);
//             wordResult.push(word);
//             levelResult.push(levelIndex);
//             if(levelIndex < highestLevel){
//                 highestVerb = word;
//             }
//             highestLevel = Math.min(highestLevel, levelIndex);
//         }
//     }

//     return {
//         words: wordResult.join(", "),
//         levels: levelResult.join(", "),
//         highestLevel,
//         highestVerb,
//     };
// };

// // Helper to convert level to number using bloomLevelMap
// function getBloomLevelIndex(level, bloomLevelMap) {
//     return bloomLevelMap[level] || Infinity; 
// }

//Version-5
const fs = require('fs');
const xlsx = require('xlsx');
const { spawnSync } = require('child_process');
const { krathwohlTaxonomyVerbs } = require('./affectiveVerbs');
const {
    simpsonTaxonomyVerbs,
    PROFICIENCY_QUALIFIERS,
    GUIDANCE_QUALIFIERS
} = require('./psychomotorVerbs');

// Bloom's taxonomy verbs by category
const bloomsTaxonomyVerbs = {
    "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
    "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
    "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
    "analyze": ["analyze", "analyse", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
    "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
    "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate", "create"]
};

exports.bloomsTaxonomyVerbs = bloomsTaxonomyVerbs;

// Field-specific verb additions, merged on top of the base list above.
const fieldVerbExtensions = {
    "medical": {
        "understand": ["auscultate", "palpate"],
        "apply": ["diagnose", "prescribe", "administer", "treat"],
        "analyze": ["differentiate diagnosis", "correlate symptoms"],
        "evaluate": ["manage", "triage", "prognosticate"]
    }
};

// Merge base verbs with a field's extension (if any) into one lookup object.
function getVerbMapForField(field) {
    const key = (field || "").toLowerCase();
    const extension = fieldVerbExtensions[key];
    if (!extension) return bloomsTaxonomyVerbs;

    const merged = {};
    for (const level in bloomsTaxonomyVerbs) {
        merged[level] = [...bloomsTaxonomyVerbs[level], ...(extension[level] || [])];
    }
    return merged;
}

// Helper: Extract verbs from text using Python spaCy (optional enhancement)
function extractVerbsPython(text) {
    try {
        const pythonCmd = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
        const scriptPath = path.join(__dirname, 'extraction_logic.py');
        const result = spawnSync(pythonCmd, [scriptPath], { input: text, encoding: 'utf-8', timeout: 1000 });
        if (result.error || result.status !== 0) {
            return [];
        }
        return (result.stdout || '').trim().split(',').filter(Boolean);
    } catch {
        return [];
    }
}

// Generalized: works for any domain given its verb dictionary + level map
function findLevelForWord(word, verbDictionary) {
    for (const level in verbDictionary) {
        if (verbDictionary[level].includes(word)) {
            return level;
        }
    }
    return "Not Found";
}

function getLevelIndex(level, levelMap, fallback) {
    const mapped = levelMap[level];
    if (mapped === undefined) {
        console.warn(`Warning: level "${level}" not found in levelMap, defaulting to ${fallback}`);
        return fallback;
    }
    return mapped;
}

// Psychomotor ambiguity heuristic (Section 2.3)
function resolvePsychomotorAmbiguity(text, matchedLevelName, levelMap) {
    const lowerText = text.toLowerCase();

    // 1. Scan for proficiency-qualifier phrase -> complex_overt_response
    for (const phrase of PROFICIENCY_QUALIFIERS) {
        if (lowerText.includes(phrase.toLowerCase())) {
            const level = "complex_overt_response";
            const levelIndex = levelMap[level] !== undefined ? levelMap[level] : 3;
            return { level, levelIndex, ruleFired: "proficiency" };
        }
    }

    // 2. Scan for guidance/imitation-qualifier phrase -> guided_response
    for (const phrase of GUIDANCE_QUALIFIERS) {
        if (lowerText.includes(phrase.toLowerCase())) {
            const level = "guided_response";
            const levelIndex = levelMap[level] !== undefined ? levelMap[level] : 5;
            return { level, levelIndex, ruleFired: "guidance" };
        }
    }

    // 3. Default to mechanism (middle safe default)
    const level = "mechanism";
    const levelIndex = levelMap[level] !== undefined ? levelMap[level] : 4;
    return { level, levelIndex, ruleFired: "default" };
}

// Generalized level finder across domains
exports.FindLevelInText = (text, domainKey, verbDictionary, levelMap = {}) => {
    const words = text.split(/\W+/);
    const wordResult = [];
    const levelResult = [];
    const maxLevelValue = Object.keys(levelMap).length + 1;
    let highestLevel = maxLevelValue;
    let highestVerb = null;
    let matchedLevelName = null;

    for (const word of words) {
        const lowerWord = word.toLowerCase();
        const level = findLevelForWord(lowerWord, verbDictionary);
        if (level !== "Not Found") {
            const levelIndex = getLevelIndex(level, levelMap, maxLevelValue);
            wordResult.push(word);
            levelResult.push(levelIndex);
            if (levelIndex < highestLevel) {
                highestLevel = levelIndex;
                highestVerb = word;
                matchedLevelName = level;
            }
        }
    }

    const matched = wordResult.length > 0;

    // Psychomotor ambiguity resolution
    if (domainKey === "psychomotor" && matched &&
        ["guided_response", "mechanism", "complex_overt_response"].includes(matchedLevelName)) {
        const resolved = resolvePsychomotorAmbiguity(text, matchedLevelName, levelMap);
        return {
            words: wordResult.join(", ") || "None",
            levels: levelResult.join(", ") || "None",
            highestLevel: resolved.levelIndex,
            highestVerb: highestVerb || "N/A",
            matchedLevelName: resolved.level,
            matched,
            ambiguityResolution: resolved.ruleFired
        };
    }

    return {
        words: wordResult.join(", ") || "None",
        levels: levelResult.join(", ") || "None",
        highestLevel: matched ? highestLevel : null,
        highestVerb: matched ? highestVerb : null,
        matchedLevelName: matched ? matchedLevelName : null,
        matched,
        ambiguityResolution: null
    };
};

// Backward-compatible wrapper for existing callers
exports.FindBloomLevelsInText = (text, bloomLevelMap, verbMap = bloomsTaxonomyVerbs) => {
    const result = exports.FindLevelInText(text, "cognitive", verbMap, bloomLevelMap);
    return {
        words: result.words,
        levels: result.levels,
        highestLevel: result.matched ? result.highestLevel : 6,
        highestVerb: result.highestVerb || "N/A"
    };
};

// Function to structurize and process the Excel data
exports.Structurize = (data, inputFile, levelMaps = {}, field) => {
    return new Promise((resolve, reject) => {
        try {
            const workbook = xlsx.readFile(inputFile);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convert the sheet into a JSON array
            const tableData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
            const verbMap = getVerbMapForField(field);

            // Extract level maps for each domain
            const cognitiveMap = levelMaps.cognitive || levelMaps;
            const affectiveMap = levelMaps.affective || {};
            const psychomotorMap = levelMaps.psychomotor || {};

            const StructurizedData = tableData.map(row => {
                const questionText = row.question || row.Question || row.QUESTION || '';
                
                if (!questionText) {
                    console.warn(`Missing question text for row: ${JSON.stringify(row)}`);
                    return null;
                }

                const cognitive = exports.FindLevelInText(
                    questionText, "cognitive", verbMap, cognitiveMap);
                const affective = exports.FindLevelInText(
                    questionText, "affective", krathwohlTaxonomyVerbs, affectiveMap);
                const psychomotor = exports.FindLevelInText(
                    questionText, "psychomotor", simpsonTaxonomyVerbs, psychomotorMap);

                const moduleNumber = row.Module !== undefined && row.Module !== null
                    ? String(row.Module).trim()
                    : 'N/A';

                // Extract verbs using Python spaCy
                const extractedVerbs = extractVerbsPython(questionText);

                return {
                    ...row,
                    Module: moduleNumber,
                    // Legacy flat fields for backward compatibility
                    "Bloom's Verbs": cognitive.words,
                    "Bloom's Taxonomy Level": cognitive.matched ? cognitive.highestLevel : 6,
                    "Bloom's Highest Verb": cognitive.highestVerb || "N/A",
                    "Extracted Verbs": extractedVerbs.join(', '),
                    // Nested DomainLevels source of truth
                    DomainLevels: { cognitive, affective, psychomotor }
                };
            }).filter(row => row !== null);

            resolve(StructurizedData);
        } catch (error) {
            reject(`Error processing the file: ${error.message}`);
        }
    });
};