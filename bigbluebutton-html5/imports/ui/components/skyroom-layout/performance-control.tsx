import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import Styled from '/imports/ui/components/settings/submenus/styles';
import { isSkyroomTheme } from './panel-toggles';
import {
  getSkyroomProtectionStage,
  SKYROOM_PERFORMANCE_TIER_EVENT,
  type PerformanceMode,
} from './performance-profile';

interface PerformanceControlProps {
  mode: PerformanceMode;
  onChange: (mode: PerformanceMode) => void;
}

const PerformanceControl = ({ mode, onChange }: PerformanceControlProps) => {
  const intl = useIntl();
  const adaptiveEnabled = window.meetingClientSettings?.public
    ?.safemeetPerformance?.adaptiveProtectionEnabled === true;
  const [stage, setStage] = useState(getSkyroomProtectionStage());
  useEffect(() => {
    const syncStage = () => setStage(getSkyroomProtectionStage());
    window.addEventListener(SKYROOM_PERFORMANCE_TIER_EVENT, syncStage);
    return () => window.removeEventListener(SKYROOM_PERFORMANCE_TIER_EVENT, syncStage);
  }, []);
  if (!isSkyroomTheme() || window.meetingClientSettings?.public?.safemeetPerformance?.enabled === false) {
    return null;
  }
  return (
    <Styled.Row>
      <Styled.FormElement>
        <Styled.Label as="label" htmlFor="safemeet-performance-mode">
          {intl.formatMessage({ id: 'app.skyroom.performance.label' })}
        </Styled.Label>
        <Styled.Select
          id="safemeet-performance-mode"
          data-test="safemeetPerformanceMode"
          value={mode}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
            onChange(event.target.value as PerformanceMode);
          }}
        >
          <option value="auto">{intl.formatMessage({ id: 'app.skyroom.performance.auto' })}</option>
          {adaptiveEnabled && (
            <option value="low">{intl.formatMessage({ id: 'app.skyroom.performance.low' })}</option>
          )}
          <option value="standard">{intl.formatMessage({ id: 'app.skyroom.performance.standard' })}</option>
        </Styled.Select>
        {adaptiveEnabled && stage !== 'none' && (
          <Styled.Label as="small" role="status" aria-live="polite">
            {intl.formatMessage({ id: `app.skyroom.performance.stage.${stage}` })}
          </Styled.Label>
        )}
      </Styled.FormElement>
    </Styled.Row>
  );
};

export default PerformanceControl;
