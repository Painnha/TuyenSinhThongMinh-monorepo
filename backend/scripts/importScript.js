const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const config = require('../config/db.config');
const SubjectCombination = require('../models/SubjectCombination');
const path = require('path');

mongoose.connect(config.url, config.options)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

const results = [];

fs.createReadStream(path.join(__dirname, 'subject-combinations.csv'))
    .pipe(csv())
    .on('data', (data) => {
        // Transform CSV data
        const combination = {
            code: data.SubjectGroup,
            subjects: data['Môn chi tiết'],
            schoolCount: parseInt(data.Trường.split(' ')[0]),
            majorCount: parseInt(data.Ngành.split(' ')[0]),
            note: data['Ghi chú']
        };
        results.push(combination);
    })
    .on('end', async () => {
        try {
            await SubjectCombination.deleteMany({}); // Clear existing data
            const imported = await SubjectCombination.insertMany(results);
            console.log(`Successfully imported ${imported.length} combinations`);
            console.log('Imported data:', imported);
        } catch (error) {
            console.error('Error importing data:', error);
        } finally {
            mongoose.disconnect();
        }
    }); 