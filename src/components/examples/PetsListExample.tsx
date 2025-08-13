// Example component showing how to use the new network error handling
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApi } from '@/lib/client-network-utils';

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  owner?: {
    name: string;
    email: string;
  };
}

export function PetsListExample() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  
  const { apiCall, isOnline } = useApi();

  const fetchPets = async () => {
    setLoading(true);
    setError(null);
    setIsNetworkError(false);

    const result = await apiCall<Pet[]>('/api/pets?practiceId=1');
    
    if (result.data) {
      setPets(result.data);
    } else if (result.error) {
      setError(result.error);
      setIsNetworkError(result.isNetworkError || false);
    }
    
    setLoading(false);
  };

  const handleRetry = () => {
    fetchPets();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Pets List Example
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </CardTitle>
        <CardDescription>
          Example of how the new network error handling works in practice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={fetchPets} 
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Fetch Pets
        </Button>

        {error && (
          <Alert variant={isNetworkError ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {isNetworkError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {pets.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Successfully loaded {pets.length} pets
            </AlertDescription>
          </Alert>
        )}

        {pets.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Pets:</h3>
            {pets.slice(0, 5).map((pet) => (
              <div key={pet.id} className="p-2 border rounded">
                <div className="font-medium">{pet.name}</div>
                <div className="text-sm text-muted-foreground">
                  {pet.species} {pet.breed && `• ${pet.breed}`}
                </div>
                {pet.owner && (
                  <div className="text-xs text-muted-foreground">
                    Owner: {pet.owner.name}
                  </div>
                )}
              </div>
            ))}
            {pets.length > 5 && (
              <div className="text-sm text-muted-foreground">
                ... and {pets.length - 5} more
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to test:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Normal: Click "Fetch Pets" with good internet</li>
            <li>Network Error: Disconnect internet and try again</li>
            <li>Recovery: Reconnect internet and use "Retry" button</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default PetsListExample;
