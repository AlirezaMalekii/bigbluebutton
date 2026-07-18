import React, { useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import humanizeSeconds from '/imports/utils/humanizeSeconds';
import Styled from './styles';

const MAX_HOURS = 23;
const MAX_MINUTES = 59;
const MAX_SECONDS = 59;
const MILLI_IN_SECOND = 1000;
const MILLI_IN_MINUTE = 60000;
const MILLI_IN_HOUR = 3600000;

const TRACKS = ['noTrack', 'track1', 'track2', 'track3'] as const;
type TrackType = typeof TRACKS[number];

export interface TimerActivationPayload {
  stopwatch: boolean;
  running: boolean;
  time: number;
  songTrack: TrackType;
}

interface TimerActivationModalProps {
  onSubmit: (payload: TimerActivationPayload) => void;
  onRequestClose: () => void;
}

const intlMessages = defineMessages({
  intro: {
    id: 'app.timer.activationModal.intro',
    description: 'Timer activation modal intro text',
  },
  modeTitle: {
    id: 'app.timer.activationModal.modeTitle',
    description: 'Timer activation mode section title',
  },
  timerMode: {
    id: 'app.timer.timer.title',
    description: 'Timer mode label',
  },
  stopwatchMode: {
    id: 'app.timer.stopwatch.title',
    description: 'Stopwatch mode label',
  },
  durationTitle: {
    id: 'app.timer.activationModal.durationTitle',
    description: 'Timer duration section title',
  },
  behaviorTitle: {
    id: 'app.timer.activationModal.behaviorTitle',
    description: 'Timer behavior section title',
  },
  previewTitle: {
    id: 'app.timer.activationModal.previewTitle',
    description: 'Timer preview section title',
  },
  warningDuration: {
    id: 'app.timer.activationModal.warningDuration',
    description: 'Validation warning for timer duration',
  },
  activate: {
    id: 'app.timer.activationModal.activate',
    description: 'Activate timer button label',
  },
  cancel: {
    id: 'app.timer.activationModal.cancel',
    description: 'Cancel timer activation button label',
  },
  autoStart: {
    id: 'app.timer.activationModal.autoStart',
    description: 'Auto start checkbox label',
  },
  selectTrack: {
    id: 'app.timer.activationModal.selectTrack',
    description: 'Select track label',
  },
  enabledMusicHint: {
    id: 'app.timer.activationModal.musicHint',
    description: 'Music enabled hint',
  },
  hours: {
    id: 'app.timer.hours',
    description: 'Timer hours label',
  },
  minutes: {
    id: 'app.timer.minutes',
    description: 'Timer minutes label',
  },
  seconds: {
    id: 'app.timer.seconds',
    description: 'Timer seconds label',
  },
  noTrack: {
    id: 'app.timer.noTrack',
    description: 'No music track label',
  },
  track1: {
    id: 'app.timer.track1',
    description: 'Track 1 label',
  },
  track2: {
    id: 'app.timer.track2',
    description: 'Track 2 label',
  },
  track3: {
    id: 'app.timer.track3',
    description: 'Track 3 label',
  },
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toMilliseconds = (hours: number, minutes: number, seconds: number) => (
  (hours * MILLI_IN_HOUR) + (minutes * MILLI_IN_MINUTE) + (seconds * MILLI_IN_SECOND)
);

const TimerActivationModal: React.FC<TimerActivationModalProps> = ({
  onSubmit,
  onRequestClose,
}) => {
  const intl = useIntl();
  const timerSettings = window.meetingClientSettings.public.timer;
  const defaultMinutes = Math.max(0, timerSettings.time ?? 5);
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  const [hours, setHours] = useState<number>(Math.floor(defaultMinutes / 60));
  const [minutes, setMinutes] = useState<number>(defaultMinutes % 60);
  const [seconds, setSeconds] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [songTrack, setSongTrack] = useState<TrackType>('noTrack');

  const timerDuration = useMemo(() => {
    if (mode === 'stopwatch') return 0;
    return toMilliseconds(hours, minutes, seconds);
  }, [mode, hours, minutes, seconds]);

  const canActivate = mode === 'stopwatch' || timerDuration > 0;
  const previewValue = mode === 'stopwatch'
    ? '00:00'
    : humanizeSeconds(Math.floor(timerDuration / 1000));

  const handleActivate = () => {
    if (!canActivate) return;
    onSubmit({
      stopwatch: mode === 'stopwatch',
      running,
      time: mode === 'stopwatch' ? 0 : timerDuration,
      songTrack,
    });
  };

  return (
    <Styled.TimerActivationWrapper>
      <Styled.ScrollBody>
        <Styled.Intro>
          {intl.formatMessage(intlMessages.intro)}
        </Styled.Intro>

        <Styled.Panel>
          <Styled.SectionTitle>{intl.formatMessage(intlMessages.modeTitle)}</Styled.SectionTitle>
          <Styled.ModeGrid>
            <Styled.ModeButton
              type="button"
              selected={mode === 'timer'}
              onClick={() => setMode('timer')}
            >
              {intl.formatMessage(intlMessages.timerMode)}
            </Styled.ModeButton>
            <Styled.ModeButton
              type="button"
              selected={mode === 'stopwatch'}
              onClick={() => setMode('stopwatch')}
            >
              {intl.formatMessage(intlMessages.stopwatchMode)}
            </Styled.ModeButton>
          </Styled.ModeGrid>
        </Styled.Panel>

        {mode === 'timer' && (
          <Styled.Panel>
            <Styled.SectionTitle>{intl.formatMessage(intlMessages.durationTitle)}</Styled.SectionTitle>
            <Styled.TimeInputs>
              <Styled.TimeField>
                <Styled.TimeLabel htmlFor="timer-modal-hours">
                  {intl.formatMessage(intlMessages.hours)}
                </Styled.TimeLabel>
                <Styled.TimeInput
                  id="timer-modal-hours"
                  type="number"
                  min={0}
                  max={MAX_HOURS}
                  value={hours}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value || '0', 10);
                    setHours(clamp(Number.isNaN(parsed) ? 0 : parsed, 0, MAX_HOURS));
                  }}
                />
              </Styled.TimeField>
              <Styled.TimeField>
                <Styled.TimeLabel htmlFor="timer-modal-minutes">
                  {intl.formatMessage(intlMessages.minutes)}
                </Styled.TimeLabel>
                <Styled.TimeInput
                  id="timer-modal-minutes"
                  type="number"
                  min={0}
                  max={MAX_MINUTES}
                  value={minutes}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value || '0', 10);
                    setMinutes(clamp(Number.isNaN(parsed) ? 0 : parsed, 0, MAX_MINUTES));
                  }}
                />
              </Styled.TimeField>
              <Styled.TimeField>
                <Styled.TimeLabel htmlFor="timer-modal-seconds">
                  {intl.formatMessage(intlMessages.seconds)}
                </Styled.TimeLabel>
                <Styled.TimeInput
                  id="timer-modal-seconds"
                  type="number"
                  min={0}
                  max={MAX_SECONDS}
                  value={seconds}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value || '0', 10);
                    setSeconds(clamp(Number.isNaN(parsed) ? 0 : parsed, 0, MAX_SECONDS));
                  }}
                />
              </Styled.TimeField>
            </Styled.TimeInputs>
          </Styled.Panel>
        )}

        <Styled.Panel>
          <Styled.SectionTitle>{intl.formatMessage(intlMessages.behaviorTitle)}</Styled.SectionTitle>
          <Styled.SettingsGrid>
            <Styled.CheckboxRow htmlFor="timer-modal-auto-start">
              <input
                id="timer-modal-auto-start"
                type="checkbox"
                checked={running}
                onChange={(e) => setRunning(e.target.checked)}
              />
              {intl.formatMessage(intlMessages.autoStart)}
            </Styled.CheckboxRow>
            {timerSettings.music?.enabled && (
              <div>
                <Styled.TimeLabel htmlFor="timer-modal-track">
                  {intl.formatMessage(intlMessages.selectTrack)}
                </Styled.TimeLabel>
                <Styled.SelectField
                  id="timer-modal-track"
                  value={songTrack}
                  onChange={(e) => setSongTrack(e.target.value as TrackType)}
                >
                  {TRACKS.map((track) => (
                    <option value={track} key={track}>
                      {intl.formatMessage(intlMessages[track])}
                    </option>
                  ))}
                </Styled.SelectField>
                <Styled.ValidationText>
                  <Styled.SuccessText>{intl.formatMessage(intlMessages.enabledMusicHint)}</Styled.SuccessText>
                </Styled.ValidationText>
              </div>
            )}
          </Styled.SettingsGrid>
        </Styled.Panel>

        <Styled.Preview>
          <Styled.PreviewTitle>{intl.formatMessage(intlMessages.previewTitle)}</Styled.PreviewTitle>
          <Styled.PreviewValue>{previewValue}</Styled.PreviewValue>
          {!canActivate && (
            <Styled.ValidationText>{intl.formatMessage(intlMessages.warningDuration)}</Styled.ValidationText>
          )}
        </Styled.Preview>
      </Styled.ScrollBody>

      <Styled.Actions>
        <Styled.ActionButton
          label={intl.formatMessage(intlMessages.cancel)}
          onClick={onRequestClose}
          color="secondary"
        />
        <Styled.ActionButton
          label={intl.formatMessage(intlMessages.activate)}
          onClick={handleActivate}
          color="primary"
          disabled={!canActivate}
        />
      </Styled.Actions>
    </Styled.TimerActivationWrapper>
  );
};

export default TimerActivationModal;
