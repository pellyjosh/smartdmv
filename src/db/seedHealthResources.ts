// src/db/seedHealthResources.ts
import { db } from './index';
import { healthResources } from './schema';

const healthResourcesData = [
  // Wellness & Prevention
  {
    title: "Annual Wellness Checkups: What to Expect",
    description: "Learn about the importance of annual wellness exams and what happens during your pet's visit.",
    content: `
# Annual Wellness Checkups: What to Expect

Regular wellness checkups are crucial for maintaining your pet's health and catching potential issues early.

## What Happens During a Wellness Exam?

### Physical Examination
- Complete nose-to-tail physical examination
- Weight and body condition assessment
- Heart and lung evaluation
- Dental health check

### Preventive Care Discussion
- Vaccination status review
- Parasite prevention planning
- Nutrition counseling
- Exercise recommendations

### Early Detection Screening
- Blood work recommendations
- Urinalysis
- Parasite testing
- Age-appropriate screenings

## Frequency Recommendations

- **Puppies/Kittens**: Every 3-4 weeks until 16 weeks old
- **Adult pets (1-7 years)**: Annual exams
- **Senior pets (7+ years)**: Bi-annual exams

Regular checkups help ensure your pet lives a long, healthy life!
    `,
    category: 'wellness',
    type: 'article',
    species: 'all',
    author: 'Dr. Sarah Johnson, DVM',
    tags: JSON.stringify(['wellness', 'prevention', 'annual-exam', 'health-screening']),
    estimatedReadTime: '5 minutes',
    difficulty: 'beginner',
    featured: true,
    practiceId: 1
  },

  // Nutrition
  {
    title: "Complete Nutrition Guide for Dogs",
    description: "Essential nutrition guidelines for dogs of all ages, from puppies to seniors.",
    content: `
# Complete Nutrition Guide for Dogs

Proper nutrition is the foundation of your dog's health and longevity.

## Life Stage Nutrition

### Puppies (0-12 months)
- High-protein, high-fat diet for growth
- Feed 3-4 times daily
- Look for AAFCO "growth" statement

### Adult Dogs (1-7 years)
- Balanced maintenance diet
- Feed 1-2 times daily
- Monitor body condition score

### Senior Dogs (7+ years)
- Easily digestible proteins
- Joint support supplements
- Adjusted calorie intake

## Reading Pet Food Labels

### Key Ingredients to Look For
- Named protein sources (chicken, beef, fish)
- Whole grains or vegetables
- Essential fatty acids

### Avoid These Ingredients
- Unnamed meat by-products
- Excessive fillers
- Artificial preservatives

## Special Dietary Considerations

- **Weight Management**: Reduce calories, increase fiber
- **Food Allergies**: Limited ingredient diets
- **Kidney Disease**: Reduced phosphorus and protein
- **Diabetes**: High fiber, consistent carbohydrates

Always consult your veterinarian before making significant dietary changes.
    `,
    category: 'nutrition',
    type: 'guide',
    species: 'dog',
    author: 'Dr. Michael Chen, DVM',
    tags: JSON.stringify(['nutrition', 'diet', 'feeding', 'dog-food']),
    estimatedReadTime: '8 minutes',
    difficulty: 'intermediate',
    featured: true,
    practiceId: 1
  },

  // Emergency
  {
    title: "Pet Emergency Contacts & First Aid",
    description: "Essential emergency contacts and basic first aid steps for pet emergencies.",
    content: `
# Pet Emergency Contacts & First Aid

Being prepared for pet emergencies can save your pet's life.

## Emergency Contacts

### 24-Hour Emergency Clinic
**Metropolitan Animal Emergency Center**
📞 (555) 123-HELP
📍 123 Emergency Drive, City, State
🕐 Available 24/7

### Poison Control
**ASPCA Animal Poison Control**
📞 (888) 426-4435
💰 $95 consultation fee
🕐 Available 24/7

### Your Primary Veterinarian
📞 Call during regular hours for guidance
🏥 Main Clinic: (555) 456-7890

## Basic First Aid Steps

### Bleeding
1. Apply direct pressure with clean cloth
2. Elevate the wound if possible
3. Seek immediate veterinary care

### Choking
1. Open mouth and look for visible objects
2. Use tweezers to remove if safe
3. Perform modified Heimlich maneuver
4. Rush to emergency clinic

### Poisoning
1. Remove pet from source
2. Call poison control immediately
3. Do NOT induce vomiting unless instructed
4. Bring packaging/sample if safe

### Heatstroke
1. Move to cool area immediately
2. Apply cool (not cold) water to paw pads
3. Offer small amounts of water
4. Transport to veterinarian

## Emergency Kit Essentials
- Gauze and bandages
- Antiseptic wipes
- Digital thermometer
- Emergency contacts list
- Recent photo of your pet

Remember: When in doubt, seek professional veterinary care immediately.
    `,
    category: 'emergency',
    type: 'emergency-contact',
    species: 'all',
    author: 'Emergency Response Team',
    tags: JSON.stringify(['emergency', 'first-aid', 'contacts', 'safety']),
    estimatedReadTime: '6 minutes',
    difficulty: 'beginner',
    featured: true,
    emergencyType: 'general',
    contactPhone: '(555) 123-HELP',
    contactAddress: '123 Emergency Drive, City, State',
    availability: '24/7',
    practiceId: 1
  },

  // Behavior
  {
    title: "Puppy Training Basics: Building Good Habits",
    description: "Essential training tips for new puppy owners to establish good behaviors early.",
    content: `
# Puppy Training Basics: Building Good Habits

Starting training early sets the foundation for a well-behaved adult dog.

## House Training

### Establish a Routine
- Take outside every 2-3 hours
- Immediately after meals, naps, and play
- Same door, same spot every time
- Praise and treat for success

### Signs Your Puppy Needs to Go
- Sniffing around
- Circling
- Whining or restlessness
- Heading toward the door

## Basic Commands

### "Sit"
1. Hold treat above puppy's nose
2. Slowly move treat back over head
3. Say "sit" as bottom touches ground
4. Reward immediately

### "Stay"
1. Start with puppy in sit position
2. Hold hand up in "stop" gesture
3. Step back one step
4. Return and reward if they stayed

### "Come"
1. Start in a safe, enclosed area
2. Get down to puppy's level
3. Say "come" in happy voice
4. Reward when they approach

## Socialization

### Critical Period: 3-14 weeks
- Expose to different people, animals, sounds
- Puppy socialization classes
- Positive experiences only
- Keep puppy safe from diseases

### What to Socialize With
- Different types of people (ages, ethnicities)
- Other vaccinated dogs
- Various surfaces and environments
- Household sounds and activities

## Common Puppy Problems

### Biting/Nipping
- Redirect to appropriate toys
- Yelp and withdraw attention
- Never use physical punishment

### Excessive Barking
- Identify triggers
- Redirect attention
- Reward quiet behavior

### Separation Anxiety
- Gradual alone time training
- Create positive associations
- Don't make big deals of departures

Remember: Consistency and patience are key to successful puppy training!
    `,
    category: 'behavior',
    type: 'guide',
    species: 'dog',
    author: 'Certified Dog Trainer, Lisa Park',
    tags: JSON.stringify(['puppy', 'training', 'behavior', 'socialization']),
    estimatedReadTime: '10 minutes',
    difficulty: 'beginner',
    featured: false,
    practiceId: 1
  },

  // Vaccination
  {
    title: "Pet Vaccination Schedule & Importance",
    description: "Complete guide to pet vaccinations, schedules, and why they're crucial for your pet's health.",
    content: `
# Pet Vaccination Schedule & Importance

Vaccinations protect your pet from serious, potentially fatal diseases.

## Core Vaccines for Dogs

### DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)
- **First vaccine**: 6-8 weeks
- **Boosters**: Every 3-4 weeks until 16 weeks
- **Adult boosters**: Every 1-3 years

### Rabies
- **First vaccine**: 12-16 weeks
- **Adult boosters**: Every 1-3 years (varies by state law)

## Core Vaccines for Cats

### FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)
- **First vaccine**: 6-8 weeks
- **Boosters**: Every 3-4 weeks until 16 weeks
- **Adult boosters**: Every 1-3 years

### Rabies
- **First vaccine**: 12-16 weeks
- **Adult boosters**: Every 1-3 years

## Non-Core Vaccines

### Dogs
- **Bordetella** (kennel cough): For dogs in boarding/daycare
- **Lyme disease**: For dogs in tick-endemic areas
- **Canine influenza**: For high-risk dogs

### Cats
- **FeLV** (Feline Leukemia): For outdoor cats
- **FIV** (Feline Immunodeficiency): Risk-based

## Vaccination Side Effects

### Normal Reactions
- Mild soreness at injection site
- Slight fever
- Decreased appetite for 24-48 hours

### When to Call Your Vet
- Vomiting or diarrhea
- Swelling at injection site
- Difficulty breathing
- Collapse or weakness

## Titre Testing

Alternative to automatic boosters:
- Blood test measures immunity levels
- Can determine if vaccination is needed
- Discuss with your veterinarian

## Vaccination Myths Debunked

❌ **Myth**: Indoor pets don't need vaccines
✅ **Truth**: Indoor pets can be exposed through open doors, other pets, and owners' clothing

❌ **Myth**: Vaccines cause autism in pets
✅ **Truth**: No scientific evidence supports this claim

❌ **Myth**: Natural immunity is better than vaccines
✅ **Truth**: Vaccines provide safer immunity than natural infection

Stay up-to-date with your pet's vaccinations to keep them healthy!
    `,
    category: 'vaccination',
    type: 'guide',
    species: 'all',
    author: 'Dr. Rebecca Martinez, DVM',
    tags: JSON.stringify(['vaccination', 'immunization', 'schedule', 'prevention']),
    estimatedReadTime: '7 minutes',
    difficulty: 'intermediate',
    featured: false,
    practiceId: 1
  },

  // Dental Care
  {
    title: "Pet Dental Care: At-Home and Professional",
    description: "Complete guide to maintaining your pet's dental health at home and when to seek professional care.",
    content: `
# Pet Dental Care: At-Home and Professional

Good dental care is essential for your pet's overall health and wellbeing.

## Signs of Dental Problems

### Watch for These Warning Signs
- Bad breath
- Yellow or brown tartar buildup
- Red, swollen gums
- Difficulty eating or chewing
- Pawing at face or mouth
- Loose or missing teeth

## At-Home Dental Care

### Daily Brushing
- Use pet-specific toothpaste (never human toothpaste)
- Start slowly, let pet get used to the process
- Focus on outer surfaces of teeth
- Reward with praise and treats

### Dental Chews and Toys
- Look for VOHC (Veterinary Oral Health Council) seal
- Appropriate size for your pet
- Monitor for wear and replace when needed

### Dental Diets
- Specially formulated kibble texture
- Helps reduce plaque and tartar
- Discuss with your veterinarian

## Professional Dental Care

### When Professional Cleaning is Needed
- Annual dental exams reveal need
- Tartar buildup below gum line
- Signs of periodontal disease
- Bad breath despite home care

### What Happens During Professional Cleaning
1. **Pre-anesthetic examination** and bloodwork
2. **Anesthesia** for patient comfort and safety
3. **Thorough examination** of all teeth and gums
4. **Scaling** to remove tartar above and below gum line
5. **Polishing** to smooth tooth surfaces
6. **Dental X-rays** if needed
7. **Extractions** of severely diseased teeth

## Age-Specific Dental Care

### Puppies and Kittens
- Teething typically occurs at 3-6 months
- Provide appropriate chew toys
- Begin tooth brushing early

### Adult Pets
- Daily brushing ideal
- Annual dental exams
- Professional cleaning as recommended

### Senior Pets
- More frequent dental exams
- Monitor for tooth loss
- Softer foods may be needed

## Dental Disease Prevention

### The 3-2-1 Rule
- **3**: Brush teeth 3 times per week minimum
- **2**: Use 2 forms of dental care (brushing + treats/diet)
- **1**: Professional cleaning at least once yearly

Remember: Dental disease doesn't just affect the mouth - bacteria can spread to the heart, liver, and kidneys!
    `,
    category: 'dental-care',
    type: 'guide',
    species: 'all',
    author: 'Dr. Amanda Foster, DVM, Veterinary Dentist',
    tags: JSON.stringify(['dental', 'teeth', 'oral-health', 'brushing']),
    estimatedReadTime: '8 minutes',
    difficulty: 'intermediate',
    featured: false,
    practiceId: 1
  },
];

async function seedHealthResources() {
  try {
    console.log('🌱 Seeding health resources...');

    for (const resource of healthResourcesData) {
      const existing = await db.query.healthResources.findFirst({
        where: (healthResources, { eq }) => eq(healthResources.title, resource.title),
      });

      if (!existing) {
        await db.insert(healthResources).values(resource);
        console.log(`✅ Created health resource: ${resource.title}`);
      } else {
        console.log(`⏭️ Health resource already exists: ${resource.title}`);
      }
    }

    console.log('🎉 Health resources seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding health resources:', error);
    throw error;
  }
}

seedHealthResources();
