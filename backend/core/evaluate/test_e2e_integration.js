// backend/core/evaluate/test_e2e_integration.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const assert = require('assert');

const User = require('../../Model/user');
const PaperInfo = require('../../Model/PaperInfo');
const fileController = require('../../controllers/fileController');
const { Structurize } = require('../Regex/Regex');

async function runE2ETest() {
    console.log('🚀 Starting End-to-End Integration Test...\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let testUser = await User.findOne();
    if (!testUser) {
        testUser = new User({
            userName: "Integration User",
            email: "integration@test.com",
            password: "password123"
        });
        await testUser.save();
    }
    const userId = testUser._id;

    // 1. Create a test Excel workbook
    const testExcelPath = path.join(__dirname, '../../uploads/e2e_test_paper.xlsx');
    const questionsData = [
        {
            "Question No": 1,
            "Question": "Calculate the operating efficiency of electric drives.",
            "CO": "CO1",
            "Module": "1",
            "Marks": 20
        },
        {
            "Question No": 2,
            "Question": "Explain and justify your engineering design choices.",
            "CO": "CO1",
            "Module": "1",
            "Marks": 30
        },
        {
            "Question No": 3,
            "Question": "Assemble the control circuitry skillfully within time limits.",
            "CO": "CO2",
            "Module": "2",
            "Marks": 50
        }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(questionsData);
    xlsx.utils.book_append_sheet(wb, ws, "Questions");
    xlsx.writeFile(wb, testExcelPath);
    console.log('Created test Excel file:', testExcelPath);

    const sequence = JSON.stringify([
        { name: "CO1", type: "CO", weight: 50, blooms: ["understand", "valuing"] },
        { name: "CO2", type: "CO", weight: 50, blooms: ["mechanism"] },
        { name: "Module1", type: "Module", hours: 10 },
        { name: "Module2", type: "Module", hours: 15 }
    ]);

    const formData = JSON.stringify({
        "College Name": "Apex Engineering Institute",
        "Field": "Engineering",
        "Branch": "Electrical Engineering",
        "Year Of Study": "3rd Year",
        "Semester": "6th",
        "Course Name": "Advanced Power Systems",
        "Course Code": "EE601",
        "Course Teacher": "Dr. Sarah Connor"
    });

    // 2. Test controller conversion / saveToDB
    const req = {
        user: { userId },
        file: {
            originalname: "e2e_test_paper.xlsx",
            path: testExcelPath
        },
        body: {
            Sequence: sequence,
            FormData: formData
        }
    };

    let sentData = null;
    let statusCode = 200;
    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        send: (data) => {
            sentData = data;
            return res;
        },
        json: (data) => {
            sentData = data;
            return res;
        }
    };

    await fileController.convertToText(req, res);

    assert.strictEqual(statusCode, 200, `Expected 200 status, got ${statusCode}`);
    assert(sentData !== null, 'Response data should not be null');
    assert(sentData.results, 'Response should contain results');
    assert(sentData.overview, 'Response should contain overview');

    console.log('\n📊 Evaluation Overview:', JSON.stringify(sentData.overview, null, 2));

    // Verify all 3 domains have evaluation results
    assert.strictEqual(sentData.overview.cognitive.hasData, true, 'Cognitive should have data');
    assert.strictEqual(sentData.overview.affective.hasData, true, 'Affective should have data');
    assert.strictEqual(sentData.overview.psychomotor.hasData, true, 'Psychomotor should have data');

    assert.strictEqual(sentData.overview.cognitive.questionCount, 2, 'Q1 and Q2 should be in Cognitive');
    assert.strictEqual(sentData.overview.affective.questionCount, 1, 'Q2 should be in Affective');
    assert.strictEqual(sentData.overview.psychomotor.questionCount, 1, 'Q3 should be in Psychomotor');

    // 3. Verify Database Record
    const savedDoc = await PaperInfo.findOne({ userId }).sort({ createdAt: -1 });
    assert(savedDoc, 'Saved PaperInfo document should exist');

    assert.strictEqual(savedDoc["College Name"], "Apex Engineering Institute");
    assert(savedDoc.DomainResults.cognitive.hasData, 'DB DomainResults.cognitive should have data');
    assert(savedDoc.DomainResults.affective.hasData, 'DB DomainResults.affective should have data');
    assert(savedDoc.DomainResults.psychomotor.hasData, 'DB DomainResults.psychomotor should have data');

    // Verify backward compatibility fields
    const collectedData = Array.isArray(savedDoc["Collected Data"])
        ? savedDoc["Collected Data"][0]
        : savedDoc["Collected Data"];
    assert(collectedData && collectedData.hasData, 'DB Collected Data should mirror cognitive');
    assert(savedDoc.blommLevelMap.understand !== undefined, 'DB blommLevelMap should mirror cognitive level map');

    // 4. Test getResults endpoint
    let getResultsData = null;
    const getRes = {
        json: (payload) => {
            getResultsData = payload;
        },
        status: (code) => getRes
    };
    await fileController.getResults({ user: { userId } }, getRes);

    assert(getResultsData && getResultsData.success, 'getResults should succeed');
    assert(getResultsData.data.DomainResults, 'getResults response should contain DomainResults');
    assert(getResultsData.data.DomainOverview, 'getResults response should contain DomainOverview');
    assert(getResultsData.data["Collected Data"], 'getResults response should contain backward-compatible Collected Data');

    // 5. Cleanup
    await PaperInfo.deleteOne({ _id: savedDoc._id });
    if (fs.existsSync(testExcelPath)) {
        fs.unlinkSync(testExcelPath);
    }

    console.log('\n✅ E2E INTEGRATION TEST PASSED FULLY!\n');
    await mongoose.disconnect();
}

runE2ETest().catch((err) => {
    console.error('❌ E2E Integration Test Failed:', err);
    process.exit(1);
});
