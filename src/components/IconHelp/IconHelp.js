import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './IconHelp.module.css';

const IconHelp = ({ className = null, rootClassName = null }) => {
  const classes = classNames(rootClassName || css.root, className);

  return (
    <svg
      className={classes}
      width="22"
      height="22"
      viewBox="0 0 22 22"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Help"
    >
      <path
        d="M11 0C4.92 0 0 4.92 0 11C0 17.08 4.92 22 11 22C17.08 22 22 17.08 22 11C22 4.92 17.08 0 11 0ZM11 20C6.04 20 2 15.96 2 11C2 6.04 6.04 2 11 2C15.96 2 20 6.04 20 11C20 15.96 15.96 20 11 20ZM11 5C9.34 5 8 6.34 8 8H10C10 7.45 10.45 7 11 7C11.55 7 12 7.45 12 8C12 9 10 8.75 10 11H12C12 9.75 14 9.5 14 8C14 6.34 12.66 5 11 5ZM10 13V15H12V13H10Z"
        fill="currentColor"
      />
    </svg>
  );
};

const { string } = PropTypes;

IconHelp.propTypes = {
  className: string,
  rootClassName: string,
};

export default IconHelp;
