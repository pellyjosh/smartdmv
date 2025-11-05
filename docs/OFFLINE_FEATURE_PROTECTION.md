# Offline Feature Protection System

## Overview

The Offline Feature Protection System provides a way to gracefully handle features that require internet connectivity. Instead of showing database errors or broken functionality, users see informative messages explaining why a feature is unavailable offline.

**Key Features:**

- Menu-based configuration (no duplicate data)
- Visual badges in sidebar showing offline-incompatible items
- Automatic route protection
- Informative unavailable page with custom messages
- Seamless online/offline transitions

## Architecture

### Components

1. **MenuItem Extensions** (`AppSidebar.tsx`)

   - Adds `offlineSupported` and `offlineMessage` to menu items
   - Defines which features work offline

2. **OfflineUnavailablePage** (`OfflineUnavailablePage.tsx`)

   - Shows when user accesses offline-incompatible feature
   - Displays feature name, custom message, and suggestions
   - Auto-detects when connection restored

3. **OfflineProtected** (`OfflineProtected.tsx`)

   - Wrapper component for route protection
   - Checks menu data against current route
   - Shows unavailable page if offline and incompatible

4. **Menu Data Utilities** (`lib/offline/utils/menu-data.ts`)
   - Helpers to flatten menu structure
   - Route compatibility checks

### Data Flow

```
User navigates to route
    ↓
OfflineProtected checks:
  - Is user online? → Allow
  - Is route in menu data? → Check offlineSupported
  - offlineSupported === false? → Show OfflineUnavailablePage
  - Otherwise → Allow
    ↓
Page renders or unavailable page shows
```

## Implementation Guide

### Step 1: Mark Features in AppSidebar

Add offline flags to menu items:

```typescript
// In AppSidebar.tsx menuGroups
{
  title: "Medical Imaging",
  href: "/admin/medical-imaging",
  icon: FlaskConical,
  roles: ["ADMINISTRATOR", "VETERINARIAN"],
  offlineSupported: false, // ← Mark as offline-incompatible
  offlineMessage: "Medical imaging requires real-time image processing, cloud storage access, and cannot be performed offline.",
}
```

### Step 2: Choose Protection Method

#### Option A: Layout-Level Protection (Recommended)

Wrap entire sections with protection:

```tsx
// app/(main)/admin/layout.tsx
"use client";

import { OfflineProtected } from "@/components/offline";
import { flattenMenuForOfflineCheck } from "@/lib/offline/utils/menu-data";
import { menuGroups } from "@/components/layout/AppSidebar"; // Export this

const menuData = flattenMenuForOfflineCheck(menuGroups);

export default function AdminLayout({ children }) {
  return <OfflineProtected menuData={menuData}>{children}</OfflineProtected>;
}
```

#### Option B: Page-Level Protection

Protect individual pages:

```tsx
// app/(main)/admin/medical-imaging/page.tsx
"use client";

import { OfflineProtected } from "@/components/offline";

const MENU_DATA = [
  {
    title: "Medical Imaging",
    href: "/admin/medical-imaging",
    offlineSupported: false,
    offlineMessage: "Medical imaging requires real-time processing...",
  },
];

export default function MedicalImagingPage() {
  return (
    <OfflineProtected menuData={MENU_DATA}>
      <MedicalImagingContent />
    </OfflineProtected>
  );
}
```

#### Option C: Hook-Based (Advanced)

Use the hook for custom logic:

```tsx
"use client";

import { useOfflineProtection } from "@/components/offline";
import { OfflineUnavailablePage } from "@/components/offline";

export default function CustomPage() {
  const { isBlocked, currentFeature } = useOfflineProtection(MENU_DATA);

  if (isBlocked && currentFeature) {
    return (
      <OfflineUnavailablePage
        featureName={currentFeature.title}
        message={currentFeature.offlineMessage}
      />
    );
  }

  return <PageContent />;
}
```

### Step 3: Export Menu Data (If Using Shared Config)

