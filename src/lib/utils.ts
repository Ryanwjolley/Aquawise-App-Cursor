import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GALLONS_PER_ACRE_FOOT = 325851;
export const GALLONS_PER_CUBIC_FOOT = 7.48052;

export const convertAndFormat = (value: number, unit: 'gallons' | 'acre-feet') => {
  if (unit === 'acre-feet') {
    const acreFeet = value / GALLONS_PER_ACRE_FOOT;
    return acreFeet.toFixed(3);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
};
