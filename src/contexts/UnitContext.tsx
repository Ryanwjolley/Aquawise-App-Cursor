
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Unit, UnitLabel } from '@/lib/data';
import { CONVERSION_FACTORS_FROM_GALLONS } from '@/lib/data';
import { formatUnitLabel } from '@/lib/utils';
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
    // Only volume units are valid here by type; others map to 1 implicitly
    const factor = (CONVERSION_FACTORS_FROM_GALLONS as any)[unit] ?? 1;
    return gallons * factor;
  };
  
  const getUnitLabel = (): UnitLabel => {
      return formatUnitLabel(unit) as UnitLabel;
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
