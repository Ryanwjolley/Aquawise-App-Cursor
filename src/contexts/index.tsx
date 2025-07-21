"use client";

import { AuthProvider } from './AuthContext';
import { UnitProvider } from './UnitContext';

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <UnitProvider>
        {children}
      </UnitProvider>
    </AuthProvider>
  );
};
