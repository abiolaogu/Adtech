import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../middleware/auth';
import { validate, uuidParamSchema } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { ReportBuilder } from '../services/analytics/ReportBuilder';

const router = Router();

// Report creation schema
const createReportSchema = {
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    type: z.enum(['CAMPAIGN_PERFORMANCE', 'INVENTORY_UTILIZATION', 'REVENUE', 'AUDIENCE_INSIGHTS', 'CUSTOM']),
    dataSource: z.enum(['CAMPAIGNS', 'IMPRESSIONS', 'PUBLISHERS', 'ADVERTISERS', 'AUDIENCES', 'CUSTOMERS', 'INVENTORY']),
    metrics: z.array(z.string()).min(1),
    dimensions: z.array(z.string()).optional(),
    filters: z.record(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    sortBy: z.array(z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc']),
    })).optional(),
    dateRange: z.enum(['CUSTOM', 'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'LAST_YEAR']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    format: z.enum(['JSON', 'CSV', 'PDF']).default('JSON'),
    schedule: z.string().optional(), // Cron expression
    recipients: z.array(z.string().email()).optional(),
    isTemplate: z.boolean().default(false),
  }),
};

// Report update schema
const updateReportSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    metrics: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    filters: z.record(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    sortBy: z.array(z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc']),
    })).optional(),
    dateRange: z.enum(['CUSTOM', 'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'LAST_YEAR']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    format: z.enum(['JSON', 'CSV', 'PDF']).optional(),
    schedule: z.string().optional(),
    recipients: z.array(z.string().email()).optional(),
    active: z.boolean().optional(),
  }),
};

// Report execution schema
const executeReportSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
};

/**
 * Create a new custom report
 * POST /api/v1/reports
 */
router.post(
  '/',
  authenticate,
  validate(createReportSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        name,
        description,
        type,
        dataSource,
        metrics,
        dimensions,
        filters,
        groupBy,
        sortBy,
        dateRange,
        startDate,
        endDate,
        format,
        schedule,
        recipients,
        isTemplate,
      } = req.body;

      const report = await prisma.report.create({
        data: {
          name,
          description,
          userId: req.user!.userId,
          type,
          dataSource,
          metrics,
          dimensions: dimensions || [],
          filters: filters || {},
          groupBy: groupBy || [],
          sortBy: sortBy || {},
          dateRange,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          format,
          schedule,
          recipients: recipients || [],
          isTemplate,
          active: true,
        },
      });

      logger.info('Report created', { reportId: report.id, userId: req.user!.userId });

      res.status(201).json({
        message: 'Report created successfully',
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List all reports
 * GET /api/v1/reports
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { type, dataSource, isTemplate } = req.query;

      const whereClause: any = {
        userId: req.user!.userId,
      };

      if (type) whereClause.type = type;
      if (dataSource) whereClause.dataSource = dataSource;
      if (isTemplate !== undefined) whereClause.isTemplate = isTemplate === 'true';

      const reports = await prisma.report.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { executions: true },
          },
        },
      });

      res.json({
        reports: reports.map((r) => ({
          ...r,
          executionCount: r._count.executions,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get a specific report
 * GET /api/v1/reports/:id
 */
router.get(
  '/:id',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
        include: {
          executions: {
            orderBy: { startedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!report) {
        throw new AppError('Report not found', 404);
      }

      // Check access rights
      if (req.user!.role !== 'ADMIN' && report.userId !== req.user!.userId) {
        throw new AppError('Access denied', 403);
      }

      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update a report
 * PUT /api/v1/reports/:id
 */
router.put(
  '/:id',
  authenticate,
  validate(updateReportSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
      });

      if (!report) {
        throw new AppError('Report not found', 404);
      }

      // Check access rights
      if (req.user!.role !== 'ADMIN' && report.userId !== req.user!.userId) {
        throw new AppError('Access denied', 403);
      }

      const updatedReport = await prisma.report.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.name && { name: req.body.name }),
          ...(req.body.description !== undefined && { description: req.body.description }),
          ...(req.body.metrics && { metrics: req.body.metrics }),
          ...(req.body.dimensions && { dimensions: req.body.dimensions }),
          ...(req.body.filters && { filters: req.body.filters }),
          ...(req.body.groupBy && { groupBy: req.body.groupBy }),
          ...(req.body.sortBy && { sortBy: req.body.sortBy }),
          ...(req.body.dateRange && { dateRange: req.body.dateRange }),
          ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
          ...(req.body.endDate && { endDate: new Date(req.body.endDate) }),
          ...(req.body.format && { format: req.body.format }),
          ...(req.body.schedule !== undefined && { schedule: req.body.schedule }),
          ...(req.body.recipients && { recipients: req.body.recipients }),
          ...(req.body.active !== undefined && { active: req.body.active }),
        },
      });

      logger.info('Report updated', { reportId: updatedReport.id });

      res.json({
        message: 'Report updated successfully',
        report: updatedReport,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete a report
 * DELETE /api/v1/reports/:id
 */
router.delete(
  '/:id',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
      });

      if (!report) {
        throw new AppError('Report not found', 404);
      }

      // Check access rights
      if (req.user!.role !== 'ADMIN' && report.userId !== req.user!.userId) {
        throw new AppError('Access denied', 403);
      }

      await prisma.report.delete({
        where: { id: req.params.id },
      });

      logger.info('Report deleted', { reportId: req.params.id });

      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Execute a report
 * POST /api/v1/reports/:id/execute
 */
router.post(
  '/:id/execute',
  authenticate,
  validate(executeReportSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
      });

      if (!report) {
        throw new AppError('Report not found', 404);
      }

      // Check access rights
      if (req.user!.role !== 'ADMIN' && report.userId !== req.user!.userId) {
        throw new AppError('Access denied', 403);
      }

      if (!report.active) {
        throw new AppError('Report is not active', 400);
      }

      // Create execution record
      const execution = await prisma.reportExecution.create({
        data: {
          reportId: report.id,
          status: 'RUNNING',
        },
      });

      try {
        // Get date range
        let startDate = req.query.startDate ? new Date(req.query.startDate as string) : report.startDate;
        let endDate = req.query.endDate ? new Date(req.query.endDate as string) : report.endDate;

        // If date range preset is used, calculate dates
        if (report.dateRange !== 'CUSTOM') {
          const dateRange = ReportBuilder.getDateRangeFromPreset(report.dateRange);
          startDate = dateRange.startDate;
          endDate = dateRange.endDate;
        }

        // Build report query
        const reportBuilder = ReportBuilder.getInstance();
        const result = await reportBuilder.executeReport({
          dataSource: report.dataSource,
          metrics: report.metrics,
          dimensions: report.dimensions,
          filters: report.filters as any,
          groupBy: report.groupBy,
          sortBy: report.sortBy as any,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: req.query.limit || undefined,
        });

        // Update execution with results
        await prisma.reportExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            duration: result.summary.executionTime,
            rowCount: result.summary.rowCount,
            resultData: report.format === 'JSON' ? result : null,
          },
        });

        // Update report lastRunAt
        await prisma.report.update({
          where: { id: report.id },
          data: { lastRunAt: new Date() },
        });

        logger.info('Report executed successfully', {
          reportId: report.id,
          executionId: execution.id,
          rowCount: result.summary.rowCount,
        });

        // Return results based on format
        if (report.format === 'CSV') {
          const csv = ReportBuilder.convertToCSV(result);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}-${Date.now()}.csv"`);
          res.send(csv);
        } else {
          res.json({
            executionId: execution.id,
            result,
          });
        }
      } catch (error: any) {
        // Update execution with error
        await prisma.reportExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            error: error.message || 'Unknown error',
          },
        });

        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get report execution history
 * GET /api/v1/reports/:id/executions
 */
