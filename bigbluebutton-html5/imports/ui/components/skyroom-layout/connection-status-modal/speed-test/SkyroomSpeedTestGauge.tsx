import React from 'react';
import { formatMbps, formatMs, mbpsToGauge } from './format';
import type { SpeedTestPhase } from './types';
import Styled from '../styles';

const CX = 110;
const CY = 100;
const RADIUS = 78;
const START_ANGLE = 225;
const SWEEP = 270;

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
  const pingPhase = phase === 'ping' || phase === 'probing';
  const progress = pingPhase ? 0 : mbpsToGauge(mbps);
  const endAngle = START_ANGLE + SWEEP * progress;
  const needle = polar(CX, CY, RADIUS - 18, endAngle);
  const running = phase !== 'idle' && phase !== 'done' && phase !== 'error';
  const displayValue = pingPhase
    ? formatMs(pingMs)
    : formatMbps(mbps ?? 0);
  const displayUnit = pingPhase ? pingUnitLabel : unitLabel;

  return (
    <Styled.GaugeWrap>
      <Styled.GaugeStage>
        <Styled.GaugeSvg
          viewBox="0 0 220 186"
          role="img"
          aria-label={`${gaugeLabel} ${displayValue} ${displayUnit}`}
          data-animate={animate ? 'true' : 'false'}
        >
          <defs>
            <linearGradient id="skyroomSpeedTestArc" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0D887E" />
              <stop offset="55%" stopColor="#20C7BB" />
              <stop offset="100%" stopColor="#7EE7DE" />
            </linearGradient>
          </defs>
          <path
            d={arcPath(RADIUS, START_ANGLE, START_ANGLE + SWEEP)}
            fill="none"
            stroke="rgba(218, 230, 245, 0.12)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {progress > 0.004 ? (
            <path
              d={arcPath(RADIUS, START_ANGLE, endAngle)}
              fill="none"
              stroke="url(#skyroomSpeedTestArc)"
              strokeWidth="14"
              strokeLinecap="round"
              className="skyroom-speedtest-progress"
            />
          ) : null}
          {TICK_MBPS.map((tick) => {
            const angle = START_ANGLE + SWEEP * mbpsToGauge(tick);
            const inner = polar(CX, CY, RADIUS - 11, angle);
            const outer = polar(CX, CY, RADIUS + 6, angle);
            return (
              <line
                key={tick}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(218, 230, 245, 0.28)"
                strokeWidth="1.5"
              />
            );
          })}
          <circle cx={CX} cy={CY} r="7" fill="#0F141C" stroke="#20C7BB" strokeWidth="2" />
          {running || progress > 0 ? (
            <line
              x1={CX}
              y1={CY}
              x2={needle.x}
              y2={needle.y}
              stroke="#E6EDF7"
              strokeWidth="2.4"
              strokeLinecap="round"
              className="skyroom-speedtest-needle"
            />
          ) : null}
        </Styled.GaugeSvg>
        <Styled.GaugeReadout>
          <Styled.GaugeValue>{displayValue}</Styled.GaugeValue>
          <Styled.GaugeUnit>{displayUnit}</Styled.GaugeUnit>
        </Styled.GaugeReadout>
      </Styled.GaugeStage>
      <Styled.GaugePhase aria-live="polite">{phaseLabel}</Styled.GaugePhase>
    </Styled.GaugeWrap>
  );
};

export default SkyroomSpeedTestGauge;
