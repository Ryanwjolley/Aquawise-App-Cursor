'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent, ChartTooltip, ChartStyle } from '@/components/ui/chart'
import type { DailyUsage } from '@/firestoreService';
import { useUnit } from '@/context/unit-context';
import { convertAndFormat, GALLONS_PER_ACRE_FOOT } from '@/lib/utils';
import { useMemo } from 'react';

type DailyUsageChartProps = {
  data: DailyUsage[];
}

export default function DailyUsageChart({ data }: DailyUsageChartProps) {
  const { unit, getUnitLabel } = useUnit();

  const chartConfig = {
      gallons: {
          label: getUnitLabel(),
          color: "hsl(var(--chart-1))",
      },
  }

  const chartData = useMemo(() => data.map(item => ({
    ...item,
    displayValue: unit === 'acre-feet' ? item.gallons / GALLONS_PER_ACRE_FOOT : item.gallons
  })), [data, unit]);

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => unit === 'gallons' ? `${value}` : `${Number(value).toFixed(2)}`} 
                />
                <ChartTooltip 
                    cursor={{fill: 'hsla(var(--muted), 0.5)'}}
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            const originalDataPoint = data.find(d => d.day === label);
                            if (originalDataPoint) {
                                return (
                                    <div className="p-2 bg-background border rounded-lg shadow-sm">
                                        <p className="font-bold">{label}</p>
                                        <p>{`${convertAndFormat(originalDataPoint.gallons, unit)} ${getUnitLabel()}`}</p>
                                    </div>
                                )
                            }
                        }
                        return null;
                    }}
                />
                <Bar dataKey="displayValue" fill="var(--color-gallons)" radius={[5, 5, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
