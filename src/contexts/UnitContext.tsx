"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

type Unit = 'gallons' | 'acre-feet';

interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
  // Conversion factor: 1 acre-foot = 325,851 gallons
  convertUsage: (gallons: number) => number;
}

const UnitContext = createContext<UnitContextValue | undefined>(undefined);

const ACRE_FEET_CONVERSION_FACTOR = 325851;

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [unit, setUnit] = useState<Unit>('gallons');

  const convertUsage = (gallons: number) => {
    if (unit === 'acre-feet') {
      return gallons / ACRE_FEET_CONVERSION_FACTOR;
    }
    return gallons;
  };

  const value = { unit, setUnit, convertUsage };

  return (
    <UnitContext.Provider value={value}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = (): UnitContextValue => {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
};
