import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './IconBell.module.css';

const IconBell = ({ className = null, rootClassName = null }) => {
  const classes = classNames(rootClassName || css.root, className);

  return (
    <svg
      className={classes}
      width="20"
      height="22"
      viewBox="0 0 20 22"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Notification bell"
    >
      <path
        d="M10 22C11.1 22 12 21.1 12 20H8C8 21.1 8.9 22 10 22ZM18 16V10C18 6.93 16.37 4.36 13.5 3.68V3C13.5 2.17 12.83 1.5 12 1.5H8C7.17 1.5 6.5 2.17 6.5 3V3.68C3.64 4.36 2 6.92 2 10V16L0 18V19H20V18L18 16ZM16 17H4V10C4 7.52 5.51 5.5 8 5.5H12C14.49 5.5 16 7.52 16 10V17Z"
        fill="currentColor"
      />
    </svg>
  );
};

const { string } = PropTypes;

IconBell.propTypes = {
  className: string,
  rootClassName: string,
};

export default IconBell;
