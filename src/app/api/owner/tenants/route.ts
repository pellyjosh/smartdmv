import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Pool } from 'pg';
import { ownerDb } from '@/db/owner-db';
import { tenants, ownerUsers, ownerSessions } from '@/db/owner-schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Marketplace seeding function for tenant database
async function seedMarketplaceData(tenantDb: any, schema: any) {
  console.log('🛍️ Starting marketplace data seeding...');

  const addonsData = [
    {
      name: 'Advanced Analytics Dashboard',
      slug: 'advanced-analytics-dashboard',
      description: 'Get detailed insights into your practice performance with advanced analytics, reporting, and business intelligence.',
      shortDescription: 'Advanced analytics and reporting for your practice',
      category: 'ADMINISTRATIVE',
      price: '49.99',
      icon: 'BarChart3',
      features: JSON.stringify([
        'Real-time practice analytics',
        'Custom reporting dashboard',
        'Revenue tracking',
        'Client behavior insights',
        'Performance benchmarking'
      ]),
      isPopular: true,
      isFeatured: true
    },
    {
      name: 'AI-Powered Diagnosis Assistant',
      slug: 'ai-powered-diagnosis-assistant',
      description: 'Leverage artificial intelligence to enhance diagnostic accuracy and speed up treatment decisions.',
      shortDescription: 'AI-powered diagnostic assistance',
      category: 'AI',
      price: '99.99',
      icon: 'Brain',
      features: JSON.stringify([
        'AI diagnostic suggestions',
        'Medical image analysis',
        'Treatment recommendations',
        'Drug interaction checking',
        'Clinical decision support'
      ]),
      isPopular: true,
      isFeatured: true
    },
    {
      name: 'Client Portal Mobile App',
      slug: 'client-portal-mobile-app',
      description: 'Branded mobile application for your clients to manage appointments, access records, and communicate.',
      shortDescription: 'Mobile app for pet parents',
      category: 'CLIENT_PORTAL',
      price: '59.99',
      icon: 'Smartphone',
      features: JSON.stringify([
        'Branded mobile app',
        'Appointment scheduling',
        'Medical record access',
        'Photo sharing',
        'Push notifications'
      ]),
      isPopular: false,
      isFeatured: false
    },
    {
      name: 'Enhanced Communication Suite',
      slug: 'enhanced-communication-suite',
      description: 'Advanced communication tools including SMS, email automation, and video consultations.',
      shortDescription: 'Complete communication platform',
      category: 'COMMUNICATION',
      price: '79.99',
      icon: 'MessageSquare',
      features: JSON.stringify([
        'Automated SMS notifications',
        'Email campaign tools',
        'Video consultations',
        'Client portal messaging',
        'Appointment reminders'
      ]),
      isPopular: false,
      isFeatured: false
    },
    {
      name: 'Financial Management Pro',
      slug: 'financial-management-pro',
      description: 'Comprehensive financial management with advanced reporting, invoicing, and payment processing.',
      shortDescription: 'Professional financial management',
      category: 'FINANCIAL',
      price: '89.99',
      icon: 'DollarSign',
      features: JSON.stringify([
        'Advanced financial reporting',
        'Automated invoicing',
        'Payment processing',
        'Tax preparation tools',
        'Profit analysis'
      ]),
      isPopular: false,
      isFeatured: false
    },
    {
      name: 'Website Request',
      slug: 'website-request',
      description: 'Professional website creation and management service for your veterinary practice.',
      shortDescription: 'Custom website for your practice',
      category: 'MARKETING',
      price: '199.99',
      icon: 'Globe',
      features: JSON.stringify([
        'Custom website design',
        'Mobile responsive layout',
        'SEO optimization',
        'Online appointment booking',
        'Content management system',
        'Domain and hosting included'
      ]),
      isPopular: true,
      isFeatured: true
    },
    {
      name: 'Telemedicine',
      slug: 'telemedicine',
      description: 'Virtual consultation platform enabling remote veterinary care and consultations.',
      shortDescription: 'Virtual veterinary consultations',
      category: 'TELEMEDICINE',
      price: '149.99',
      icon: 'Video',
      features: JSON.stringify([
        'Video consultations',
        'Screen sharing',
        'Digital prescriptions',
        'Remote monitoring',
        'Consultation recording',
        'Multi-device support'
      ]),
      isPopular: true,
      isFeatured: true
    },
    {
      name: 'Diseases Reporting',
      slug: 'diseases-reporting',
      description: 'Comprehensive disease tracking and reporting system for regulatory compliance and public health monitoring.',
      shortDescription: 'Disease tracking and reporting',
      category: 'COMPLIANCE',
      price: '79.99',
      icon: 'FileText',
      features: JSON.stringify([
        'Disease case tracking',
        'Regulatory reporting',
        'Public health alerts',
        'Outbreak monitoring',
        'Custom report generation',
        'Integration with health authorities'
      ]),
      isPopular: false,
      isFeatured: false
    }
  ];

  try {
    // Insert marketplace addons
    await tenantDb.insert(schema.addons).values(addonsData);
    
    console.log(`✅ Seeded ${addonsData.length} marketplace addons`);
    console.log('   Available addons:');
    addonsData.forEach((addon, index) => {
      console.log(`   - ${addon.name} (${addon.category})`);
    });

  } catch (error) {
    console.error('❌ Error seeding marketplace data:', error);
    throw error;
  }
}

