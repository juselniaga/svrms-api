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

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store flat in photos/ — matches Laravel's storage convention
    cb(null, storagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Extension comes from the checked type, never the client's filename: this folder is
    // served by Apache, so a name like x.php would run as code
    const filename = file.fieldname + '-' + uniqueSuffix + ALLOWED_TYPES[file.mimetype];

    // Attach relative path so controller stores 'photos/filename' in DB
    // (compatible with Laravel's Storage::url('photos/filename'))
    file.relativePath = 'photos/' + filename;

    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (Object.hasOwn(ALLOWED_TYPES, file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Invalid file type. Only JPEG, PNG, JPG and WebP are allowed.'), { status: 400, code: 'INVALID_FILE_TYPE' }), false);
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
