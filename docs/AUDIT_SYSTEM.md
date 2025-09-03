# Audit Logs and Reports System

This implementation provides comprehensive audit logging and reporting functionality for the SmartDVM application, allowing administrators to track all user actions and system changes for compliance and security purposes.

## Features

### Audit Logs

- **Real-time Activity Tracking**: Log all user actions including CREATE, UPDATE, DELETE, VIEW, and LOCK operations
- **Comprehensive Data Capture**: Record user ID, IP address, user agent, timestamps, and detailed change information
- **Flexible Filtering**: Filter logs by date range, action type, record type, and search terms
- **CSV Export**: Export filtered audit logs for external analysis and compliance reporting

### Audit Reports

- **Grouped Reporting**: Generate reports grouped by day, week, month, user, action, or record type
- **Statistical Analysis**: View distribution charts for actions, record types, user activity, and hourly patterns
- **Interactive Dashboard**: Tabbed interface for both detailed reports and statistical overviews
- **Export Functionality**: Download reports in CSV format for compliance documentation

## Pages

### `/admin/audit-logs`

Interactive audit log viewer with:

- Tab-based interface for different record types
- Advanced filtering by date, action, and search terms
- Detailed log entries with expandable metadata
- Export functionality for compliance

### `/admin/audit-reports`

Comprehensive reporting dashboard with:

- **Reports Tab**: Grouped audit data with customizable grouping options
- **Statistics Tab**: Visual analytics including distribution charts and activity patterns
- **Filter Options**: Date range, record type, action, user ID, practice ID filters
- **Export Options**: CSV download for both reports and raw data

## API Endpoints

### Audit Logs

- `GET /api/audit-logs/[recordType]` - Fetch audit logs by record type
- `GET /api/audit-logs/[recordType]/export` - Export audit logs as CSV
- `POST /api/audit-logs/test` - Create test data (development only)
- `DELETE /api/audit-logs/test` - Remove test data (development only)

### Audit Reports

- `GET /api/audit-reports/reports` - Generate grouped audit reports
- `GET /api/audit-reports/statistics` - Generate audit statistics and analytics

## Database Schema

The audit system uses a dedicated `audit_logs` table with the following structure:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id TEXT,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  changes JSONB,
  reason TEXT,
  practice_id TEXT,
  organization_id TEXT,
  version TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Usage

### Creating Audit Logs

Use the `audit-logger` utility to create audit entries:

```typescript
import { createAuditLog, createAuditLogFromRequest } from "@/lib/audit-logger";

// Basic audit log
await createAuditLog({
  action: "CREATE",
  recordType: "SOAP_NOTE",
  recordId: "note-123",
  description: "Created SOAP note for patient",
  userId: "user-456",
  practiceId: "practice-789",
  metadata: { patientId: "patient-123" },
  changes: {
    before: null,
    after: { content: "Patient examination completed" },
  },
});

// From API request (automatically captures IP and user agent)
await createAuditLogFromRequest(request, {
  action: "UPDATE",
  recordType: "USER",
  recordId: userId,
  description: "Updated user permissions",
  userId: currentUser.id,
  practiceId: currentUser.practiceId,
});
```

### Setting Up Database

1. Run the migration script: `src/db/migrations/create_audit_logs_table.sql`
2. Create test data: `POST /api/audit-logs/test`

### Development and Testing

- Use the test API endpoints to populate sample data
- Monitor the browser network tab to verify API calls
- Check database directly to confirm audit log creation

## Compliance Features

- **Tamper-Evident**: All logs are immutable once created
- **Comprehensive Tracking**: Captures WHO did WHAT, WHEN, WHERE, and WHY
- **Data Retention**: Configurable retention policies through the `is_active` field
- **Export Capabilities**: CSV exports for audit compliance and external analysis
- **Performance Optimized**: Indexed database queries for fast retrieval

## Access Control

Audit functionality is restricted to:

- **ADMINISTRATOR**: Full access to all audit logs and reports
- **PRACTICE_ADMIN**: Access to practice-specific audit data

Navigation is controlled through the sidebar based on user roles and permissions.

## Future Enhancements

- Real-time audit log streaming via WebSocket
- Automated compliance report generation
- Integration with external SIEM systems
- Advanced analytics and anomaly detection
- Role-based data filtering and access controls