// Seeding function for new tenant database
async function seedTenantData(tenantDb: any, schema: any, superUserEmail: string, superUserPassword: string) {
  console.log('🌱 Starting tenant data seeding...');

  // 1. Create default practice
  console.log('🏥 Creating default practice...');
  const [practice] = await tenantDb
    .insert(schema.practices)
    .values({
      name: 'Main Practice',
      bookingWidgetEnabled: false,
    })
    .returning();

  // 2. Create super user
  console.log('👤 Creating super user...');
  const hashedPassword = await bcrypt.hash(superUserPassword, 12);

  // Generate username from email (part before @)
  const username = superUserEmail.split('@')[0];

  const [superUser] = await tenantDb
    .insert(schema.users)
    .values({
      email: superUserEmail,
      username: username,
      name: 'Super Admin',
      password: hashedPassword,
      role: schema.UserRoleEnum.SUPER_ADMIN,
      practiceId: practice.id,
      currentPracticeId: practice.id, // Set current practice ID for seamless access
    })
    .returning();

  // 3. Define all permissions for SUPER_ADMIN role
  console.log('🔒 Defining permissions...');
  const allPermissions = [
    // User Management
    { id: 'users:create', resource: 'USER', action: 'CREATE', granted: true, category: 'User Management' },
    { id: 'users:read', resource: 'USER', action: 'READ', granted: true, category: 'User Management' },
    { id: 'users:update', resource: 'USER', action: 'UPDATE', granted: true, category: 'User Management' },
    { id: 'users:delete', resource: 'USER', action: 'DELETE', granted: true, category: 'User Management' },
    { id: 'users:manage', resource: 'USER', action: 'MANAGE', granted: true, category: 'User Management' },

    // Roles Management
    { id: 'roles:create', resource: 'ROLE', action: 'CREATE', granted: true, category: 'User Management' },
    { id: 'roles:read', resource: 'ROLE', action: 'READ', granted: true, category: 'User Management' },
    { id: 'roles:update', resource: 'ROLE', action: 'UPDATE', granted: true, category: 'User Management' },
    { id: 'roles:delete', resource: 'ROLE', action: 'DELETE', granted: true, category: 'User Management' },
    { id: 'roles:manage', resource: 'ROLE', action: 'MANAGE', granted: true, category: 'User Management' },

    // Patient Management
    { id: 'patients:create', resource: 'PATIENT', action: 'CREATE', granted: true, category: 'Patient Management' },
    { id: 'patients:read', resource: 'PATIENT', action: 'READ', granted: true, category: 'Patient Management' },
    { id: 'patients:update', resource: 'PATIENT', action: 'UPDATE', granted: true, category: 'Patient Management' },
    { id: 'patients:delete', resource: 'PATIENT', action: 'DELETE', granted: true, category: 'Patient Management' },
    { id: 'patients:manage', resource: 'PATIENT', action: 'MANAGE', granted: true, category: 'Patient Management' },

    // Pet Management
    { id: 'pets:create', resource: 'PET', action: 'CREATE', granted: true, category: 'Patient Management' },
    { id: 'pets:read', resource: 'PET', action: 'READ', granted: true, category: 'Patient Management' },
    { id: 'pets:update', resource: 'PET', action: 'UPDATE', granted: true, category: 'Patient Management' },
    { id: 'pets:delete', resource: 'PET', action: 'DELETE', granted: true, category: 'Patient Management' },
    { id: 'pets:manage', resource: 'PET', action: 'MANAGE', granted: true, category: 'Patient Management' },

    // Appointment Management
    { id: 'appointments:create', resource: 'APPOINTMENT', action: 'CREATE', granted: true, category: 'Appointment Management' },
    { id: 'appointments:read', resource: 'APPOINTMENT', action: 'READ', granted: true, category: 'Appointment Management' },
    { id: 'appointments:update', resource: 'APPOINTMENT', action: 'UPDATE', granted: true, category: 'Appointment Management' },
    { id: 'appointments:delete', resource: 'APPOINTMENT', action: 'DELETE', granted: true, category: 'Appointment Management' },
    { id: 'appointments:manage', resource: 'APPOINTMENT', action: 'MANAGE', granted: true, category: 'Appointment Management' },
    { id: 'appointments:assign', resource: 'APPOINTMENT', action: 'ASSIGN', granted: true, category: 'Appointment Management' },

    // Medical Records
    { id: 'medical:create', resource: 'MEDICAL_RECORD', action: 'CREATE', granted: true, category: 'Medical Records' },
    { id: 'medical:read', resource: 'MEDICAL_RECORD', action: 'READ', granted: true, category: 'Medical Records' },
    { id: 'medical:update', resource: 'MEDICAL_RECORD', action: 'UPDATE', granted: true, category: 'Medical Records' },
    { id: 'medical:delete', resource: 'MEDICAL_RECORD', action: 'DELETE', granted: true, category: 'Medical Records' },
    { id: 'medical:approve', resource: 'MEDICAL_RECORD', action: 'APPROVE', granted: true, category: 'Medical Records' },

    // Billing & Financial
    { id: 'billing:create', resource: 'INVOICE', action: 'CREATE', granted: true, category: 'Financial Management' },
    { id: 'billing:read', resource: 'INVOICE', action: 'READ', granted: true, category: 'Financial Management' },
    { id: 'billing:update', resource: 'INVOICE', action: 'UPDATE', granted: true, category: 'Financial Management' },
    { id: 'billing:delete', resource: 'INVOICE', action: 'DELETE', granted: true, category: 'Financial Management' },
    { id: 'billing:approve', resource: 'INVOICE', action: 'APPROVE', granted: true, category: 'Financial Management' },
    { id: 'payments:create', resource: 'PAYMENT', action: 'CREATE', granted: true, category: 'Financial Management' },
    { id: 'payments:read', resource: 'PAYMENT', action: 'READ', granted: true, category: 'Financial Management' },
    { id: 'payments:update', resource: 'PAYMENT', action: 'UPDATE', granted: true, category: 'Financial Management' },
    { id: 'payments:delete', resource: 'PAYMENT', action: 'DELETE', granted: true, category: 'Financial Management' },

    // Inventory Management
    { id: 'inventory:create', resource: 'INVENTORY', action: 'CREATE', granted: true, category: 'Inventory Management' },
    { id: 'inventory:read', resource: 'INVENTORY', action: 'READ', granted: true, category: 'Inventory Management' },
    { id: 'inventory:update', resource: 'INVENTORY', action: 'UPDATE', granted: true, category: 'Inventory Management' },
    { id: 'inventory:delete', resource: 'INVENTORY', action: 'DELETE', granted: true, category: 'Inventory Management' },
    { id: 'inventory:manage', resource: 'INVENTORY', action: 'MANAGE', granted: true, category: 'Inventory Management' },

    // Reports & Analytics
    { id: 'reports:view', resource: 'REPORT', action: 'READ', granted: true, category: 'Reports & Analytics' },
    { id: 'reports:export', resource: 'REPORT', action: 'EXPORT', granted: true, category: 'Reports & Analytics' },
    { id: 'reports:create', resource: 'REPORT', action: 'CREATE', granted: true, category: 'Reports & Analytics' },
    { id: 'analytics:view', resource: 'ANALYTICS', action: 'READ', granted: true, category: 'Reports & Analytics' },

    // System Administration
    { id: 'system:settings', resource: 'SYSTEM', action: 'MANAGE', granted: true, category: 'System Administration' },
    { id: 'system:audit', resource: 'AUDIT_LOG', action: 'READ', granted: true, category: 'System Administration' },
    { id: 'system:backup', resource: 'SYSTEM', action: 'EXPORT', granted: true, category: 'System Administration' },
    { id: 'system:restore', resource: 'SYSTEM', action: 'IMPORT', granted: true, category: 'System Administration' },

    // Practice Management
    { id: 'practice:read', resource: 'PRACTICE', action: 'READ', granted: true, category: 'Practice Management' },
    { id: 'practice:update', resource: 'PRACTICE', action: 'UPDATE', granted: true, category: 'Practice Management' },
    { id: 'practice:manage', resource: 'PRACTICE', action: 'MANAGE', granted: true, category: 'Practice Management' },
  ];

  // 4. Create SUPER_ADMIN role with all permissions
  console.log('👑 Creating SUPER_ADMIN role with all permissions...');
  const [superAdminRole] = await tenantDb
    .insert(schema.roles)
    .values({
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Super Administrator - Full system access with all permissions',
      isSystemDefined: true,
      isActive: true,
      practiceId: practice.id,
      permissions: allPermissions, // Store all permissions as JSONB
    })
    .returning();

  // 5. Create additional standard roles
  console.log('👥 Creating standard roles...');
  const standardRoles = [
    {
      name: 'VETERINARIAN',
      displayName: 'Veterinarian',
      description: 'Licensed veterinarian with medical and patient management access',
      permissions: allPermissions.filter(p =>
        p.category !== 'System Administration' &&
        !p.id.includes('users:delete') &&
        !p.id.includes('roles:')
      ),
    },
    {
      name: 'TECHNICIAN',
      displayName: 'Veterinary Technician',
      description: 'Veterinary technician with patient care and limited medical access',
      permissions: allPermissions.filter(p =>
        ['Patient Management', 'Medical Records', 'Appointment Management', 'Inventory Management'].includes(p.category) &&
        !p.id.includes('delete') && !p.id.includes('approve')
      ),
    },
    {
      name: 'RECEPTIONIST',
      displayName: 'Receptionist',
      description: 'Front desk staff with appointment and basic patient access',
      permissions: allPermissions.filter(p =>
        ['Patient Management', 'Appointment Management'].includes(p.category) &&
        ['CREATE', 'READ', 'UPDATE'].includes(p.action)
      ),
    },
  ];

  for (const roleData of standardRoles) {
    await tenantDb
      .insert(schema.roles)
      .values({
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        isSystemDefined: true,
        isActive: true,
        practiceId: practice.id,
        permissions: roleData.permissions,
      });
  }

  // 6. Assign SUPER_ADMIN role to super user
  console.log('👤 Assigning SUPER_ADMIN role to super user...');
  await tenantDb
    .insert(schema.userRoles)
    .values({
      userId: superUser.id,
      roleId: superAdminRole.id,
      assignedBy: superUser.id,
      assignedAt: new Date(),
      isActive: true,
    });

  console.log('✅ Tenant seeding completed successfully!');
  console.log(`📧 Super user created: ${superUserEmail}`);
  console.log(`👑 Super user has SUPER_ADMIN role with ${allPermissions.length} permissions`);
}

