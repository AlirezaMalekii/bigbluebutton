import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import injectWbResizeEvent from '/imports/ui/components/presentation/resize-wrapper/component';
import Styled from './styles';
import CustomLogo from './custom-logo/component';
import UserContentContainer from './user-list-content/container';
import { SkyroomUserSearchProvider } from '../skyroom-layout/user-search/context';
import { isSkyroomColumnLayout } from '../skyroom-layout/panel-toggles';

const propTypes = {
  compact: PropTypes.bool,
  CustomLogoUrl: PropTypes.string,
  CustomDarkLogoUrl: PropTypes.string,
  DarkModeIsEnabled: PropTypes.bool,
  showBranding: PropTypes.bool.isRequired,
};

const defaultProps = {
  compact: false,
  CustomLogoUrl: null,
  CustomDarkLogoUrl: null,
};

class UserList extends PureComponent {
  render() {
    const {
      compact,
      CustomLogoUrl,
      CustomDarkLogoUrl,
      DarkModeIsEnabled,
      showBranding,
    } = this.props;
    const logoUrl = DarkModeIsEnabled ? CustomDarkLogoUrl : CustomLogoUrl;
    const showCustomLogo = showBranding
      && !compact
      && logoUrl
      && !isSkyroomColumnLayout();

    return (
      <Styled.UserList data-test="userListContainer">
        {
          showCustomLogo
            ? <CustomLogo CustomLogoUrl={logoUrl} /> : null
        }
        <SkyroomUserSearchProvider>
          <UserContentContainer compact={compact} />
        </SkyroomUserSearchProvider>
      </Styled.UserList>
    );
  }
}

UserList.propTypes = propTypes;
UserList.defaultProps = defaultProps;

export default injectWbResizeEvent(UserList);
