import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';

/**
 * Validation middleware factory
 * Validates request body, query, and params against Zod schemas
 */
export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(new AppError(`Validation error: ${formattedErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`, 400));
      } else {
        next(error);
      }
    }
  };
}

// ===== Auth Schemas =====

export const registerSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    organizationName: z.string().min(2).max(100).optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
};

// ===== Campaign Schemas =====

export const createCampaignSchema = {
  body: z.object({
    name: z.string().min(1, 'Campaign name is required').max(200),
    advertiserId: z.string().uuid('Invalid advertiser ID'),
    userId: z.string().uuid('Invalid user ID'),
    type: z.enum(['DISPLAY', 'VIDEO', 'EMAIL', 'NATIVE', 'SPONSORED']),
    objective: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION']),
    budget: z.number().positive('Budget must be positive'),
    bidStrategy: z.enum(['CPM', 'CPC', 'CPA', 'FIXED']),
    maxBid: z.number().positive().optional(),
    targeting: z.object({
      countries: z.array(z.string()).optional(),
      devices: z.array(z.string()).optional(),
      inventoryTypes: z.array(z.string()).optional(),
    }).optional().default({}),
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()).optional(),
  }),
};

export const updateCampaignSchema = {
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    budget: z.number().positive().optional(),
    maxBid: z.number().positive().optional(),
    targeting: z.object({
      countries: z.array(z.string()).optional(),
      devices: z.array(z.string()).optional(),
      inventoryTypes: z.array(z.string()).optional(),
    }).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
};

export const campaignIdParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
};

// ===== Inventory Schemas =====

export const createInventorySchema = {
  body: z.object({
    type: z.enum(['EMAIL', 'MOVIE', 'VIDEO', 'DISPLAY', 'NATIVE', 'CUSTOM']),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    publisherId: z.string().uuid('Invalid publisher ID'),
    floorPrice: z.number().nonnegative().default(0),
    currency: z.string().length(3).default('USD'),
    totalSlots: z.number().int().positive(),
    availableSlots: z.number().int().nonnegative(),
    metadata: z.record(z.any()).optional(),
    emailListSize: z.number().int().positive().optional(),
    emailSegments: z.array(z.string()).optional(),
    contentType: z.string().optional(),
    contentGenre: z.array(z.string()).optional(),
    contentRating: z.string().optional(),
  }),
};

export const reserveSlotSchema = {
  body: z.object({
    slotId: z.string().uuid('Invalid slot ID'),
    campaignId: z.string().uuid('Invalid campaign ID'),
    price: z.number().positive('Price must be positive'),
  }),
};

export const inventoryQuerySchema = {
  query: z.object({
    type: z.enum(['EMAIL', 'MOVIE', 'VIDEO', 'DISPLAY', 'NATIVE', 'CUSTOM']).optional(),
    minSlots: z.string().regex(/^\d+$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d+\.?\d*$/).transform(Number).optional(),
    publisherId: z.string().uuid().optional(),
  }),
};

export const inventoryForecastSchema = {
  params: z.object({
    id: z.string().uuid('Invalid inventory ID'),
  }),
  query: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
  }),
};

// ===== MarTech Schemas =====

export const identifyCustomerSchema = {
  body: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    externalId: z.string().optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    attributes: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
  }).refine(
    (data) => data.email || data.phone || data.externalId,
    'At least one identifier (email, phone, or externalId) is required'
  ),
};

export const trackEventSchema = {
  body: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    eventType: z.string().min(1),
    eventName: z.string().min(1),
    properties: z.record(z.any()).optional(),
    sessionId: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
  }),
};

export const createAudienceSchema = {
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    userId: z.string().uuid('Invalid user ID'),
    rules: z.record(z.any()),
  }),
};

export const mergeCustomersSchema = {
  body: z.object({
    primaryId: z.string().uuid('Invalid primary customer ID'),
    secondaryId: z.string().uuid('Invalid secondary customer ID'),
  }),
};

export const audienceMembersQuerySchema = {
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default('100'),
    offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  }),
};

// ===== Creative Schemas =====

export const createCreativeSchema = {
  body: z.object({
    name: z.string().min(1).max(200),
    advertiserId: z.string().uuid('Invalid advertiser ID'),
    type: z.enum(['IMAGE', 'VIDEO', 'HTML5', 'NATIVE', 'EMAIL']),
    format: z.string().min(1),
    content: z.record(z.any()),
    clickUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    htmlContent: z.string().optional(),
  }),
};

// ===== Publisher Schemas =====

export const createPublisherSchema = {
  body: z.object({
    name: z.string().min(1).max(200),
    domain: z.string().min(1).max(255),
    organizationId: z.string().uuid().optional(),
    revenueShare: z.number().min(0).max(1).default(0.7),
  }),
};

export const createPlacementSchema = {
  body: z.object({
    publisherId: z.string().uuid('Invalid publisher ID'),
    name: z.string().min(1).max(200),
    size: z.string().min(1),
    type: z.string().min(1),
    position: z.string().optional(),
  }),
};

// ===== Ad Serving Schemas =====

export const serveAdQuerySchema = {
  query: z.object({
    placementId: z.string().min(1, 'placementId is required'),
    publisherId: z.string().min(1, 'publisherId is required'),
    deviceType: z.enum(['mobile', 'desktop', 'tablet', 'ctv']),
    country: z.string().length(2).optional(),
    userId: z.string().optional(),
  }),
};

export const trackConversionSchema = {
  body: z.object({
    value: z.number().nonnegative().optional(),
  }),
  params: z.object({
    requestId: z.string().uuid('Invalid request ID'),
  }),
};

// ===== Common Schemas =====

export const uuidParamSchema = {
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
};

export const paginationQuerySchema = {
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  }),
};
