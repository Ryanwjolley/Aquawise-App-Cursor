'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import type { DailyUsage } from '@/firestoreService';

const chartConfig = {
    gallons: {
        label: "Gallons",
        color: "hsl(var(--chart-1))",
    },
}

type DailyUsageChartProps = {
  data: DailyUsage[];
}

export default function DailyUsageChart({ data }: DailyUsageChartProps) {
  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: -10, left: -10 }}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                    cursor={{fill: 'hsla(var(--muted), 0.5)'}} 
                    content={<ChartTooltipContent indicator="dot" />} 
                />
                <Bar dataKey="gallons" fill="var(--color-gallons)" radius={[5, 5, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
