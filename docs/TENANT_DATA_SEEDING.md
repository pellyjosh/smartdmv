# Tenant Data Seeding Guide

This guide explains how to use the tenant data seeding script to populate any chosen tenant database with sample data.

## Quick Start

```bash
# Seed all data types with default counts
npm run db:tenant:seed <tenant-slug> --all

# Example: Seed the smartvet tenant
npm run db:tenant:seed smartvet --all
```

## Usage

```bash
npm run db:tenant:seed <tenant-slug> [options]
```

### Parameters

- `<tenant-slug>`: The subdomain of the tenant database you want to seed (required)

### Options

- `--health-plans=N` - Seed N health plans (default: 5)
- `--appointments=N` - Seed N appointments (default: 10)
- `--soap-notes=N` - Seed N SOAP notes (default: 15)
- `--prescriptions=N` - Seed N prescriptions (default: 8)
- `--vaccinations=N` - Seed N vaccinations (default: 6)
- `--referrals=N` - Seed N referrals (default: 4)
- `--notifications=N` - Seed N notifications (default: 12)
- `--inventory-items=N` - Seed N inventory items (default: 20)
- `--all` - Seed all data types with default counts
- `--clear` - Clear existing seeded data before seeding (⚠️ DANGEROUS!)

## Examples

### Basic Usage

```bash
# Seed smartvet tenant with all data types using defaults
npm run db:tenant:seed smartvet --all

# Seed specific data types with custom counts
npm run db:tenant:seed smartvet --health-plans=10 --appointments=20 --soap-notes=25

# Seed only health plans and appointments
npm run db:tenant:seed smartvet --health-plans=5 --appointments=15
```

### Advanced Usage

```bash
# Clear existing data and seed everything fresh (dangerous!)
npm run db:tenant:seed smartvet --all --clear

# Seed large amounts of test data
npm run db:tenant:seed smartvet --appointments=100 --soap-notes=200 --prescriptions=50
```

## What Gets Seeded

### Health Plans (--health-plans)

- Comprehensive health plans for pets
- Associated milestones for each plan
- Progress tracking and notes
- Realistic start/end dates

### Appointments (--appointments)

- Various appointment types (checkup, vaccination, surgery, etc.)
- Different statuses (scheduled, confirmed, completed, cancelled)
- Realistic scheduling with different vets and pets
- Appointment notes and durations

### SOAP Notes (--soap-notes)

- Complete SOAP format notes (Subjective, Objective, Assessment, Plan)
- Realistic veterinary observations
- Associated with pets and veterinarians
- Various visit dates

### Prescriptions (--prescriptions)

- Common veterinary medications
- Proper dosages and frequencies
- Instructions and duration
- Active/inactive status

### Vaccinations (--vaccinations)

- Core vaccines for dogs and cats (DHPP, Rabies, FVRCP)
- Vaccination records with lot numbers
- Due dates and administration tracking
- Species-appropriate vaccines

### Referrals (--referrals)

- Specialist referrals to various specialties
- Different priorities and statuses
- Complete referral workflow
- Contact information for specialists

### Notifications (--notifications)

- System notifications for users
- Various types (reminders, alerts, updates)
- Read/unread status
- Priority levels

### Inventory Items (--inventory-items)

- Medical supplies and equipment
- Categorized items with SKUs
- Stock levels and pricing
- Supplier information

## Prerequisites

The script will automatically create basic data (practices, users, pets) if none exist in the target tenant database. However, ensure:

1. The tenant exists in the owner database
2. The tenant database is accessible
3. Database credentials are properly configured

## Safety Notes

- The `--clear` option will DELETE existing data - use with extreme caution
- Always backup important data before running with `--clear`
- The script creates realistic but fictional data - not suitable for production with real patient data
- Run on development/testing environments only

## Troubleshooting

### Common Issues

1. **Tenant not found**: Ensure the tenant slug exists in the owner database
2. **Connection issues**: Verify database credentials and network access
3. **Permission errors**: Check database user permissions
4. **Missing dependencies**: Run `npm install` to ensure all packages are installed

### Getting Help

Run without parameters to see usage information:

```bash
npm run db:tenant:seed
```

## Related Commands

- `npm run db:tenant:list` - List all available tenants
- `npm run db:tenant:view <tenant-slug>` - Open Drizzle Studio for a tenant
- `npm run db:tenant:studio` - Open Drizzle Studio for default tenant
