import React from 'react';
import './logo.scss';

const LOGO_SRC = `${process.env.PUBLIC_URL}/safemeet-logo.svg`;

const PlatformLogo = () => (
  <a
    className="platform-logo"
    href="https://safemeet.ir"
    rel="noopener noreferrer"
    target="_blank"
    aria-label="سیف میت"
  >
    <img alt="سیف میت" className="platform-logo-image" src={LOGO_SRC} />
  </a>
);

export default PlatformLogo;
