CREATE TABLE "dashboard_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"practice_id" text,
	"config" text NOT NULL,
	"role" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"data" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "administrator_accessible_practices" (
	"administrator_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"assignedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "administrator_accessible_practices_administrator_id_practice_id_pk" PRIMARY KEY("administrator_id","practice_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"name" text,
	"password" text NOT NULL,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"country" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relationship" text,
	"role" text NOT NULL,
	"practice_id" integer,
	"current_practice_id" integer,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"duration_minutes" text DEFAULT '30',
	"status" text DEFAULT 'pending' NOT NULL,
	"pet_id" integer,
	"client_id" integer,
	"staff_id" integer,
	"type" text,
	"practitioner_id" integer,
	"practice_id" integer NOT NULL,
	"room_id" text,
	"notes" text,
	"telemedicine_started_at" timestamp,
	"telemedicine_ended_at" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"species" text,
	"breed" text,
	"dateOfBirth" timestamp,
	"owner_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"weight" text,
	"allergies" text,
	"color" text,
	"gender" text,
	"microchip_number" text,
	"pet_type" text,
	"photo_path" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pet_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"plan_type" text,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"attending_vet_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"room_id" integer,
	"admission_date" timestamp NOT NULL,
	"discharge_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_number" text NOT NULL,
	"type" text DEFAULT 'standard' NOT NULL,
	"capacity" integer NOT NULL,
	"notes" text,
	"practice_id" integer NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"value" text,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soap_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer,
	"practitioner_id" integer NOT NULL,
	"pet_id" integer NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"has_prescriptions" boolean DEFAULT false,
	"has_attachments" boolean DEFAULT false,
	"has_treatments" boolean DEFAULT false,
	"locked" boolean DEFAULT false,
	"locked_at" timestamp,
	"updated_by_id" integer,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soap_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"species_applicability" text,
	"subjective_template" text,
	"objective_template" text,
	"assessment_template" text,
	"plan_template" text,
	"is_default" boolean DEFAULT false,
	"practice_id" integer NOT NULL,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"prescription_id" integer NOT NULL,
	"quantity_dispensed" numeric NOT NULL,
	"dispensed_by" text,
	"date_dispensed" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"notes" text,
	"inventory_transaction_id" integer,
	"practice_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"soap_note_id" integer,
	"pet_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"prescribed_by" text NOT NULL,
	"dispensed_by" text,
	"inventory_item_id" integer,
	"medication_name" text NOT NULL,
	"dosage" text NOT NULL,
	"route" text NOT NULL,
	"frequency" text NOT NULL,
	"duration" text NOT NULL,
	"instructions" text,
	"quantity_prescribed" numeric NOT NULL,
	"quantity_dispensed" numeric DEFAULT '0',
	"refills_allowed" integer DEFAULT 0,
	"refills_remaining" integer DEFAULT 0,
	"dispensed_in_house" boolean DEFAULT true,
	"status" text DEFAULT 'active' NOT NULL,
	"date_created" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"date_dispensed" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"soap_note_id" integer,
	"pet_id" integer NOT NULL,
	"practitioner_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"inventory_item_id" text,
	"dosage" text,
	"route" text,
	"frequency" text,
	"duration" text,
	"instructions" text,
	"procedure_code" text,
	"location" text,
	"technician" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"administered_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"cost" numeric,
	"billable" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whiteboard_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"appointment_id" integer,
	"notes" text,
	"urgency" text DEFAULT 'none',
	"status" text DEFAULT 'triage' NOT NULL,
	"assigned_to_id" integer,
	"location" text,
	"position" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whiteboard_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"note" text NOT NULL,
	"date" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"sku" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" text,
	"min_quantity" integer,
	"last_restock_date" timestamp,
	"expiry_date" timestamp,
	"cost" text,
	"price" text,
	"location" text,
	"supplier" text,
	"batch_tracking" boolean DEFAULT false,
	"dea_schedule" text DEFAULT 'none',
	"requires_special_auth" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"default_dosage" text,
	"default_route" text,
	"default_frequency" text,
	"default_duration" text,
	"default_instructions" text,
	"default_procedure_code" text,
	"common_diagnoses" text,
	"inventory_item_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_by_id" integer NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"note_content" text NOT NULL,
	"is_private" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"referring_practice_id" integer NOT NULL,
	"referring_vet_id" integer NOT NULL,
	"specialist_id" integer,
	"specialist_practice_id" integer,
	"referral_reason" text NOT NULL,
	"specialty" text NOT NULL,
	"clinical_history" text,
	"current_medications" text,
	"diagnostic_tests" text,
	"referral_notes" text,
	"priority" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_date" text,
	"completed_date" text,
	"attachments" boolean DEFAULT false,
	"create_appointment" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addon_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"addon_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"is_verified_purchase" boolean DEFAULT false,
	"is_published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text,
	"category" text NOT NULL,
	"icon" text,
	"cover_image" text,
	"gallery_images" text,
	"features" text,
	"pricing_tiers" text,
	"price" text,
	"is_popular" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "addons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "practice_addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"addon_id" integer NOT NULL,
	"subscription_tier" text NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"start_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"end_date" timestamp,
	"payment_status" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_activated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"practice_id" integer,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"related_id" text,
	"related_type" text,
	"link" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_order_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"lab_order_id" integer NOT NULL,
	"test_catalog_id" integer NOT NULL,
	"status" text DEFAULT 'ordered' NOT NULL,
	"price" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"ordered_by_id" integer NOT NULL,
	"soap_note_id" integer,
	"order_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provider" text NOT NULL,
	"external_order_id" text,
	"external_reference" text,
	"sample_collection_date" timestamp,
	"sample_type" text,
	"priority" text DEFAULT 'routine' NOT NULL,
	"notes" text,
	"is_manual_entry" boolean DEFAULT false NOT NULL,
	"total_price" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_provider_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"provider" text NOT NULL,
	"api_key" text,
	"api_secret" text,
	"account_id" text,
	"in_house_equipment" text,
	"in_house_contact" text,
	"in_house_location" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"lab_order_id" integer NOT NULL,
	"test_catalog_id" integer,
	"result_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"results" text NOT NULL,
	"interpretation" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference_range" text,
	"previous_value" text,
	"previous_date" timestamp,
	"trend_direction" text,
	"abnormal_flags" text,
	"reviewed_by_id" integer,
	"reviewed_at" timestamp,
	"notes" text,
	"file_path" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_test_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_code" text NOT NULL,
	"test_name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"provider" text NOT NULL,
	"price" text,
	"turn_around_time" text,
	"practice_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"reference_ranges" text,
	"instructions" text,
	"is_panel" boolean DEFAULT false NOT NULL,
	"panel_test_ids" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boarding_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"activity_date" timestamp NOT NULL,
	"performed_by_id" integer NOT NULL,
	"notes" text,
	"success" boolean DEFAULT true,
	"practice_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boarding_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"requirement_type" text NOT NULL,
	"requirement_description" text NOT NULL,
	"is_mandatory" boolean DEFAULT true,
	"is_completed" boolean DEFAULT false,
	"completed_date" timestamp,
	"completed_by_id" integer,
	"notes" text,
	"practice_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boarding_stays" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"kennel_id" integer NOT NULL,
	"check_in_date" timestamp NOT NULL,
	"planned_check_out_date" timestamp NOT NULL,
	"actual_check_out_date" timestamp,
	"status" text NOT NULL,
	"special_instructions" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"reservation_notes" text,
	"belongings_description" text,
	"daily_rate" text,
	"practice_id" integer NOT NULL,
	"created_by_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feeding_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"feeding_type" text NOT NULL,
	"food_description" text,
	"frequency" text NOT NULL,
	"amount" text NOT NULL,
	"special_instructions" text,
	"practice_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kennels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"size" text NOT NULL,
	"location" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"practice_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"medication_name" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"route" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"special_instructions" text,
	"last_administered" timestamp,
	"practice_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electronic_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signer_type" text NOT NULL,
	"signature_data" text NOT NULL,
	"document_type" text NOT NULL,
	"document_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"document_name" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_info" text,
	"signed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"metadata" text DEFAULT '{}',
	"verified" boolean DEFAULT false NOT NULL,
	"verification_method" text,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "imaging_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"annotation_type" text NOT NULL,
	"annotation_data" text NOT NULL,
	"color" text DEFAULT '#FF0000',
	"text" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"measurement_type" text NOT NULL,
	"measurement_data" text NOT NULL,
	"value" text NOT NULL,
	"unit" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"medical_imaging_id" text NOT NULL,
	"series_number" integer NOT NULL,
	"series_name" text NOT NULL,
	"description" text,
	"file_path" text,
	"number_of_images" integer DEFAULT 0,
	"modality" text NOT NULL,
	"body_part" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_imaging" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"soap_note_id" text,
	"veterinarian_id" text NOT NULL,
	"radiologist_id" text,
	"study_date" timestamp NOT NULL,
	"imaging_type" text NOT NULL,
	"anatomical_region" text NOT NULL,
	"laterality" text,
	"view" text,
	"study_name" text NOT NULL,
	"description" text,
	"findings" text,
	"impression" text,
	"recommendations" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"has_annotations" boolean DEFAULT false NOT NULL,
	"has_measurements" boolean DEFAULT false NOT NULL,
	"machine_info" text,
	"technician_notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_record_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" text NOT NULL,
	"description" text,
	"tags" text,
	"thumbnail_path" text,
	"series_id" text,
	"dicom_metadata" text,
	"width" integer,
	"height" integer,
	"rotation" integer DEFAULT 0,
	"calibration_factor" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"gemini_api_key" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"configured_by" integer NOT NULL,
	"max_tokens" text,
	"temperature" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"practice_id" integer NOT NULL,
	"vaccine_type_id" integer,
	"vaccine_name" text NOT NULL,
	"manufacturer" text,
	"lot_number" text,
	"serial_number" text,
	"expiration_date" timestamp,
	"administration_date" timestamp NOT NULL,
	"administration_site" text,
	"route" text,
	"dose" text,
	"administering_vet_id" integer,
	"next_due_date" timestamp,
	"status" text DEFAULT 'completed' NOT NULL,
	"reactions" text,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccine_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"species" text NOT NULL,
	"manufacturer" text,
	"diseases_protected" text,
	"recommended_schedule" text,
	"duration_of_immunity" text,
	"side_effects" text,
	"contraindications" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assigned_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"pet_id" integer NOT NULL,
	"template_id" integer,
	"appointment_id" integer,
	"soap_note_id" integer,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"assigned_by_id" integer,
	"assigned_to_id" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" text,
	"due_date" timestamp,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completed_by_id" integer,
	"assigned_to_id" integer,
	"notes" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"estimated_duration" integer,
	"reminder_threshold" integer,
	"assignee_role" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"estimated_duration" integer,
	"reminder_threshold" integer,
	"assignee_role" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_checklist_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_assign_to_diagnosis" jsonb,
	"created_by_id" integer NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrator_accessible_practices" ADD CONSTRAINT "administrator_accessible_practices_administrator_id_users_id_fk" FOREIGN KEY ("administrator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrator_accessible_practices" ADD CONSTRAINT "administrator_accessible_practices_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_current_practice_id_practices_id_fk" FOREIGN KEY ("current_practice_id") REFERENCES "public"."practices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_attending_vet_id_users_id_fk" FOREIGN KEY ("attending_vet_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_categories" ADD CONSTRAINT "custom_field_categories_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_groups" ADD CONSTRAINT "custom_field_groups_category_id_custom_field_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."custom_field_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_groups" ADD CONSTRAINT "custom_field_groups_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_group_id_custom_field_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."custom_field_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_soap_note_id_soap_notes_id_fk" FOREIGN KEY ("soap_note_id") REFERENCES "public"."soap_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD CONSTRAINT "whiteboard_items_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD CONSTRAINT "whiteboard_items_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD CONSTRAINT "whiteboard_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD CONSTRAINT "whiteboard_items_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_notes" ADD CONSTRAINT "whiteboard_notes_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whiteboard_notes" ADD CONSTRAINT "whiteboard_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attachments" ADD CONSTRAINT "referral_attachments_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attachments" ADD CONSTRAINT "referral_attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_notes" ADD CONSTRAINT "referral_notes_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_notes" ADD CONSTRAINT "referral_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referring_practice_id_practices_id_fk" FOREIGN KEY ("referring_practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referring_vet_id_users_id_fk" FOREIGN KEY ("referring_vet_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_specialist_id_users_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_specialist_practice_id_practices_id_fk" FOREIGN KEY ("specialist_practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_reviews" ADD CONSTRAINT "addon_reviews_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_reviews" ADD CONSTRAINT "addon_reviews_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_reviews" ADD CONSTRAINT "addon_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_addons" ADD CONSTRAINT "practice_addons_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_addons" ADD CONSTRAINT "practice_addons_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_order_tests" ADD CONSTRAINT "lab_order_tests_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "public"."lab_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_order_tests" ADD CONSTRAINT "lab_order_tests_test_catalog_id_lab_test_catalog_id_fk" FOREIGN KEY ("test_catalog_id") REFERENCES "public"."lab_test_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_id_users_id_fk" FOREIGN KEY ("ordered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_soap_note_id_soap_notes_id_fk" FOREIGN KEY ("soap_note_id") REFERENCES "public"."soap_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_provider_settings" ADD CONSTRAINT "lab_provider_settings_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "public"."lab_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_test_catalog_id_lab_test_catalog_id_fk" FOREIGN KEY ("test_catalog_id") REFERENCES "public"."lab_test_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_catalog" ADD CONSTRAINT "lab_test_catalog_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_configured_by_users_id_fk" FOREIGN KEY ("configured_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_vaccine_type_id_vaccine_types_id_fk" FOREIGN KEY ("vaccine_type_id") REFERENCES "public"."vaccine_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_administering_vet_id_users_id_fk" FOREIGN KEY ("administering_vet_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccine_types" ADD CONSTRAINT "vaccine_types_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_template_id_treatment_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."treatment_checklist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_soap_note_id_soap_notes_id_fk" FOREIGN KEY ("soap_note_id") REFERENCES "public"."soap_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_checklists" ADD CONSTRAINT "assigned_checklists_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_assigned_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."assigned_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_items" ADD CONSTRAINT "template_items_template_id_treatment_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."treatment_checklist_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_checklist_templates" ADD CONSTRAINT "treatment_checklist_templates_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_checklist_templates" ADD CONSTRAINT "treatment_checklist_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;