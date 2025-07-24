import { dbTable, text, timestamp, integer, boolean, decimal } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Define enums for medical imaging
const medicalImagingStatusEnum = ['pending', 'completed', 'reviewed'] as const;
const imagingTypeEnum = ['radiograph', 'ultrasound', 'ct', 'mri', 'fluoroscopy', 'endoscopy'] as const;
const anatomicalRegionEnum = ['head', 'neck', 'thorax', 'abdomen', 'pelvis', 'spine', 'extremities'] as const;
const lateralityEnum = ['left', 'right', 'bilateral'] as const;
const viewEnum = ['dorsoventral', 'ventrodorsal', 'lateral', 'oblique', 'anterior', 'posterior'] as const;

// Medical Imaging Studies table
export const medicalImaging = dbTable("medical_imaging", {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  petId: text("pet_id").notNull(),
  practiceId: text("practice_id").notNull(),
  soapNoteId: text("soap_note_id"), // Optional link to a SOAP note
  veterinarianId: text("veterinarian_id").notNull(), // Vet who ordered/performed the imaging
  radiologistId: text("radiologist_id"), // Optional - for referral cases
  studyDate: isSqlite
    ? timestamp('study_date', { mode: 'timestamp_ms' }).notNull()
    : timestamp('study_date', { mode: 'date' }).notNull(),
  imagingType: text("imaging_type", { enum: imagingTypeEnum }).notNull(),
  anatomicalRegion: text("anatomical_region", { enum: anatomicalRegionEnum }).notNull(), 
  laterality: text("laterality", { enum: lateralityEnum }), // Left, Right, Bilateral, etc.
  view: text("view", { enum: viewEnum }), // Dorsoventral, Lateral, Oblique, etc.
  studyName: text("study_name").notNull(),
  description: text("description"),
  findings: text("findings"), // Radiologist or vet findings
  impression: text("impression"), // Clinical impression
  recommendations: text("recommendations"),
  status: text("status", { enum: medicalImagingStatusEnum }).notNull().default('pending'),
  hasAnnotations: boolean("has_annotations").notNull().default(false),
  hasMeasurements: boolean("has_measurements").notNull().default(false),
  machineInfo: text("machine_info"), // Equipment used for the study
  technicianNotes: text("technician_notes"),
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Medical Imaging Series - a collection of images for a study
export const imagingSeries = dbTable("imaging_series", {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  medicalImagingId: text("medical_imaging_id").notNull(), // Parent study
  seriesNumber: integer("series_number").notNull(),
  seriesName: text("series_name").notNull(),
  description: text("description"),
  filePath: text("file_path"), // Path to image file
  numberOfImages: integer("number_of_images").default(0),
  modality: text("modality").notNull(), // DX, US, CT, MR, etc.
  bodyPart: text("body_part"), // Body part imaged
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Imaging Annotations table for storing annotations made on images
export const imagingAnnotations = dbTable("imaging_annotations", {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  seriesId: text("series_id").notNull(), // Link to the imaging series
  createdById: text("created_by_id").notNull(), // User who created the annotation
  annotationType: text("annotation_type").notNull(), // arrow, circle, freeform, text, etc.
  annotationData: text("annotation_data").notNull(), // JSON with coordinates, paths, etc.
  color: text("color").default("#FF0000"), // Color of annotation
  text: text("text"), // Optional text for text annotations
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Imaging Measurements table for storing measurements made on images
export const imagingMeasurements = dbTable("imaging_measurements", {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  seriesId: text("series_id").notNull(), // Link to the imaging series
  createdById: text("created_by_id").notNull(), // User who created the measurement
  measurementType: text("measurement_type").notNull(), // distance, angle, area, etc.
  measurementData: text("measurement_data").notNull(), // JSON with points, values, etc.
  value: text("value").notNull(), // Actual measurement value
  unit: text("unit").notNull(), // mm, cm, degrees, etc.
  label: text("label"), // Optional descriptive label
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Medical Record Attachments table for document/media uploads
export const medicalRecordAttachments = dbTable("medical_record_attachments", {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // "image", "document", "lab_result", "radiology", etc.
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  uploadedById: text("uploaded_by_id").notNull(),
  petId: text("pet_id").notNull(),
  practiceId: text("practice_id").notNull(),
  recordType: text("record_type").notNull(), // "SOAP_NOTE", "LAB_RESULT", "PRESCRIPTION", "MEDICAL_IMAGING", etc.
  recordId: text("record_id").notNull(), // ID of the related record
  description: text("description"),
  tags: text("tags"), // JSON array as text
  thumbnailPath: text("thumbnail_path"),
  seriesId: text("series_id"), // Optional - for imaging series
  dicomMetadata: text("dicom_metadata"), // Optional - for DICOM format medical images (stored as JSON string)
  width: integer("width"), // Image width if applicable
  height: integer("height"), // Image height if applicable
  rotation: integer("rotation").default(0), // Default rotation angle
  calibrationFactor: text("calibration_factor"), // For measurement calibration (stored as text for precision)
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Electronic Signatures
export const electronicSignatures = dbTable("electronic_signatures", {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // User who created the signature
  signerName: text("signer_name").notNull(), // Name of the person signing (could be client or staff)
  signerEmail: text("signer_email").notNull(), // Email of the signer
  signerType: text("signer_type").notNull(), // CLIENT, STAFF, VETERINARIAN, etc.
  signatureData: text("signature_data").notNull(), // Base64 encoded signature data
  documentType: text("document_type").notNull(), // SOAP_NOTE, HEALTH_PLAN, CONSENT_FORM, etc.
  documentId: text("document_id").notNull(), // ID of the related document
  practiceId: text("practice_id").notNull(),
  documentName: text("document_name").notNull(), // User-friendly name of the document
  ipAddress: text("ip_address"), // IP address for legal verification
  userAgent: text("user_agent"), // Browser/device info for legal verification 
  deviceInfo: text("device_info"), // Additional device information
  signedAt: isSqlite
    ? timestamp('signed_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('signed_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  metadata: text("metadata").default("{}"), // Additional data like consent text version (JSON string)
  verified: boolean("verified").notNull().default(false), // Verification status
  verificationMethod: text("verification_method"), // EMAIL, SMS, etc.
  verifiedAt: timestamp('verified_at', { mode: 'date' }),
});

// Create insert schemas for medical imaging tables
export const insertMedicalImagingSchema = createInsertSchema(medicalImaging).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertImagingSeriesSchema = createInsertSchema(imagingSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertImagingAnnotationSchema = createInsertSchema(imagingAnnotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertImagingMeasurementSchema = createInsertSchema(imagingMeasurements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMedicalRecordAttachmentSchema = createInsertSchema(medicalRecordAttachments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertElectronicSignatureSchema = createInsertSchema(electronicSignatures).omit({ 
  id: true, 
  createdAt: true, 
  signedAt: true,
  verifiedAt: true
});
