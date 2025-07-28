"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

type Unit = 'gallons' | 'kgal' | 'acre-feet';
type UnitLabel = 'Gallons' | 'kGal' | 'Acre-Feet';

interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
  convertUsage: (gallons: number) => number;
  getUnitLabel: () => UnitLabel;
}

const UnitContext = createContext<UnitContextValue | undefined>(undefined);

const CONVERSION_FACTORS = {
    'gallons': 1,
    'kgal': 1 / 1000,
    'acre-feet': 1 / 325851,
};

const UNIT_LABELS: Record<Unit, UnitLabel> = {
    'gallons': 'Gallons',
    'kgal': 'kGal',
    'acre-feet': 'Acre-Feet',
};

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [unit, setUnit] = useState<Unit>('gallons');

  const convertUsage = (gallons: number): number => {
    return gallons * CONVERSION_FACTORS[unit];
  };
  
  const getUnitLabel = (): UnitLabel => {
      return UNIT_LABELS[unit];
  }

  const value = { unit, setUnit, convertUsage, getUnitLabel };

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
