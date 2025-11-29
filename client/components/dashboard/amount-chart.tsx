"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from '@/lib/utils'
import { Request } from "@/types"

const chartConfig = {
  average: {
    label: "Średnia PLN",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

// Grupowanie i liczenie średnich
function groupAndAverageByDay(requests: Request[]) {
  const map = new Map<string, number[]>()

  for (const request of requests) {
    const date = new Date(request.createdAt).toISOString().split("T")[0]
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)!.push(request.amountPln)
  }

  const result = Array.from(map.entries()).map(([date, amounts]) => {
    const average = amounts.reduce((acc, curr) => acc + curr, 0) / amounts.length
    return {
      date,
      average: Math.round(average),
    }
  })

  result.sort((a, b) => a.date.localeCompare(b.date))

  return result
}

type AmountChartProps = {
  className?: string
  requests?: Request[]
}

export function AmountChart({ className, requests = [] }: AmountChartProps) {
  const chartData = React.useMemo(() => {
    return groupAndAverageByDay(requests)
  }, [requests])

  return (
    <Card className={cn('rounded-2xl bg-white dark:bg-gray-800 py-4 sm:py-0', className)}>
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 min-h-20 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Średnia wartość zgłoszeń dziennie</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("pl-PL", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="average"
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("pl-PL", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                  valueFormatter={(val) => `${val} PLN`}
                />
              }
            />
            <Line
              dataKey="average"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
