import React, { Component } from 'react';

import * as log from '../../util/log';

import css from './PageErrorBoundary.module.css';

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    log.error(error, 'page-render-error', { componentStack: info.componentStack });
  }

  handleReload() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={css.root}>
          <div className={css.content}>
            <p className={css.message}>Something went wrong loading this page.</p>
            <button className={css.reloadButton} onClick={this.handleReload} type="button">
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
