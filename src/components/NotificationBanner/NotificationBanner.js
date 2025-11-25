import React, { useState, useEffect } from 'react';
import { bool, string, func, number } from 'prop-types';
import classNames from 'classnames';

import css from './NotificationBanner.module.css';

/**
 * NotificationBanner - A sliding banner that appears from the top
 * @param {Object} props
 * @param {string} props.title - The title to display
 * @param {string} props.message - The message to display (optional)
 * @param {string} props.type - Type of notification: 'success', 'info', 'error'
 * @param {number} props.duration - Duration in milliseconds (default: 5000)
 * @param {Function} props.onClose - Callback when banner closes
 * @returns {JSX.Element|null}
 */
const NotificationBanner = props => {
  const { title, message, type = 'success', duration = 5000, onClose } = props;
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (title || message) {
      // Trigger slide-in animation
      setTimeout(() => setIsVisible(true), 10);

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [title, message, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      if (onClose) {
        onClose();
      }
    }, 300); // Match CSS transition duration
  };

  if (!title && !message) {
    return null;
  }

  const classes = classNames(css.root, {
    [css.visible]: isVisible && !isExiting,
    [css.exiting]: isExiting,
    [css.success]: type === 'success',
    [css.info]: type === 'info',
    [css.error]: type === 'error',
  });

  return (
    <div className={classes}>
      <div className={css.content}>
        <div className={css.textContent}>
          {title && <div className={css.title}>{title}</div>}
          {message && <div className={css.message}>{message}</div>}
        </div>
      </div>
    </div>
  );
};

NotificationBanner.propTypes = {
  title: string,
  message: string,
  type: string,
  duration: number,
  onClose: func,
};

export default NotificationBanner;
