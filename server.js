const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
        cb(null, `mohamed-elhemaly-cv-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
        cb(isPdf ? null : new Error('Only PDF files are allowed'), isPdf);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/data', (_req, res) => {
    try {
        res.json(readData());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to read data file' });
    }
});

app.post('/api/data', (req, res) => {
    try {
        writeData(req.body);
        res.json({ success: true, message: 'Data updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save data file' });
    }
});

app.post('/api/upload-resume', upload.single('resume'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const data = readData();
        const previousResume = data?.general?.resume_url;

        if (!data.general) data.general = {};
        data.general.resume_url = `/uploads/${req.file.filename}`;
        writeData(data);

        if (previousResume && previousResume.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, previousResume.replace('/uploads/', 'uploads\\'));
            if (oldPath !== req.file.path && fs.existsSync(oldPath)) {
                fs.unlink(oldPath, () => {});
            }
        }

        res.json({
            success: true,
            resume_url: data.general.resume_url,
            filename: req.file.originalname
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update resume path' });
    }
});

app.use((err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message || 'Request failed' });
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Local CMS Server running at http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`Live Site: http://localhost:${PORT}/index.html`);
});