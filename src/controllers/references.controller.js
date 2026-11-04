const pool = require('../config/db');

// Reference lists managed by the Admin in Laravel
exports.getReferences = async (req, res, next) => {
  try {
    const [mukims] = await pool.execute('SELECT mukim_no, mukim FROM mukims WHERE status = 1 ORDER BY mukim_no');
    const [bps] = await pool.execute('SELECT id, bp_name FROM b_p_s WHERE status = 1 ORDER BY id');
    const [bpks] = await pool.execute('SELECT id, bp_id, bpk_name FROM b_p_k_s WHERE status = 1 ORDER BY bp_id, id');
    res.json({ mukims, bps, bpks });
  } catch (error) {
    next(error);
  }
};
