import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GALLONS_PER_ACRE_FOOT = 325851;
export const GALLONS_PER_CUBIC_FOOT = 7.48052;

// Conversion factors to gallons per second
export const GPM_TO_GALLONS_PER_SECOND = 1 / 60;
export const CFS_TO_GALLONS_PER_SECOND = GALLONS_PER_CUBIC_FOOT;


export const convertAndFormat = (value: number, unit: 'gallons' | 'acre-feet') => {
  if (unit === 'acre-feet') {
    const acreFeet = value / GALLONS_PER_ACRE_FOOT;
    return acreFeet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
};
