import { createRef, PureComponent } from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  keyValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
  ]),
};

const defaultProps = {
  disabled: false,
  keyValue: undefined,
};

export default class Base extends PureComponent {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.element = createRef();
  }

  componentDidMount() {
    const element = this.element.current;
    if (element) element.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    const element = this.element.current;
    if (element) element.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event) {
    const { key } = event;
    const node = this.element.current;
    if (key === 'Enter' && node) {
      const input = node.getElementsByTagName('input')[0];
      input?.click();
    }
  }

  handleChange() {
    const { disabled, keyValue, onChange } = this.props;
    if (disabled) return;
    // Always read onChange from props — caching it in the constructor leaves a
    // stale closure (e.g. poll vs quiz multiple-response toggles after tab switch).
    onChange(keyValue);
  }

  render() {
    return null;
  }
}

Base.propTypes = propTypes;
Base.defaultProps = defaultProps;
