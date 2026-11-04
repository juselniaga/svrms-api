const { z } = require('zod');
const { httpError } = require('./access');

const applicationId = z.coerce.number().int().positive();
const shortText = z.string().max(255);

const siteSchema = z.object({
  application_id: applicationId,
  mukim: shortText.min(1),
  bp: shortText.min(1),
  bpk: shortText.optional(),
  lot: shortText.min(1),
  kategori_tanah: shortText.min(1),
  status_tanah: shortText.min(1),
  lembaran: shortText.min(1),
  luas: z.coerce.number().min(0).max(999999),
  google_lat: shortText.optional()
});

const siteVisitSchema = z.object({
  application_id: applicationId,
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(['draft', 'submit']),
  recommend_road: z.coerce.number().int().min(0).max(1).default(0),
  finding_north: z.string().max(65535).optional(),
  findings_south: z.string().max(65535).optional(),
  findings_east: z.string().max(65535).optional(),
  finding_west: z.string().max(65535).optional(),
  topography: z.string().max(65535).optional(),
  location_data: z.string().max(65535).optional(),
  activity: shortText.optional(),
  facility: shortText.optional(),
  entrance_way: shortText.optional(),
  parit: shortText.optional(),
  tree: shortText.optional(),
  land_use_zone: shortText.optional(),
  density: shortText.optional(),
  anjakan: shortText.optional(),
  social_facility: shortText.optional()
});

const reviewSchema = z.object({
  application_id: applicationId,
  review_content: z.string().min(1).max(65535),
  recommendation: z.enum(['SUPPORTED', 'NOT_SUPPORTED']),
  self_check_completed: z.literal(true)
});

const parse = (schema, data) => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw httpError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.issues);
  }
  return parsed.data;
};

module.exports = { siteSchema, siteVisitSchema, reviewSchema, parse };
