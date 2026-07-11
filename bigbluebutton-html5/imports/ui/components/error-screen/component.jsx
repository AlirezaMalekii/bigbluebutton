import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import resolveErrorScreen from './errorReason';

const propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    cause: PropTypes.string,
  }),
  endedReason: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  callback: PropTypes.func,
  children: PropTypes.node,
};

const defaultProps = {
  callback: () => {},
  endedReason: null,
  error: {},
};

class ErrorScreen extends PureComponent {
  componentDidMount() {
    const { callback, endedReason } = this.props;
    callback(endedReason, () => {});
  }

  render() {
    const {
      children,
      error,
      endedReason,
    } = this.props;

    const {
      title,
      reason,
      hint,
      reloadLabel,
      technicalDetailLabel,
      technicalDetail,
      isRtl,
    } = resolveErrorScreen({ error, endedReason });

    return (
      <div data-skyroom-error-screen="true" data-test="errorScreen">
        <div data-skyroom-error-card="true">
          <div
            data-skyroom-error-content="true"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div data-skyroom-error-icon="true" aria-hidden="true">
              <Icon iconName="alert" />
            </div>

            <h1 data-skyroom-error-title="true" data-test="errorScreenMessage">
              {title}
            </h1>

            <p data-skyroom-error-reason="true">
              {reason}
            </p>

            {technicalDetail ? (
              <div data-skyroom-error-detail="true">
                <span data-skyroom-error-detail-label="true">
                  {technicalDetailLabel}
                </span>
                <p data-skyroom-error-detail-text="true">
                  {technicalDetail}
                </p>
              </div>
            ) : null}

            <p data-skyroom-error-hint="true">
              {hint}
            </p>

            <div data-skyroom-error-actions="true">
              <button
                type="button"
                data-skyroom-error-btn="true"
                data-test="errorScreenReload"
                onClick={() => window.location.reload()}
              >
                {reloadLabel}
              </button>
            </div>

            {children ? (
              <div>
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

ErrorScreen.propTypes = propTypes;
ErrorScreen.defaultProps = defaultProps;

export default ErrorScreen;

export { ErrorScreen };
