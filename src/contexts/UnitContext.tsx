
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Unit, UnitLabel } from '@/lib/data';
import { getUnitLabel as getLabel } from '@/lib/data';
import { useAuth } from './AuthContext';


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


export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const { company } = useAuth();
  const [unit, setUnit] = useState<Unit>('gallons');

  useEffect(() => {
    // Set the initial unit based on company settings when available
    if (company?.defaultUnit) {
      setUnit(company.defaultUnit);
    }
  }, [company]);


  const convertUsage = (gallons: number): number => {
    return gallons * CONVERSION_FACTORS[unit];
  };
  
  const getUnitLabel = (): UnitLabel => {
      return getLabel(unit);
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