```typescript
// components/layout/AppSidebar.tsx

// Export menuGroups for use in protection
export { menuGroups };

// Or create a separate config file:
// lib/config/menu-config.ts
export const menuGroups = [...];
```

## Sidebar Badges

Offline-incompatible items automatically show "Requires Internet" badge when offline:

```tsx
// Automatically rendered in AppSidebar
{
  !isOnline && item.offlineSupported === false && (
    <Badge
      variant="outline"
      className="ml-auto text-xs bg-red-100 text-red-700"
    >
      Requires Internet
    </Badge>
  );
}
```

**Badge Priority:**

1. Offline badge (when offline and incompatible)
2. Add-on badge
3. Website integration badge

## Marking Features as Offline-Incompatible

### When to Mark as Offline-Incompatible

Mark `offlineSupported: false` for features that:

- **Require Real-Time External Systems**

  - Lab integrations
  - Payment processing
  - Email sending
  - Cloud storage access

- **Require Cloud Processing**

  - AI/ML features
  - Real-time analytics
  - Large-scale data aggregation

- **Require Regulatory Compliance**

  - Disease reporting
  - Audit submissions
  - Government filings

- **Complex Data Dependencies**
  - Cross-tenant reports
  - Real-time dashboards
  - Multi-source data aggregation

### When Features CAN Work Offline

Features that work offline:

- **Read-Only Viewing**

  - Client records (cached)
  - Appointments (cached)
  - Basic pet information

- **Data Entry with Sync**

  - New appointments
  - Client notes
  - Treatment records
  - (Synced when online)

- **Local Calculations**
  - Drug dose calculations
  - Weight conversions
  - Basic forms

## Custom Messages

Provide context-specific messages for each feature:

```typescript
{
  title: "AI Diagnostic Assistant",
  href: "/admin/ai-diagnostics",
  offlineSupported: false,
  offlineMessage: "AI diagnostic features require cloud-based processing and cannot run offline. Please connect to the internet to use AI-powered analysis.",
}
```

**Message Guidelines:**

- Explain WHY feature needs internet
- Be specific about requirements
- Suggest when to use (e.g., "connect to internet")
- Keep under 200 characters

## Current Offline-Incompatible Features

As of implementation, these features are marked as offline-incompatible:

### Clinical Tools

- **Lab Integration**: Requires external lab system connection
- **Medical Imaging**: Requires real-time image processing, cloud storage
- **Disease Reporting**: Requires regulatory submission connection
- **AI Diagnostic Assistant**: Requires cloud-based AI processing

### Reports & Analytics

- **Reports & Analytics**: Requires real-time data aggregation
- **Advanced Reporting**: Requires real-time data processing
- **Predictive Analytics**: Requires cloud AI and real-time analysis
- **Audit Reports**: Requires complete audit log access

### Administration

- **Email Templates**: Requires server-side validation
- **Email Service**: Requires email server connection
- **Billing Analytics**: Requires real-time financial data

## Testing

### Manual Testing

1. **Test Offline Badge Display:**

   ```bash
   # In browser DevTools:
   # Network tab → Toggle "Offline"
   # Navigate to AppSidebar
   # Verify "Requires Internet" badges appear
   ```

2. **Test Route Protection:**

   ```bash
   # Go offline
   # Navigate to /admin/medical-imaging
   # Should see OfflineUnavailablePage
   ```

3. **Test Online Transition:**
   ```bash
   # While on unavailable page
   # Go online (Network tab → Online)
   # Click "Retry" button
   # Should navigate to feature
   ```

### Automated Testing

```typescript
// Example test
import { render, screen } from "@testing-library/react";
import { OfflineProtected } from "@/components/offline";

test("shows unavailable page when offline and incompatible", () => {
  // Mock offline
  jest.spyOn(navigator, "onLine", "get").mockReturnValue(false);

  const menuData = [
    {
      title: "Test Feature",
      href: "/test",
      offlineSupported: false,
    },
  ];

  render(
    <OfflineProtected menuData={menuData}>
      <div>Content</div>
    </OfflineProtected>
  );

  expect(
    screen.getByText(/requires an internet connection/i)
  ).toBeInTheDocument();
});
```

