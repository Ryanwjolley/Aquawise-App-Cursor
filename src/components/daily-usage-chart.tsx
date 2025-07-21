'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import type { DailyUsage } from '@/firestoreService';
import { convertAndFormat } from '@/lib/utils';
import { useMemo } from 'react';

type DailyUsageChartProps = {
  data: DailyUsage[];
  unit: 'gallons' | 'acre-feet';
  unitLabel: string;
}

const CustomTooltip = ({ active, payload, label, unit, unitLabel }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    if (typeof dataPoint.gallons === 'number') {
        return (
            <div className="p-2 bg-background border rounded-lg shadow-sm">
            <p className="font-bold">{label}</p>
            <p>{`${convertAndFormat(dataPoint.gallons, unit)} ${unitLabel}`}</p>
            </div>
        );
    }
  }
  return null;
};


export default function DailyUsageChart({ data, unit, unitLabel }: DailyUsageChartProps) {
  const chartConfig = {
      gallons: {
          label: unitLabel,
          color: "hsl(var(--chart-1))",
      },
  }

  const chartData = useMemo(() => data.map(item => ({
    ...item,
    displayValue: unit === 'acre-feet' ? item.gallons / 325851 : item.gallons,
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
                <Tooltip 
                    cursor={{fill: 'hsla(var(--muted), 0.5)'}}
                    content={<CustomTooltip unit={unit} unitLabel={unitLabel} />}
                />
                <Bar dataKey="displayValue" fill="var(--color-gallons)" radius={[5, 5, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
