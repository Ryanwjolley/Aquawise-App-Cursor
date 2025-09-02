
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Unit } from '@/lib/data';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const GALLONS_PER_ACRE_FOOT = 325851.429;
const GALLONS_PER_CUBIC_FOOT = 7.48051948;
const GALLONS_PER_KGAL = 1000;

export function convertToGallons(amount: number, unit: Unit, durationHours?: number): number {
  switch (unit) {
    case 'gallons':
      return amount;
    case 'kgal':
      return amount * GALLONS_PER_KGAL;
    case 'acre-feet':
      return amount * GALLONS_PER_ACRE_FOOT;
    case 'cubic-feet':
      return amount * GALLONS_PER_CUBIC_FOOT;
    case 'cfs':
      if (!durationHours) return 0;
      // cubic feet per second → gallons over duration
      return amount * GALLONS_PER_CUBIC_FOOT * (durationHours * 3600);
    case 'gpm':
      if (!durationHours) return 0;
      // gallons per minute → gallons over duration
      return amount * 60 * durationHours;
    case 'acre-feet-day':
      if (!durationHours) return 0;
      // ac-ft per day → gallons over duration
      return amount * GALLONS_PER_ACRE_FOOT * (durationHours / 24);
    default:
      return amount;
  }
}

// Convert a stored gallons value into a display value for a given unit.
// Note: Only volume units are supported for reverse conversion. For rate units,
// we return the original gallons since a duration would be required for rates.
export function convertGallonsToUnit(gallons: number, unit: Unit): number {
  switch (unit) {
    case 'gallons':
      return gallons;
    case 'kgal':
      return gallons / GALLONS_PER_KGAL;
    case 'acre-feet':
      return gallons / GALLONS_PER_ACRE_FOOT;
    case 'cubic-feet':
      return gallons / GALLONS_PER_CUBIC_FOOT;
    // Rates need a duration to compute; fall back to gallons
    case 'cfs':
    case 'gpm':
    case 'acre-feet-day':
    default:
      return gallons;
  }
}

export function formatUnitLabel(unit?: Unit): string {
  switch (unit) {
    case 'gallons':
      return 'Gallons';
    case 'kgal':
      return 'kGal';
    case 'acre-feet':
      return 'Acre-Feet';
    case 'cubic-feet':
      return 'Cubic Feet';
    case 'cfs':
      return 'CFS';
    case 'gpm':
      return 'GPM';
    case 'acre-feet-day':
      return 'Ac-Ft/Day';
    default:
      return 'Gallons';
  }
}