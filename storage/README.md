# Tenant Storage Structure

This directory contains tenant-specific file storage.

## Structure:

- `tenants/[tenant-subdomain]/`
  - `practices/[practice-id]/` - Practice-specific files
    - `uploads/` - General uploads
    - `medical-imaging/` - Medical imaging files
    - `documents/` - Documents and reports
  - `uploads/` - Tenant-wide uploads
  - `medical-imaging/` - Tenant-wide medical imaging
  - `documents/` - Tenant-wide documents
  - `exports/` - Data exports

## Example:

```
storage/
└── tenants/
    ├── abc-vet/
    │   ├── practices/
    │   │   └── 1/
    │   │       ├── uploads/
    │   │       ├── medical-imaging/
    │   │       └── documents/
    │   ├── uploads/
    │   ├── medical-imaging/
    │   └── documents/
    └── xyz-clinic/
        ├── practices/
        │   └── 2/
        │       ├── uploads/
        │       ├── medical-imaging/
        │       └── documents/
        ├── uploads/
        ├── medical-imaging/
        └── documents/
```
