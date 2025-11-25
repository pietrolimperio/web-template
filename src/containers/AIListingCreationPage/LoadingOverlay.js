import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import loadingGif from '../../assets/loading.gif';
import css from './LoadingOverlay.module.css';

/**
 * LoadingOverlay Component
 * 
 * Full-screen overlay with loading.gif animation
 * Features:
 * - Dark semi-transparent background
 * - Circular cropped loading.gif
 * - Customizable title and message
 */
const LoadingOverlay = ({ title, message, titleId, messageId }) => {
  return (
    <div className={css.overlay}>
      <div className={css.content}>
        <div className={css.loaderContainer}>
          <img src={loadingGif} alt="Loading..." className={css.loadingGif} />
        </div>
        {(title || titleId) && (
          <h2 className={css.title}>
            {titleId ? <FormattedMessage id={titleId} /> : title}
          </h2>
        )}
        {(message || messageId) && (
          <p className={css.message}>
            {messageId ? <FormattedMessage id={messageId} /> : message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
