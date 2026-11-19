// //v2
// const { FindBloomLevelsInText } = require("../Regex/Regex");
// const { generateBloomRecommendations } = require("../recommendation/bloomRecommendation");
// const { generateCORecommendations } = require("../recommendation/coWeightageRecommendation");
// const { generateModuleRecommendations } = require("../recommendation/moduleWeightageRecommendation");

// // Normalize sequence data to ensure the sum of all weights is 100
// function Normalize(seqData) {
//     let sum = seqData.reduce((acc, item) => acc + (+item.M), 0);
//     if (sum === 100) return seqData;
//     if (!sum || isNaN(sum)) return seqData;

//     return seqData.map(item => {
//         item.M = !isNaN(mark) ? (mark / sum) * 100 : 0;
//         return item;
//     });
// }

// // Function to handle Module Hours Penalty
// function calculateModulePenalty(ModuleWeights) {
//     let C2 = 0;
//     let n = ModuleWeights.length;
//     ModuleWeights.forEach(item => {
//         const diff = (item.expected - item.actual) / item.expected;
//         if (diff >= 0) {
//             C2 += diff;
//         }
//     });
//     return C2/n;
// }

// // Function to handle CO Penalty
// function calculateCOPenalty(dataArray, CO_Map) {
//     let C3 = 0;    

//     dataArray.forEach(item => {
//         const coKey = item[0]; 
//         const coNumber = coKey.replace('CO', '');
//         const actualScore = CO_Map[coNumber] || 0; 
//         const expectedWeight = item[1].weight;  
//         const diff = (expectedWeight - actualScore) / expectedWeight || 0;
        
//         if (diff > 0) {
//             C3 += diff;
//         }
//     });

//     const COCount = Object.keys(CO_Map).length;  
//     return COCount > 0 ? C3 / COCount : 0;  
// }    


// function obtainD(QHBTL, COBTL, returnRemark = false) {
//     const D = QHBTL - COBTL;
//     let qScore = 0;
//     let remark = "";

//     if (D === 0 || D === -1) {
//         remark = "Matches Expected Blooms Level";
//         qScore = 1;
//     } else if (D < -1) {
//         remark = "Higher than Expected Blooms Level";
//         qScore = 2;
//     } else if(D === 1) {
//         remark = "Lower than Expected Blooms Level";
//         qScore = -1;
//     } else {
//         remark = "Lower than Expected Blooms Level";
//         qScore = -1;
//     }

//     return returnRemark ? { qScore, remark } : qScore;
// }


// // Main Evaluation function
// exports.Evaluate = (SequenceData, pre_data, Module_Hrs, bloomLevelMap) => {
//     let ModuleWeights = [];
//     let checkModule = true;

//     // Assuming bloomLevelMap is available

// const BT_Weights = {
//     1: { level: 1, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
//     2: { level: 2, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
//     3: { level: 3, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
//     4: { level: 4, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
// };

// // Sort pre_data by weight (descending)
// const dataArray = Object.entries(pre_data).sort((a, b) => {
//     return b[1].weight - a[1].weight; // Sort by weight
// });

// // Fill BT_Weights based on the bloomLevelMap
// dataArray.forEach(([co, data]) => {
//     const bloomKey = data.blooms[0]?.toLowerCase();
//     const bloomLevel = bloomLevelMap[bloomKey];
//     if (bloomLevel) {
//         BT_Weights[bloomLevel].weights += data.weight;
//         BT_Weights[bloomLevel].name = data.blooms[0]; // Add Bloom's level name
//     }

//     // Get all Bloom level names mapped to level 4
//     const level4Names = Object.entries(bloomLevelMap)
//         .filter(([name, level]) => level === 4)
//         .map(([name]) => name);

//     // Use level4Names as the name for level 4 wherever needed
//     BT_Weights[4].name = level4Names.join(', ');

// });


//     // Handle module hours
//     if (Module_Hrs && typeof Module_Hrs === 'object' && !Array.isArray(Module_Hrs)) {
//         let totalHrs = Object.values(Module_Hrs).reduce((sum, hrs) => sum + (+hrs || 0), 0);

