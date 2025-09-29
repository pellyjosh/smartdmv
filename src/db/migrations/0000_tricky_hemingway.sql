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
	"api_key" text,
	"api_key_last_reset" timestamp,
	"webhook_url" text,
	"booking_widget_enabled" boolean DEFAULT false,
	"booking_widget_settings" jsonb,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text NOT NULL,
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
	"source" text DEFAULT 'internal' NOT NULL,
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
CREATE TABLE "health_plan_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"health_plan_id" integer NOT NULL,
	"note" text NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_plan_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"health_plan_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"dueDate" timestamp,
	"completed" boolean DEFAULT false NOT NULL,
	"completedOn" timestamp,
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
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_id" integer NOT NULL,
	"transaction_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"reference_type" text,
	"reference_id" text,
	"reference_data" text,
	"performed_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" text NOT NULL,
	"medication_a_id" integer NOT NULL,
	"medication_b_id" integer NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
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
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"veterinarian_id" integer,
	"practice_id" integer NOT NULL,
	"pet_id" integer,
	"contact_method" text NOT NULL,
	"urgency" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"phone_number" text,
	"preferred_time" text,
	"appointment_id" integer,
	"room_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"responded_at" timestamp,
	"responded_by" integer,
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
CREATE TABLE "integration_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"key_name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"permissions" text NOT NULL,
	"scopes" text,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"rate_limit_per_hour" integer DEFAULT 100,
	"rate_limit_per_day" integer DEFAULT 1000,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"website_url" text,
	"is_verified" boolean DEFAULT false,
	"widget_settings" text,
	"api_settings" text,
	"webhook_url" text,
	"webhook_secret" text,
	"rate_limit_per_hour" integer DEFAULT 100,
	"allowed_origins" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"widget_id" text,
	"session_id" text,
	"appointment_type" text,
	"appointment_duration" integer,
	"user_agent" text,
	"referrer_url" text,
	"ip_address" text,
	"widget_version" text,
	"widget_config" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" text,
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"changes" jsonb,
	"reason" text,
	"practice_id" text,
	"organization_id" text,
	"version" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "permission_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"granted" boolean NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp,
	"practice_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0,
	"icon" varchar(100),
	"is_active" boolean DEFAULT true,
	"is_system_defined" boolean DEFAULT false,
	"practice_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"is_system_defined" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"practice_id" integer,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" integer
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"treatment_id" integer,
	"description" text NOT NULL,
	"quantity" numeric DEFAULT '1' NOT NULL,
	"unit_price" numeric NOT NULL,
	"subtotal" numeric NOT NULL,
	"discount_amount" numeric DEFAULT '0.00' NOT NULL,
	"taxable" text DEFAULT 'yes' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"pet_id" integer,
	"appointment_id" integer,
	"invoice_number" text NOT NULL,
	"description" text,
	"subtotal" numeric NOT NULL,
	"tax_amount" numeric DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric DEFAULT '0.00' NOT NULL,
	"total_amount" numeric NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" text NOT NULL,
	"last_four_digits" text NOT NULL,
	"expiry_month" text,
	"expiry_year" text,
	"card_brand" text,
	"billing_name" text,
	"billing_address" text,
	"billing_city" text,
	"billing_state" text,
	"billing_zip" text,
	"billing_country" text DEFAULT 'US',
	"is_default" text DEFAULT 'no' NOT NULL,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"stripe_customer_id" text,
	"stripe_payment_method_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"payment_number" text NOT NULL,
	"amount" numeric NOT NULL,
	"payment_method" text NOT NULL,
	"transaction_id" text,
	"processor_response" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "health_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"species" text DEFAULT 'all' NOT NULL,
	"thumbnail_url" text,
	"image_url" text,
	"video_url" text,
	"external_url" text,
	"download_url" text,
	"author" text,
	"tags" text,
	"estimated_read_time" text,
	"difficulty" text,
	"featured" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"view_count" text DEFAULT '0',
	"emergency_type" text,
	"contact_phone" text,
	"contact_address" text,
	"availability" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
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
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_health_plan_id_health_plans_id_fk" FOREIGN KEY ("health_plan_id") REFERENCES "public"."health_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_plan_milestones" ADD CONSTRAINT "health_plan_milestones_health_plan_id_health_plans_id_fk" FOREIGN KEY ("health_plan_id") REFERENCES "public"."health_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_veterinarian_id_users_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "treatment_checklist_templates" ADD CONSTRAINT "treatment_checklist_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_analytics" ADD CONSTRAINT "widget_analytics_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_actions" ADD CONSTRAINT "permission_actions_resource_id_permission_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."permission_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_categories" ADD CONSTRAINT "permission_categories_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_resources" ADD CONSTRAINT "permission_resources_category_id_permission_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."permission_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_resources" ADD CONSTRAINT "health_resources_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;