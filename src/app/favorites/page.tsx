"use client";

import { useEffect, useState } from 'react';
import { mockVetServices } from '@/lib/mockData';
import type { VetService } from '@/lib/types';
import { VetServiceCard } from '@/components/VetServiceCard';
import { useFavorites } from '@/hooks/useFavorites';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { favoriteIds, isLoaded } = useFavorites();
  const [favoriteServices, setFavoriteServices] = useState<VetService[]>([]);

  useEffect(() => {
    if (isLoaded) {
      const filteredServices = mockVetServices.filter(service => favoriteIds.includes(service.id));
      setFavoriteServices(filteredServices);
    }
  }, [favoriteIds, isLoaded]);

  if (!isLoaded) {
    // Optional: Add a loading skeleton state
    return (
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary">My Favorite Services</h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 animate-pulse">
              <div className="h-48 bg-muted rounded mb-4"></div>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <Heart className="mr-3 h-8 w-8 text-destructive fill-destructive" />
          My Favorite Services
        </h1>
      </header>

      {favoriteServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteServices.map(service => (
            <VetServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Heart className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Favorites Yet</h2>
          <p className="text-muted-foreground">
            Browse services and click the heart icon to add them to your favorites.
          </p>
        </div>
      )}
    </div>
  );
}
