import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './skyroom-theme.css';
import { IntlProvider } from 'react-intl';
import App from './App';
import { UserDetailsProvider } from './components/UserDetails/context';

const RTL_LANGUAGES = ['ar', 'dv', 'fa', 'he'];

function isValidLocale(locale) {
  try {
    const intl = new Intl.Locale(locale);
    return !!intl;
  } catch (error) {
    return false;
  }
}

function normalizeLocale(lang) {
  const lParts = lang.split('-');

  // 'pt' returns 'pt'
  // 'pt-br' and 'pt-BR' return 'pt_BR'
  // 'pt_BR' returns 'pt_BR'
  return lParts.length > 1 ? `${lParts[0]}_${lParts[1].toUpperCase()}` : lang;
}

function getLanguage() {
  let { language } = navigator;

  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  if (typeof params.lang !== 'undefined') {
    language = params.lang;
  }

  return language;
}

class Dashboard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      intlMessages: {},
      intlLocale: getLanguage(),
    };

    this.setMessages();
    this.setRtl();
  }

  setMessages() {
    const fetchMessages = (lang) => new Promise((resolve, reject) => {
      const url = `/html5client/locales/${normalizeLocale(lang)}.json`;
      fetch(url).then((response) => {
        if (!response.ok) return reject();
        return resolve(response.json());
      });
    });

    Promise.all([fetchMessages('en'), fetchMessages(getLanguage())])
      .then((values) => {
        let mergedMessages = {};

        if (values[0]) {
          mergedMessages = Object.assign(mergedMessages, values[0]);
        }

        if (values[1]) {
          mergedMessages = Object.assign(mergedMessages, values[1]);
        }

        this.setState({ intlMessages: mergedMessages });
      }).catch(() => {});
  }

  setRtl() {
    const { intlLocale } = this.state;
    const lang = intlLocale.substring(0, 2);

    if (RTL_LANGUAGES.includes(lang)) {
      document.body.parentNode.setAttribute('dir', 'rtl');
    } else {
      document.body.parentNode.setAttribute('dir', 'ltr');
    }

    // Persian/Arabic-script locales get IRANYekan typography (see
    // src/skyroom-theme.css `body.lang-fa`), mirroring the main app.
    document.body.parentNode.setAttribute('lang', intlLocale);
    if (lang === 'fa' || lang === 'ar') {
      document.body.classList.add('lang-fa');
    } else {
      document.body.classList.remove('lang-fa');
    }
  }

  render() {
    const { intlLocale, intlMessages } = this.state;

    const locale = isValidLocale(intlLocale) ? intlLocale : undefined;

    return (
      <UserDetailsProvider>
        <IntlProvider defaultLocale="en" locale={locale} messages={intlMessages}>
          <App />
        </IntlProvider>
      </UserDetailsProvider>
    );
  }
}

const rootElement = document.getElementById('root');
ReactDOM.render(<Dashboard />, rootElement);
