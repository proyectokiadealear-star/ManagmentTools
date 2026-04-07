import { useState, useEffect } from 'react';
import { getLocationNamesMap } from '../../services/assetService';

/**
 * Returns a function that resolves a location ID (area, bahía, rack, caja) to
 * its human-readable name. IDs are never exposed in the UI.
 *
 * The name map is fetched once per session and shared across all components.
 */
export function useLocationNames(): (id: string | undefined | null) => string {
  const [namesMap, setNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getLocationNamesMap().then(setNamesMap).catch(() => {});
  }, []);

  return (id: string | undefined | null): string => {
    if (!id) return '';
    return namesMap[id] ?? '';
  };
}
