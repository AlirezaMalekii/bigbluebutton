import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import {
  HUNDRED_PERCENT,
  STEP,
} from '/imports/utils/slideCalcUtils';
import Styled from './styles';
import HoldButton from './holdButton/component';

const DELAY_MILLISECONDS = 200;
const STEP_TIME = 100;

const intlMessages = defineMessages({
  resetZoomLabel: {
    id: 'app.presentation.presentationToolbar.zoomReset',
    description: 'Reset zoom button label',
  },
  zoomInLabel: {
    id: 'app.presentation.presentationToolbar.zoomInLabel',
    description: 'Aria label for increment zoom level',
  },
  zoomInDesc: {
    id: 'app.presentation.presentationToolbar.zoomInDesc',
    description: 'Aria description for increment zoom level',
  },
  zoomOutLabel: {
    id: 'app.presentation.presentationToolbar.zoomOutLabel',
    description: 'Aria label for decrement zoom level',
  },
  zoomOutDesc: {
    id: 'app.presentation.presentationToolbar.zoomOutDesc',
    description: 'Aria description for decrement zoom level',
  },
  zoomIndicator: {
    id: 'app.presentation.presentationToolbar.zoomIndicator',
    description: 'Current zoom percentage selector label',
  },
  currentValue: {
    id: 'app.submenu.application.currentSize',
    description: 'current presentation zoom percentage aria description',
  },
});

const buildZoomOptions = (minBound, maxBound, step, currentValue) => {
  const safeMin = Number.isFinite(minBound) ? minBound : HUNDRED_PERCENT;
  const safeMax = Number.isFinite(maxBound) ? maxBound : HUNDRED_PERCENT;
  const safeStep = Number.isFinite(step) && step > 0 ? step : STEP;
  const opts = [];
  for (let z = safeMin; z <= safeMax; z += safeStep) {
    opts.push(z);
  }
  if (Number.isFinite(currentValue) && !opts.includes(currentValue)) {
    opts.push(currentValue);
    opts.sort((a, b) => a - b);
  }
  return opts;
};

class ZoomTool extends PureComponent {
  constructor(props) {
    super(props);
    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
    this.mouseDownHandler = this.mouseDownHandler.bind(this);
    this.mouseUpHandler = this.mouseUpHandler.bind(this);
    this.execInterval = this.execInterval.bind(this);
    this.onChanger = this.onChanger.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.setInt = 0;
    this.state = {
      stateZoomValue: props.zoomValue,
      mouseHolding: false,
    };
  }

  componentDidUpdate() {
    const { zoomValue } = this.props;
    const { stateZoomValue } = this.state;
    const isDifferent = zoomValue !== stateZoomValue;
    if (isDifferent) {
      this.onChanger(zoomValue);
    }
  }

  handleSelectChange(event) {
    const next = Number(event.target.value);
    if (Number.isFinite(next)) this.onChanger(next);
  }

  onChanger(value) {
    const {
      maxBound,
      minBound,
      change,
      zoomValue,
    } = this.props;
    const { stateZoomValue } = this.state;
    let newValue = value;
    const isDifferent = newValue !== stateZoomValue;

    if (newValue <= minBound) {
      newValue = minBound;
    } else if (newValue >= maxBound) {
      newValue = maxBound;
    }

    const propsIsDifferente = zoomValue !== newValue;
    if (isDifferent && propsIsDifferente) {
      this.setState({ stateZoomValue: newValue }, () => {
        change(newValue);
      });
    }
    if (isDifferent && !propsIsDifferente) this.setState({ stateZoomValue: newValue });
  }

  increment() {
    const {
      step,
    } = this.props;
    const { stateZoomValue } = this.state;
    const increaseZoom = stateZoomValue + step;
    this.onChanger(increaseZoom);
  }

  decrement() {
    const {
      step,
    } = this.props;
    const { stateZoomValue } = this.state;
    const decreaseZoom = stateZoomValue - step;
    this.onChanger(decreaseZoom);
  }

  execInterval(inc) {
    const { mouseHolding } = this.state;
    const exec = inc ? this.increment : this.decrement;

    const interval = () => {
      clearInterval(this.setInt);
      this.setInt = setInterval(exec, STEP_TIME);
    };

    setTimeout(() => {
      if (mouseHolding) {
        interval();
      }
    }, DELAY_MILLISECONDS);
  }

  mouseDownHandler(bool) {
    this.setState({
      mouseHolding: true,
    }, () => {
      this.execInterval(bool);
    });
  }

  mouseUpHandler() {
    this.setState({
      mouseHolding: false,
    }, () => clearInterval(this.setInt));
  }

