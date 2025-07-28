"use client"

import * as React from "react"
import { Pie, PieChart, Sector } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import { useUnit } from "@/contexts/UnitContext"

type UsageDonutChartProps = {
    data: { name: string; value: number; fill: string }[];
    title: string;
    description: string;
};

const chartConfig = {
  usage: {
    label: "Usage",
  },
} satisfies ChartConfig

export function UsageDonutChart({ data, title, description }: UsageDonutChartProps) {
  const { convertUsage, getUnitLabel } = useUnit();
  const id = React.useId()

  const chartData = data.map(item => ({
    ...item,
    value: convertUsage(item.value)
  }));
  
  const aggregate = chartData.reduce((acc, current) => acc + current.value, 0);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
              activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 4} />
                  <Sector {...props} outerRadius={outerRadius + 10} innerRadius={outerRadius + 6}/>
                </g>
              )}
            >
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardContent className="flex flex-col items-center justify-center text-center p-4 gap-2 mt-auto">
         <p className="text-2xl font-bold">{aggregate.toLocaleString(undefined, {maximumFractionDigits: 1})} {getUnitLabel()}</p>
         <p className="text-sm text-muted-foreground">Total Usage</p>
      </CardContent>
    </Card>
  )
}
