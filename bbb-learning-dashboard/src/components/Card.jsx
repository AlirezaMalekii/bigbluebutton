import React from 'react';

function Card(props) {
  const {
    number, name, children, iconClass, cardClass,
  } = props;

  let icons;

  try {
    React.Children.only(children);
    icons = (
      <div className={`ld-stat-icon ${iconClass || ''}`}>
        { children }
      </div>
    );
  } catch (e) {
    icons = (
      <div className="flex">
        {
          React.Children.map(children, (child, index) => {
            let offsetClass = 'translate-x-2';
            if (index === 0) offsetClass = 'translate-x-4';
            if (index === (React.Children.count(children) - 1)) offsetClass = 'translate-x-0';

            return (
              <div className={`ld-stat-icon transform ${offsetClass} ${iconClass || ''}`} style={{ zIndex: index * 10 }}>
                { child }
              </div>
            );
          })
        }
      </div>
    );
  }

  return (
    <div
      className={
        'ld-stat-card'
        + ` ${cardClass}`
      }
    >
      <div className="w-70 text-left rtl:text-right">
        <p className="ld-stat-number">
          { number }
        </p>
        <p className="ld-stat-label">
          { name }
        </p>
      </div>
      {icons}
    </div>
  );
}

export default Card;
