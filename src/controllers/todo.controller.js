const pool = require('../config/db');

exports.getTodoList = async (req, res, next) => {
  try {
    const officer_id = req.user.user_id;
    const { status } = req.query;

    let query = `
      SELECT 
        a.application_id,
        a.officer_id,
        a.reference_no,
        a.developer_id,
        d.name as developer_name,
        a.tajuk,
        a.lokasi,
        a.no_fail,
        a.status as app_status,
        s.status as site_status
      FROM applications a
      LEFT JOIN developers d ON a.developer_id = d.developer_id
      LEFT JOIN sites s ON a.application_id = s.application_id
      WHERE a.officer_id = ? 
        AND a.status IN ('RECORDED', 'SITE_VISIT_IN_PROGRESS')
        AND a.is_active = 1
    `;
    
    const queryParams = [officer_id];
    const [rawApplications] = await pool.execute(query, queryParams);

    const applications = [];
    rawApplications.forEach(app => {
      let processType = null;

      if (app.app_status === 'RECORDED') {
        if (!app.site_status) {
          processType = 'register_site';
        } else {
          processType = 'register_site_visit';
        }
      } else if (app.app_status === 'SITE_VISIT_IN_PROGRESS') {
        processType = 'review';
      }

      if (processType) {
        applications.push({
          application_id: app.application_id,
          reference_no: app.reference_no,
          tajuk: app.tajuk,
          lokasi: app.lokasi,
          process: processType
        });
      }
    });

    res.status(200).json({
      officer: {
        user_id: req.user.user_id,
        name: req.user.name
      },
      total: applications.length,
      applications
    });

  } catch (error) {
    next(error);
  }
};
