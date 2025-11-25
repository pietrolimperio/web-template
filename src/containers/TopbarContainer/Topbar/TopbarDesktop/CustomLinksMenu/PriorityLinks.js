import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../../util/reactIntl';

import { ExternalLink, IconHelp, NamedLink } from '../../../../../components';

import css from './PriorityLinks.module.css';

/**
 * Create component that shows only a single "Post a new listing" link.
 *
 * @param {*} props contains customLinksMenuClass
 * @returns div with only one link inside.
 */
export const CreateListingMenuLink = props => {
  return (
    <div className={props.customLinksMenuClass}>
      <NamedLink name="NewListingPage" className={classNames(css.priorityLink, css.highlight)}>
        <span className={css.priorityLinkLabel}>
          <FormattedMessage id="TopbarDesktop.createListing" />
        </span>
      </NamedLink>
    </div>
  );
};

/**
 * Link component that can be used on TopbarDesktop.
 *
 * @param {*} props containing linkConfig including resolved 'route' params for NamedLink and isAuthenticated flag.
 * @returns NamedLink or ExternalLink component based on config.
 */
const PriorityLink = ({ linkConfig, isAuthenticated }) => {
  const { text, type, href, route, highlight } = linkConfig;
  
  // Check if this is an "About" link and user is authenticated
  const isAboutLink = text && (text.toLowerCase().includes('about') || text.toLowerCase().includes('informazioni'));
  const showAsIcon = isAboutLink && isAuthenticated;
  
  const classes = classNames(css.priorityLink, { 
    [css.highlight]: highlight,
    [css.iconOnly]: showAsIcon
  });

  // Note: if the config contains 'route' keyword,
  // then in-app linking config has been resolved already.
  if (type === 'internal' && route) {
    // Internal link
    const { name, params, to } = route || {};
    return (
      <NamedLink name={name} params={params} to={to} className={classes}>
        {showAsIcon ? (
          <span className={css.priorityIconWrapper}>
            <IconHelp className={css.helpIcon} />
          </span>
        ) : (
          <span className={css.priorityLinkLabel}>{text}</span>
        )}
      </NamedLink>
    );
  }
  return (
    <ExternalLink href={href} className={classes}>
      {showAsIcon ? (
        <span className={css.priorityIconWrapper}>
          <IconHelp className={css.helpIcon} />
        </span>
      ) : (
        <span className={css.priorityLinkLabel}>{text}</span>
      )}
    </ExternalLink>
  );
};

/**
 * Create priority links, which are visible on the desktop layout on the Topbar.
 * If space is limited, this doesn't include anything to the Topbar.
 *
 * @param {*} props contains links array, setLinks function, and isAuthenticated flag
 * @returns container div with priority links included.
 */
const PriorityLinks = props => {
  const containerRef = useRef(null);

  // With this useEffect, we measure the widths of each rendered priority link
  // This is done once before the real rendering and it's done outside the viewport.
  useEffect(() => {
    const isMeasured = props.links?.[0]?.width;
    if (containerRef.current && !isMeasured) {
      const linksFromRenderedWrapper = [...containerRef.current.childNodes];
      let cumulatedWidth = 0;
      // Generate an array of link configs with width & cumulatedWidth included
      const linksWithWidths = props.links.reduce((links, l, i) => {
        const width = linksFromRenderedWrapper[i].offsetWidth;
        cumulatedWidth = cumulatedWidth + width;
        return [...links, { ...l, width, cumulatedWidth }];
      }, []);
      props.setLinks(linksWithWidths);
    }
  }, [containerRef]);

  const { links, priorityLinks, isAuthenticated } = props;
  const isServer = typeof window === 'undefined';
  const isMeasured = links?.[0]?.width && (priorityLinks.length === 0 || priorityLinks?.[0]?.width);
  const styleWrapper = !!isMeasured
    ? {}
    : {
        style: {
          position: 'absolute',
          top: '-2000px',
          left: '-2000px',
          width: '100%',
          height: 'var(--topbarHeightDesktop)',
          display: 'flex',
          flexDirection: 'row',
        },
      };
  const linkConfigs = isMeasured ? priorityLinks : links;

  return isMeasured || isServer ? (
    <div className={css.priorityLinkWrapper} {...styleWrapper} ref={containerRef}>
      {linkConfigs.map((linkConfig, index) => {
        return <PriorityLink key={`${linkConfig.text}_${index}`} linkConfig={linkConfig} isAuthenticated={isAuthenticated} />;
      })}
    </div>
  ) : (
    ReactDOM.createPortal(
      <div className={css.priorityLinkWrapper} {...styleWrapper} ref={containerRef}>
        {linkConfigs.map((linkConfig, index) => {
          return <PriorityLink key={`${linkConfig.text}_${index}`} linkConfig={linkConfig} isAuthenticated={isAuthenticated} />;
        })}
      </div>,
      document.body
    )
  );
};

export default PriorityLinks;
