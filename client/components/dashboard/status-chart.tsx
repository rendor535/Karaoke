'use client';

import { Pie, PieChart } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

const chartConfig = {
  approved: {
    label: 'Potwierdzono',
    color: 'var(--chart-1)',
  },
  rejected: {
    label: 'Odrzucono',
    color: 'var(--chart-2)',
  },
  pending: {
    label: 'Czeka',
    color: 'var(--chart-3)',
  },
  purchased: {
    label: 'Zakupione',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

type StatusChartProps = {
  className?: string;
  stats: {
    approved: number;
    rejected: number;
    pending: number;
    purchased: number;
  }
};

export function StatusChart({ className, stats }: StatusChartProps) {
  const chartData = [
    { request: 'approved', amount: stats.approved, fill: 'var(--color-approved)' },
    { request: 'rejected', amount: stats.rejected, fill: 'var(--color-rejected)' },
    { request: 'pending', amount: stats.pending, fill: 'var(--color-pending)' },
    { request: 'purchased', amount: stats.purchased, fill: 'var(--color-purchased)' },
  ];
  
  return (
    <Card className={cn('flex flex-col p-5 rounded-2xl bg-white dark:bg-gray-800', className)}>
      <CardHeader className="items-center mb-5">
        <CardTitle>Statusy zgłoszeń</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px] px-0"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="request" hideLabel/>}
            />
            <Pie
              data={chartData}
              dataKey="amount"
              labelLine={false}
              label={({ payload, ...props }) => {
                return (
                  <text
                    cx={props.cx}
                    cy={props.cy}
                    x={props.x}
                    y={props.y}
                    textAnchor={props.textAnchor}
                    dominantBaseline={props.dominantBaseline}
                    fill="hsla(var(--foreground))"
                  >
                    {payload.amount}
                  </text>
                );
              }}
              nameKey="request"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
