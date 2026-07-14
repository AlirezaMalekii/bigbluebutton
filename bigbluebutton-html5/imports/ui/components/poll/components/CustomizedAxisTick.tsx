import React from 'react';

function getAverageCharacterWidth(text: string, font: string, fontSize: number) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  ctx.font = `normal ${fontSize}px ${font}`;

  const textWidth = ctx.measureText(text).width;
  if (text.length === 0) return fontSize * 0.55;
  return textWidth / text.length;
}

const TICK_SIZE = 6;
const ELLIPSIS = '...';
const TICK_OFFSET = 10;

function resolveChartFontFamily(): string {
  if (typeof document === 'undefined') return 'Source Sans Pro, sans-serif';
  const bodyFont = window.getComputedStyle(document.body).fontFamily;
  return bodyFont || 'IRANYekanX, Source Sans Pro, sans-serif';
}

function isRtlChart(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomizedAxisTick = (props: any) => {
  const {
    payload, x, y, width, fontSize, fill,
  } = props;
  const label = payload?.value ?? '';
  const chartFont = resolveChartFontFamily();
  const averageCharWidth = getAverageCharacterWidth(label, chartFont, fontSize)
    ?? (fontSize * 0.55);
  const numberOfChars = Math.floor((width - TICK_SIZE) / averageCharWidth);
  const restValue = label.substring(numberOfChars, label.length);
  const displayLabel = `${label.substring(
    0,
    restValue.length > 0 ? numberOfChars - ELLIPSIS.length : numberOfChars,
  )}${restValue.length > 0 ? ELLIPSIS : ''}`;

  const rtl = isRtlChart();

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        dx={rtl ? TICK_OFFSET : -TICK_OFFSET}
        textAnchor={rtl ? 'start' : 'end'}
        fontSize={fontSize}
        fill={fill || 'var(--skyroom-modal-text-muted, #aab6c7)'}
      >
        {displayLabel}
      </text>
    </g>
  );
};

export default CustomizedAxisTick;
