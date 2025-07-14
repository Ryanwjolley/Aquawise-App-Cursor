import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GALLONS_PER_ACRE_FOOT = 325851;

export const convertAndFormat = (value: number, unit: 'gallons' | 'acre-feet', chartTooltip: boolean = false) => {
  if (unit === 'acre-feet') {
    const acreFeet = value / GALLONS_PER_ACRE_FOOT;
    if (chartTooltip) {
      // Logic for chart tooltip which gets unconverted value
      const originalGallons = value * GALLONS_PER_ACRE_FOOT;
      return (originalGallons / GALLONS_PER_ACRE_FOOT).toFixed(4);
    }
    return acreFeet.toFixed(3);
  }
  return value.toLocaleString();
};