//         if (totalHrs > 0) {
//             Object.keys(Module_Hrs).forEach(module => {
//                 let moduleHours = +Module_Hrs[module];
//                 ModuleWeights.push({
//                     expected: (moduleHours / totalHrs) * 100,
//                     actual: 0
//                 });
//             });
//         } else {
//             checkModule = false;
//         }
//     } else {
//         checkModule = false;
//     }

//     SequenceData = Normalize(SequenceData);

//     let QT_Map = {}, CO_Map = {};
//     let QP = 0, QPMin = 0, QPMax = 0;
//     let questionRecommendations = [];

//     SequenceData.forEach(i => {
//         QT_Map[i["Question Type"]] = (QT_Map[i["Question Type"]] || 0) + 1;

//         const co = parseInt(i.CO.match(/\d+/)[0]);
//         const coKey = `CO${co}`;
//         const coBloom = (pre_data[coKey]?.blooms?.[0] || "").toLowerCase();
//         const COBTL = bloomLevelMap[coBloom] || 4;

//         const QHBTL = BT_Weights[i["Bloom's Taxonomy Level"]].level;

//         const{qScore, remark} = obtainD(QHBTL,COBTL,true);
//         i["Remark"] = remark;
//         QP += qScore;
//         QPMax += obtainD(1,COBTL);
//         QPMin += obtainD(4,COBTL);


//         const extractedVerb = i["Bloom's Verbs"] || "";
//         // Get the highest verb (Bloom's level name) for this question
//         const highestVerb =i["Bloom's Highest Verb"] || "N/A";

//         // Create recommendation object for this question
//         questionRecommendations.push({
//             QuestionData: i["Question No"] || i["Question"],
//             marks: +i.Marks,
//             co: coKey,
//             qScore: qScore,
//             extractedVerb: extractedVerb,
//             highestVerb: highestVerb,
//             remark: remark
//         });
              
//         BT_Weights[i["Bloom's Taxonomy Level"]].marks += (+i.Marks);
//         BT_Weights[i["Bloom's Taxonomy Level"]].No_Of_Questions++;
//         CO_Map[co] = (CO_Map[co] || 0) + (+i.Marks);

//         if (checkModule && i.Module) {
//             const match = i.Module.match(/\d+\.\d+|\d+/);
//             if (match) {
//                 const moduleNumber = parseFloat(match[0]);
//                 const moduleIndex = moduleNumber - 1;
//                 if (ModuleWeights[moduleIndex]) {
//                     ModuleWeights[moduleIndex].actual += (+i.Marks);
//                 }
//             }
//         }
//     });

//     // console.log("QP: ",QP);
//     // console.log("QPMax: ",QPMax);
//     // console.log("QPMin: ",QPMin);

//     // Normalize QP score
//     const QP_Final = ((QP - QPMin) / ((QPMax - QPMin) || 1)) * 100;

//     console.log("QP_Final: ",QP_Final);

//     // Penalty Calculations
//     const C2 = checkModule ? calculateModulePenalty(ModuleWeights) : 0;
//     const C3 = calculateCOPenalty(dataArray, CO_Map);

//     const P_Final = checkModule ? (C2 + C3) / 2 : C3;
//     console.log("P_Final: ",P_Final);
//     const PF_Percentage = (P_Final / 2) * 100;

//     const FinalScore = parseFloat(((QP_Final + (100 - PF_Percentage)) / 2).toFixed(2));

//     console.log("Final Score: ", FinalScore);

//     console.log("BT_Weights: ", BT_Weights);

//       // Generate recommendations and log them
//     // const bloomRecommendations = generateBloomRecommendations(SequenceData, pre_data, bloomLevelMap, CO_Map);
//     // console.log("Bloom Recommendations:", bloomRecommendations); 

//     const coRecommendations = generateCORecommendations(pre_data, CO_Map);
//     console.log("CO Recommendations:", coRecommendations); 

//     const moduleRecommendations = generateModuleRecommendations(ModuleWeights);
//     console.log("Module Recommendations:", moduleRecommendations); 

//     console.log("Question Recommendations:", questionRecommendations);


//     return {
//         QuestionData: SequenceData,
//         ModuleData: ModuleWeights,
//         BloomsData: BT_Weights,
//         COData: CO_Map,
//         FinalScore,
//         // BloomRecommendations: bloomRecommendations,
//         CORecommendations: coRecommendations,
//         ModuleRecommendations: moduleRecommendations,
//         QuestionRecommendations: questionRecommendations
//     };
// };

