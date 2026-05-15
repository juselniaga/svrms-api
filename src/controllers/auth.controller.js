const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().email(),
  password: z.string().min(1)
});

exports.login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed.',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues
      });
    }

    const { username, password } = parsed.data;

    // The specs state to check email = username AND role = 'officer' AND is_active = 1
    // Actually Laravel doesn't always have is_active, let's query the DB to be sure.
    // Assuming the table structure matches CONTEXT.md
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND role = ? AND is_active = 1',
      [username, 'Officer']
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or insufficient role.', code: 'UNAUTHORIZED' });
    }

    const user = rows[0];

    // Laravel uses $2y$ prefix which Node bcrypt sometimes rejects. Replace with $2a$.
    const hashForNode = user.password.replace(/^\$2y\$/, '$2a$');

    // Verify password using bcrypt
    const match = await bcrypt.compare(password, hashForNode);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials or insufficient role.', code: 'UNAUTHORIZED' });
    }

    // Sign JWT
    const payload = {
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      department: user.department
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    res.status(200).json({ token, user: payload });
  } catch (error) {
    next(error);
  }
};
