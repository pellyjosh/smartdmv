import { db } from '@/db';
import { roles } from '@/db/schemas/rolesSchema';
import { UserRoleEnum } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const SYSTEM_ROLES = [
	{
		name: UserRoleEnum.SUPER_ADMIN,
		displayName: 'Super Administrator',
		description: 'Full system access with all permissions across all practices',
		isSystemDefined: true,
		permissions: [
			{ id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'users_delete', resource: 'users', action: 'DELETE', granted: true, category: 'Users & Access' },
			{ id: 'users_manage', resource: 'users', action: 'MANAGE', granted: true, category: 'Users & Access' },
			{ id: 'roles_create', resource: 'roles', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'roles_read', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'roles_update', resource: 'roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'roles_delete', resource: 'roles', action: 'DELETE', granted: true, category: 'Users & Access' },
			{ id: 'permissions_manage', resource: 'permissions', action: 'MANAGE', granted: true, category: 'Users & Access' },
			{ id: 'practices_create', resource: 'practices', action: 'CREATE', granted: true, category: 'System Management' },
			{ id: 'practices_read', resource: 'practices', action: 'READ', granted: true, category: 'System Management' },
			{ id: 'practices_update', resource: 'practices', action: 'UPDATE', granted: true, category: 'System Management' },
			{ id: 'practices_delete', resource: 'practices', action: 'DELETE', granted: true, category: 'System Management' },
			// Broad system-level resources
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'vaccinations_manage', resource: 'vaccinations', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'prescriptions_manage', resource: 'prescriptions', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'treatments_manage', resource: 'treatments', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'lab_manage', resource: 'lab', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
			{ id: 'custom_fields_manage', resource: 'custom_fields', action: 'MANAGE', granted: true, category: 'Configuration' },
			{ id: 'checklists_manage', resource: 'checklists', action: 'MANAGE', granted: true, category: 'Workflow' },
			{ id: 'health_plans_manage', resource: 'health_plans', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'reports_manage', resource: 'reports', action: 'MANAGE', granted: true, category: 'Reporting' },
				// Auto-added permissions discovered in repository scan
				{ id: '__read', resource: '__read', action: 'READ', granted: true, category: 'Misc' },
				{ id: 'addons_create', resource: 'addons', action: 'CREATE', granted: true, category: 'Marketplace' },
				{ id: 'addons_read', resource: 'addons', action: 'READ', granted: true, category: 'Marketplace' },
				{ id: 'addons_update', resource: 'addons', action: 'UPDATE', granted: true, category: 'Marketplace' },
				{ id: 'addons_delete', resource: 'addons', action: 'DELETE', granted: true, category: 'Marketplace' },
				{ id: 'addons_manage', resource: 'addons', action: 'MANAGE', granted: true, category: 'Marketplace' },
				{ id: 'admin_all', resource: 'admin', action: 'ALL', granted: true, category: 'System' },
				{ id: 'analytics_manage', resource: 'analytics', action: 'MANAGE', granted: true, category: 'Analytics' },
				{ id: 'analytics_read', resource: 'analytics', action: 'READ', granted: true, category: 'Analytics' },
				{ id: 'appointments_delete', resource: 'appointments', action: 'DELETE', granted: true, category: 'Patients & Records' },
				{ id: 'audit_logs_manage', resource: 'audit_logs', action: 'MANAGE', granted: true, category: 'Audit' },
				{ id: 'audit_logs_read', resource: 'audit_logs', action: 'READ', granted: true, category: 'Audit' },
				{ id: 'billing_create', resource: 'billing', action: 'CREATE', granted: true, category: 'Financial' },
				{ id: 'billing_read', resource: 'billing', action: 'READ', granted: true, category: 'Financial' },
				{ id: 'billing_update', resource: 'billing', action: 'UPDATE', granted: true, category: 'Financial' },
				{ id: 'billing_delete', resource: 'billing', action: 'DELETE', granted: true, category: 'Financial' },
				{ id: 'billing_manage', resource: 'billing', action: 'MANAGE', granted: true, category: 'Financial' },
				{ id: 'financial_reports_create', resource: 'financial_reports', action: 'CREATE', granted: true, category: 'Financial' },
				{ id: 'financial_reports_manage', resource: 'financial_reports', action: 'MANAGE', granted: true, category: 'Financial' },
				{ id: 'financial_reports_read', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
				{ id: 'imaging_create', resource: 'imaging', action: 'CREATE', granted: true, category: 'Medical Imaging' },
				{ id: 'imaging_read', resource: 'imaging', action: 'READ', granted: true, category: 'Medical Imaging' },
				{ id: 'imaging_update', resource: 'imaging', action: 'UPDATE', granted: true, category: 'Medical Imaging' },
				{ id: 'imaging_delete', resource: 'imaging', action: 'DELETE', granted: true, category: 'Medical Imaging' },
				{ id: 'imaging_manage', resource: 'imaging', action: 'MANAGE', granted: true, category: 'Medical Imaging' },
				{ id: 'inventory_create', resource: 'inventory', action: 'CREATE', granted: true, category: 'Operations' },
				{ id: 'inventory_delete', resource: 'inventory', action: 'DELETE', granted: true, category: 'Operations' },
				{ id: 'lab_orders_delete', resource: 'lab_orders', action: 'DELETE', granted: true, category: 'Medical' },
				{ id: 'lab_orders_manage', resource: 'lab_orders', action: 'MANAGE', granted: true, category: 'Medical' },
				{ id: 'lab_orders_update', resource: 'lab_orders', action: 'UPDATE', granted: true, category: 'Medical' },
				{ id: 'lab_results_create', resource: 'lab_results', action: 'CREATE', granted: true, category: 'Medical' },
				{ id: 'lab_results_delete', resource: 'lab_results', action: 'DELETE', granted: true, category: 'Medical' },
				{ id: 'lab_results_manage', resource: 'lab_results', action: 'MANAGE', granted: true, category: 'Medical' },
				{ id: 'lab_results_update', resource: 'lab_results', action: 'UPDATE', granted: true, category: 'Medical' },
				{ id: 'marketplace_manage', resource: 'marketplace', action: 'MANAGE', granted: true, category: 'Marketplace' },
				{ id: 'marketplace_read', resource: 'marketplace', action: 'READ', granted: true, category: 'Marketplace' },
				{ id: 'medical_records_delete', resource: 'medical_records', action: 'DELETE', granted: true, category: 'Patients & Records' },
				{ id: 'medical_records_manage', resource: 'medical_records', action: 'MANAGE', granted: true, category: 'Patients & Records' },
				{ id: 'medications_create', resource: 'medications', action: 'CREATE', granted: true, category: 'Inventory' },
				{ id: 'medications_read', resource: 'medications', action: 'READ', granted: true, category: 'Inventory' },
				{ id: 'medications_update', resource: 'medications', action: 'UPDATE', granted: true, category: 'Inventory' },
				{ id: 'medications_delete', resource: 'medications', action: 'DELETE', granted: true, category: 'Inventory' },
				{ id: 'medications_manage', resource: 'medications', action: 'MANAGE', granted: true, category: 'Inventory' },
				{ id: 'messaging_create', resource: 'messaging', action: 'CREATE', granted: true, category: 'Communications' },
				{ id: 'messaging_read', resource: 'messaging', action: 'READ', granted: true, category: 'Communications' },
				{ id: 'messaging_update', resource: 'messaging', action: 'UPDATE', granted: true, category: 'Communications' },
				{ id: 'messaging_delete', resource: 'messaging', action: 'DELETE', granted: true, category: 'Communications' },
				{ id: 'messaging_manage', resource: 'messaging', action: 'MANAGE', granted: true, category: 'Communications' },
				{ id: 'notifications_create', resource: 'notifications', action: 'CREATE', granted: true, category: 'Notifications' },
				{ id: 'notifications_read', resource: 'notifications', action: 'READ', granted: true, category: 'Notifications' },
				{ id: 'notifications_update', resource: 'notifications', action: 'UPDATE', granted: true, category: 'Notifications' },
				{ id: 'notifications_delete', resource: 'notifications', action: 'DELETE', granted: true, category: 'Notifications' },
				{ id: 'notifications_manage', resource: 'notifications', action: 'MANAGE', granted: true, category: 'Notifications' },
				{ id: 'patients_delete', resource: 'patients', action: 'DELETE', granted: true, category: 'Patients & Records' },
				{ id: 'patients_manage', resource: 'patients', action: 'MANAGE', granted: true, category: 'Patients & Records' },
				{ id: 'payments_create', resource: 'payments', action: 'CREATE', granted: true, category: 'Financial' },
				{ id: 'payments_delete', resource: 'payments', action: 'DELETE', granted: true, category: 'Financial' },
				{ id: 'payments_read', resource: 'payments', action: 'READ', granted: true, category: 'Financial' },
				{ id: 'payments_update', resource: 'payments', action: 'UPDATE', granted: true, category: 'Financial' },
				{ id: 'permissions_create', resource: 'permissions', action: 'CREATE', granted: true, category: 'Users & Access' },
				{ id: 'permissions_read', resource: 'permissions', action: 'READ', granted: true, category: 'Users & Access' },
				{ id: 'permissions_update', resource: 'permissions', action: 'UPDATE', granted: true, category: 'Users & Access' },
				{ id: 'permissions_delete', resource: 'permissions', action: 'DELETE', granted: true, category: 'Users & Access' },
				{ id: 'practice_access_all', resource: 'practice_access', action: 'ALL', granted: true, category: 'Practice Management' },
				{ id: 'practice_admin_all', resource: 'practice_admin', action: 'ALL', granted: true, category: 'Practice Management' },
				{ id: 'practice_settings_create', resource: 'practice_settings', action: 'CREATE', granted: true, category: 'Practice Management' },
				{ id: 'practice_settings_read', resource: 'practice_settings', action: 'READ', granted: true, category: 'Practice Management' },
				{ id: 'practice_settings_update', resource: 'practice_settings', action: 'UPDATE', granted: true, category: 'Practice Management' },
				{ id: 'practice_settings_delete', resource: 'practice_settings', action: 'DELETE', granted: true, category: 'Practice Management' },
				{ id: 'practice_settings_manage', resource: 'practice_settings', action: 'MANAGE', granted: true, category: 'Practice Management' },
				{ id: 'practice_switching_manage', resource: 'practice_switching', action: 'MANAGE', granted: true, category: 'Practice Management' },
				{ id: 'practice_access_all', resource: 'practice_access', action: 'ALL', granted: true, category: 'Practice Management' },
				{ id: 'procedures_create', resource: 'procedures', action: 'CREATE', granted: true, category: 'Treatments & Procedures' },
				{ id: 'procedures_read', resource: 'procedures', action: 'READ', granted: true, category: 'Treatments & Procedures' },
				{ id: 'procedures_update', resource: 'procedures', action: 'UPDATE', granted: true, category: 'Treatments & Procedures' },
				{ id: 'procedures_delete', resource: 'procedures', action: 'DELETE', granted: true, category: 'Treatments & Procedures' },
				{ id: 'procedures_manage', resource: 'procedures', action: 'MANAGE', granted: true, category: 'Treatments & Procedures' },
				{ id: 'reports_create', resource: 'reports', action: 'CREATE', granted: true, category: 'Reporting' },
				{ id: 'reports_read', resource: 'reports', action: 'READ', granted: true, category: 'Reporting' },
				{ id: 'reports_update', resource: 'reports', action: 'UPDATE', granted: true, category: 'Reporting' },
				{ id: 'reports_delete', resource: 'reports', action: 'DELETE', granted: true, category: 'Reporting' },
				{ id: 'roles_manage', resource: 'roles', action: 'MANAGE', granted: true, category: 'Users & Access' },
				{ id: 'system_backups_create', resource: 'system_backups', action: 'CREATE', granted: true, category: 'System' },
				{ id: 'system_backups_read', resource: 'system_backups', action: 'READ', granted: true, category: 'System' },
				{ id: 'system_backups_manage', resource: 'system_backups', action: 'MANAGE', granted: true, category: 'System' },
				{ id: 'system_settings_create', resource: 'system_settings', action: 'CREATE', granted: true, category: 'System' },
				{ id: 'system_settings_read', resource: 'system_settings', action: 'READ', granted: true, category: 'System' },
				{ id: 'system_settings_update', resource: 'system_settings', action: 'UPDATE', granted: true, category: 'System' },
				{ id: 'system_settings_delete', resource: 'system_settings', action: 'DELETE', granted: true, category: 'System' },
				{ id: 'system_settings_manage', resource: 'system_settings', action: 'MANAGE', granted: true, category: 'System' },
				{ id: 'telemedicine_create', resource: 'telemedicine', action: 'CREATE', granted: true, category: 'Telemedicine' },
				{ id: 'telemedicine_read', resource: 'telemedicine', action: 'READ', granted: true, category: 'Telemedicine' },
				{ id: 'telemedicine_update', resource: 'telemedicine', action: 'UPDATE', granted: true, category: 'Telemedicine' },
				{ id: 'telemedicine_delete', resource: 'telemedicine', action: 'DELETE', granted: true, category: 'Telemedicine' },
				{ id: 'telemedicine_manage', resource: 'telemedicine', action: 'MANAGE', granted: true, category: 'Telemedicine' },
				{ id: 'treatments_create', resource: 'treatments', action: 'CREATE', granted: true, category: 'Medical' },
				{ id: 'treatments_read', resource: 'treatments', action: 'READ', granted: true, category: 'Medical' },
				{ id: 'treatments_update', resource: 'treatments', action: 'UPDATE', granted: true, category: 'Medical' },
				{ id: 'treatments_delete', resource: 'treatments', action: 'DELETE', granted: true, category: 'Medical' },
				{ id: 'whiteboard_update', resource: 'whiteboard', action: 'UPDATE', granted: true, category: 'Collaboration' },
		],
	},
	{
		name: UserRoleEnum.PRACTICE_ADMINISTRATOR,
		displayName: 'Practice Administrator',
		description: 'Full practice-level administration with most permissions',
		isSystemDefined: true,
		permissions: [
			{ id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'users_delete', resource: 'users', action: 'DELETE', granted: false, category: 'Users & Access' },
			{ id: 'roles_read', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'roles_update', resource: 'roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'custom_roles_create', resource: 'custom_roles', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'custom_roles_update', resource: 'custom_roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
			{ id: 'financial_reports', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'vaccinations_manage', resource: 'vaccinations', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'prescriptions_manage', resource: 'prescriptions', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'treatments_manage', resource: 'treatments', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'lab_manage', resource: 'lab', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'custom_fields_manage', resource: 'custom_fields', action: 'MANAGE', granted: true, category: 'Configuration' },
		],
	},
	{
		name: UserRoleEnum.ADMINISTRATOR,
		displayName: 'Administrator',
		description: 'General administrator with broad access',
		isSystemDefined: true,
		permissions: [
			{ id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'roles_read', resource: 'roles', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'roles_update', resource: 'roles', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'inventory_read', resource: 'inventory', action: 'READ', granted: true, category: 'Operations' },
			{ id: 'vaccinations_create', resource: 'vaccinations', action: 'CREATE', granted: true, category: 'Medical' },
			{ id: 'vaccinations_read', resource: 'vaccinations', action: 'READ', granted: true, category: 'Medical' },
			{ id: 'vaccinations_update', resource: 'vaccinations', action: 'UPDATE', granted: true, category: 'Medical' },
			{ id: 'vaccinations_delete', resource: 'vaccinations', action: 'DELETE', granted: false, category: 'Medical' },
			{ id: 'prescriptions_create', resource: 'prescriptions', action: 'CREATE', granted: true, category: 'Medical' },
			{ id: 'prescriptions_read', resource: 'prescriptions', action: 'READ', granted: true, category: 'Medical' },
			{ id: 'prescriptions_update', resource: 'prescriptions', action: 'UPDATE', granted: true, category: 'Medical' },
			{ id: 'treatments_manage', resource: 'treatments', action: 'MANAGE', granted: true, category: 'Medical' },
			{ id: 'lab_manage', resource: 'lab', action: 'MANAGE', granted: true, category: 'Medical' },
		],
	},
	{
		name: UserRoleEnum.VETERINARIAN,
		displayName: 'Veterinarian',
		description: 'Licensed veterinarian with patient care and medical record access',
		isSystemDefined: true,
		permissions: [
			{ id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'medical_records_create', resource: 'medical_records', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'medical_records_read', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'medical_records_update', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'prescriptions_create', resource: 'prescriptions', action: 'CREATE', granted: true, category: 'Medical' },
			{ id: 'prescriptions_update', resource: 'prescriptions', action: 'UPDATE', granted: true, category: 'Medical' },
			{ id: 'lab_orders_create', resource: 'lab_orders', action: 'CREATE', granted: true, category: 'Medical' },
			{ id: 'lab_results_read', resource: 'lab_results', action: 'READ', granted: true, category: 'Medical' },
			{ id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_update', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'vaccinations_create', resource: 'vaccinations', action: 'CREATE', granted: true, category: 'Medical' },
			{ id: 'vaccinations_update', resource: 'vaccinations', action: 'UPDATE', granted: true, category: 'Medical' },
			{ id: 'prescriptions_dispense', resource: 'prescriptions', action: 'DISPENSE', granted: true, category: 'Medical' },
		],
	},
	{
		name: UserRoleEnum.TECHNICIAN,
		displayName: 'Veterinary Technician',
		description: 'Licensed veterinary technician with limited patient care access',
		isSystemDefined: true,
		permissions: [
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'medical_records_read', resource: 'medical_records', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'medical_records_update', resource: 'medical_records', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'lab_orders_read', resource: 'lab_orders', action: 'READ', granted: true, category: 'Medical' },
			{ id: 'lab_results_read', resource: 'lab_results', action: 'READ', granted: true, category: 'Medical' },
			{ id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_update', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'inventory_read', resource: 'inventory', action: 'READ', granted: true, category: 'Operations' },
			{ id: 'inventory_update', resource: 'inventory', action: 'UPDATE', granted: true, category: 'Operations' },
			{ id: 'vaccinations_read', resource: 'vaccinations', action: 'READ', granted: true, category: 'Medical' },
			{ id: 'vaccinations_update', resource: 'vaccinations', action: 'UPDATE', granted: true, category: 'Medical' },
		],
	},
	{
		name: UserRoleEnum.RECEPTIONIST,
		displayName: 'Receptionist',
		description: 'Front desk operations and appointment management',
		isSystemDefined: true,
		permissions: [
			{ id: 'appointments_create', resource: 'appointments', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_update', resource: 'appointments', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'patients_create', resource: 'patients', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'patients_update', resource: 'patients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'clients_create', resource: 'clients', action: 'CREATE', granted: true, category: 'Patients & Records' },
			{ id: 'clients_read', resource: 'clients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'clients_update', resource: 'clients', action: 'UPDATE', granted: true, category: 'Patients & Records' },
			{ id: 'financial_basic', resource: 'financial_basic', action: 'READ', granted: true, category: 'Financial' },
		],
	},
	{
		name: UserRoleEnum.PRACTICE_MANAGER,
		displayName: 'Practice Manager',
		description: 'Practice management with administrative and operational oversight',
		isSystemDefined: true,
		permissions: [
			{ id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
			{ id: 'financial_reports', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
			{ id: 'staff_scheduling', resource: 'staff_scheduling', action: 'MANAGE', granted: true, category: 'Operations' },
			{ id: 'custom_fields_manage', resource: 'custom_fields', action: 'MANAGE', granted: true, category: 'Configuration' },
			{ id: 'vaccinations_read', resource: 'vaccinations', action: 'READ', granted: true, category: 'Medical' },
		],
	},
	{
		name: UserRoleEnum.PRACTICE_ADMIN,
		displayName: 'Practice Admin',
		description: 'Practice-level administrative access',
		isSystemDefined: true,
		permissions: [
			{ id: 'users_create', resource: 'users', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'users_update', resource: 'users', action: 'UPDATE', granted: true, category: 'Users & Access' },
			{ id: 'custom_roles_create', resource: 'custom_roles', action: 'CREATE', granted: true, category: 'Users & Access' },
			{ id: 'patients_read', resource: 'patients', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'inventory_manage', resource: 'inventory', action: 'MANAGE', granted: true, category: 'Operations' },
			{ id: 'vaccinations_manage', resource: 'vaccinations', action: 'MANAGE', granted: true, category: 'Medical' },
		],
	},
	{
		name: UserRoleEnum.ACCOUNTANT,
		displayName: 'Accountant',
		description: 'Financial management and reporting access',
		isSystemDefined: true,
		permissions: [
			{ id: 'financial_reports', resource: 'financial_reports', action: 'READ', granted: true, category: 'Financial' },
			{ id: 'financial_manage', resource: 'financial_manage', action: 'UPDATE', granted: true, category: 'Financial' },
			{ id: 'invoices_create', resource: 'invoices', action: 'CREATE', granted: true, category: 'Financial' },
			{ id: 'invoices_read', resource: 'invoices', action: 'READ', granted: true, category: 'Financial' },
			{ id: 'invoices_update', resource: 'invoices', action: 'UPDATE', granted: true, category: 'Financial' },
			{ id: 'payments_manage', resource: 'payments', action: 'MANAGE', granted: true, category: 'Financial' },
		],
	},
	{
		name: UserRoleEnum.CASHIER,
		displayName: 'Cashier',
		description: 'Payment processing and basic financial operations',
		isSystemDefined: true,
		permissions: [
			{ id: 'payments_process', resource: 'payments', action: 'CREATE', granted: true, category: 'Financial' },
			{ id: 'invoices_read', resource: 'invoices', action: 'READ', granted: true, category: 'Financial' },
			{ id: 'appointments_read', resource: 'appointments', action: 'READ', granted: true, category: 'Patients & Records' },
			{ id: 'clients_read', resource: 'clients', action: 'READ', granted: true, category: 'Patients & Records' },
		],
	},
	{
		name: UserRoleEnum.OFFICE_MANAGER,
		displayName: 'Office Manager',
		description: 'Office operations and administrative coordination',
		isSystemDefined: true,
		permissions: [
			{ id: 'users_read', resource: 'users', action: 'READ', granted: true, category: 'Users & Access' },
			{ id: 'appointments_manage', resource: 'appointments', action: 'MANAGE', granted: true, category: 'Patients & Records' },
			{ id: 'inventory_read', resource: 'inventory', action: 'READ', granted: true, category: 'Operations' },
			{ id: 'staff_scheduling', resource: 'staff_scheduling', action: 'MANAGE', granted: true, category: 'Operations' },
			{ id: 'office_operations', resource: 'office_operations', action: 'MANAGE', granted: true, category: 'Operations' },
		],
	},
	{
		name: UserRoleEnum.CLIENT,
		displayName: 'Client',
		description: 'Pet owner with limited access to their own records',
		isSystemDefined: true,
		permissions: [
			{ id: 'own_pets_read', resource: 'own_pets', action: 'READ', granted: true, category: 'Personal Records' },
			{ id: 'own_appointments_read', resource: 'own_appointments', action: 'READ', granted: true, category: 'Personal Records' },
			{ id: 'own_appointments_create', resource: 'own_appointments', action: 'CREATE', granted: true, category: 'Personal Records' },
			{ id: 'own_medical_records_read', resource: 'own_medical_records', action: 'READ', granted: true, category: 'Personal Records' },
			{ id: 'profile_update', resource: 'profile', action: 'UPDATE', granted: true, category: 'Personal Records' },
		],
	},
];

export async function seedSystemRoles() {
	console.log('Seeding system roles...');

	for (const roleData of SYSTEM_ROLES) {
		// Check if role already exists
		const existingRole = await db
			.select()
			.from(roles)
			.where(
				and(
					eq(roles.name, roleData.name),
					eq(roles.isSystemDefined, true)
				)
			)
			.limit(1);

		if (existingRole.length === 0) {
			await db.insert(roles).values({
				name: roleData.name,
				displayName: roleData.displayName,
				description: roleData.description,
				isSystemDefined: roleData.isSystemDefined,
				permissions: roleData.permissions,
				practiceId: null, // System roles are not practice-specific
			});
			console.log(`✓ Created system role: ${roleData.displayName}`);
		} else {
			// Merge existing permissions with the seed permissions (preserve existing entries)
			const existing = existingRole[0] as any;
			const existingPermissions: any[] = Array.isArray(existing.permissions) ? existing.permissions : [];

			const map = new Map<string, any>();
			for (const p of existingPermissions) {
				if (p && p.id) map.set(p.id, p);
			}
			for (const p of roleData.permissions) {
				if (!map.has(p.id)) map.set(p.id, p);
			}

			const mergedPermissions = Array.from(map.values());

			await db.update(roles).set({
				displayName: roleData.displayName,
				description: roleData.description,
				isSystemDefined: roleData.isSystemDefined,
				permissions: mergedPermissions,
			}).where(eq(roles.id, existing.id));

			console.log(`✓ Updated existing system role: ${roleData.displayName} (id=${existing.id})`);
		}
	}

	console.log('System roles seeding completed');
}

// Run seeding if this file is executed directly
if (require.main === module) {
	seedSystemRoles()
		.then(() => {
			console.log('Seeding completed successfully');
			process.exit(0);
		})
		.catch((error) => {
			console.error('Seeding failed:', error);
			process.exit(1);
		});
}
