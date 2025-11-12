import { useState } from 'react';

interface OfflineDataState {
  [key: string]: any;
}

export function useOfflineData() {
  const [offlineData, setOfflineData] = useState<OfflineDataState>({});
  
  const storeOfflineData = (key: string, data: any) => {
    setOfflineData((prev: OfflineDataState) => ({ ...prev, [key]: data }));
    localStorage.setItem(`offline_${key}`, JSON.stringify(data));
  };
  
  const getOfflineData = (key: string) => {
    if (offlineData[key]) return offlineData[key];
    
    const stored = localStorage.getItem(`offline_${key}`);
    if (stored) {
      const data = JSON.parse(stored);
      setOfflineData((prev: OfflineDataState) => ({ ...prev, [key]: data }));
      return data;
    }
    
    return null;
  };
  
  return {
    storeOfflineData,
    getOfflineData,
    offlineData
  };
}
