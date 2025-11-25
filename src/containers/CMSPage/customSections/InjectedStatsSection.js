import React from 'react';
import css from './InjectedStatsSection.module.css';

/**
 * Example of a custom section designed to be injected BETWEEN Console sections
 * This will be inserted programmatically via CMSPage.js injection config
 */
const InjectedStatsSection = props => {
  const { sectionId, className } = props;

  return (
    <section id={sectionId} className={className}>
      <div className={css.container}>
        <div className={css.badge}>🚀 Injected Custom Section</div>
        
        <h2 className={css.title}>Live Statistics</h2>
        
        <div className={css.stats}>
          <div className={css.statCard}>
            <div className={css.statNumber}>15,432</div>
            <div className={css.statLabel}>Active Users</div>
          </div>
          
          <div className={css.statCard}>
            <div className={css.statNumber}>98.5%</div>
            <div className={css.statLabel}>Satisfaction Rate</div>
          </div>
          
          <div className={css.statCard}>
            <div className={css.statNumber}>24/7</div>
            <div className={css.statLabel}>Support Available</div>
          </div>
        </div>
        
        <p className={css.note}>
          ℹ️ This section was injected between Console sections using Approach 3!
        </p>
      </div>
    </section>
  );
};

export default InjectedStatsSection;
