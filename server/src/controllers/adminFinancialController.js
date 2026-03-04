const FinancialService = require('../services/financialService');
const { successResponse, errorResponse } = require('../utils/responses');

/**
 * Admin Financial Controller
 * Handles all financial reporting endpoints
 */

exports.getPlatformSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await FinancialService.getPlatformSummary(startDate, endDate);
    res.json(successResponse('Platform summary retrieved', summary));
  } catch (error) {
    console.error('Error fetching platform summary:', error);
    res.status(500).json(errorResponse('Failed to fetch platform summary', error.message));
  }
};

exports.getTenantFinancials = async (req, res) => {
  try {
    const { tenantId, startDate, endDate } = req.query;
    const financials = await FinancialService.getTenantFinancials(tenantId, startDate, endDate);
    res.json(successResponse('Tenant financials retrieved', financials));
  } catch (error) {
    console.error('Error fetching tenant financials:', error);
    res.status(500).json(errorResponse('Failed to fetch tenant financials', error.message));
  }
};

exports.getTenantLeaderboard = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const leaderboard = await FinancialService.getTenantLeaderboard(
      parseInt(limit),
      startDate,
      endDate
    );
    res.json(successResponse('Tenant leaderboard retrieved', leaderboard));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json(errorResponse('Failed to fetch leaderboard', error.message));
  }
};

exports.getTenantEmployeeMetrics = async (req, res) => {
  try {
    const { tenantId, startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json(errorResponse('tenantId is required'));
    }

    const metrics = await FinancialService.getTenantEmployeeMetrics(
      tenantId,
      startDate,
      endDate
    );
    res.json(successResponse('Employee metrics retrieved', metrics));
  } catch (error) {
    console.error('Error fetching employee metrics:', error);
    res.status(500).json(errorResponse('Failed to fetch employee metrics', error.message));
  }
};

exports.getMonthlyComparison = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const comparison = await FinancialService.getMonthlyComparison(parseInt(limit));
    res.json(successResponse('Monthly comparison retrieved', comparison));
  } catch (error) {
    console.error('Error fetching monthly comparison:', error);
    res.status(500).json(errorResponse('Failed to fetch monthly comparison', error.message));
  }
};

exports.getCommissionByPlan = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const breakdown = await FinancialService.getCommissionByPlan(startDate, endDate);
    res.json(successResponse('Commission breakdown retrieved', breakdown));
  } catch (error) {
    console.error('Error fetching commission breakdown:', error);
    res.status(500).json(errorResponse('Failed to fetch commission breakdown', error.message));
  }
};

exports.getRevenueByType = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await FinancialService.getRevenueByType(startDate, endDate);
    res.json(successResponse('Revenue by type retrieved', data));
  } catch (error) {
    console.error('Error fetching revenue by type:', error);
    res.status(500).json(errorResponse('Failed to fetch revenue by type', error.message));
  }
};

exports.getBillsSummary = async (req, res) => {
  try {
    const { status } = req.query;
    const data = await FinancialService.getBillsSummary(status || null);
    res.json(successResponse('Bills summary retrieved', data));
  } catch (error) {
    console.error('Error fetching bills summary:', error);
    res.status(500).json(errorResponse('Failed to fetch bills summary', error.message));
  }
};

exports.getPlatformTransactions = async (req, res) => {
  try {
    const { startDate, endDate, tenantId, type, limit, offset } = req.query;
    const data = await FinancialService.getPlatformTransactions({
      startDate,
      endDate,
      tenantId,
      type,
      limit,
      offset,
    });
    res.json(successResponse('Platform transactions retrieved', data));
  } catch (error) {
    console.error('Error fetching platform transactions:', error);
    res.status(500).json(errorResponse('Failed to fetch platform transactions', error.message));
  }
};

exports.getCommissionByPackage = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await FinancialService.getCommissionByPackage(startDate, endDate);
    res.json(successResponse('Commission by package retrieved', data));
  } catch (error) {
    console.error('Error fetching commission by package:', error);
    res.status(500).json(errorResponse('Failed to fetch commission by package', error.message));
  }
};

exports.getGeneralReport = async (req, res) => {
  try {
    const { startDate, endDate, leaderboardLimit, monthlyLimit, employeesLimit } = req.query;
    const data = await FinancialService.getGeneralReport(startDate, endDate, {
      leaderboardLimit: leaderboardLimit ? parseInt(leaderboardLimit, 10) : 10,
      monthlyLimit: monthlyLimit ? parseInt(monthlyLimit, 10) : 12,
      employeesLimit: employeesLimit ? parseInt(employeesLimit, 10) : 10,
    });
    res.json(successResponse('General report retrieved', data));
  } catch (error) {
    console.error('Error fetching general report:', error);
    res.status(500).json(errorResponse('Failed to fetch general report', error.message));
  }
};

exports.getDetailedReport = async (req, res) => {
  try {
    const { startDate, endDate, tenantId, type, limit, offset } = req.query;
    const data = await FinancialService.getDetailedReport({
      startDate,
      endDate,
      tenantId,
      type,
      limit,
      offset,
    });
    res.json(successResponse('Detailed report retrieved', data));
  } catch (error) {
    console.error('Error fetching detailed report:', error);
    res.status(500).json(errorResponse('Failed to fetch detailed report', error.message));
  }
};

exports.getTransactionDetails = async (req, res) => {
  try {
    const { tenantId, limit = 50, offset = 0 } = req.query;

    if (!tenantId) {
      return res.status(400).json(errorResponse('tenantId is required'));
    }

    const transactions = await FinancialService.getTransactionDetails(
      tenantId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(successResponse('Transaction details retrieved', transactions));
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json(errorResponse('Failed to fetch transaction details', error.message));
  }
};

exports.getTopEmployees = async (req, res) => {
  try {
    const { limit = 20, startDate, endDate } = req.query;
    const topEmployees = await FinancialService.getTopEmployees(parseInt(limit), startDate, endDate);
    res.json(successResponse('Top employees retrieved', topEmployees));
  } catch (error) {
    console.error('Error fetching top employees:', error);
    res.status(500).json(errorResponse('Failed to fetch top employees', error.message));
  }
};

// Combined endpoint for dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [summary, leaderboard, monthlyComparison, commissionBreakdown, topEmployees] =
      await Promise.all([
        FinancialService.getPlatformSummary(startDate, endDate),
        FinancialService.getTenantLeaderboard(5, startDate, endDate),
        FinancialService.getMonthlyComparison(6),
        FinancialService.getCommissionByPlan(startDate, endDate),
        FinancialService.getTopEmployees(5, startDate, endDate),
      ]);

    res.json(
      successResponse('Dashboard overview retrieved', {
        summary,
        leaderboard,
        monthlyComparison,
        commissionBreakdown,
        topEmployees,
      })
    );
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json(errorResponse('Failed to fetch dashboard overview', error.message));
  }
};
