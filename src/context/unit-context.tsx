'use client';
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type Unit = 'gallons' | 'acre-feet';

interface UnitContextType {
  unit: Unit;
  setUnit: (unit: Unit) => void;
  getUnitLabel: () => string;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [unit, setUnit] = useState<Unit>('gallons');

  const getUnitLabel = useCallback(() => {
    switch (unit) {
      case 'gallons':
        return 'gal';
      case 'acre-feet':
        return 'ac-ft';
      default:
        return '';
    }
  }, [unit]);

  return (
    <UnitContext.Provider value={{ unit, setUnit, getUnitLabel }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = (): UnitContextType => {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
};