router.get(
  '/:id/executions',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
      });

      if (!report) {
        throw new AppError('Report not found', 404);
      }

      // Check access rights
      if (req.user!.role !== 'ADMIN' && report.userId !== req.user!.userId) {
        throw new AppError('Access denied', 403);
      }

      const executions = await prisma.reportExecution.findMany({
        where: { reportId: req.params.id },
        orderBy: { startedAt: 'desc' },
        take: 50,
      });

      res.json({ executions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get available metrics and dimensions for a data source
 * GET /api/v1/reports/schema/:dataSource
 */
router.get(
  '/schema/:dataSource',
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { dataSource } = req.params;

      // Define available metrics and dimensions for each data source
      const schemas: Record<string, any> = {
        CAMPAIGNS: {
          metrics: ['impressions', 'clicks', 'conversions', 'spent', 'ctr', 'cvr', 'cpm', 'cpc', 'cpa'],
          dimensions: ['name', 'type', 'status', 'objective', 'advertiser', 'owner', 'date', 'startDate', 'endDate'],
        },
        IMPRESSIONS: {
          metrics: ['revenue', 'publisherRevenue'],
          dimensions: ['campaign', 'advertiser', 'publisher', 'placement', 'served', 'viewed', 'clicked', 'converted', 'date', 'hour', 'dayOfWeek'],
        },
        PUBLISHERS: {
          metrics: ['impressions', 'revenue', 'avgCpm', 'inventoryCount', 'placementCount'],
          dimensions: ['name', 'domain', 'status', 'revenueShare'],
        },
        AUDIENCES: {
          metrics: ['size', 'memberCount', 'campaignCount'],
          dimensions: ['name', 'status', 'owner'],
        },
        CUSTOMERS: {
          metrics: ['eventCount', 'segmentCount'],
          dimensions: ['email', 'firstName', 'lastName', 'country', 'city', 'emailConsent', 'smsConsent'],
        },
        INVENTORY: {
          metrics: ['totalSlots', 'availableSlots', 'utilization', 'floorPrice', 'slotCount', 'campaignCount'],
          dimensions: ['name', 'type', 'publisher', 'status', 'currency'],
        },
      };

      const schema = schemas[dataSource];

      if (!schema) {
        throw new AppError('Invalid data source', 400);
      }

      res.json(schema);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Clone a report (create from template)
 * POST /api/v1/reports/:id/clone
 */
router.post(
  '/:id/clone',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const sourceReport = await prisma.report.findUnique({
        where: { id: req.params.id },
      });

      if (!sourceReport) {
        throw new AppError('Report not found', 404);
      }

      // Create new report with same configuration
      const newReport = await prisma.report.create({
        data: {
          name: `${sourceReport.name} (Copy)`,
          description: sourceReport.description,
          userId: req.user!.userId,
          type: sourceReport.type,
          dataSource: sourceReport.dataSource,
          metrics: sourceReport.metrics,
          dimensions: sourceReport.dimensions,
          filters: sourceReport.filters,
          groupBy: sourceReport.groupBy,
          sortBy: sourceReport.sortBy,
          dateRange: sourceReport.dateRange,
          startDate: sourceReport.startDate,
          endDate: sourceReport.endDate,
          format: sourceReport.format,
          schedule: null, // Don't copy schedule
          recipients: [],
          isTemplate: false,
          active: true,
        },
      });

      logger.info('Report cloned', { sourceId: req.params.id, newId: newReport.id });

      res.status(201).json({
        message: 'Report cloned successfully',
        report: newReport,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