## Troubleshooting

### Badge Not Showing

**Problem:** "Requires Internet" badge doesn't appear in sidebar
**Solutions:**

- Verify `offlineSupported: false` is set on menu item
- Check `isOnline` state in AppSidebar
- Ensure offline mode is actually active
- Check badge render logic in `renderNavItemContent`

### Route Not Protected

**Problem:** Page loads when it should show unavailable page
**Solutions:**

- Verify menu data includes the route
- Check route matching logic (exact match vs. prefix)
- Ensure `OfflineProtected` wraps the page content
- Verify `offlineSupported: false` in menu data

### Message Not Displaying

**Problem:** Generic message shows instead of custom one
**Solutions:**

- Verify `offlineMessage` is set in menu item
- Check message is passed to `OfflineUnavailablePage`
- Ensure menu data flattening preserves message

## API Reference

### Types

```typescript
interface OfflineFeatureConfig {
  title: string;
  href: string;
  offlineSupported?: boolean;
  offlineMessage?: string;
}

interface OfflineProtectedProps {
  children: React.ReactNode;
  menuData: OfflineFeatureConfig[];
  fallback?: React.ReactNode;
}

interface OfflineUnavailablePageProps {
  featureName: string;
  message?: string;
  onRetry?: () => void;
}
```

### Components

#### OfflineProtected

```tsx
<OfflineProtected
  menuData={menuData}
  fallback={<CustomFallback />} // Optional
>
  {children}
</OfflineProtected>
```

#### OfflineUnavailablePage

```tsx
<OfflineUnavailablePage
  featureName="Medical Imaging"
  message="Custom message here"
  onRetry={() => console.log("Retry")}
/>
```

### Hooks

#### useOfflineProtection

```typescript
const {
  isBlocked, // true if offline and incompatible
  isOfflineCompatible, // true if feature works offline
  currentFeature, // matched menu item or undefined
  isOnline, // network status
  canAccess, // inverse of isBlocked
} = useOfflineProtection(menuData);
```

### Utilities

#### flattenMenuForOfflineCheck

```typescript
const flatData = flattenMenuForOfflineCheck(menuGroups);
// Returns: OfflineFeatureConfig[]
```

#### isRouteOfflineCompatible

```typescript
const isCompatible = isRouteOfflineCompatible(
  "/admin/medical-imaging",
  menuData
);
// Returns: boolean
```

#### getOfflineMessage

```typescript
const message = getOfflineMessage("/admin/medical-imaging", menuData);
// Returns: string | undefined
```

## Best Practices

1. **Mark Features Conservatively**

   - Only mark as offline-incompatible if truly required
   - Consider offline-first alternatives when possible

2. **Provide Clear Messages**

   - Explain technical reason for requirement
   - Be user-friendly, not technical jargon
   - Suggest next steps

3. **Use Layout-Level Protection**

   - Wrap sections rather than individual pages
   - Reduces code duplication
   - Ensures consistent behavior

4. **Test Both States**

   - Always test online and offline scenarios
   - Verify transition between states
   - Check badge visibility

5. **Consider Partial Offline Support**
   - Some features might work partially offline
   - Show what's available vs. unavailable
   - Cache what you can for viewing

## Future Enhancements

Potential improvements:

- **Granular Feature Flags**: Mark specific sub-features as offline/online
- **Sync Indicators**: Show which data needs sync
- **Offline Queue**: Queue actions to perform when online
- **Feature Detection**: Auto-detect offline capabilities
- **Progressive Enhancement**: Start offline, enhance when online

## Related Documentation

- [Offline System Overview](./OFFLINE_ORGANIZATION.md)
- [Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)
- [RBAC Integration](./RBAC_INTEGRATION.md)
- [AppSidebar Documentation](../src/components/layout/AppSidebar.tsx)
