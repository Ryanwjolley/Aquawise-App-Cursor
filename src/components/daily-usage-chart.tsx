'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import type { DailyUsage } from '@/firestoreService';
import { useUnit } from '@/context/unit-context';
import { convertAndFormat, GALLONS_PER_ACRE_FOOT } from '@/lib/utils';

type DailyUsageChartProps = {
  data: DailyUsage[];
}

export default function DailyUsageChart({ data }: DailyUsageChartProps) {
  const { unit, getUnitLabel } = useUnit();

  const chartData = data.map(item => ({
      ...item,
      value: unit === 'acre-feet' ? item.gallons / GALLONS_PER_ACRE_FOOT : item.gallons,
  }));

  const chartConfig = {
      gallons: {
          label: getUnitLabel(),
          color: "hsl(var(--chart-1))",
      },
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: -10, left: -10 }}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => unit === 'gallons' ? `${value}` : `${Number(value).toFixed(3)}`} 
                />
                <Tooltip 
                    cursor={{fill: 'hsla(var(--muted), 0.5)'}} 
                    content={<ChartTooltipContent 
                                indicator="dot" 
                                formatter={(value, name, props) => {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{props.payload.day}</span>
                                            <span>{`${convertAndFormat(props.payload.gallons, unit)} ${getUnitLabel()}`}</span>
                                        </div>
                                    )
                                }}
                            />}
                />
                <Bar dataKey="value" fill="var(--color-gallons)" radius={[5, 5, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
