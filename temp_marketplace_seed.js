const { db } = require('./src/db/index.ts');
const { addons } = require('./src/db/schema.ts');

async function seedMarketplaceData() {
  console.log('🛍️ Seeding marketplace data...');

  try {
    // Clear existing addons first
    await db.delete(addons);
    console.log('Cleared existing marketplace data');

    // Marketplace addons data
    const addonsData = [
      {
        name: 'Website Integration',
        slug: 'website-integration',
        description: 'Connect your practice website with SmartDVM to allow clients to schedule appointments online. This add-on provides website widgets, embed codes, and APIs for seamless integration with your clinic\'s online presence.',
        shortDescription: 'Website integration for online appointment booking',
        category: 'CLIENT_PORTAL',
        price: '29.99',
        icon: 'Globe',
        features: JSON.stringify([
          'Website appointment widget',
          'Custom embed codes',
          'API integration',
          'Real-time availability sync',
          'Custom branding options'
        ]),
        pricingTiers: JSON.stringify({
          STANDARD: {
            monthlyPrice: '29.99',
            yearlyPrice: '299.99',
            features: [
              'Website appointment widget',
              'Basic API access',
              'Email notifications',
              'Standard support'
            ]
          },
          PREMIUM: {
            monthlyPrice: '49.99',
            yearlyPrice: '499.99',
            features: [
              'All STANDARD features',
              'Advanced API access',
              'SMS notifications',
              'Priority support',
              'Custom branding'
            ]
          }
        }),
        isPopular: true,
        isFeatured: true
      },
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
        pricingTiers: JSON.stringify({
          STANDARD: {
            monthlyPrice: '49.99',
            yearlyPrice: '499.99'
          }
        }),
        isPopular: true
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
        pricingTiers: JSON.stringify({
          STANDARD: {
            monthlyPrice: '99.99',
            yearlyPrice: '999.99'
          }
        }),
        isPopular: true
      },
      {
        name: 'Point of Sale System',
        slug: 'point-of-sale-system',
        description: 'Complete POS solution for retail sales, inventory management, and payment processing.',
        shortDescription: 'Integrated point of sale system',
        category: 'FINANCIAL',
        price: '39.99',
        icon: 'CreditCard',
        features: JSON.stringify([
          'Payment processing',
          'Inventory tracking',
          'Sales reporting',
          'Receipt printing',
          'Tax calculations'
        ]),
        pricingTiers: JSON.stringify({
          STANDARD: {
            monthlyPrice: '39.99',
            yearlyPrice: '399.99'
          }
        }),
        isPopular: false
      },
      {
        name: 'Telemedicine Platform',
        slug: 'telemedicine-platform',
        description: 'Conduct virtual consultations with built-in video calling, screen sharing, and digital prescriptions.',
        shortDescription: 'Virtual consultation platform',
        category: 'COMMUNICATION',
        price: '79.99',
        icon: 'Video',
        features: JSON.stringify([
          'HD video consultations',
          'Screen sharing',
          'Digital prescriptions',
          'Recording capabilities',
          'Multi-device support'
        ]),
        pricingTiers: JSON.stringify({
          STANDARD: {
            monthlyPrice: '79.99',
            yearlyPrice: '799.99'
          }
        }),
        isPopular: true
      },
      {
        name: 'Disease Reporting System',
        slug: 'disease-reporting-system',
        description: 'Automated disease reporting to regulatory authorities with compliance tracking.',
        shortDescription: 'Automated regulatory disease reporting',
        category: 'ADMINISTRATIVE',
        price: '19.99',
        icon: 'AlertTriangle',
        features: JSON.stringify([
          'Automated reporting',
          'Compliance tracking',
          'Regulatory updates',
          'Audit trails',
          'Custom forms'
        ]),
        pricingTiers: JSON.stringify({
          STANDARD: {
            monthlyPrice: '19.99',
            yearlyPrice: '199.99'
          }
        }),
        isPopular: false
      }
    ];

    // Insert addons
    for (const addon of addonsData) {
      await db.insert(addons).values({
        ...addon,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`✅ Successfully seeded ${addonsData.length} marketplace addons`);
  } catch (error) {
    console.error('❌ Error seeding marketplace data:', error);
    throw error;
  }
}

// Run the seed function
seedMarketplaceData()
  .then(() => {
    console.log('🎉 Marketplace seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
