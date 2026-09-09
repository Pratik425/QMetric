const fs = require('fs');
const { Readable } = require('stream');
const drive = require('./driveClient');

const folderIdCache = new Map(); // avoids repeat lookups within one server run

function sanitize(value, fallback = 'unknown') {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return cleaned || fallback;
}

async function findFolder(name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const q = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false and ${parentClause}`;
  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
  return res.data.files?.[0]?.id || null;
}

async function createFolder(name, parentId) {
  const resource = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {}),
  };
  const res = await drive.files.create({ resource, fields: 'id' });
  return res.data.id;
}

// Finds an existing folder by name under parentId, or creates it. Never creates a duplicate.
async function getOrCreateFolder(rawName, parentId) {
  const name = sanitize(rawName);
  const cacheKey = `${parentId || 'root'}::${name}`;
  if (folderIdCache.has(cacheKey)) return folderIdCache.get(cacheKey);

  let id = await findFolder(name, parentId);
  if (!id) id = await createFolder(name, parentId);

  folderIdCache.set(cacheKey, id);
  return id;
}

// Walks/creates a chain of folders, e.g. ['qmetric backup', 'paperinfo', 'iit bombay', 'data structures']
async function getOrCreateNestedFolders(names, startParentId = null) {
  let parentId = startParentId;
  for (const raw of names) {
    parentId = await getOrCreateFolder(raw, parentId);
  }
  return parentId;
}

async function findFileInFolder(name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const q = `name='${safeName}' and trashed=false and '${parentId}' in parents`;
  const res = await drive.files.list({ q, fields: 'files(id, name)' });
  return res.data.files?.[0]?.id || null;
}

// Uploads a local file (e.g. the uploaded question paper) to a folder; overwrites if same name exists.
async function uploadLocalFile({ name, parentId, localFilePath, mimeType }) {
  const media = { mimeType, body: fs.createReadStream(localFilePath) };
  const existingId = await findFileInFolder(name, parentId);
  if (existingId) {
    const res = await drive.files.update({ fileId: existingId, media, fields: 'id, name, webViewLink' });
    return res.data;
  }
  const res = await drive.files.create({
    resource: { name, parents: [parentId] },
    media,
    fields: 'id, name, webViewLink',
  });
  return res.data;
}

// Uploads a JSON object as a .json file; overwrites if same name exists.
async function uploadJSON({ name, parentId, data }) {
  const body = Readable.from(Buffer.from(JSON.stringify(data, null, 2)));
  const media = { mimeType: 'application/json', body };
  const existingId = await findFileInFolder(name, parentId);
  if (existingId) {
    const res = await drive.files.update({ fileId: existingId, media, fields: 'id, name, webViewLink' });
    return res.data;
  }
  const res = await drive.files.create({
    resource: { name, parents: [parentId] },
    media,
    fields: 'id, name, webViewLink',
  });
  return res.data;
}

module.exports = { sanitize, getOrCreateFolder, getOrCreateNestedFolders, uploadLocalFile, uploadJSON };