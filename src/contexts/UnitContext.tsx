
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Unit, UnitLabel } from '@/lib/data';
import { getUnitLabel as getLabel, CONVERSION_FACTORS_FROM_GALLONS } from '@/lib/data';
import { useAuth } from './AuthContext';


interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
  convertUsage: (gallons: number) => number;
  getUnitLabel: () => UnitLabel;
}

const UnitContext = createContext<UnitContextValue | undefined>(undefined);


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
    return gallons * (CONVERSION_FACTORS_FROM_GALLONS[unit] || 1);
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