async function getCurrentOwnerUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('owner_session');
  
  if (!sessionCookie) {
    return null;
  }

  try {
    // Try to parse as JSON first (legacy format)
    const sessionData = JSON.parse(sessionCookie.value);
    
    if (sessionData.email) {
      // Legacy JSON session - fetch user directly
      const users = await ownerDb
        .select({
          id: ownerUsers.id,
          email: ownerUsers.email,
          name: ownerUsers.name,
          username: ownerUsers.username,
          role: ownerUsers.role,
          phone: ownerUsers.phone,
          createdAt: ownerUsers.createdAt,
        })
        .from(ownerUsers)
        .where(eq(ownerUsers.email, sessionData.email))
        .limit(1);

      return users[0] || null;
    }
  } catch (parseError) {
    // Not JSON, try as session ID
    const [session] = await ownerDb
      .select({
        userId: ownerSessions.userId,
        expiresAt: ownerSessions.expiresAt,
        user: {
          id: ownerUsers.id,
          email: ownerUsers.email,
          username: ownerUsers.username,
          name: ownerUsers.name,
          phone: ownerUsers.phone,
          role: ownerUsers.role,
          createdAt: ownerUsers.createdAt,
        }
      })
      .from(ownerSessions)
      .innerJoin(ownerUsers, eq(ownerSessions.userId, ownerUsers.id))
      .where(
        and(
          eq(ownerSessions.id, sessionCookie.value),
          gt(ownerSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return session?.user || null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentOwnerUser();

    if (!user || (user.role !== 'OWNER' && user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allTenants = await ownerDb
      .select()
      .from(tenants)
      .orderBy(tenants.createdAt);

    return NextResponse.json(allTenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentOwnerUser();

    if (!user || (user.role !== 'OWNER' && user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      subdomain, 
      customDomain, 
      plan, 
      maxPractices, 
      maxUsers,
      superUserEmail,
      superUserPassword,
      superUserName
    } = body;

    // Validate required fields
    if (!name || !subdomain || !superUserEmail || !superUserPassword || !superUserName) {
      return NextResponse.json(
        { error: 'Name, subdomain, super user email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(superUserEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format for super user' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (superUserPassword.length < 8) {
      return NextResponse.json(
        { error: 'Super user password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingTenant = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);

    if (existingTenant.length > 0) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Get database configuration from environment
    const dbHost = process.env.DB_HOST;
    const dbPort = parseInt(process.env.DB_PORT || '5432');
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;

    if (!dbHost || !dbUser || !dbPassword) {
      return NextResponse.json(
        { error: 'Database connection components not configured in environment' },
        { status: 500 }
      );
    }

    // Create tenant with database configuration from environment
    const dbName = `tenant_${subdomain.replace(/-/g, '_')}`;
    const storagePath = `tenants/${subdomain}`;

    const newTenant = await ownerDb
      .insert(tenants)
      .values({
        name,
        subdomain,
        customDomain: customDomain || null,
        dbHost, // Use environment DB_HOST
        dbName,
        dbPort, // Use environment DB_PORT
        dbUser, // Use environment DB_USER (for reference)
        dbPassword, // Use environment DB_PASSWORD (for reference)
        storagePath,
        plan: plan || 'BASIC',
        status: 'PENDING', // Start as pending until database is created
        settings: {
          maxPractices: maxPractices || 1,
          maxUsers: maxUsers || 10,
          features: [],
        },
      })
      .returning();

    // Create the actual tenant database and storage
    try {
      // Create the tenant database using direct PostgreSQL connection
      const dbHost = process.env.DB_HOST;
      const dbPort = process.env.DB_PORT || '5432';
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD;
      const dbSslMode = process.env.DB_SSL_MODE || 'require';

      if (!dbHost || !dbUser || !dbPassword) {
        throw new Error('Database connection components not configured in environment');
      }

      console.log(`🚀 Creating database for tenant ${newTenant[0].id}...`);

      // 1. Connect to postgres database to create new tenant database
      const adminConnectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/postgres?sslmode=${dbSslMode}`;
      const adminPoolConfig: any = { 
        connectionString: adminConnectionString,
        max: 1, // Single connection for admin tasks
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      };
      if (adminConnectionString.includes('sslmode=require') || adminConnectionString.includes('amazonaws.com')) {
        adminPoolConfig.ssl = { rejectUnauthorized: false };
      }
      
      const adminPool = new Pool(adminPoolConfig);

      console.log(`📦 Creating database: ${newTenant[0].dbName}...`);
      
      // Check if database already exists
      const checkDbResult = await adminPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [newTenant[0].dbName]
      );

      if (checkDbResult.rows.length > 0) {
        console.log(`⚠️ Database ${newTenant[0].dbName} already exists, dropping it first...`);
        
        // Terminate all connections to the database before dropping
        await adminPool.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1
            AND pid <> pg_backend_pid()
        `, [newTenant[0].dbName]);

        // Drop the existing database
        await adminPool.query(`DROP DATABASE "${newTenant[0].dbName}"`);
        console.log(`✅ Existing database ${newTenant[0].dbName} dropped`);
      }

      // Create the new database
      await adminPool.query(`CREATE DATABASE "${newTenant[0].dbName}"`);
      console.log(`✅ Database ${newTenant[0].dbName} created successfully`);
      
      await adminPool.end();
      
      // Wait a moment for database to be fully ready
      console.log('⏳ Waiting for database to be ready...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Connect to the new tenant database and run migrations
      const tenantConnectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${newTenant[0].dbName}?sslmode=${dbSslMode}`;
      
      // Configure pool with better settings for migration stability
      const tenantPoolConfig: any = { 
        connectionString: tenantConnectionString,
        max: 2, // Limit connections during migration
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 60000, // 60 second timeout
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      };
      
      if (tenantConnectionString.includes('sslmode=require') || tenantConnectionString.includes('amazonaws.com')) {
        tenantPoolConfig.ssl = { rejectUnauthorized: false };
      }
      
      let tenantPool: Pool | null = null;
      let tenantDb: any = null;

      try {
        tenantPool = new Pool(tenantPoolConfig);

        // Test the connection first
        console.log('🔌 Testing tenant database connection...');
        const testClient = await tenantPool.connect();
        await testClient.query('SELECT 1');
        testClient.release();
        console.log('✅ Tenant database connection successful');

        // 3. Enable necessary PostgreSQL extensions
        console.log('📦 Enabling PostgreSQL extensions...');
        await tenantPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await tenantPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        
        // 4. Run Drizzle migrations on the new tenant database
        console.log('📦 Running migrations on tenant database...');
        const { migrate } = await import('drizzle-orm/node-postgres/migrator');
        const { drizzle } = await import('drizzle-orm/node-postgres');
        
        const schema = await import('../../../../db/schema');
        tenantDb = drizzle(tenantPool, { schema });
        
        // Run migrations with error handling
        try {
          await migrate(tenantDb, { migrationsFolder: './src/db/migrations' });
          console.log('✅ Migrations completed successfully');
        } catch (migrationError) {
          console.error('Migration failed:', migrationError);
          throw new Error(`Migration failed: ${migrationError instanceof Error ? migrationError.message : 'Unknown error'}`);
        }
        
  // 5. Seed initial data including marketplace
  console.log('🌱 Seeding initial tenant data...');
  await seedTenantData(tenantDb, schema, superUserEmail, superUserPassword);
  
  // 6. Seed marketplace data
  console.log('🛍️ Seeding marketplace data...');
  await seedMarketplaceData(tenantDb, schema);
  
  console.log('✅ Seeding completed successfully');      } catch (connectionError) {
        console.error('Tenant database connection/migration error:', connectionError);
        throw connectionError;
      } finally {
        // Always clean up the connection
        if (tenantPool) {
          await tenantPool.end();
          console.log('🔌 Tenant database pool closed');
        }
      }

      console.log(`✅ Tenant database created and seeded successfully for: ${newTenant[0].name}`);

      // Update tenant status to ACTIVE after successful database creation
      await ownerDb
        .update(tenants)
        .set({ status: 'ACTIVE' })
        .where(eq(tenants.id, newTenant[0].id));

      console.log(`✅ Tenant status updated to ACTIVE for: ${newTenant[0].name}`);
    } catch (dbError) {
      console.error('Failed to create tenant database:', dbError);
      
      // Delete the tenant record if database creation failed
      await ownerDb
        .delete(tenants)
        .where(eq(tenants.id, newTenant[0].id));
      
      return NextResponse.json(
        { 
          error: 'Failed to create tenant database', 
          details: dbError instanceof Error ? dbError.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...newTenant[0],
      message: 'Tenant created successfully with dedicated database.'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentOwnerUser();

    if (!user || (user.role !== 'OWNER' && user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get tenant info before deletion
    const [tenant] = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.id, parseInt(tenantId)))
      .limit(1);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deleting tenant: ${tenant.name} (${tenant.subdomain})`);

    // Get database configuration from environment
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbSslMode = process.env.DB_SSL_MODE || 'require';

    if (!dbHost || !dbUser || !dbPassword) {
      return NextResponse.json(
        { error: 'Database connection components not configured in environment' },
        { status: 500 }
      );
    }

    try {
      // 1. Drop the tenant database
      if (tenant.dbName) {
        console.log(`📦 Dropping database: ${tenant.dbName}...`);
        
        const adminConnectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/postgres?sslmode=${dbSslMode}`;
        const adminPoolConfig: any = { connectionString: adminConnectionString };
        if (adminConnectionString.includes('sslmode=require') || adminConnectionString.includes('amazonaws.com')) {
          adminPoolConfig.ssl = { rejectUnauthorized: false };
        }
        
        const adminPool = new Pool(adminPoolConfig);

        // Terminate all connections to the database before dropping
        await adminPool.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1
            AND pid <> pg_backend_pid()
        `, [tenant.dbName]);

        // Drop the database
        await adminPool.query(`DROP DATABASE IF EXISTS "${tenant.dbName}"`);
        console.log(`✅ Database ${tenant.dbName} dropped successfully`);
        
        await adminPool.end();
      }

      // 2. Delete tenant storage directory (if using file system)
      // Note: You might want to implement this based on your storage solution
      console.log(`📁 Storage path to cleanup: ${tenant.storagePath}`);

      // 3. Delete tenant record from owner database
      await ownerDb
        .delete(tenants)
        .where(eq(tenants.id, parseInt(tenantId)));

      console.log(`✅ Tenant deleted successfully: ${tenant.name}`);

      return NextResponse.json({
        message: `Tenant '${tenant.name}' and all associated resources have been deleted successfully.`
      }, { status: 200 });

    } catch (dbError) {
      console.error('Failed to delete tenant database:', dbError);
      
      return NextResponse.json(
        { 
          error: 'Failed to delete tenant database', 
          details: dbError instanceof Error ? dbError.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}
