import React, { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ResponsiveImage, Modal } from '../../components';

import ImageCarousel from './ImageCarousel/ImageCarousel';

import css from './ListingPage.module.css';

const SectionHero = props => {
  const intl = useIntl();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    title,
    listing,
    isOwnListing,
    handleViewPhotosClick,
    imageCarouselOpen,
    onImageCarouselClose,
    onManageDisableScrolling,
    actionBar,
  } = props;

  const hasImages = listing.images && listing.images.length > 0;
  const firstImage = hasImages ? listing.images[0] : null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith('scaled'))
    : [];

  const viewPhotosButton = hasImages ? (
    <button className={css.viewPhotos} onClick={handleViewPhotosClick}>
      <FormattedMessage
        id="ListingPage.viewImagesButton"
        values={{ count: listing.images.length }}
      />
    </button>
  ) : null;

  const handleWrapperKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewPhotosClick();
    }
  };

  return (
    <section className={css.sectionHero} data-testid="hero">
      <div
        className={css.imageWrapperForSectionHero}
        onClick={handleViewPhotosClick}
        onKeyDown={handleWrapperKeyDown}
        role="button"
        tabIndex={hasImages ? 0 : -1}
        aria-label={hasImages ? intl.formatMessage({ id: 'ListingPage.viewImagesButton' }, { count: listing.images.length }) : undefined}
      >
        {mounted && listing.id && isOwnListing ? (
          <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} className={css.actionBarContainerForHeroLayout} role="presentation">
            {actionBar}
          </div>
        ) : null}

        <ResponsiveImage
          rootClassName={css.rootForImage}
          alt={title}
          image={firstImage}
          variants={variants}
        />
        {viewPhotosButton}
      </div>
      <Modal
        id="ListingPage.imageCarousel"
        scrollLayerClassName={css.carouselModalScrollLayer}
        containerClassName={css.carouselModalContainer}
        lightCloseButton
        isOpen={imageCarouselOpen}
        onClose={onImageCarouselClose}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <ImageCarousel
          images={listing.images}
          imageVariants={['scaled-small', 'scaled-medium', 'scaled-large', 'scaled-xlarge']}
        />
      </Modal>
    </section>
  );
};

export default SectionHero;
