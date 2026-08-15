const fs = require('fs');
var express = require('express');
var router = express.Router();
const authenticateToken = require('../core/auth/utilities')
let fileController=require("../controllers/fileController");
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const uploadDir = path.join(__dirname, "../uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);

    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + fileExt
    );
  },
});

const upload = multer({ storage });

router.post(
    '/totext',

    authenticateToken,

    (req, res, next) => {
        console.log("🔥 AUTH PASSED");
        console.log("Content-Type:", req.headers["content-type"]);
        next();
    },

    (req, res, next) => {
        console.log("🔥 STARTING MULTER");

        upload.single("file")(req, res, (err) => {

            if (err) {
                console.error("❌❌❌ MULTER ERROR ❌❌❌");
                console.error("Error:", err);
                console.error("Message:", err.message);
                console.error("Code:", err.code);

                return res.status(500).json({
                    success: false,
                    error: "Multer failed",
                    message: err.message,
                    code: err.code
                });
            }

            console.log("✅ MULTER FINISHED");

            console.log("req.file:", req.file);
            console.log("req.body:", req.body);

            next();
        });
    },

    (req, res, next) => {
        console.log("🔥 CONTROLLER ABOUT TO RUN");
        next();
    },

    fileController.convertToText
);
router.get('/totext', authenticateToken, fileController.getResults);
// router.get('/totext/:id', authenticateToken, fileController.getResults);
router.get('/all', authenticateToken, fileController.getResultsById);
router.post ('/search', authenticateToken, fileController.searchPapers);

router.get('/test', (req, res) => {
  res.send('File route is working!');
});

module.exports = router;
