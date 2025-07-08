'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

const chartData = [
  { day: 'Sun', gallons: 1200 },
  { day: 'Mon', gallons: 1500 },
  { day: 'Tue', gallons: 1300 },
  { day: 'Wed', gallons: 1800 },
  { day: 'Thu', gallons: 900 },
  { day: 'Fri', gallons: 800 },
  { day: 'Sat', gallons: 0 },
]

const chartConfig = {
    gallons: {
        label: "Gallons",
        color: "hsl(var(--chart-1))",
    },
}

export default function DailyUsageChart() {
  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: -10, left: -10 }}>
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
