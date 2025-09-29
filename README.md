# SmartDMV

To get started, take a look at src/app/page.tsx.



# Seed only 5 health resources
npm run db:tenant:seed -- smartvett --health-resources=5

# Seed only 3 vaccinations  
npm run db:tenant:seed -- smartvett --vaccinations=3

# Seed multiple specific types
npm run db:tenant:seed -- smartvett --health-plans=2 --appointments=5

# Seed all types with defaults
npm run db:tenant:seed smartvett --all