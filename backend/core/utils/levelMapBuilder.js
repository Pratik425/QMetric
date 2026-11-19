// backend/core/utils/levelMapBuilder.js

/**
 * Dynamically assigns 1..N numbering to a domain's levels:
 * levels actually used (in their natural taxonomic order) get numbered
 * first, then any unused levels fill in the remaining numbers afterward.
 * This generalizes the existing cognitive-only logic from
 * fileController.js.
 *
 * @param {string[]} naturalOrderLevels - full ordered list of level names for this domain
 * @param {Set<string>|Array<string>} usedLevels - the subset actually referenced by this paper's COs
 * @returns {Object<string, number>} levelName -> numeric rank (1-indexed)
 */
function buildLevelMap(naturalOrderLevels, usedLevels = new Set()) {
  const levelMap = {};
  const usedSet = usedLevels instanceof Set ? usedLevels : new Set(usedLevels || []);

  const sortedUsed = naturalOrderLevels.filter((level) => usedSet.has(level));
  sortedUsed.forEach((level, index) => {
    levelMap[level] = index + 1;
  });

  let nextRank = sortedUsed.length + 1;
  naturalOrderLevels.forEach((level) => {
    if (!levelMap[level] && nextRank <= naturalOrderLevels.length) {
      levelMap[level] = nextRank;
      nextRank++;
    }
  });

  // Defensive fallback in case any unassigned
  naturalOrderLevels.forEach((level) => {
    if (!levelMap[level]) {
      levelMap[level] = naturalOrderLevels.length;
    }
  });

  return levelMap;
}

module.exports = { buildLevelMap };
