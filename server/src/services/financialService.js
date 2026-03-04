const { sequelize } = require('../models');

/**
 * Financial Service - Handles all financial calculations and queries
 */

class FinancialService {
  /**
   * Get summary of platform earnings
   */
  static async getPlatformSummary(startDate, endDate) {
    try {
      const query = `
        SELECT 
          ROUND(SUM(CAST(amount as NUMERIC)), 2) as total_revenue,
          ROUND(SUM(CAST("platformFee" as NUMERIC)), 2) as your_earnings,
          ROUND(SUM(CAST("tenantRevenue" as NUMERIC)), 2) as tenant_earnings,
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          ROUND(AVG(CAST("platformFee" as NUMERIC)), 2) as avg_commission
        FROM transactions
        WHERE status = 'completed'
          AND type IN ('booking', 'product_purchase', 'subscription')
          ${startDate ? 'AND "createdAt" >= :startDate' : ''}
          ${endDate ? 'AND "createdAt" <= :endDate' : ''}
      `;

      const result = await sequelize.query(query, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });

      return result[0] || {};
    } catch (error) {
      console.error('Error in getPlatformSummary:', error);
      return {};
    }
  }

  /**
   * Get tenant financial details with earnings
   */
  static async getTenantFinancials(tenantId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          t.id,
          t.name,
          t.plan,
          t.status as tenant_status,
          COUNT(*) as total_bookings,
          ROUND(SUM(CAST(tr.amount as NUMERIC)), 2) as gross_revenue,
          ROUND(SUM(CAST(tr."platformFee" as NUMERIC)), 2) as platform_commission,
          ROUND(SUM(CAST(tr."tenantRevenue" as NUMERIC)), 2) as net_revenue,
          ROUND(SUM(CAST(tr."tenantRevenue" as NUMERIC)) / NULLIF(COUNT(*), 0), 2) as avg_booking_value,
          COUNT(CASE WHEN tr.status = 'pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_transactions
        FROM transactions tr
        JOIN tenants t ON tr."tenantId" = t.id
        WHERE tr.status = 'completed'
          AND tr.type IN ('booking', 'product_purchase', 'subscription')
          ${tenantId ? 'AND t.id = :tenantId' : ''}
          ${startDate ? 'AND tr."createdAt" >= :startDate' : ''}
          ${endDate ? 'AND tr."createdAt" <= :endDate' : ''}
        GROUP BY t.id, t.name, t.plan, t.status
        ORDER BY net_revenue DESC
      `;

      const result = await sequelize.query(query, {
        replacements: { tenantId, startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });

      return tenantId ? result[0] : result || [];
    } catch (error) {
      console.error('Error in getTenantFinancials:', error);
      return tenantId ? null : [];
    }
  }

  /**
   * Get all tenants leaderboard
   */
  static async getTenantLeaderboard(limit = 10, startDate, endDate) {
    try {
      const query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY net_revenue DESC) as rank,
          t.id,
          t.name,
          t.plan,
          COUNT(*) as bookings,
          ROUND(SUM(CAST(tr.amount as NUMERIC)), 2) as gross_revenue,
          ROUND(SUM(CAST(tr."platformFee" as NUMERIC)), 2) as your_commission,
          ROUND(SUM(CAST(tr."tenantRevenue" as NUMERIC)), 2) as tenant_earned,
          ROUND(SUM(CAST(tr."tenantRevenue" as NUMERIC)) / NULLIF(COUNT(*), 0), 2) as avg_per_booking,
          COUNT(DISTINCT DATE(tr."createdAt")) as active_days
        FROM transactions tr
        JOIN tenants t ON tr."tenantId" = t.id
        WHERE tr.status = 'completed'
          AND tr.type IN ('booking', 'product_purchase', 'subscription')
          ${startDate ? 'AND tr."createdAt" >= :startDate' : ''}
          ${endDate ? 'AND tr."createdAt" <= :endDate' : ''}
        GROUP BY t.id, t.name, t.plan
        ORDER BY tenant_earned DESC
        LIMIT :limit
      `;

      const result = await sequelize.query(query, {
        replacements: { limit, startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });

      return result && Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in getTenantLeaderboard:', error);
      return [];
    }
  }

  /**
   * Get employee hours and earnings for a tenant
   */
  static async getTenantEmployeeMetrics(tenantId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          s.id,
          s.name,
          s."commissionRate",
          COUNT(*) as total_appointments,
          COUNT(DISTINCT DATE(a."startTime")) as days_worked,
          ROUND(SUM(EXTRACT(EPOCH FROM (a."endTime" - a."startTime")))/3600.0, 2) as hours_worked,
          ROUND(AVG(EXTRACT(EPOCH FROM (a."endTime" - a."startTime")))/60.0, 2) as avg_duration_minutes,
          ROUND(SUM(CAST(a."employeeCommission" as NUMERIC)), 2) as commission_earned,
          ROUND(SUM(CAST(a.price as NUMERIC)), 2) as total_value_handled
        FROM appointments a
        JOIN staff s ON a."staffId" = s.id
        WHERE a."tenantId" = :tenantId
          AND a.status = 'completed'
          ${startDate ? 'AND a."startTime" >= :startDate' : ''}
          ${endDate ? 'AND a."startTime" <= :endDate' : ''}
        GROUP BY s.id, s.name, s."commissionRate"
        ORDER BY hours_worked DESC
      `;

      const result = await sequelize.query(query, {
        replacements: { tenantId, startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });

      return result && Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in getTenantEmployeeMetrics:', error);
      return [];
    }
  }

  /**
   * Get monthly revenue comparison
   */
  static async getMonthlyComparison(limit = 12) {
    try {
      const query = `
        WITH monthly_data AS (
          SELECT 
            DATE_TRUNC('month', "createdAt")::date as month,
            ROUND(SUM(CAST(amount as NUMERIC)), 2) as total_revenue,
            ROUND(SUM(CAST("platformFee" as NUMERIC)), 2) as your_earnings,
            ROUND(SUM(CAST("tenantRevenue" as NUMERIC)), 2) as tenant_earnings,
            COUNT(*) as transaction_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
          FROM transactions
          WHERE status = 'completed'
            AND type IN ('booking', 'product_purchase', 'subscription')
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month DESC
          LIMIT :limit
        )
        SELECT 
          month,
          total_revenue,
          your_earnings,
          tenant_earnings,
          transaction_count,
          failed_count,
          ROUND((your_earnings / total_revenue * 100)::numeric, 1) as your_percentage
        FROM monthly_data
        ORDER BY month DESC
      `;

      const result = await sequelize.query(query, {
        replacements: { limit },
        type: sequelize.QueryTypes.SELECT,
      });

      return result && Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in getMonthlyComparison:', error);
      return [];
    }
  }

  /**
   * Get revenue breakdown by type (booking, product_purchase, subscription)
   */
  static async getRevenueByType(startDate, endDate) {
    try {
      const query = `
        SELECT 
          type,
          COUNT(*) as count,
          ROUND(SUM(CAST(amount as NUMERIC)), 2) as amount,
          ROUND(SUM(CAST("platformFee" as NUMERIC)), 2) as platform_fee,
          ROUND(SUM(CAST("tenantRevenue" as NUMERIC)), 2) as tenant_revenue
        FROM transactions
        WHERE status = 'completed'
          AND type IN ('booking', 'product_purchase', 'subscription')
          ${startDate ? 'AND "createdAt" >= :startDate' : ''}
          ${endDate ? 'AND "createdAt" <= :endDate' : ''}
        GROUP BY type
      `;
      const rows = await sequelize.query(query, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });
      const result = {
        booking: { count: 0, amount: 0, platformFee: 0, tenantRevenue: 0 },
        product_purchase: { count: 0, amount: 0, platformFee: 0, tenantRevenue: 0 },
        subscription: { count: 0, amount: 0, platformFee: 0, tenantRevenue: 0 },
      };
      (rows || []).forEach((row) => {
        const key = row.type;
        if (result[key] != null) {
          result[key] = {
            count: parseInt(row.count, 10) || 0,
            amount: parseFloat(row.amount) || 0,
            platformFee: parseFloat(row.platform_fee) || 0,
            tenantRevenue: parseFloat(row.tenant_revenue) || 0,
          };
        }
      });
      return result;
    } catch (error) {
      console.error('Error in getRevenueByType:', error);
      return {
        booking: { count: 0, amount: 0, platformFee: 0, tenantRevenue: 0 },
        product_purchase: { count: 0, amount: 0, platformFee: 0, tenantRevenue: 0 },
        subscription: { count: 0, amount: 0, platformFee: 0, tenantRevenue: 0 },
      };
    }
  }

  /**
   * Get bills summary (counts and totals by status)
   */
  static async getBillsSummary(status = null) {
    try {
      const whereClause = status ? 'WHERE b.status = :status' : '';
      const query = `
        SELECT 
          b.status,
          COUNT(*) as count,
          ROUND(SUM(CAST(b.amount as NUMERIC)), 2) as total_amount
        FROM bills b
        ${whereClause}
        GROUP BY b.status
      `;
      const replacements = status ? { status } : {};
      const rows = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      const result = {
        UNPAID: { count: 0, totalAmount: 0 },
        PAID: { count: 0, totalAmount: 0 },
        EXPIRED: { count: 0, totalAmount: 0 },
      };
      (rows || []).forEach((row) => {
        if (result[row.status] != null) {
          result[row.status] = {
            count: parseInt(row.count, 10) || 0,
            totalAmount: parseFloat(row.total_amount) || 0,
          };
        }
      });
      return result;
    } catch (error) {
      console.error('Error in getBillsSummary:', error);
      return {
        UNPAID: { count: 0, totalAmount: 0 },
        PAID: { count: 0, totalAmount: 0 },
        EXPIRED: { count: 0, totalAmount: 0 },
      };
    }
  }

  /**
   * Get commission breakdown by subscription plan
   */
  static async getCommissionByPlan(startDate, endDate) {
    try {
      const query = `
        SELECT 
          t.plan as plan,
          COUNT(DISTINCT t.id) as tenant_count,
          COUNT(*) as total_transactions,
          ROUND(SUM(CAST(tr.amount as NUMERIC)), 2) as total_revenue,
          ROUND(SUM(CAST(tr."platformFee" as NUMERIC)), 2) as your_earnings,
          ROUND(SUM(CAST(tr."tenantRevenue" as NUMERIC)), 2) as tenant_earnings,
          CASE 
            WHEN t.plan = 'Starter' THEN 7.0
            WHEN t.plan = 'Professional' THEN 8.0
            WHEN t.plan = 'Enterprise' THEN 3.5
            ELSE 5.0
          END as commission_rate
        FROM transactions tr
        JOIN tenants t ON tr."tenantId" = t.id
        WHERE tr.status = 'completed'
          AND tr.type IN ('booking', 'product_purchase', 'subscription')
          ${startDate ? 'AND tr."createdAt" >= :startDate' : ''}
          ${endDate ? 'AND tr."createdAt" <= :endDate' : ''}
        GROUP BY t.plan
        ORDER BY your_earnings DESC
      `;

      const result = await sequelize.query(query, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });

      return result && Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching commission breakdown:', error);
      return [];
    }
  }

  /**
   * Get platform-wide transactions (paginated, filterable)
   */
  static async getPlatformTransactions(filters = {}) {
    const { startDate, endDate, tenantId, type, limit = 50, offset = 0 } = filters;
    try {
      const dateCond = [];
      if (startDate) dateCond.push('tr."createdAt" >= :startDate');
      if (endDate) dateCond.push('tr."createdAt" <= :endDate');
      const tenantCond = tenantId ? 'AND tr."tenantId" = :tenantId' : '';
      const typeCond = type ? 'AND tr.type = :type' : '';
      const dateWhere = dateCond.length ? `AND ${dateCond.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*)::int as total
        FROM transactions tr
        JOIN tenants t ON tr."tenantId" = t.id
        WHERE tr.status = 'completed'
          AND tr.type IN ('booking', 'product_purchase', 'subscription')
          ${dateWhere}
          ${tenantCond}
          ${typeCond}
      `;
      const dataQuery = `
        SELECT 
          tr.id,
          tr."createdAt",
          t.name as tenant_name,
          tr."tenantId" as tenant_id,
          tr.type as transaction_type,
          CASE 
            WHEN tr.type = 'subscription' THEN 'Subscription'
            WHEN a.id IS NOT NULL THEN COALESCE(s.name_en, 'Service')
            WHEN o.id IS NOT NULL THEN COALESCE(o."orderNumber", 'Order')
            ELSE 'N/A'
          END as item_name,
          ROUND(CAST(tr.amount as NUMERIC), 2) as amount,
          ROUND(CAST(tr."platformFee" as NUMERIC), 2) as platform_fee,
          ROUND(CAST(tr."tenantRevenue" as NUMERIC), 2) as tenant_revenue,
          tr.status as payment_status
        FROM transactions tr
        JOIN tenants t ON tr."tenantId" = t.id
        LEFT JOIN appointments a ON tr."appointmentId" = a.id
        LEFT JOIN services s ON a."serviceId" = s.id
        LEFT JOIN orders o ON tr.order_id = o.id
        WHERE tr.status = 'completed'
          AND tr.type IN ('booking', 'product_purchase', 'subscription')
          ${dateWhere}
          ${tenantCond}
          ${typeCond}
        ORDER BY tr."createdAt" DESC
        LIMIT :limit
        OFFSET :offset
      `;
      const replacements = { startDate, endDate, tenantId, type, limit: parseInt(limit, 10) || 50, offset: parseInt(offset, 10) || 0 };
      const [countResult, rows] = await Promise.all([
        sequelize.query(countQuery, { replacements, type: sequelize.QueryTypes.SELECT }),
        sequelize.query(dataQuery, { replacements, type: sequelize.QueryTypes.SELECT }),
      ]);
      const total = (countResult && countResult[0] && countResult[0].total) || 0;
      return { transactions: rows || [], total };
    } catch (error) {
      console.error('Error in getPlatformTransactions:', error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * Get commission breakdown by subscription package (from TenantSubscription -> SubscriptionPackage)
   */
  static async getCommissionByPackage(startDate, endDate) {
    try {
      const query = `
        SELECT 
          COALESCE(sp.name, 'Unknown') as plan,
          COUNT(DISTINCT t.id) as tenant_count,
          COUNT(tr.id) as total_transactions,
          ROUND(SUM(CAST(tr.amount as NUMERIC)), 2) as total_revenue,
          ROUND(SUM(CAST(tr."platformFee" as NUMERIC)), 2) as your_earnings,
          ROUND(SUM(CAST(tr."tenantRevenue" as NUMERIC)), 2) as tenant_earnings
        FROM transactions tr
        JOIN tenants t ON tr."tenantId" = t.id
        LEFT JOIN LATERAL (
          SELECT "packageId" FROM tenant_subscriptions
          WHERE "tenantId" = t.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) ts ON true
        LEFT JOIN subscription_packages sp ON sp.id = ts."packageId"
        WHERE tr.status = 'completed'
          AND tr.type IN ('booking', 'product_purchase', 'subscription')
          ${startDate ? 'AND tr."createdAt" >= :startDate' : ''}
          ${endDate ? 'AND tr."createdAt" <= :endDate' : ''}
        GROUP BY sp.id, sp.name
        ORDER BY your_earnings DESC
      `;
      const result = await sequelize.query(query, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });
      return result && Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in getCommissionByPackage:', error);
      return [];
    }
  }

  /**
   * Get transaction details for detailed view
   */
  static async getTransactionDetails(tenantId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        tr.id,
        tr."createdAt",
        t.name as tenant_name,
        CASE 
          WHEN tr.type = 'subscription' THEN 'subscription'
          WHEN a.id IS NOT NULL THEN 'appointment'
          WHEN o.id IS NOT NULL THEN 'product'
          ELSE 'other'
        END as transaction_type,
        COALESCE(
          s.name_en,
          CASE WHEN tr.type = 'subscription' THEN 'Subscription' END,
          CASE WHEN o.id IS NOT NULL THEN o."orderNumber" END,
          'N/A'
        ) as item_name,
        ROUND(CAST(tr.amount as NUMERIC), 2) as amount,
        ROUND(CAST(tr."platformFee" as NUMERIC), 2) as your_fee,
        ROUND(CAST(tr."tenantRevenue" as NUMERIC), 2) as tenant_revenue,
        tr.status as payment_status,
        COALESCE(tr.metadata->>'paymentMethod', 'N/A') as "paymentMethod"
      FROM transactions tr
      JOIN tenants t ON tr."tenantId" = t.id
      LEFT JOIN appointments a ON tr."appointmentId" = a.id
      LEFT JOIN services s ON a."serviceId" = s.id
      LEFT JOIN orders o ON tr.order_id = o.id
      WHERE tr."tenantId" = :tenantId
        AND tr.status = 'completed'
        AND tr.type IN ('booking', 'product_purchase', 'subscription')
      ORDER BY tr."createdAt" DESC
      LIMIT :limit
      OFFSET :offset
    `;

    try {
      const result = await sequelize.query(query, {
        replacements: { tenantId, limit, offset },
        type: sequelize.QueryTypes.SELECT,
      });
      return result || [];
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return [];
    }
  }

  /**
   * General report: platform summary, revenue by type, monthly, commission by package, top tenants, top employees
   */
  static async getGeneralReport(startDate, endDate, options = {}) {
    const { leaderboardLimit = 10, monthlyLimit = 12, employeesLimit = 10 } = options;
    try {
      const [
        summary,
        revenueByType,
        monthlyComparison,
        commissionByPackage,
        leaderboard,
        topEmployees,
      ] = await Promise.all([
        this.getPlatformSummary(startDate, endDate),
        this.getRevenueByType(startDate, endDate),
        this.getMonthlyComparison(monthlyLimit),
        this.getCommissionByPackage(startDate, endDate),
        this.getTenantLeaderboard(leaderboardLimit, startDate, endDate),
        this.getTopEmployees(employeesLimit, startDate, endDate),
      ]);
      return {
        summary,
        revenueByType,
        monthlyComparison,
        commissionByPackage,
        leaderboard,
        topEmployees,
        startDate,
        endDate,
      };
    } catch (error) {
      console.error('Error in getGeneralReport:', error);
      throw error;
    }
  }

  /**
   * Detailed report: paginated transactions + optional subtotals by tenant and type
   */
  static async getDetailedReport(filters = {}) {
    const { startDate, endDate, tenantId, type, limit = 50, offset = 0 } = filters;
    try {
      const { transactions, total } = await this.getPlatformTransactions({
        startDate,
        endDate,
        tenantId,
        type,
        limit,
        offset,
      });
      const summary = await this.getPlatformSummary(startDate, endDate);
      const revenueByType = await this.getRevenueByType(startDate, endDate);
      return {
        transactions,
        total,
        summary,
        revenueByType,
        startDate,
        endDate,
      };
    } catch (error) {
      console.error('Error in getDetailedReport:', error);
      throw error;
    }
  }

  /**
   * Get top performing employees across all tenants
   */
  static async getTopEmployees(limit = 20, startDate, endDate) {
    try {
      const query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY commission_earned DESC) as rank,
          t.name as tenant,
          s.name as employee,
          COUNT(*) as appointments,
          ROUND(SUM(EXTRACT(EPOCH FROM (a."endTime" - a."startTime")))/3600.0, 2) as hours_worked,
          ROUND(SUM(CAST(a."employeeCommission" as NUMERIC)), 2) as commission_earned,
          ROUND(SUM(CAST(a.price as NUMERIC)), 2) as total_value,
          ROUND(SUM(CAST(a."employeeCommission" as NUMERIC)) / NULLIF(COUNT(*), 0), 2) as avg_per_appointment
        FROM appointments a
        JOIN staff s ON a."staffId" = s.id
        JOIN tenants t ON a."tenantId" = t.id
        WHERE a.status = 'completed'
          ${startDate ? 'AND a."startTime" >= :startDate' : ''}
          ${endDate ? 'AND a."startTime" <= :endDate' : ''}
        GROUP BY t.id, t.name, s.id, s.name
        ORDER BY commission_earned DESC
        LIMIT :limit
      `;

      const result = await sequelize.query(query, {
        replacements: { limit, startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      });

      return result && Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching top employees:', error);
      return [];
    }
  }
}

module.exports = FinancialService;
