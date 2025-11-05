# Offline Feature Protection - Quick Reference

## Quick Start

### 1. Mark Feature as Offline-Incompatible

In `AppSidebar.tsx`:

```typescript
{
  title: "Your Feature",
  href: "/admin/your-feature",
  icon: YourIcon,
  roles: ["ADMINISTRATOR"],
  offlineSupported: false, // ← Add this
  offlineMessage: "Explain why this needs internet", // ← Add this
}
```

### 2. Protect the Route

Option A - Layout Level (Recommended):

```tsx
// app/(main)/admin/layout.tsx
import { OfflineProtected } from "@/components/offline";
import { flattenMenuForOfflineCheck } from "@/lib/offline/utils/menu-data";

const menuData = flattenMenuForOfflineCheck(menuGroups);

export default function Layout({ children }) {
  return <OfflineProtected menuData={menuData}>{children}</OfflineProtected>;
}
```

Option B - Page Level:

```tsx
// app/(main)/admin/your-feature/page.tsx
import { OfflineProtected } from "@/components/offline";

const MENU_DATA = [
  {
    title: "Your Feature",
    href: "/admin/your-feature",
    offlineSupported: false,
    offlineMessage: "Explain why...",
  },
];

export default function YourPage() {
  return (
    <OfflineProtected menuData={MENU_DATA}>
      <YourContent />
    </OfflineProtected>
  );
}
```

### 3. Done!

Users will now see:

- ✅ "Requires Internet" badge when offline
- ✅ Informative unavailable page if they click
- ✅ Automatic access when back online

## Components Reference

### OfflineProtected

Wraps content to protect from offline access.

```tsx
<OfflineProtected
  menuData={menuData} // Required: Array of menu items
  fallback={<CustomPage />} // Optional: Custom unavailable page
>
  {children}
</OfflineProtected>
```

### OfflineUnavailablePage

Displays when user tries to access offline feature.

```tsx
<OfflineUnavailablePage
  featureName="Medical Imaging" // Required: Feature name
  message="Custom message" // Optional: Why unavailable
  onRetry={() => {}} // Optional: Custom retry action
/>
```

### useOfflineProtection Hook

For custom protection logic.

```tsx
const {
  isBlocked, // true if offline and incompatible
  isOfflineCompatible, // true if works offline
  currentFeature, // matched menu item
  isOnline, // network status
  canAccess, // inverse of isBlocked
} = useOfflineProtection(menuData);
```

## Utilities Reference

### flattenMenuForOfflineCheck

Convert AppSidebar menu to flat array.

```tsx
import { flattenMenuForOfflineCheck } from "@/lib/offline/utils/menu-data";

const flatData = flattenMenuForOfflineCheck(menuGroups);
```

### isRouteOfflineCompatible

Check if route works offline.

```tsx
import { isRouteOfflineCompatible } from "@/lib/offline/utils/menu-data";

const isOk = isRouteOfflineCompatible("/admin/your-route", menuData);
```

### getOfflineMessage

Get custom message for route.

```tsx
import { getOfflineMessage } from "@/lib/offline/utils/menu-data";

const message = getOfflineMessage("/admin/your-route", menuData);
```

## When to Mark as Offline-Incompatible

Mark `offlineSupported: false` if feature requires:

- ❌ **External Systems**: Payment processors, lab integrations, email servers
- ❌ **Cloud Processing**: AI/ML, real-time analytics, data aggregation
- ❌ **Regulatory Submission**: Government reporting, compliance uploads
- ❌ **Real-Time Data**: Live dashboards, cross-tenant reports

Allow offline if feature only needs:

- ✅ **Cached Data Viewing**: Client records, appointments, pet info
- ✅ **Local Data Entry**: New records (sync later), form filling
- ✅ **Local Calculations**: Drug doses, conversions, basic math

## Testing Checklist

Manual test in browser DevTools:

```bash
1. Network tab → Toggle "Offline"
2. Check sidebar for "Requires Internet" badges
3. Click protected feature → Should show unavailable page
4. Verify custom message displays
5. Click "Go Back" → Should return to previous page
6. Network tab → Toggle "Online"
7. Verify green "You're back online!" alert
8. Click "Retry" → Should navigate to feature
9. Badges should disappear
```

## Common Issues & Solutions

### Badge Not Showing

- ✓ Check `offlineSupported: false` is set
- ✓ Verify actually offline (DevTools Network)
- ✓ Check `isOnline` state in sidebar

### Page Not Protected

- ✓ Verify route in menuData
- ✓ Check OfflineProtected wraps content
- ✓ Ensure route matching logic correct

### Custom Message Not Showing

- ✓ Set `offlineMessage` in menu item
- ✓ Verify message passed through flattening
- ✓ Check OfflineUnavailablePage receives message

## Currently Protected Features (11)

1. Lab Integration - `/admin/lab-integration`
2. Medical Imaging - `/admin/medical-imaging`
3. Disease Reporting - `/admin/disease-reporting`
4. AI Diagnostic Assistant - `/admin/ai-diagnostics`
5. Reports & Analytics - `/admin/reports`
6. Advanced Reporting - `/admin/advanced-reporting`
7. Predictive Analytics - `/admin/predictive-analytics`
8. Audit Reports - `/admin/audit-reports`
9. Email Templates - `/admin/email-templates`
10. Email Service - `/admin/email-service`
11. Billing Analytics - `/admin/billing/analytics`

## Key Files

```
src/
  components/
    offline/
      OfflineProtected.tsx           # Protection wrapper
      OfflineUnavailablePage.tsx     # Unavailable UI
      OfflineProtectedExample.tsx    # Usage examples
      index.ts                       # Exports
    layout/
      AppSidebar.tsx                 # Menu configuration
  lib/
    offline/
      utils/
        menu-data.ts                 # Helper utilities

docs/
  OFFLINE_FEATURE_PROTECTION.md               # Full guide
  OFFLINE_FEATURE_AVAILABILITY_IMPLEMENTATION.md  # Implementation summary
```

## Full Documentation

For detailed information, see:

- [Complete Implementation Guide](./OFFLINE_FEATURE_PROTECTION.md)
- [Implementation Summary](./OFFLINE_FEATURE_AVAILABILITY_IMPLEMENTATION.md)
