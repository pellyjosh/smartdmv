'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useUser();
  const [displayName, setDisplayName] = useState(user?.name || '');

  const onSave = () => {
    // Placeholder save - wire to API later
    console.log('Saving name to future API:', displayName);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <Button onClick={onSave} className="mt-2">Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