  resetZoom() {
    const { stateZoomValue } = this.state;
    if (stateZoomValue !== HUNDRED_PERCENT) this.onChanger(HUNDRED_PERCENT);
  }

  render() {
    const {
      zoomValue,
      minBound,
      maxBound,
      intl,
      isConnected,
      step,
    } = this.props;
    const { stateZoomValue } = this.state;

    let zoomOutAriaLabel = intl.formatMessage(intlMessages.zoomOutLabel);

    if (zoomValue > minBound) {
      zoomOutAriaLabel += ` ${intl.formatNumber(((zoomValue - step) / 100), { style: 'percent' })}`;
    }

    let zoomInAriaLabel = intl.formatMessage(intlMessages.zoomInLabel);
    if (zoomValue < maxBound) {
      zoomInAriaLabel += ` ${intl.formatNumber(((zoomValue + step) / 100), { style: 'percent' })}`;
    }

    const stateZoomPct = intl.formatNumber((stateZoomValue / 100), { style: 'percent' });
    const zoomOptions = buildZoomOptions(minBound, maxBound, step, stateZoomValue);
    const showReset = stateZoomValue !== HUNDRED_PERCENT;

    return (
      [
        (
          <HoldButton
            key="zoom-tool-1"
            exec={this.decrement}
            value={zoomValue}
            minBound={minBound}
          >
            <Styled.DecreaseZoomButton
              color="light"
              circle
              size="md"
              key="zoom-tool-1"
              aria-describedby="zoomOutDescription"
              aria-label={zoomOutAriaLabel}
              label={intl.formatMessage(intlMessages.zoomOutLabel)}
              data-test="zoomOutBtn"
              icon="substract"
              onClick={() => { }}
              disabled={(zoomValue <= minBound) || !isConnected}
              hideLabel
            />
            <div id="zoomOutDescription" hidden>{intl.formatMessage(intlMessages.zoomOutDesc)}</div>
          </HoldButton>
        ),
        (
          <Styled.ZoomPercentSelect
            key="zoom-tool-2"
            id="zoomSelect"
            data-test="zoomSelect"
            aria-label={intl.formatMessage(intlMessages.zoomIndicator)}
            aria-describedby="zoomSelectDescription"
            disabled={!isConnected}
            value={stateZoomValue}
            onChange={this.handleSelectChange}
          >
            {zoomOptions.map((z) => (
              <option key={z} value={z}>
                {intl.formatNumber((z / 100), { style: 'percent' })}
              </option>
            ))}
          </Styled.ZoomPercentSelect>
        ),
        (
          <div id="zoomSelectDescription" key="zoom-tool-2-desc" hidden>
            {intl.formatMessage(intlMessages.currentValue, ({ size: stateZoomPct }))}
          </div>
        ),
        showReset ? (
          <Styled.ResetZoomButton
            key="zoom-tool-reset"
            aria-label={intl.formatMessage(intlMessages.resetZoomLabel)}
            aria-describedby="resetZoomDescription"
            disabled={!isConnected}
            color="light"
            size="md"
            circle
            onClick={() => this.resetZoom()}
            label={intl.formatMessage(intlMessages.resetZoomLabel)}
            data-test="resetZoomButton"
            icon="refresh"
            hideLabel
          />
        ) : null,
        showReset ? (
          <div id="resetZoomDescription" key="zoom-tool-reset-desc" hidden>
            {intl.formatMessage(intlMessages.resetZoomLabel)}
          </div>
        ) : null,
        (
          <HoldButton
            key="zoom-tool-3"
            exec={this.increment}
            value={zoomValue}
            maxBound={maxBound}
          >
            <Styled.IncreaseZoomButton
              color="light"
              circle
              size="md"
              key="zoom-tool-3"
              aria-describedby="zoomInDescription"
              aria-label={zoomInAriaLabel}
              label={intl.formatMessage(intlMessages.zoomInLabel)}
              data-test="zoomInBtn"
              icon="add"
              onClick={() => { }}
              disabled={(zoomValue >= maxBound) || !isConnected}
              hideLabel
            />
            <div id="zoomInDescription" hidden>{intl.formatMessage(intlMessages.zoomInDesc)}</div>
          </HoldButton>
        ),
      ]
    );
  }
}

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
    formatNumber: PropTypes.func.isRequired,
  }).isRequired,
  zoomValue: PropTypes.number.isRequired,
  change: PropTypes.func.isRequired,
  minBound: PropTypes.number.isRequired,
  maxBound: PropTypes.number.isRequired,
  step: PropTypes.number.isRequired,
  isConnected: PropTypes.bool.isRequired,
};

ZoomTool.propTypes = propTypes;

export default injectIntl(ZoomTool);
