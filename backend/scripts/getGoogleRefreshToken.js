require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5555/oauth2callback'
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('Open this URL, sign in with your college email, then approve:\n', authUrl);

http.createServer(async (req, res) => {
  const q = url.parse(req.url, true).query;
  if (q.code) {
    const { tokens } = await oAuth2Client.getToken(q.code);
    console.log('\nAdd this to your .env as GOOGLE_REFRESH_TOKEN:\n', tokens.refresh_token);
    res.end('Done — check your terminal. You can close this tab.');
    process.exit(0);
  }
}).listen(5555);