//Version 3
//v3
const { generateCORecommendations } = require("../recommendation/coWeightageRecommendation");
const { generateModuleRecommendations } = require("../recommendation/moduleWeightageRecommendation");
const { DOMAINS } = require("../config/domainRegistry");

// Normalize sequence data to ensure the sum of all weights is 100
function Normalize(seqData) {
    const getMark = (item) => {
        const val = item.Marks !== undefined && item.Marks !== "" ? item.Marks : item.M;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    let sum = seqData.reduce((acc, item) => acc + getMark(item), 0);
    if (!sum || isNaN(sum)) return seqData;

    return seqData.map(item => {
        const mark = getMark(item);
        item.M = (mark / sum) * 100;
        return item;
    });
}

// Function to handle Module Hours Penalty
function calculateModulePenalty(ModuleWeights) {
    let C2 = 0;
    let n = ModuleWeights.length;
    if (n === 0) return 0;
    ModuleWeights.forEach(item => {
        const diff = item.expected > 0 ? (item.expected - item.actual) / item.expected : 0;
        if (diff >= 0) {
            C2 += diff;
        }
    });
    return C2 / n;
}

// Function to handle CO Penalty
function calculateCOPenalty(dataArray, CO_Map) {
    let C3 = 0;    
    const totalWeight = dataArray.reduce((acc, item) => acc + (item[1].weight || 0), 0);

    dataArray.forEach(item => {
        const coKey = item[0]; 
        const coNumber = coKey.replace('CO', '');
        const actualScore = CO_Map[coNumber] || 0; 
        const expectedWeight = totalWeight > 0 ? (item[1].weight / totalWeight) * 100 : 0;  
        const diff = expectedWeight > 0 ? (expectedWeight - actualScore) / expectedWeight : 0;
        
        if (diff > 0) {
            C3 += diff;
        }
    });

    const COCount = dataArray.length;  
    return COCount > 0 ? C3 / COCount : 0;  
}    

function obtainD(QHBTL, COBTL, returnRemark = false) {
    const D = QHBTL - COBTL;
    let qScore = 0;
    let remark = "";

    if (D === 0 || D === -1) {
        remark = "Matches Expected Blooms Level";
        qScore = 1;
    } else if (D < -1) {
        remark = "Higher than Expected Blooms Level";
        qScore = 2;
    } else if (D >= 1) {
        remark = "Lower than Expected Blooms Level";
        qScore = -1;
    }

    return returnRemark ? { qScore, remark } : qScore;
}

// Evaluates a single domain
exports.EvaluateDomain = (SequenceData, pre_data, Module_Hrs, levelMap = {}, domainConfig) => {
    const domainKey = domainConfig.key;

    // 1. Extract COs that declare this domain
    const relevantCODetails = {};
    Object.entries(pre_data).forEach(([coKey, details]) => {
        let domainLevel = null;
        if (details.levelsByDomain && details.levelsByDomain[domainKey]) {
            domainLevel = details.levelsByDomain[domainKey];
        } else if (domainKey === "cognitive" && details.blooms && details.blooms.length > 0) {
            domainLevel = (details.blooms[0] || "").toLowerCase();
        }
        if (domainLevel) {
            relevantCODetails[coKey] = {
                weight: details.weight,
                expectedLevel: domainLevel
            };
        }
    });

    // 2. Early exit: no applicable COs declared for this domain
    if (Object.keys(relevantCODetails).length === 0) {
        return {
            domain: domainKey,
            hasData: false,
            message: `No ${domainKey} domain content declared in this paper's Course Outcomes.`
        };
    }

    // 3. Filter relevant questions (linked to relevant CO AND matching domain verbs)
    const relevantQuestions = SequenceData.filter((question) => {
        if (!question.CO) return false;
        const match = String(question.CO).match(/\d+/);
        if (!match) return false;
        const coKey = `CO${parseInt(match[0])}`;
        const coIsRelevant = Object.prototype.hasOwnProperty.call(relevantCODetails, coKey);

        let domainResult = question.DomainLevels && question.DomainLevels[domainKey];
        if (!domainResult && domainKey === "cognitive") {
            const matched = question["Bloom's Taxonomy Level"] !== undefined && question["Bloom's Taxonomy Level"] !== null;
            domainResult = {
                matched,
                highestLevel: question["Bloom's Taxonomy Level"],
                highestVerb: question["Bloom's Highest Verb"] || "N/A",
                words: question["Bloom's Verbs"] || ""
            };
        }
        const verbMatched = Boolean(domainResult && domainResult.matched === true);
        return coIsRelevant && verbMatched;
    });

    // 4. Early exit: COs declare this domain, but no questions contained matching verbs
    if (relevantQuestions.length === 0) {
        return {
            domain: domainKey,
            hasData: false,
            message: `${domainKey} domain is declared on this paper's COs, but no questions contained matching ${domainKey} verbs.`
        };
    }

    // 5. Domain-local marks normalization
    const normalizedQuestions = Normalize(relevantQuestions.map(q => ({ ...q })));

    // 6. Setup dynamic LevelData structure
    const naturalOrder = domainConfig.naturalOrder;
    const maxLevel = naturalOrder.length;
    const LevelData = {};
    for (let l = 1; l <= maxLevel; l++) {
        LevelData[l] = { level: l, name: "", weights: 0, marks: 0, penalty: 0, No_Of_Questions: 0 };
    }

    const levelToNameMap = {};
    Object.entries(levelMap).forEach(([name, level]) => {
        if (!levelToNameMap[level]) {
            levelToNameMap[level] = [];
        }
        levelToNameMap[level].push(name);
    });

    Object.keys(LevelData).forEach(level => {
        const levelNum = parseInt(level);
        if (levelToNameMap[levelNum]) {
            LevelData[levelNum].name = levelToNameMap[levelNum].join(', ');
        }
    });

    const dataArray = Object.entries(relevantCODetails).sort((a, b) => b[1].weight - a[1].weight);
    const totalCOWeight = dataArray.reduce((acc, item) => acc + (item[1].weight || 0), 0);

    dataArray.forEach(([coKey, data]) => {
        const expectedLevel = data.expectedLevel;
        const lvlNum = levelMap[expectedLevel];
        if (lvlNum && LevelData[lvlNum]) {
            const normalizedWeight = totalCOWeight > 0 ? (data.weight / totalCOWeight) * 100 : 0;
            LevelData[lvlNum].weights += normalizedWeight;
        }
    });

    // 7. Handle module hours (Cognitive only)
    let ModuleWeights = [];
    let checkModule = domainConfig.applyModulePenalty === true;
    if (checkModule && Module_Hrs && typeof Module_Hrs === 'object' && !Array.isArray(Module_Hrs)) {
        let totalHrs = Object.values(Module_Hrs).reduce((sum, hrs) => sum + (+hrs || 0), 0);

        if (totalHrs > 0) {
            Object.keys(Module_Hrs).forEach(module => {
                let moduleHours = +Module_Hrs[module];
                ModuleWeights.push({
                    expected: (moduleHours / totalHrs) * 100,
                    actual: 0
                });
            });
        } else {
            checkModule = false;
        }
    } else {
        checkModule = false;
    }

    let QT_Map = {}, CO_Map = {};
    let QP = 0, QPMin = 0, QPMax = 0;
    let questionRecommendations = [];

    normalizedQuestions.forEach(i => {
        if (i["Question Type"]) {
            QT_Map[i["Question Type"]] = (QT_Map[i["Question Type"]] || 0) + 1;
        }

        const co = parseInt(String(i.CO).match(/\d+/)[0]);
        const coKey = `CO${co}`;
        const expectedLevel = relevantCODetails[coKey].expectedLevel;
        const COBTL = levelMap[expectedLevel] || maxLevel;

        const domainResult = (i.DomainLevels && i.DomainLevels[domainKey])
            ? i.DomainLevels[domainKey]
            : { highestLevel: parseInt(i["Bloom's Taxonomy Level"]), words: i["Bloom's Verbs"], highestVerb: i["Bloom's Highest Verb"] };

        let QHBTL = domainResult.highestLevel;
        if (QHBTL === null || QHBTL === undefined || QHBTL < 1 || QHBTL > maxLevel) {
            throw new Error(`Internal error: unfiltered/invalid level reached scoring for domain ${domainKey}, question ${JSON.stringify(i["Question No"] || i.Question)}`);
        }

        const { qScore, remark } = obtainD(QHBTL, COBTL, true);
        i["Remark"] = remark;
        QP += qScore;
        QPMax += obtainD(1, COBTL);
        QPMin += obtainD(maxLevel, COBTL);

        const extractedVerb = domainResult.words || "";
        const highestVerb = domainResult.highestVerb || "N/A";
        const levelName = LevelData[QHBTL]?.name || domainResult.matchedLevelName || "Unknown";
        const questionMark = i.M !== undefined && !isNaN(+i.M) ? +i.M : (+i.Marks || 0);

        questionRecommendations.push({
            QuestionData: i["Question No"] || i["Question"],
            marks: +i.Marks || questionMark,
            co: coKey,
            qScore: qScore,
            extractedVerb: extractedVerb,
            highestVerb: highestVerb,
            level: QHBTL,
            levelName: levelName,
            remark: remark
        });

        LevelData[QHBTL].marks += questionMark;
        LevelData[QHBTL].No_Of_Questions++;
        CO_Map[co] = (CO_Map[co] || 0) + questionMark;

        if (checkModule && i.Module) {
            const match = String(i.Module).match(/\d+\.\d+|\d+/);
            if (match) {
                const moduleNumber = parseFloat(match[0]);
                const moduleIndex = moduleNumber - 1;
                if (ModuleWeights[moduleIndex]) {
                    ModuleWeights[moduleIndex].actual += questionMark;
                }
            }
        }
    });

    const QP_Final = ((QP - QPMin) / ((QPMax - QPMin) || 1)) * 100;
    const C2 = checkModule ? calculateModulePenalty(ModuleWeights) : 0;
    const C3 = calculateCOPenalty(dataArray, CO_Map);
    const P_Final = checkModule ? (C2 + C3) / 2 : C3;
    const PF_Percentage = (P_Final / 2) * 100;
    const FinalScore = parseFloat(((QP_Final + (100 - PF_Percentage)) / 2).toFixed(2));

    const coRecommendations = generateCORecommendations(relevantCODetails, CO_Map);
    const moduleRecommendations = checkModule ? generateModuleRecommendations(ModuleWeights) : [];

    return {
        domain: domainKey,
        hasData: true,
        QuestionData: normalizedQuestions,
        ModuleData: ModuleWeights,
        LevelData: LevelData,
        BloomsData: LevelData, // backward compatibility
        COData: CO_Map,
        FinalScore,
        CORecommendations: coRecommendations,
        ModuleRecommendations: moduleRecommendations,
        QuestionRecommendations: questionRecommendations
    };
};

// Orchestrates evaluation across all domains
exports.EvaluateAllDomains = (SequenceData, coDetails, moduleHours, levelMaps = {}) => {
    const results = {};
    Object.values(DOMAINS).forEach((domainCfg) => {
        results[domainCfg.key] = exports.EvaluateDomain(
            SequenceData,
            coDetails,
            moduleHours,
            levelMaps[domainCfg.key] || {},
            domainCfg
        );
    });

    // Decision #10 — lightweight overview object
    const overview = {};
    Object.values(DOMAINS).forEach((domainCfg) => {
        const r = results[domainCfg.key];
        overview[domainCfg.key] = {
            hasData: r.hasData,
            finalScore: r.hasData ? r.FinalScore : null,
            coCount: r.hasData
                ? Object.keys(coDetails).filter((k) => {
                    const d = coDetails[k];
                    return d.levelsByDomain ? Boolean(d.levelsByDomain[domainCfg.key]) : (domainCfg.key === "cognitive" && d.blooms && d.blooms.length > 0);
                }).length
                : 0,
            questionCount: r.hasData ? r.QuestionData.length : 0
        };
    });

    return { results, overview };
};

// Backward-compatible wrapper for existing callers
exports.Evaluate = (SequenceData, pre_data, Module_Hrs, bloomLevelMap) => {
    return exports.EvaluateDomain(
        SequenceData,
        pre_data,
        Module_Hrs,
        bloomLevelMap,
        DOMAINS.cognitive
    );
};