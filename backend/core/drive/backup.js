const path = require('path');
const { sanitize, getOrCreateNestedFolders, uploadLocalFile, uploadJSON } = require('./driveService');

const ROOT = 'qmetric backup';
const USERS_DIR = 'users';
const PAPERINFO_DIR = 'paperinfo';

async function backupUserToDrive(user) {
  const parentId = await getOrCreateNestedFolders([ROOT, USERS_DIR]);
  const fileName = `user_${user._id}.json`;
  const data = {
    _id: user._id,
    userName: sanitize(user.userName),
    email: sanitize(user.email),
    createdAt: user.createdAt,
  }; // password intentionally excluded
  return uploadJSON({ name: fileName, parentId, data });
}

// formData: same object saved into PaperInfo. localFilePath: req.file.path. fileExtension: e.g. '.xlsx'
async function backupPaperToDrive(formData, localFilePath, fileExtension) {
  const collegeName = sanitize(formData['College Name']);
  const subject = sanitize(formData['Course Name']);        // "Subject" folder
  const nameSlug = sanitize(formData['Course Code']);        // {name} in filename
  const year = sanitize(formData['Year Of Study']);          // {year} in filename

  const parentId = await getOrCreateNestedFolders([ROOT, PAPERINFO_DIR, collegeName, subject]);
  const fileName = `${nameSlug}_${year}${fileExtension.toLowerCase()}`;

  return uploadLocalFile({
    name: fileName,
    parentId,
    localFilePath,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

module.exports = { backupUserToDrive, backupPaperToDrive };