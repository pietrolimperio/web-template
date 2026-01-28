import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './IconWithBadge.module.css';

/**
 * Icon component with optional notification badge.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.iconClassName Font Awesome icon classes (e.g., "fa-regular fa-message")
 * @param {number?} props.notificationCount Number of notifications. Badge is shown when count > 0
 * @param {string?} props.className Additional CSS classes for the wrapper
 * @param {string?} props.rootClassName Override wrapper CSS classes
 * @param {string?} props.iconRootClassName Additional CSS classes for the icon
 * @returns {JSX.Element} Icon with optional notification badge
 */
const IconWithBadge = props => {
  const { iconClassName, notificationCount = 0, className, rootClassName, iconRootClassName } = props;
  
  const wrapperClasses = classNames(rootClassName || css.root, className);
  const iconClasses = classNames(css.icon, iconRootClassName);
  
  const showBadge = notificationCount > 0;
  const badge = showBadge ? <div className={css.badge} /> : null;

  return (
    <span className={wrapperClasses}>
      <i className={`${iconClassName} ${iconClasses}`} />
      {badge}
    </span>
  );
};

const { string, number } = PropTypes;

IconWithBadge.propTypes = {
  iconClassName: string.isRequired,
  notificationCount: number,
  className: string,
  rootClassName: string,
  iconRootClassName: string,
};

export default IconWithBadge;
