'use client'

import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'

type UsageDonutChartProps = {
    value: number;
}

export default function UsageDonutChart({ value }: UsageDonutChartProps) {
  const chartData = [
    { name: 'Used', value: value, fill: 'hsl(var(--chart-1))' },
    { name: 'Remaining', value: 100 - value, fill: 'hsl(var(--muted))' },
  ]
  const chartConfig = {
      used: { label: 'Used', color: 'hsl(var(--chart-1))' },
      remaining: { label: 'Remaining', color: 'hsl(var(--muted))' },
  };

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="75%"
                    outerRadius="100%"
                    strokeWidth={4}
                    stroke="hsl(var(--card))"
                    paddingAngle={2}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
