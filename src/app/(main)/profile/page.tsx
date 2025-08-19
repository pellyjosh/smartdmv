'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';

export default function ProfilePage() {
  const { user } = useUser();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Name:</span> {user.name || '—'}</div>
              <div><span className="font-medium">Email:</span> {user.email}</div>
              <div><span className="font-medium">Role:</span> {user.role}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No user loaded.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
