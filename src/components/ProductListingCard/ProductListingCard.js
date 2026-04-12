import React from 'react';
import classNames from 'classnames';

import css from './ProductListingCard.module.css';

/**
 * Shared product/listing card layout: image (flush top), body with optional category,
 * title, owner, and a bottom-aligned price block (rental line, optional compare below).
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {React.ElementType} [props.as] — root element (e.g. NamedLink) or 'div'
 * @param {Object} [props.asProps] — spread onto root (e.g. name, params for NamedLink)
 * @param {React.ReactNode} props.image — image area (AspectRatioWrapper, img, etc.)
 * @param {boolean} [props.portraitImage] — if true, image wrapper uses 3:4 aspect ratio
 * @param {string} [props.imageWrapperClassName]
 * @param {React.ReactNode} [props.category]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.owner]
 * @param {React.ReactNode} [props.pricePrimary]
 * @param {React.ReactNode} [props.priceCompare]
 * @param {React.ReactNode} [props.favoriteButton]
 */
const ProductListingCard = props => {
  const {
    className,
    rootClassName,
    as: Root = 'div',
    asProps = {},
    image,
    portraitImage = false,
    imageWrapperClassName,
    category,
    title,
    owner,
    pricePrimary,
    priceCompare,
    favoriteButton,
  } = props;

  const showPriceRow = pricePrimary != null || priceCompare != null;

  return (
    <Root
      className={classNames(css.root, rootClassName, className)}
      {...asProps}
    >
      <div
        className={classNames(
          css.imageWrapper,
          portraitImage && css.imageWrapperPortrait,
          imageWrapperClassName
        )}
      >
        {image}
        {favoriteButton}
      </div>
      <div className={css.body}>
        {category ? <p className={css.category}>{category}</p> : null}
        {title ? <div className={css.title}>{title}</div> : null}
        {owner ? <p className={css.owner}>{owner}</p> : null}
        {showPriceRow ? (
          <div className={css.priceRow}>
            <div className={css.pricePrimaryWrap}>
              <div className={css.pricePrimary}>{pricePrimary}</div>
              {priceCompare ? <div className={css.priceCompare}>{priceCompare}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </Root>
  );
};

export default ProductListingCard;
