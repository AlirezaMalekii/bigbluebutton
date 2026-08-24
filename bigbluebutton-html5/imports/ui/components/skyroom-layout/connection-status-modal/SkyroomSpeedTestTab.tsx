import React, { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useSettings from '/imports/ui/services/settings/hooks/useSettings';
import { SETTINGS } from '/imports/ui/services/settings/enums';
import Styled from './styles';
import useSpeedTest from './speed-test/useSpeedTest';
import SkyroomSpeedTestGauge from './speed-test/SkyroomSpeedTestGauge';
import {
  formatMbps,
  formatMs,
  getMeetingAdvice,
} from './speed-test/format';
import type { MeetingFitLevel } from './speed-test/format';
import type { SpeedTestErrorCode, SpeedTestPhase } from './speed-test/types';

const intlMessages = defineMessages({
  server: {
    id: 'app.skyroom.speedTest.server',
    description: 'Meeting server label',
  },
  start: {
    id: 'app.skyroom.speedTest.start',
    description: 'Start speed test',
  },
  cancel: {
    id: 'app.skyroom.speedTest.cancel',
    description: 'Cancel speed test',
  },
  retry: {
    id: 'app.skyroom.speedTest.retry',
    description: 'Retry speed test',
  },
  warning: {
    id: 'app.skyroom.speedTest.warning',
    description: 'Bandwidth warning',
  },
  phaseIdle: {
    id: 'app.skyroom.speedTest.phaseIdle',
    description: 'Idle phase',
  },
  phaseProbing: {
    id: 'app.skyroom.speedTest.phaseProbing',
    description: 'Probing phase',
  },
  phasePing: {
    id: 'app.skyroom.speedTest.phasePing',
    description: 'Ping phase',
  },
  phaseDownload: {
    id: 'app.skyroom.speedTest.phaseDownload',
    description: 'Download phase',
  },
  phaseUpload: {
    id: 'app.skyroom.speedTest.phaseUpload',
    description: 'Upload phase',
  },
  phaseDone: {
    id: 'app.skyroom.speedTest.phaseDone',
    description: 'Completed phase',
  },
  ping: {
    id: 'app.skyroom.speedTest.ping',
    description: 'Ping label',
  },
  jitter: {
    id: 'app.skyroom.speedTest.jitter',
    description: 'Jitter label',
  },
  download: {
    id: 'app.skyroom.speedTest.download',
    description: 'Download label',
  },
  upload: {
    id: 'app.skyroom.speedTest.upload',
    description: 'Upload label',
  },
  mbps: {
    id: 'app.skyroom.speedTest.mbps',
    description: 'Megabits unit',
  },
  ms: {
    id: 'app.skyroom.speedTest.ms',
    description: 'Milliseconds unit',
  },
  verdictExcellent: {
    id: 'app.skyroom.speedTest.verdictExcellent',
    description: 'Excellent verdict',
  },
  verdictGood: {
    id: 'app.skyroom.speedTest.verdictGood',
    description: 'Good verdict',
  },
  verdictFair: {
    id: 'app.skyroom.speedTest.verdictFair',
    description: 'Fair verdict',
  },
  verdictPoor: {
    id: 'app.skyroom.speedTest.verdictPoor',
    description: 'Poor verdict',
  },
  errorNotConfigured: {
    id: 'app.skyroom.speedTest.errorNotConfigured',
    description: 'Server not configured',
  },
  errorNetwork: {
    id: 'app.skyroom.speedTest.errorNetwork',
    description: 'Network error',
  },
  errorOffline: {
    id: 'app.skyroom.speedTest.errorOffline',
    description: 'Offline error',
  },
  gaugeLabel: {
    id: 'app.skyroom.speedTest.gaugeLabel',
    description: 'Gauge accessible name',
  },
  phaseFailed: {
    id: 'app.skyroom.speedTest.phaseFailed',
    description: 'Short failed phase label',
  },
  fitWatch: {
    id: 'app.skyroom.speedTest.fitWatch',
    description: 'Watching capability',
  },
  fitPresent: {
    id: 'app.skyroom.speedTest.fitPresent',
    description: 'Presenting capability',
  },
  fitShare: {
    id: 'app.skyroom.speedTest.fitShare',
    description: 'Screenshare capability',
  },
  fitGood: {
    id: 'app.skyroom.speedTest.fitGood',
    description: 'Good fit',
  },
  fitOk: {
    id: 'app.skyroom.speedTest.fitOk',
    description: 'Acceptable fit',
  },
  fitPoor: {
    id: 'app.skyroom.speedTest.fitPoor',
    description: 'Poor fit',
  },
  fitUnknown: {
    id: 'app.skyroom.speedTest.fitUnknown',
    description: 'Unknown fit',
  },
  reportExcellent: {
    id: 'app.skyroom.speedTest.reportExcellent',
    description: 'Excellent meeting fit',
  },
  reportGood: {
    id: 'app.skyroom.speedTest.reportGood',
    description: 'Good meeting fit',
  },
  reportWatchOk: {
    id: 'app.skyroom.speedTest.reportWatchOk',
    description: 'Viewer-only meeting fit',
  },
  reportLimited: {
    id: 'app.skyroom.speedTest.reportLimited',
    description: 'Limited meeting fit',
  },
  reportPoor: {
    id: 'app.skyroom.speedTest.reportPoor',
    description: 'Poor meeting fit',
  },
  reportPartial: {
    id: 'app.skyroom.speedTest.reportPartial',
    description: 'Partial test meeting fit',
  },
});

const PHASE_MESSAGE: Record<SpeedTestPhase, keyof typeof intlMessages> = {
  idle: 'phaseIdle',
  probing: 'phaseProbing',
  ping: 'phasePing',
  download: 'phaseDownload',
  upload: 'phaseUpload',
  done: 'phaseDone',
  error: 'phaseFailed',
};

const ERROR_MESSAGE: Record<SpeedTestErrorCode, keyof typeof intlMessages> = {
  notConfigured: 'errorNotConfigured',
  network: 'errorNetwork',
  offline: 'errorOffline',
};

const FIT_LEVEL_MESSAGE: Record<MeetingFitLevel, keyof typeof intlMessages> = {
  good: 'fitGood',
  ok: 'fitOk',
  poor: 'fitPoor',
  unknown: 'fitUnknown',
};

const REPORT_MESSAGE: Record<
  ReturnType<typeof getMeetingAdvice>['summaryKey'],
  keyof typeof intlMessages
> = {
  reportExcellent: 'reportExcellent',
  reportGood: 'reportGood',
  reportWatchOk: 'reportWatchOk',
  reportLimited: 'reportLimited',
  reportPoor: 'reportPoor',
  reportPartial: 'reportPartial',
};

const SkyroomSpeedTestTab: React.FC = () => {
  const intl = useIntl();
  const application = useSettings(SETTINGS.APPLICATION) as { animations?: boolean };
  const {
    snapshot,
    start,
    cancel,
    running,
  } = useSpeedTest();
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const reduceMotion = application?.animations === false
    || (typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const phaseLabel = intl.formatMessage(intlMessages[PHASE_MESSAGE[snapshot.phase]]);

  let liveMbps = snapshot.downloadMbps ?? snapshot.liveMbps;
  if (snapshot.phase === 'upload') {
    liveMbps = snapshot.liveMbps ?? snapshot.uploadMbps;
  } else if (snapshot.phase === 'download') {
    liveMbps = snapshot.liveMbps ?? snapshot.downloadMbps;
  }

  const primaryLabel = snapshot.phase === 'done' || snapshot.phase === 'error'
    ? intl.formatMessage(intlMessages.retry)
    : intl.formatMessage(intlMessages.start);

  const withUnit = (value: string, unit: string) => (
    <>
      {value}
      <Styled.SpeedMetricUnit>{unit}</Styled.SpeedMetricUnit>
    </>
  );

  const hasPartialResult = snapshot.pingMs != null || snapshot.downloadMbps != null;
  const advice = snapshot.phase === 'done'
    || (snapshot.phase === 'error' && hasPartialResult)
    ? getMeetingAdvice({
      ...snapshot,
      uploadIncomplete: snapshot.uploadIncomplete || snapshot.uploadMbps == null,
    })
    : null;
  const showHardError = snapshot.phase === 'error' && snapshot.errorCode && !advice;

  const fitChip = (labelKey: keyof typeof intlMessages, level: MeetingFitLevel) => (
    <Styled.SpeedFitChip $level={level}>
      {intl.formatMessage(intlMessages[labelKey])}
      {' · '}
      {intl.formatMessage(intlMessages[FIT_LEVEL_MESSAGE[level]])}
    </Styled.SpeedFitChip>
  );

  return (
    <Styled.PanelScroll>
      <Styled.SpeedTestRoot data-test="speedTestPanel">
        <Styled.SpeedTestServer>
          <Styled.SpeedTestServerLabel>
            {intl.formatMessage(intlMessages.server)}
          </Styled.SpeedTestServerLabel>
          <Styled.SpeedTestServerHost title={snapshot.serverHost}>
            {snapshot.serverHost}
          </Styled.SpeedTestServerHost>
        </Styled.SpeedTestServer>

        <SkyroomSpeedTestGauge
          mbps={liveMbps}
          pingMs={snapshot.pingMs}
          phase={snapshot.phase}
          phaseLabel={phaseLabel}
          unitLabel={intl.formatMessage(intlMessages.mbps)}
          pingUnitLabel={intl.formatMessage(intlMessages.ms)}
          gaugeLabel={intl.formatMessage(intlMessages.gaugeLabel)}
          animate={!reduceMotion}
        />

        <Styled.SpeedMetricGrid>
          <Styled.SpeedMetricCard $tone="neutral">
            <Styled.SpeedMetricLabel>
              {intl.formatMessage(intlMessages.ping)}
            </Styled.SpeedMetricLabel>
            <Styled.SpeedMetricValue>
              {withUnit(formatMs(snapshot.pingMs), intl.formatMessage(intlMessages.ms))}
            </Styled.SpeedMetricValue>
          </Styled.SpeedMetricCard>
          <Styled.SpeedMetricCard $tone="neutral">
            <Styled.SpeedMetricLabel>
              {intl.formatMessage(intlMessages.jitter)}
            </Styled.SpeedMetricLabel>
            <Styled.SpeedMetricValue>
              {withUnit(formatMs(snapshot.jitterMs), intl.formatMessage(intlMessages.ms))}
            </Styled.SpeedMetricValue>
          </Styled.SpeedMetricCard>
          <Styled.SpeedMetricCard $tone="download">
            <Styled.SpeedMetricLabel>
              {intl.formatMessage(intlMessages.download)}
            </Styled.SpeedMetricLabel>
            <Styled.SpeedMetricValue>
              {withUnit(formatMbps(snapshot.downloadMbps), intl.formatMessage(intlMessages.mbps))}
            </Styled.SpeedMetricValue>
          </Styled.SpeedMetricCard>
          <Styled.SpeedMetricCard $tone="upload">
            <Styled.SpeedMetricLabel>
              {intl.formatMessage(intlMessages.upload)}
            </Styled.SpeedMetricLabel>
            <Styled.SpeedMetricValue>
              {withUnit(formatMbps(snapshot.uploadMbps), intl.formatMessage(intlMessages.mbps))}
            </Styled.SpeedMetricValue>
          </Styled.SpeedMetricCard>
        </Styled.SpeedMetricGrid>

        {advice ? (
          <>
            <Styled.SpeedFitRow>
              {fitChip('fitWatch', advice.watching)}
              {fitChip('fitPresent', advice.presenting)}
              {fitChip('fitShare', advice.screenshare)}
            </Styled.SpeedFitRow>
            <Styled.SpeedTestVerdict data-level={advice.tone} aria-live="polite">
              {intl.formatMessage(intlMessages[REPORT_MESSAGE[advice.summaryKey]])}
            </Styled.SpeedTestVerdict>
          </>
        ) : null}

        {showHardError && snapshot.errorCode ? (
          <Styled.SpeedTestError role="alert">
            {intl.formatMessage(intlMessages[ERROR_MESSAGE[snapshot.errorCode]])}
          </Styled.SpeedTestError>
        ) : null}

        {snapshot.phase === 'idle' || snapshot.phase === 'error' ? (
          <Styled.SpeedTestWarning>
            {intl.formatMessage(intlMessages.warning)}
          </Styled.SpeedTestWarning>
        ) : null}

        <Styled.SpeedTestActions>
          <Styled.SpeedTestButton
            type="button"
            $secondary={running}
            onClick={running ? cancel : start}
            disabled={!running && !online}
            data-test={running ? 'speedTestCancel' : 'speedTestStart'}
          >
            {running ? intl.formatMessage(intlMessages.cancel) : primaryLabel}
          </Styled.SpeedTestButton>
        </Styled.SpeedTestActions>
      </Styled.SpeedTestRoot>
    </Styled.PanelScroll>
  );
};

export default SkyroomSpeedTestTab;
