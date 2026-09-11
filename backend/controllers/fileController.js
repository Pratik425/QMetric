//version2
const path = require("path");
const fs = require("fs");
const { Structurize } = require("../core/Regex/Regex");
const PaperInfo = require("../Model/PaperInfo");
const { Evaluate, EvaluateAllDomains } = require("../core/evaluate/evaluate");
const { backupPaperToDrive } = require('../core/drive/backup');
const { DOMAINS, LEVEL_TO_DOMAIN } = require("../core/config/domainRegistry");
const { buildLevelMap } = require("../core/utils/levelMapBuilder");

exports.convertToText = async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "No file uploaded." });
  }

  const { userId } = req.user;

  console.log("✅ Received POST /upload/totext");
  console.log("req.body keys:", Object.keys(req.body));
  console.log("req.body.FormData (raw):", req.body.FormData);
  console.log("req.body.Sequence (raw):", req.body.Sequence);
  console.log("req.file:", req.file);
  console.log("userId:", userId);

  const inputFileName = req.file.originalname;
  const fileExtension = path.extname(inputFileName).toLowerCase();
  const supportedExtensions = [".xlsx"];

  if (!supportedExtensions.includes(fileExtension)) {
    return res.status(400).send({
      error: "Invalid File Format",
      message: "Only Excel files (.xlsx) are supported.",
    });
  }

  try {
    const outputDir = path.join(__dirname, "../Converted");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await saveToDB(
      userId,
      req.body.Sequence,
      req.body.FormData,
      req.file.path,
    );
    if (result.error) {
      return res.status(500).send(result);
    }

    return res.send(result);
  } catch (error) {
    console.error("Error during conversion or DB save:", error);
    return res
      .status(500)
      .send({ error: "Server error while processing file" });
  }
};

const saveToDB = async (userId, Sequence, FormData, filePath) => {
  try {
    // Step 1: Safely Parse Input JSON
    let sequenceArray, formData;

    try {
      sequenceArray = JSON.parse(Sequence);
      formData = JSON.parse(FormData);
    } catch (parseErr) {
      console.error("Error parsing JSON:", parseErr);
      return { error: "Invalid JSON in Sequence or FormData" };
    }

    const coWeights = {};
    const moduleHours = {};
    const coDetails = {};
    const usedLevelsByDomain = {
      cognitive: new Set(),
      affective: new Set(),
      psychomotor: new Set()
    };

    // Step 2: Parse raw Sequence into coDetails bucketed by domain
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
          // Normalization: lowercase, trim, whitespace -> underscore
          const level = raw.toLowerCase().trim().replace(/\s+/g, "_");
          const domain = LEVEL_TO_DOMAIN[level];
          if (!domain) {
            console.warn(`Unknown level "${raw}" on ${coKey} — ignored. Must match a known level name across the 3 domains.`);
            return;
          }
          if (levelsByDomain[domain] !== null) {
            console.warn(`${coKey} declares multiple levels for domain "${domain}" (already has "${levelsByDomain[domain]}", ignoring "${level}"). Only the first is used.`);
            return;
          }
          levelsByDomain[domain] = level;
          usedLevelsByDomain[domain].add(level);
        });

        const legacyBlooms = levelsByDomain.cognitive ? [levelsByDomain.cognitive] : [];

        coWeights[coKey] = weight;
        coDetails[coKey] = {
          weight,
          blooms: legacyBlooms,
          levelsByDomain
        };
      } else if (item.type === "Module") {
        moduleHours[`M${number}`] = parseFloat(item.hours || 0);
      }
    });

    // Step 3: Build a dynamic level map PER DOMAIN (Decision #8)
    const levelMaps = {};
    Object.values(DOMAINS).forEach((domainCfg) => {
      levelMaps[domainCfg.key] = buildLevelMap(domainCfg.naturalOrder, usedLevelsByDomain[domainCfg.key]);
    });

    console.log("Used Levels By Domain:", {
      cognitive: Array.from(usedLevelsByDomain.cognitive),
      affective: Array.from(usedLevelsByDomain.affective),
      psychomotor: Array.from(usedLevelsByDomain.psychomotor)
    });
    console.log("Dynamic Level Maps:", levelMaps);

    // Step 4: Process Question Data across all domains
    const questionData = await Structurize([], filePath, levelMaps, formData.Field);

    // Step 5: Evaluate all domains
    const { results, overview } = EvaluateAllDomains(
      questionData,
      coDetails,
      moduleHours,
      levelMaps
    );

    // Step 6: Save Data to MongoDB
    const paper = new PaperInfo({
      "College Name": formData["College Name"],
      Field: formData.Field,
      Branch: formData.Branch,
      "Year Of Study": formData["Year Of Study"],
      Semester: formData.Semester,
      "Course Name": formData["Course Name"],
      "Course Code": formData["Course Code"],
      "Course Teacher": formData["Course Teacher"],
      Sequence: {
        COs: coDetails,
        ModuleHours: moduleHours,
      },
      // Backward compatibility mirrors:
      "Collected Data": results.cognitive && results.cognitive.hasData ? results.cognitive : {},
      blommLevelMap: levelMaps.cognitive || {},

      // New multi-domain fields:
      DomainResults: results,
      LevelMaps: levelMaps,
      DomainOverview: overview,

      userId: userId,
    });

    await paper.save();
    try {
      await backupPaperToDrive(formData, filePath, path.extname(filePath));
    } catch (driveErr) {
      console.error('Drive backup failed (paper still saved to DB):', driveErr.message);
    }
    return { results, overview, id: paper._id, _id: paper._id };
  } catch (error) {
    console.error("❌ ERROR INSIDE saveToDB");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return {
      error: "Failed to process and save data",
      details: error.message,
    };
  }
};

exports.getResults = async (req, res) => {
  try {
    // Safely destructure userId from req.user, fallback to 'anonymous' if req.user is undefined
    const { userId } = req.user || { userId: "anonymous" };
    // console.log(userId)

    // Get all results for this user
    const userResults = await PaperInfo.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (userResults.length === 0) {
      return res.status(404).json({
        error: "No results found",
        message: "No analysis results found for your account",
      });
    }

    // Return the most recent result
    const latestResult = userResults[0];
    const { extractedText, ...responseData } = latestResult;

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Get results error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve results",
    });
  }
};

// exports.getResults = async(req, res) => {
//   try{
//     const id = req.params.id;
//     console.log(id);
//     const paper = await PaperInfo.findById(id);
//     res.status(200).json(paper);
//   } catch(error){
//     res.status(500).json({message: error.message})
//   }
// };

exports.getResultsById = async (req, res) => {
  try {
    // Safely destructure userId from req.user, fallback to 'anonymous' if req.user is undefined
    const { userId } = req.user || { userId: "anonymous" };

    // Get all results for this user
    const userResults = await PaperInfo.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (userResults.length === 0) {
      return res.status(404).json({
        error: "No results found",
        message: "No analysis results found for your account",
      });
    }

    // Return the most recent result
    const results = userResults.map(({ extractedText, ...rest }) => rest);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Get results error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve results",
    });
  }
};

exports.searchPapers = async (req, res) => {
  try {
    const { userId } = req.user;
    const { query } = req.body;

    const searchRegex = new RegExp(query, "i");

    const papers = await PaperInfo.find({
      userId: userId,
      $or: [
        { "College Name": searchRegex },
        { Branch: searchRegex },
        { "Course Name": searchRegex },
        { "Course Code": searchRegex },
      ],
    });

    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
