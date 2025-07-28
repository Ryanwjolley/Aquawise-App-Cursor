
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnit } from "@/contexts/UnitContext";
import type { Unit } from "@/lib/data";

export function UnitSwitcher() {
    const { unit, setUnit } = useUnit();

    return (
        <Select value={unit} onValueChange={(value: Unit) => setUnit(value)}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="gallons">Gallons</SelectItem>
                <SelectItem value="kgal">kGal (Thousands)</SelectItem>
                <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                <SelectItem value="cubic-feet">Cubic Feet</SelectItem>
            </SelectContent>
        </Select>
    )

}
