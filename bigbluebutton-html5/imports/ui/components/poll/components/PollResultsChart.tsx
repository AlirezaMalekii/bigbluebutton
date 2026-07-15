import React, { useMemo } from 'react';
import {
  Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import Styled from '../styles';
import { getPollChartColor } from './pollChartColors';

const CHART_BAR_HEIGHT = 36;
const CHART_MIN_HEIGHT = 120;
const CHART_PADDING = 40;

export interface PollChartDatum {
  label: string;
  count: number;
  isCorrectAnswer?: boolean;
}

interface PollResultsChartProps {
  data: PollChartDatum[];
  dataTest?: string;
  variant?: 'modal' | 'chat';
}

function computeChartHeight(itemCount: number, variant: 'modal' | 'chat'): number {
  const barHeight = variant === 'chat' ? 28 : CHART_BAR_HEIGHT;
  const minHeight = variant === 'chat' ? 80 : CHART_MIN_HEIGHT;
  return Math.max(minHeight, itemCount * barHeight + CHART_PADDING);
}

const PollResultsChart: React.FC<PollResultsChartProps> = ({
  data,
  dataTest = 'pollResultsChart',
  variant = 'modal',
}) => {
  const chartData = useMemo(
    () => data.map((item, index) => ({
      ...item,
      rowKey: `poll-row-${index}`,
      rowIndex: index + 1,
    })),
    [data],
  );

  const chartHeight = computeChartHeight(chartData.length, variant);
  const barRadius = variant === 'chat' ? 3 : 4;

  return (
    <Styled.PollResultsChartRoot data-test={dataTest} data-variant={variant}>
      <Styled.PollResultsChartArea>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 4,
              right: 8,
              left: 8,
              bottom: 4,
            }}
            barCategoryGap="22%"
          >
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: variant === 'chat' ? 11 : 12 }}
            />
            <YAxis
              type="category"
              dataKey="rowIndex"
              width={0}
              hide
            />
            <Bar
              dataKey="count"
              radius={[0, barRadius, barRadius, 0]}
              maxBarSize={variant === 'chat' ? 22 : 28}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.rowKey} fill={getPollChartColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Styled.PollResultsChartArea>
      <Styled.PollResultsLegend data-variant={variant}>
        {chartData.map((item, index) => (
          <Styled.PollResultsLegendItem key={item.rowKey}>
            <Styled.PollResultsLegendSwatch color={getPollChartColor(index)} />
            <Styled.PollResultsLegendContent>
              <Styled.PollResultsLegendLabel data-variant={variant}>
                {item.isCorrectAnswer ? '✅ ' : ''}
                {item.label}
              </Styled.PollResultsLegendLabel>
              <Styled.PollResultsLegendCount data-variant={variant}>
                {item.count}
              </Styled.PollResultsLegendCount>
            </Styled.PollResultsLegendContent>
          </Styled.PollResultsLegendItem>
        ))}
      </Styled.PollResultsLegend>
    </Styled.PollResultsChartRoot>
  );
};

export default PollResultsChart;
