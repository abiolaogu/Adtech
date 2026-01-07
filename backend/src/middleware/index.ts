/**
 * Middleware barrel export
 * Import all middleware from this file for cleaner imports
 */

export { authenticate, optionalAuth, authorize, AuthenticatedRequest, JWTPayload, getJWTSecretForSigning, getJWTExpiresIn } from './auth';
export { errorHandler, AppError, ErrorCodes, asyncHandler, notFoundHandler } from './errorHandler';
export { requestIdMiddleware, getRequestId } from './requestId';
export { authRateLimiter, apiRateLimiter, adServingRateLimiter, exportRateLimiter, deleteRateLimiter } from './rateLimiter';
export {
  validate,
  registerSchema,
  loginSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdParamsSchema,
  createInventorySchema,
  reserveSlotSchema,
  inventoryQuerySchema,
  inventoryForecastSchema,
  identifyCustomerSchema,
  trackEventSchema,
  createAudienceSchema,
  mergeCustomersSchema,
  audienceMembersQuerySchema,
  createCreativeSchema,
  createPublisherSchema,
  createPlacementSchema,
  serveAdQuerySchema,
  trackConversionSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from './validation';
