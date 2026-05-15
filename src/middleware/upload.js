const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Resolve storage path — supports both relative (../svrms/...) and absolute paths
const rawPath = process.env.STORAGE_PATH || '../svrms/storage/app/public/photos';
const storagePath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(process.cwd(), rawPath);

// Ensure the directory exists
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store flat in photos/ — matches Laravel's storage convention
    cb(null, storagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);

    // Attach relative path so controller stores 'photos/filename' in DB
    // (compatible with Laravel's Storage::url('photos/filename'))
    file.relativePath = 'photos/' + filename;

    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG and WebP are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
