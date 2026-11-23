const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ASSETS_DIR = path.join(__dirname, 'assets');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const resumeStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
        cb(null, `mohamed-elhemaly-cv-${Date.now()}${ext}`);
    }
});

const photoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        cb(null, `profile-photo-${Date.now()}${ext}`);
    }
});

const uploadResume = multer({
    storage: resumeStorage,
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
        cb(isPdf ? null : new Error('Only PDF files are allowed'), isPdf);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadPhoto = multer({
    storage: photoStorage,
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const isImage = file.mimetype.startsWith('image/') || allowed.includes(ext);
        cb(isImage ? null : new Error('Only image files (JPG, PNG, WebP) are allowed'), isImage);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/assets', express.static(ASSETS_DIR));

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

app.post('/api/upload-resume', uploadResume.single('resume'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const data = readData();
        const previousResume = data?.general?.resume_url;

        if (!data.general) data.general = {};
        data.general.resume_url = `./uploads/${req.file.filename}`;
        writeData(data);

        if (previousResume && (previousResume.startsWith('/uploads/') || previousResume.startsWith('./uploads/'))) {
            const cleanName = previousResume.split('/').pop();
            const oldPath = path.join(UPLOADS_DIR, cleanName);
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

app.post('/api/upload-photo', uploadPhoto.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
    }

    try {
        const data = readData();
        if (!data.general) data.general = {};
        data.general.profile_image = `./uploads/${req.file.filename}`;
        writeData(data);

        // Also mirror to assets for bulletproof availability
        const assetTarget = path.join(ASSETS_DIR, 'profile-photo.jpg');
        try {
            fs.copyFileSync(req.file.path, assetTarget);
        } catch (_) {}

        res.json({
            success: true,
            profile_image: data.general.profile_image,
            filename: req.file.originalname
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile photo' });
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
