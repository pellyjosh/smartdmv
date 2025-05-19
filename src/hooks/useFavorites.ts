"use client";

import { useState, useEffect, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'vetConnectProFavorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        setFavoriteIds(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage", error);
    }
    setIsLoaded(true);
  }, []);

  const persistFavorites = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("Failed to save favorites to localStorage", error);
    }
  }, []);

  const addFavorite = useCallback((id: string) => {
    setFavoriteIds(prevIds => {
      if (prevIds.includes(id)) return prevIds;
      const newIds = [...prevIds, id];
      persistFavorites(newIds);
      return newIds;
    });
  }, [persistFavorites]);

  const removeFavorite = useCallback((id: string) => {
    setFavoriteIds(prevIds => {
      const newIds = prevIds.filter(favId => favId !== id);
      persistFavorites(newIds);
      return newIds;
    });
  }, [persistFavorites]);

  const isFavorite = useCallback((id: string) => {
    return favoriteIds.includes(id);
  }, [favoriteIds]);

  const toggleFavorite = useCallback((id: string) => {
    if (isFavorite(id)) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favoriteIds,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    isLoaded, // To help components know when localStorage has been checked
  };
}
