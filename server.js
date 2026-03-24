const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
// Serve static files from the website directory so we can run admin.html and index.html locally
app.use(express.static(__dirname));

// Endpoint to Get Data
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint to Update Data
app.post('/api/data', (req, res) => {
    const freshData = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(freshData, null, 2), (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to save data file' });
        }
        res.json({ success: true, message: 'Data updated successfully' });
    });
});

app.listen(PORT, () => {
    console.log(`✅ Local CMS Server running at http://localhost:${PORT}`);
    console.log(`➡️  Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`➡️  Live Site: http://localhost:${PORT}/index.html`);
});
