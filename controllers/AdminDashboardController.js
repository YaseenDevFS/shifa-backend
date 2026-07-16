// controllers/adminDashboardController.js
import db from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/dashboard/stats  — KPI cards at top of dashboard
// ══════════════════════════════════════════════════════════════════════════════
export const getDashboardStats = async (req, res) => {
  try {
    // Run all stat queries in parallel
    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      appointmentsByStatus,
      recentAppointments,
      topDepartments,
      monthlyAppointments,
      doctorScheduleToday,
    ] = await Promise.all([
      // Total unique patients (by email)
      db.query(`SELECT COUNT(DISTINCT email) AS total FROM appointments`),

      // Total doctors
      db.query(`SELECT COUNT(*) AS total FROM doctors`),

      // Total appointments + this month vs last month
      db.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) AS this_month,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')) AS last_month
        FROM appointments
      `),

      // Appointments grouped by status
      db.query(`
        SELECT status, COUNT(*) AS count
        FROM appointments
        GROUP BY status
      `),

      // Recent 5 appointments with doctor & department
      db.query(`
        SELECT
          a.id,
          a.full_name,
          a.preferred_date,
          a.preferred_time,
          a.status,
          a.gender,
          dep.name AS department_name,
          doc.first_name || ' ' || doc.last_name AS doctor_name
        FROM appointments a
        LEFT JOIN departments dep ON dep.id = a.department_id
        LEFT JOIN doctors doc ON doc.id = a.doctor_id
        ORDER BY a.created_at DESC
        LIMIT 5
      `),

      // Top 5 departments by appointment count
      db.query(`
        SELECT
          dep.name,
          dep.icon_name,
          COUNT(a.id) AS appointments_count,
          COUNT(DISTINCT a.email) AS patient_count
        FROM departments dep
        LEFT JOIN appointments a ON a.department_id = dep.id
        GROUP BY dep.id, dep.name, dep.icon_name
        ORDER BY appointments_count DESC
        LIMIT 5
      `),

      // Monthly appointment counts for the chart (last 7 months)
      db.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', preferred_date), 'Mon') AS month,
          DATE_TRUNC('month', preferred_date) AS month_date,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed
        FROM appointments
        WHERE preferred_date >= NOW() - INTERVAL '7 months'
        GROUP BY DATE_TRUNC('month', preferred_date)
        ORDER BY month_date ASC
      `),

      // Doctor schedule today (بدون doc.image_url)
      db.query(`
        SELECT
          a.preferred_time,
          a.full_name AS patient_name,
          a.status,
          doc.first_name || ' ' || doc.last_name AS doctor_name,
          dep.name AS department
        FROM appointments a
        LEFT JOIN doctors doc ON doc.id = a.doctor_id
        LEFT JOIN departments dep ON dep.id = a.department_id
        WHERE a.preferred_date = CURRENT_DATE
        ORDER BY a.preferred_time ASC
        LIMIT 8
      `),
    ]);

    // Build status map
    const statusMap = {};
    appointmentsByStatus.rows.forEach((r) => {
      statusMap[r.status] = parseInt(r.count, 10);
    });

    const apptTotal = parseInt(totalAppointments.rows[0].total, 10);
    const apptThisMonth = parseInt(totalAppointments.rows[0].this_month, 10);
    const apptLastMonth = parseInt(totalAppointments.rows[0].last_month, 10);
    const apptGrowth =
      apptLastMonth === 0
        ? 100
        : (((apptThisMonth - apptLastMonth) / apptLastMonth) * 100).toFixed(1);

    return res.status(200).json({
      status: 'success',
      data: {
        kpi: {
          total_patients: parseInt(totalPatients.rows[0].total, 10),
          total_doctors: parseInt(totalDoctors.rows[0].total, 10),
          total_appointments: apptTotal,
          appointments_this_month: apptThisMonth,
          appointments_growth_percent: parseFloat(apptGrowth),
        },
        appointments_by_status: {
          confirmed: statusMap['confirmed'] || 0,
          completed: statusMap['completed'] || 0,
          cancelled: statusMap['cancelled'] || 0,
          pending: statusMap['pending'] || 0,
          total: apptTotal,
        },
        recent_appointments: recentAppointments.rows,
        top_departments: topDepartments.rows,
        monthly_chart: monthlyAppointments.rows,
        doctor_schedule_today: doctorScheduleToday.rows,
      },
    });
  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Server error: ' + error.message 
    });
  }
};