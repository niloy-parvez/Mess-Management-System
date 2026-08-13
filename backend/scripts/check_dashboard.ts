import { fetchDashboardStats } from '../src/services/dashboardService';

(async () => {
  try {
    const stats = await fetchDashboardStats();
    console.log(JSON.stringify({ success: true, stats }, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({ success: false, error: String(err?.message || err) }, null, 2));
    process.exit(1);
  }
})();
