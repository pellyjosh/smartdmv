"use client";

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface FavoriteButtonProps {
  serviceId: string;
  className?: string;
}

export function FavoriteButton({ serviceId, className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites();
  const [isClientFavorite, setIsClientFavorite] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setIsClientFavorite(isFavorite(serviceId));
    }
  }, [isLoaded, isFavorite, serviceId]);
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if button is inside an <a> tag
    e.stopPropagation(); // Prevent card click event if button is on a card
    toggleFavorite(serviceId);
  };

  if (!isLoaded) {
    // Render a placeholder or nothing until favorites are loaded
    return <Button variant="ghost" size="icon" className={cn("text-muted-foreground", className)} disabled><Heart className="h-5 w-5" /></Button>;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleFavorite}
      className={cn(isClientFavorite ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-destructive/80", className)}
      aria-label={isClientFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn("h-5 w-5", isClientFavorite && "fill-destructive")} />
    </Button>
  );
}
