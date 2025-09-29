import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { addons } from './schema';

export async function seedMarketplaceData() {
  console.log('🛍️ Seeding marketplace data...');

  // Get the tenant-specific database
  const db = await getCurrentTenantDb();

  // Marketplace addons data
  const addonsData = [
    {
      name: 'Advanced Analytics Dashboard',
      slug: 'advanced-analytics-dashboard',
      description: 'Get detailed insights into your practice performance with advanced analytics, reporting, and business intelligence.',
      shortDescription: 'Advanced analytics and reporting for your practice',
      category: 'ADMINISTRATIVE' as const,
      price: '49.99',
      icon: 'BarChart3',
      features: JSON.stringify([
        'Real-time practice analytics',
        'Custom reporting dashboard',
        'Revenue tracking',
        'Client behavior insights',
        'Performance benchmarking'
      ]),
      isPopular: true
    },
    {
      name: 'AI-Powered Diagnosis Assistant',
      slug: 'ai-powered-diagnosis-assistant',
      description: 'Leverage artificial intelligence to enhance diagnostic accuracy and speed up treatment decisions.',
      shortDescription: 'AI-powered diagnostic assistance',
      category: 'AI' as const,
      price: '99.99',
      icon: 'Brain',
      features: JSON.stringify([
        'AI diagnostic suggestions',
        'Medical image analysis',
        'Treatment recommendations',
        'Drug interaction checking',
        'Clinical decision support'
      ]),
      isPopular: true
    },
    {
      name: 'Client Portal Mobile App',
      slug: 'client-portal-mobile-app',
      description: 'Branded mobile application for your clients to manage appointments, access records, and communicate.',
      shortDescription: 'Mobile app for pet parents',
      category: 'CLIENT_PORTAL' as const,
      price: '59.99',
      icon: 'Smartphone',
      features: JSON.stringify([
        'Branded mobile app',
        'Appointment scheduling',
        'Medical record access',
        'Photo sharing',
        'Push notifications'
      ]),
      isPopular: false
    },
    {
      name: 'Enhanced Communication Suite',
      slug: 'enhanced-communication-suite',
      description: 'Advanced communication tools including SMS, email automation, and video consultations.',
      shortDescription: 'Complete communication platform',
      category: 'COMMUNICATION' as const,
      price: '79.99',
      icon: 'MessageSquare',
      features: JSON.stringify([
        'Automated SMS notifications',
        'Email campaign tools',
        'Video consultations',
        'Client portal messaging',
        'Appointment reminders'
      ]),
      isPopular: false
    },
    {
      name: 'Financial Management Pro',
      slug: 'financial-management-pro',
      description: 'Comprehensive financial management with advanced reporting, invoicing, and payment processing.',
      shortDescription: 'Professional financial management',
      category: 'FINANCIAL' as const,
      price: '89.99',
      icon: 'DollarSign',
      features: JSON.stringify([
        'Advanced financial reporting',
        'Automated invoicing',
        'Payment processing',
        'Tax preparation tools',
        'Profit analysis'
      ]),
      isPopular: false
    },
    {
      name: 'Website Request',
      slug: 'website-request',
      description: 'Professional website creation and management service for your veterinary practice.',
      shortDescription: 'Custom website for your practice',
      category: 'MARKETING' as const,
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
      isPopular: true
    },
    {
      name: 'Telemedicine',
      slug: 'telemedicine',
      description: 'Virtual consultation platform enabling remote veterinary care and consultations.',
      shortDescription: 'Virtual veterinary consultations',
      category: 'TELEMEDICINE' as const,
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
      isPopular: true
    },
    {
      name: 'Diseases Reporting',
      slug: 'diseases-reporting',
      description: 'Comprehensive disease tracking and reporting system for regulatory compliance and public health monitoring.',
      shortDescription: 'Disease tracking and reporting',
      category: 'COMPLIANCE' as const,
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
      isPopular: false
    }
  ];

  try {
    // Insert marketplace addons using Drizzle ORM (timestamps will use defaults)
    await db.insert(addons).values(addonsData);
    
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
