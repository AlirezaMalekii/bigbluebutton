import React, { useId } from 'react';
import { formatMbps, formatMs, mbpsToGauge } from './format';
import type { SpeedTestPhase } from './types';
import Styled from '../styles';

const CX = 120;
const CY = 112;
const RADIUS = 86;
const START_ANGLE = 270;
const SWEEP = 179;
const TRACK_WIDTH = 14;

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

const arcPath = (r: number, startAngle: number, endAngle: number) => {
  const start = polar(CX, CY, r, startAngle);
  const end = polar(CX, CY, r, endAngle);
  const delta = (((endAngle - startAngle) % 360) + 360) % 360;
  const largeArc = delta > 180 ? 1 : 0;
  const startCmd = `${start.x.toFixed(2)} ${start.y.toFixed(2)}`;
  const endCmd = `${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  return `M ${startCmd} A ${r} ${r} 0 ${largeArc} 1 ${endCmd}`;
};

const TICK_MBPS = [1, 10, 100, 1000];

interface SkyroomSpeedTestGaugeProps {
  mbps: number | null;
  pingMs: number | null;
  phase: SpeedTestPhase;
  phaseLabel: string;
  unitLabel: string;
  pingUnitLabel: string;
  gaugeLabel: string;
  animate: boolean;
}

const SkyroomSpeedTestGauge: React.FC<SkyroomSpeedTestGaugeProps> = ({
  mbps,
  pingMs,
  phase,
  phaseLabel,
  unitLabel,
  pingUnitLabel,
  gaugeLabel,
  animate,
}) => {
  const reactId = useId().replace(/:/g, '');
  const gradientId = `skyroomSpeedArc-${reactId}`;
  const pingPhase = phase === 'ping' || phase === 'probing';
  const idle = phase === 'idle';
  const progress = pingPhase || idle ? 0 : mbpsToGauge(mbps);
  const endAngle = START_ANGLE + SWEEP * progress;
  const tip = polar(CX, CY, RADIUS, endAngle);
  const displayValue = pingPhase
    ? formatMs(pingMs)
    : formatMbps(idle ? null : mbps);
  const displayUnit = pingPhase ? pingUnitLabel : unitLabel;

  return (
    <Styled.GaugeWrap>
      <Styled.GaugeStage>
        <Styled.GaugeSvg
          viewBox="0 0 240 128"
          role="img"
          aria-label={`${gaugeLabel} ${displayValue} ${displayUnit}`}
          data-animate={animate ? 'true' : 'false'}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="80%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--skyroom-brand-600, #0A6F67)" />
              <stop offset="50%" stopColor="var(--skyroom-accent, #20C7BB)" />
              <stop offset="100%" stopColor="var(--skyroom-brand-200, #8CDDD6)" />
            </linearGradient>
          </defs>
          <path
            d={arcPath(RADIUS, START_ANGLE, START_ANGLE + SWEEP)}
            fill="none"
            stroke="rgba(218, 230, 245, 0.1)"
            strokeWidth={TRACK_WIDTH}
            strokeLinecap="round"
          />
          {progress > 0.004 ? (
            <path
              d={arcPath(RADIUS, START_ANGLE, START_ANGLE + SWEEP)}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${progress} 1`}
              className="skyroom-speedtest-progress"
            />
          ) : null}
          {TICK_MBPS.map((tick) => {
            const angle = START_ANGLE + SWEEP * mbpsToGauge(tick);
            const inner = polar(CX, CY, RADIUS - 9, angle);
            const outer = polar(CX, CY, RADIUS + 1, angle);
            return (
              <line
                key={tick}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(218, 230, 245, 0.22)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
          {progress > 0.004 ? (
            <circle
              cx={tip.x}
              cy={tip.y}
              r="5.5"
              fill="var(--skyroom-brand-200, #8CDDD6)"
              stroke="rgba(7, 11, 20, 0.65)"
              strokeWidth="2"
            />
          ) : null}
          <text
            x={CX}
            y={CY - 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--skyroom-text-primary, #E6EDF7)"
            fontSize="30"
            fontWeight="700"
            letterSpacing="-0.05em"
            direction="ltr"
          >
            {displayValue}
          </text>
          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--skyroom-brand-300, #3FC2B8)"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.12em"
            direction="ltr"
          >
            {displayUnit.toUpperCase()}
          </text>
        </Styled.GaugeSvg>
        <Styled.GaugePhase aria-live="polite" data-test="speedTestPhase">
          {phaseLabel}
        </Styled.GaugePhase>
      </Styled.GaugeStage>
    </Styled.GaugeWrap>
  );
};

export default SkyroomSpeedTestGauge;
