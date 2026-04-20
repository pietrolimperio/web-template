import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import { getCategoryNamesFromIds, getShortLocaleForCategoryDisplay } from '../../util/fieldHelpers';
import {
  NamedLink,
  PrimaryButton,
  SecondaryButton,
  H4,
  IconArrowHead,
  ResponsiveImage,
  Map,
  IconSpinner,
  IconDelete,
} from '../../components';
import AvailabilityCalendar from '../AIListingCreationPage/AvailabilityCalendar';
import productCss from '../ProductPage/ProductPage.module.css';
import css from './PreviewListingPage.module.css';

/**
 * Struttura allineata a ProductPage (hero split + contentWrapper + colonne),
 * senza OwnerCard, recensioni e prodotti correlati.
 */
const PreviewListingPageProductLayout = props => {
  const {
    intl,
    config,
    listing,
    isDraft,
    isDraftMode,
    isGuestPreview,
    history,
    routeConfiguration,
    setGuestListingPendingPublish,
    visibleImages,
    selectedImageIndex,
    setSelectedImageIndex,
    setShowImageModal,
    hasSensitiveFieldsChanged,
    handleResetToOriginal,
    updatingListing,
    handleImageUpload,
    uploadingImage,
    handleImageReplace,
    handleImageDelete,
    deletingImageId,
    fieldValues,
    editingField,
    handleEditField,
    handleChangeField,
    handleSaveField,
    handleCancelEdit,
    hasSensitiveFieldChanged,
    hoveredFeatureIndex,
    setHoveredFeatureIndex,
    showAddFeatureInput,
    setShowAddFeatureInput,
    newFeatureValue,
    setNewFeatureValue,
    handleRemoveKeyFeature,
    handleAddKeyFeature,
    listingTitleStr,
    richListingTitle,
    listingIdUuidStr,
    heroTitleTrailingAccentWordCount,
    listingCardStyleHeroPrice,
    priceAttr,
    publicDataHero,
    listingConfig,
    currencyFormatting,
    handByHandAvailable,
    handleHandByHandToggle,
    confirmBookingRequired,
    handleConfirmBookingToggle,
    currentUser,
    geocodedLocation,
    isGeocoding,
    setShowPriceModal,
    setShowAvailabilityModal,
    setShowLocationModal,
    availableDates,
    disabledDates,
    currentListing,
    publishListingError,
    publishInProgress,
    handleDeleteDraft,
    deleteDraftInProgress,
    handlePublish,
    createResourceLocatorString,
    formattedBasePriceStr,
  } = props;

  const fieldConfigs = listingConfig?.listingFields || [];

  const renderHeroTitle = () => {
    if (editingField === 'title' && isDraftMode) {
      return (
        <div className={css.previewHeroTitleEditWrap}>
          <textarea
            value={fieldValues.title || ''}
            onChange={e => handleChangeField('title', e.target.value)}
            className={css.previewHeroTitleTextarea}
            autoFocus
            rows={2}
          />
          <div className={css.editActions}>
            <button
              type="button"
              onClick={() => handleSaveField('title')}
              className={css.saveButton}
              disabled={updatingListing || !hasSensitiveFieldChanged('title')}
            >
              <FormattedMessage id="PreviewListingPage.saveButton" />
            </button>
            <button
              type="button"
              onClick={() => handleCancelEdit('title')}
              className={css.cancelButton}
              disabled={updatingListing}
            >
              <FormattedMessage id="PreviewListingPage.cancelButton" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <h1 className={productCss.heroTitle}>
        {(() => {
          const words = listingTitleStr.split(/\s+/).filter(Boolean);
          const n = heroTitleTrailingAccentWordCount(listingIdUuidStr, listingTitleStr, words.length);
          if (words.length <= 3) {
            return <span className={productCss.heroTitleAccent}>{listingTitleStr}</span>;
          }
          const leading = words.slice(0, -n).join(' ');
          const trailing = words.slice(-n).join(' ');
          return (
            <>
              {leading}{' '}
              <span className={productCss.heroTitleAccent}>{trailing}</span>
            </>
          );
        })()}
        {isDraftMode && !isGuestPreview && (
          <button type="button" onClick={() => handleEditField('title')} className={css.previewHeroEditLink}>
            <FormattedMessage id="PreviewListingPage.editLink" defaultMessage="edit" />
          </button>
        )}
      </h1>
    );
  };

  const renderConditionBrandHero = () => {
    if (!listing.attributes.publicData) return null;

    const toCamelCase = str =>
      str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (ch, i) => (i === 0 ? ch.toLowerCase() : ch.toUpperCase()))
        .replace(/[\s\-_]+/g, '');
    const conditionRaw = publicDataHero?.condition;
    const brandRaw = publicDataHero?.brand;

    if (editingField === 'condition' && isDraftMode) {
      return (
        <div className={productCss.heroFeatureCards}>
          <div className={css.previewHeroInlineEdit}>
            <select
              value={fieldValues.condition || listing.attributes?.publicData?.condition || 'Used'}
              onChange={e => handleChangeField('condition', e.target.value)}
              className={css.detailSelect}
            >
              <option value="New">
                {intl.formatMessage({ id: 'PreviewListingPage.condition.new', defaultMessage: 'New' })}
              </option>
              <option value="Like New">
                {intl.formatMessage({ id: 'PreviewListingPage.condition.likeNew', defaultMessage: 'Like New' })}
              </option>
              <option value="Used">
                {intl.formatMessage({ id: 'PreviewListingPage.condition.used', defaultMessage: 'Used' })}
              </option>
              <option value="Refurbished">
                {intl.formatMessage({ id: 'PreviewListingPage.condition.refurbished', defaultMessage: 'Refurbished' })}
              </option>
            </select>
            <div className={css.editActions}>
              <button
                type="button"
                onClick={() => handleSaveField('condition')}
                className={css.saveButton}
                disabled={updatingListing || !hasSensitiveFieldChanged('condition')}
              >
                <FormattedMessage id="PreviewListingPage.saveButton" />
              </button>
              <button
                type="button"
                onClick={() => handleCancelEdit('condition')}
                className={css.cancelButton}
                disabled={updatingListing}
              >
                <FormattedMessage id="PreviewListingPage.cancelButton" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (editingField === 'brand' && isDraftMode) {
      return (
        <div className={productCss.heroFeatureCards}>
          <div className={css.previewHeroInlineEdit}>
            <input
              type="text"
              value={fieldValues.brand || listing.attributes?.publicData?.brand || ''}
              onChange={e => handleChangeField('brand', e.target.value)}
              className={css.detailInput}
            />
            <div className={css.editActions}>
              <button
                type="button"
                onClick={() => handleSaveField('brand')}
                className={css.saveButton}
                disabled={updatingListing || !hasSensitiveFieldChanged('brand')}
              >
                <FormattedMessage id="PreviewListingPage.saveButton" />
              </button>
              <button
                type="button"
                onClick={() => handleCancelEdit('brand')}
                className={css.cancelButton}
                disabled={updatingListing}
              >
                <FormattedMessage id="PreviewListingPage.cancelButton" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!conditionRaw && !brandRaw) return null;

    const conditionKey = conditionRaw ? toCamelCase(String(conditionRaw)) : '';
    const conditionMessageId = `ProductPage.condition.${conditionKey}`;
    const conditionLabel = conditionRaw
      ? intl.formatMessage({ id: conditionMessageId, defaultMessage: String(conditionRaw) })
      : null;

    const rawBrandForDisplay =
      fieldValues.brand != null && fieldValues.brand !== '' ? fieldValues.brand : brandRaw;
    const normalizedBrand = String(rawBrandForDisplay || '')
      .trim();

    const brandLabel = (() => {
      if (!rawBrandForDisplay) return null;
      const cfg = fieldConfigs.find(f => f.key === 'brand');
      if (cfg?.enumOptions) {
        const match = cfg.enumOptions.find(o => `${o.option}` === `${rawBrandForDisplay}`);
        if (match?.label) return match.label;
      }
      return String(rawBrandForDisplay);
    })();
    const isBrandValid =
      normalizedBrand &&
      normalizedBrand.toLowerCase() !== 'n/a' &&
      normalizedBrand.toLowerCase() !== 'na' &&
      normalizedBrand.toLowerCase() !== 'n.a.';

    return (
      <div className={productCss.heroFeatureCards}>
        {conditionRaw && (
          <div className={productCss.heroFeatureCard}>
            <div className={productCss.heroFeatureCardIcon}>✓</div>
            <div className={productCss.heroFeatureCardContent}>
              <p className={productCss.heroFeatureCardLabel}>
                <FormattedMessage id="ProductPage.conditionLabel" defaultMessage="Condizione" />
              </p>
              <h3 className={productCss.heroFeatureCardTitle}>{conditionLabel}</h3>
            </div>
            {isDraftMode && !isGuestPreview && (
              <button type="button" onClick={() => handleEditField('condition')} className={css.previewHeroCardEdit}>
                <FormattedMessage id="PreviewListingPage.editLink" defaultMessage="edit" />
              </button>
            )}
          </div>
        )}
        {isBrandValid && (
          <div className={productCss.heroFeatureCard}>
            <div className={productCss.heroFeatureCardIcon}>🏷</div>
            <div className={productCss.heroFeatureCardContent}>
              <p className={productCss.heroFeatureCardLabel}>
                <FormattedMessage id="ProductPage.brandLabel" defaultMessage="Brand" />
              </p>
              <h3 className={productCss.heroFeatureCardTitle}>{brandLabel}</h3>
            </div>
            {isDraftMode && !isGuestPreview && (
              <button type="button" onClick={() => handleEditField('brand')} className={css.previewHeroCardEdit}>
                <FormattedMessage id="PreviewListingPage.editLink" defaultMessage="edit" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const mainImage = visibleImages[selectedImageIndex >= visibleImages.length ? 0 : selectedImageIndex];
  const mainImageVariants = mainImage?.attributes?.variants || {};
  const mainImageUrl =
    mainImageVariants['scaled-xlarge']?.url ||
    mainImageVariants['scaled-large']?.url ||
    mainImageVariants['scaled-medium']?.url ||
    mainImageVariants['listing-card-6x']?.url ||
    mainImageVariants['listing-card-4x']?.url ||
    mainImageVariants['listing-card-2x']?.url ||
    mainImageVariants['listing-card']?.url;

  const priceSectionContent = listing.attributes.price
    ? (() => {
        const currency = listing.attributes.price.currency;
        const priceVariants = listing.attributes.publicData?.priceVariants || [];
        const defaultPrice = listing.attributes.price.amount / 100;
        const formatPrice = priceAmount => {
          const currencyConfig = currencyFormatting(currency, { enforceSupportedCurrencies: false });
          return intl.formatNumber(priceAmount, currencyConfig);
        };
        const formatPriceVariantLabel = variant => {
          const variantType =
            variant.type ||
            (variant.period || (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0)
              ? 'period'
              : null) ||
            (variant.minLength ||
            variant.minDuration ||
            variant.maxLength ||
            variant.maxDuration ||
            variant.duration
              ? 'duration'
              : null) ||
            'duration';
          if (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0) {
            const start = new Date(variant.dates[0]);
            const end = new Date(variant.dates[variant.dates.length - 1]);
            const formatDate = date => {
              const day = date.getDate();
              const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
              const month = monthNames[date.getMonth()];
              return `${day} ${month}`;
            };
            return `${formatDate(start)} - ${formatDate(end)}`;
          }
          if (variant.period && typeof variant.period === 'string' && variant.period.trim()) {
            const formatPeriodDate = dateStr => {
              if (dateStr.length === 8) {
                const year = parseInt(dateStr.substring(0, 4), 10);
                const month = parseInt(dateStr.substring(4, 6), 10) - 1;
                const day = parseInt(dateStr.substring(6, 8), 10);
                const date = new Date(year, month, day);
                const dayNum = date.getDate();
                const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
                return `${dayNum} ${monthNames[date.getMonth()]}`;
              }
              try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  const dayNum = date.getDate();
                  const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
                  return `${dayNum} ${monthNames[date.getMonth()]}`;
                }
              } catch (e) { /* ignore */ }
              return dateStr;
            };
            const periodStr = variant.period.trim();
            const periods = periodStr.split(',');
            const firstPeriod = periods[0].trim();
            if (firstPeriod.includes('-')) {
              const [startStr, endStr] = firstPeriod.split('-').map(s => s.trim());
              if (startStr && endStr) return `${formatPeriodDate(startStr)} - ${formatPeriodDate(endStr)}`;
            } else if (periods.length > 1) {
              const startStr = periods[0].trim();
              const endStr = periods[periods.length - 1].trim();
              if (startStr && endStr && startStr.length === 8 && endStr.length === 8)
                return `${formatPeriodDate(startStr)} - ${formatPeriodDate(endStr)}`;
            } else if (firstPeriod.length === 8) {
              return formatPeriodDate(firstPeriod);
            }
          }
          if (variantType === 'length' || variantType === 'duration' || variant.duration || variant.minLength || variant.minDuration) {
            const minDuration = variant.minDuration || variant.minLength;
            const maxDuration = variant.maxDuration || variant.maxLength;
            if (minDuration && maxDuration)
              return intl.formatMessage({ id: 'PreviewListingPage.fromToDays' }, { min: minDuration, max: maxDuration, defaultMessage: 'from {min} to {max} days' });
            if (minDuration)
              return intl.formatMessage({ id: 'PreviewListingPage.fromDays' }, { days: minDuration, defaultMessage: 'from {days} days' });
            if (variant.duration) {
              const durationStr = variant.duration.trim();
              if (durationStr.startsWith('>'))
                return intl.formatMessage({ id: 'PreviewListingPage.moreThanDays' }, { days: durationStr.substring(1).trim(), defaultMessage: 'more than {days} days' });
              if (durationStr.includes('-')) {
                const [min, max] = durationStr.split('-').map(s => s.trim());
                return intl.formatMessage({ id: 'PreviewListingPage.fromToDays' }, { min, max, defaultMessage: 'from {min} to {max} days' });
              }
              return intl.formatMessage({ id: 'PreviewListingPage.fromDays' }, { days: durationStr, defaultMessage: 'from {days} days' });
            }
          }
          if (variantType === 'period') return typeof variant.period === 'string' ? variant.period : '';
          return '';
        };

        return (
          <div className={css.priceSection}>
            <div className={css.priceSectionHeader}>
              <button
                type="button"
                onClick={() => !isGuestPreview && setShowPriceModal(true)}
                className={css.modifyLink}
                disabled={isGuestPreview}
                style={isGuestPreview ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                title={isGuestPreview ? intl.formatMessage({ id: 'PreviewListingPage.guestTooltip' }) : undefined}
              >
                <FormattedMessage id="PreviewListingPage.modifyPriceLink" defaultMessage="Modify price or add price variants" />
              </button>
            </div>
            <div className={css.priceCardsList}>
              <div
                className={css.priceCard}
                style={{ borderColor: config.branding?.marketplaceColor || '#4A90E2', cursor: isGuestPreview ? 'default' : 'pointer', opacity: isGuestPreview ? 0.7 : 1 }}
                onClick={() => !isGuestPreview && setShowPriceModal(true)}
                title={isGuestPreview ? intl.formatMessage({ id: 'PreviewListingPage.guestTooltip' }) : undefined}
                role="presentation"
              >
                <div className={css.priceCardPrice}>{formatPrice(defaultPrice)}</div>
                <div className={css.priceCardLabel}><FormattedMessage id="PreviewListingPage.defaultPrice" defaultMessage="Default" /></div>
              </div>
              {priceVariants.map((variant, index) => (
                <div
                  key={index}
                  className={css.priceCard}
                  style={{ borderColor: config.branding?.marketplaceColor || '#4A90E2', cursor: isGuestPreview ? 'default' : 'pointer', opacity: isGuestPreview ? 0.7 : 1 }}
                  onClick={() => !isGuestPreview && setShowPriceModal(true)}
                  title={isGuestPreview ? intl.formatMessage({ id: 'PreviewListingPage.guestTooltip' }) : undefined}
                  role="presentation"
                >
                  <div className={css.priceCardPrice}>
                    {variant.type === 'duration' && variant.percentageDiscount != null
                      ? <>-{variant.percentageDiscount}%</>
                      : formatPrice(variant.priceInSubunits / 100)}
                  </div>
                  <div className={css.priceCardLabel}>{formatPriceVariantLabel(variant)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()
    : null;

  return (
    <div className={css.previewProductLayout}>
      <div className={css.previewPageIntro}>
        <h1 className={css.previewPageHeading}>
          <FormattedMessage id={isDraft ? 'PreviewListingPage.heading' : 'PreviewListingPage.headingEdit'} />
        </h1>
        <p className={css.previewPageDescription}>
          {isGuestPreview ? (
            <>
              <a
                href={createResourceLocatorString('LoginPage', routeConfiguration, {}, {})}
                onClick={e => {
                  e.preventDefault();
                  setGuestListingPendingPublish();
                  history.push(createResourceLocatorString('LoginPage', routeConfiguration, {}, {}));
                }}
                style={{ color: config.branding?.marketplaceColor || '#4A90E2', textDecoration: 'underline' }}
              >
                <FormattedMessage id="PreviewListingPage.loginLink" defaultMessage="Login" />
              </a>
              <FormattedMessage
                id="PreviewListingPage.guestDescription"
                defaultMessage="Login to edit the listing and publish it. "
              />
            </>
          ) : (
            <FormattedMessage
              id={isDraft ? 'PreviewListingPage.descriptionEditDraft' : 'PreviewListingPage.descriptionEdit'}
            />
          )}
        </p>
      </div>

      <section className={productCss.heroSection}>
        <div className={productCss.heroImageContainer}>
          <div className={css.heroImageColumn}>
          <div
            className={productCss.heroPortraitFrame}
            onClick={() => visibleImages.length > 0 && setShowImageModal(true)}
            role="presentation"
          >
            {visibleImages.length > 0 ? (
              <img src={mainImageUrl} alt={listingTitleStr} className={productCss.heroImage} />
            ) : (
              <ResponsiveImage
                className={productCss.heroImageFallback}
                image={null}
                variants={[]}
                alt={listingTitleStr}
              />
            )}

            {visibleImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={classNames(productCss.heroImageNav, productCss.heroNavPrev)}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev => (prev === 0 ? visibleImages.length - 1 : prev - 1));
                  }}
                >
                  <IconArrowHead direction="left" size="big" />
                </button>
                <button
                  type="button"
                  className={classNames(productCss.heroImageNav, productCss.heroNavNext)}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev => (prev === visibleImages.length - 1 ? 0 : prev + 1));
                  }}
                >
                  <IconArrowHead direction="right" size="big" />
                </button>
                <div className={productCss.heroImageCounter}>
                  {selectedImageIndex + 1} / {visibleImages.length}
                </div>
              </>
            )}

            {visibleImages.length > 1 && (
              <button
                type="button"
                className={productCss.heroViewPhotos}
                onClick={e => {
                  e.stopPropagation();
                  setShowImageModal(true);
                }}
              >
                <FormattedMessage
                  id="ProductPage.viewPhotos"
                  defaultMessage="Vedi {count} foto"
                  values={{ count: visibleImages.length }}
                />
              </button>
            )}
          </div>

          {(visibleImages.length > 1 || (isDraftMode && !isGuestPreview)) && (
            <div className={productCss.thumbnailsContainer}>
              <div className={productCss.thumbnailsScroll}>
                {isDraftMode && !isGuestPreview && (
                  <div className={css.thumbnail}>
                    <label className={css.uploadThumbnail}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        disabled={uploadingImage}
                      />
                      <div className={css.uploadIcon}>{uploadingImage ? '...' : '+'}</div>
                    </label>
                  </div>
                )}
                {visibleImages.map((image, index) => {
                  const variants = image.attributes?.variants || {};
                  const imageUrl =
                    variants['scaled-small']?.url ||
                    variants['scaled-medium']?.url ||
                    variants['listing-card-2x']?.url ||
                    variants['listing-card']?.url;
                  const imgId = image.imageId || image.id;
                  const imgUuid = typeof imgId === 'object' ? imgId.uuid : imgId;
                  const isDeleting = deletingImageId === imgUuid;
                  const isLastImage = visibleImages.length === 1;
                  const isDisabled = isDeleting || isLastImage;

                  return (
                    <div
                      key={imgUuid || index}
                      className={classNames(css.thumbnail, {
                        [css.thumbnailActive]: index === selectedImageIndex,
                        [css.thumbnailDeleting]: isDeleting,
                      })}
                    >
                      <button
                        type="button"
                        className={css.thumbnailButton}
                        onClick={() => setSelectedImageIndex(index)}
                        aria-label={intl.formatMessage({ id: 'PreviewListingPage.selectImage' }, { index: index + 1 })}
                      >
                        <img src={imageUrl} alt={`Thumbnail ${index + 1}`} className={css.thumbnailImage} loading="lazy" />
                      </button>
                      {isDraftMode && !isGuestPreview && (
                        <div className={css.thumbnailDeleteButtonWrapper}>
                          {isLastImage ? (
                            <label
                              className={css.thumbnailReplaceButton}
                              aria-label={intl.formatMessage(
                                { id: 'PreviewListingPage.replaceImage' },
                                { index: index + 1 }
                              )}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                  e.stopPropagation();
                                  handleImageReplace(image.id || image.imageId, index, e);
                                }}
                                style={{ display: 'none' }}
                                disabled={uploadingImage || isDeleting}
                              />
                              {uploadingImage || isDeleting ? (
                                '⏳'
                              ) : (
                                <svg
                                  className={css.updateIcon}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M4,12A8,8,0,0,1,18.93,8"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20,12A8,8,0,0,1,5.07,16"
                                  />
                                  <polyline
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    points="14 8 19 8 19 3"
                                  />
                                  <polyline
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    points="10 16 5 16 5 21"
                                  />
                                </svg>
                              )}
                            </label>
                          ) : (
                            <button
                              type="button"
                              className={css.thumbnailDeleteButton}
                              onClick={e => {
                                e.stopPropagation();
                                handleImageDelete(image.id || image.imageId, index);
                              }}
                              disabled={isDisabled}
                              aria-label={intl.formatMessage(
                                { id: 'PreviewListingPage.deleteImage' },
                                { index: index + 1 }
                              )}
                            >
                              {isDeleting ? (
                                '⏳'
                              ) : (
                                <svg
                                  className={css.trashIcon}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>

        <div className={productCss.heroInfoPanel}>
          {(() => {
            const pub = listing.attributes.publicData || {};
            const id1 = pub.categoryId;
            const id2 = pub.subcategoryId;
            const id3 = pub.thirdCategoryId;
            const categories = config?.categoryConfiguration?.categories ?? [];
            const shortLocale = getShortLocaleForCategoryDisplay(config, intl?.locale);
            const names = getCategoryNamesFromIds(categories, id1, id2, id3, shortLocale);
            const categoryLabel = names.category ?? pub.category;
            const subcategoryLabel = names.subcategory ?? pub.subcategory;
            const thirdCategoryLabel = names.thirdCategory ?? pub.thirdCategory;
            const parts = [categoryLabel, subcategoryLabel, thirdCategoryLabel].filter(Boolean);
            if (!parts.length) return null;
            return (
              <nav className={productCss.heroBreadcrumb}>
                {parts.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span>/</span>}
                    <NamedLink className={productCss.heroBreadcrumbLink} name="SearchPage" to={{ search: '' }}>
                      {part}
                    </NamedLink>
                  </React.Fragment>
                ))}
              </nav>
            );
          })()}

          {renderHeroTitle()}

          {priceAttr ? (
            <div className={productCss.heroAuthorSection}>
              <div className={productCss.heroAuthorRowPrice}>
                {listingCardStyleHeroPrice(productCss.heroAuthorPrice, productCss.heroAuthorPriceUnit)}
              </div>
              {!isGuestPreview && (
                <div className={productCss.heroAuthorRight}>
                  <button
                    type="button"
                    className={css.modifyLink}
                    onClick={() => setShowPriceModal(true)}
                  >
                    <FormattedMessage
                      id="PreviewListingPage.modifyPriceLink"
                      defaultMessage="Modify price or add price variants"
                    />
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {renderConditionBrandHero()}
        </div>
      </section>

      <div className={productCss.contentWrapper}>
        <div className={productCss.mobileHeader}>
          <H4 as="h1" className={productCss.listingTitle}>
            {richListingTitle}
          </H4>
          {priceAttr ? (
            <div className={productCss.priceContainer}>
              <div className={productCss.priceInfo}>
                <span className={productCss.price}>{formattedBasePriceStr}</span>
                <span className={productCss.perUnit}>
                  <FormattedMessage id="ProductPage.perUnit" values={{ unitType: publicDataHero.unitType || 'day' }} />
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className={productCss.mainContent}>
          <div className={productCss.detailsColumn}>
            {hasSensitiveFieldsChanged && isDraftMode && (
              <div className={css.resetToOriginalContainer}>
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  className={css.resetToOriginalLink}
                  disabled={updatingListing}
                >
                  <FormattedMessage id="PreviewListingPage.resetToOriginal" defaultMessage="Ripristina annuncio originale" />
                </button>
              </div>
            )}

            <div className={css.mobilePriceSection}>{priceSectionContent}</div>

            <div className={productCss.descriptionSection}>
              <div className={css.descriptionHeader}>
                <h3 className={productCss.sectionTitle}>
                  <FormattedMessage id="PreviewListingPage.descriptionLabel" defaultMessage="Description" />
                </h3>
                {editingField !== 'description' && isDraftMode && !isGuestPreview && (
                  <button type="button" onClick={() => handleEditField('description')} className={css.modifyLink}>
                    <FormattedMessage id="PreviewListingPage.modifyLink" defaultMessage="Edit" />
                  </button>
                )}
              </div>
              <div className={css.editableField}>
                {editingField === 'description' && isDraftMode ? (
                  <>
                    <textarea
                      className={css.descriptionTextarea}
                      value={fieldValues.description}
                      onChange={e => handleChangeField('description', e.target.value)}
                      rows={8}
                    />
                    <div className={css.editButtons}>
                      <button
                        type="button"
                        onClick={() => handleSaveField('description')}
                        className={css.saveButton}
                        disabled={updatingListing || !fieldValues.description || !hasSensitiveFieldChanged('description')}
                      >
                        <FormattedMessage id="PreviewListingPage.saveButton" defaultMessage="Save" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className={css.cancelButton}
                        disabled={updatingListing}
                      >
                        <FormattedMessage id="PreviewListingPage.cancelButton" defaultMessage="Cancel" />
                      </button>
                    </div>
                  </>
                ) : (
                  <p className={classNames(css.listingDescription, productCss.descriptionText)}>
                    {fieldValues.description || listing.attributes.description}
                  </p>
                )}
              </div>
            </div>

            {listing.attributes.publicData &&
              (() => {
                const publicData = listing.attributes?.publicData || {};
                const keyFeatures = publicData.keyFeatures || publicData.key_features || [];
                const keyFeaturesArray = Array.isArray(keyFeatures) ? keyFeatures : [];
                const keyFeaturesFieldName = publicData.keyFeatures
                  ? 'keyFeatures'
                  : publicData.key_features
                  ? 'key_features'
                  : 'keyFeatures';

                return (
                  <div className={productCss.detailsSection}>
                    <h3 className={productCss.sectionTitle}>
                      <FormattedMessage id="PreviewListingPage.details" defaultMessage="Details" />
                    </h3>
                    <div className={css.keyFeaturesListContainer}>
                      <ul className={productCss.keyFeaturesList}>
                        {keyFeaturesArray.map((feature, index) => (
                          <li
                            key={`${index}-${feature}`}
                            className={classNames(css.keyFeatureListItem, productCss.keyFeatureItem)}
                            onMouseEnter={() => setHoveredFeatureIndex(index)}
                            onMouseLeave={() => setHoveredFeatureIndex(null)}
                          >
                            <span className={productCss.keyFeatureBullet} />
                            <span className={css.keyFeatureText}>{String(feature)}</span>
                            {hoveredFeatureIndex === index && isDraftMode && !isGuestPreview && (
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyFeature(index)}
                                className={css.keyFeatureDelete}
                                disabled={updatingListing}
                                aria-label={intl.formatMessage({ id: 'PreviewListingPage.removeFeature' })}
                              >
                                <IconDelete />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isDraftMode && !isGuestPreview &&
                        (showAddFeatureInput ? (
                          <div className={css.addFeatureInputWrapper}>
                            <input
                              type="text"
                              value={newFeatureValue}
                              onChange={e => setNewFeatureValue(e.target.value)}
                              onKeyPress={e => {
                                if (e.key === 'Enter' && newFeatureValue.trim()) {
                                  handleAddKeyFeature(newFeatureValue.trim(), keyFeaturesArray, keyFeaturesFieldName);
                                  setNewFeatureValue('');
                                  setShowAddFeatureInput(false);
                                }
                              }}
                              className={css.addFeatureInput}
                              autoFocus
                              placeholder={intl.formatMessage({
                                id: 'PreviewListingPage.addFeaturePlaceholder',
                                defaultMessage: 'Enter feature...',
                              })}
                            />
                            <div className={css.addFeatureActions}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (newFeatureValue.trim()) {
                                    handleAddKeyFeature(newFeatureValue.trim(), keyFeaturesArray, keyFeaturesFieldName);
                                    setNewFeatureValue('');
                                  }
                                  setShowAddFeatureInput(false);
                                }}
                                className={css.saveButton}
                                disabled={!newFeatureValue.trim() || updatingListing}
                              >
                                <FormattedMessage id="PreviewListingPage.saveButton" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewFeatureValue('');
                                  setShowAddFeatureInput(false);
                                }}
                                className={css.cancelButton}
                                disabled={updatingListing}
                              >
                                <FormattedMessage id="PreviewListingPage.cancelButton" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAddFeatureInput(true)}
                            className={css.addFeatureLink}
                          >
                            <FormattedMessage id="PreviewListingPage.addFeature" defaultMessage="Add" />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })()}
          </div>

          <div className={productCss.infoColumn}>
            <H4 as="h1" className={productCss.listingTitle}>
              {richListingTitle}
            </H4>

            <div className={css.desktopPriceSection}>{priceSectionContent}</div>

            <div className={css.calendarSection}>
              <div className={css.calendarHeader}>
                <button
                  type="button"
                  onClick={() => !isGuestPreview && setShowAvailabilityModal(true)}
                  className={css.modifyLink}
                  disabled={isGuestPreview}
                  style={isGuestPreview ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  title={isGuestPreview ? intl.formatMessage({ id: 'PreviewListingPage.guestTooltip' }) : undefined}
                >
                  <FormattedMessage id="PreviewListingPage.modifyAvailabilityLink" defaultMessage="Modify availability" />
                </button>
              </div>
              <AvailabilityCalendar
                selectedDates={availableDates}
                onDatesChange={() => {}}
                selectMode="range"
                marketplaceColor={config.branding?.marketplaceColor || '#4A90E2'}
                disabledDates={disabledDates}
                readOnly
                singleMonth
                availableFrom={currentListing.attributes?.publicData?.availableFrom}
                availableUntil={currentListing.attributes?.publicData?.availableUntil}
                onMonthsContainerClick={isGuestPreview ? null : () => setShowAvailabilityModal(true)}
              />
            </div>

            {listing.attributes.publicData?.location &&
              (() => {
                const location = listing.attributes.publicData.location;
                const geolocation = location.geolocation || null;
                const addressObj = location.address || {};
                const addressString =
                  typeof addressObj === 'string'
                    ? addressObj
                    : addressObj.street && addressObj.streetNumber
                    ? `${addressObj.street} ${addressObj.streetNumber}, ${addressObj.city || ''} ${addressObj.postalCode || ''}`.trim()
                    : addressObj.city || addressObj.address || '';
                let normalizedGeolocation = null;
                if (geolocation) {
                  if (geolocation.lat !== undefined && geolocation.lng !== undefined) {
                    normalizedGeolocation = { lat: geolocation.lat, lng: geolocation.lng };
                  } else if (
                    geolocation.latitude !== undefined &&
                    geolocation.longitude !== undefined
                  ) {
                    normalizedGeolocation = { lat: geolocation.latitude, lng: geolocation.longitude };
                  } else if (Array.isArray(geolocation) && geolocation.length === 2) {
                    normalizedGeolocation = { lat: geolocation[0], lng: geolocation[1] };
                  }
                }
                const mapCenter = normalizedGeolocation || geocodedLocation;

                return (
                  <div className={css.mapSection}>
                    <div className={css.locationToggles}>
                      <div className={css.toggleRow}>
                        <button
                          type="button"
                          className={`${css.toggleButton} ${handByHandAvailable ? css.toggleActive : ''}`}
                          onClick={handleHandByHandToggle}
                          disabled={updatingListing}
                          style={
                            handByHandAvailable
                              ? {
                                  backgroundColor: config.branding?.marketplaceColor || '#4A90E2',
                                  borderColor: config.branding?.marketplaceColor || '#4A90E2',
                                }
                              : {}
                          }
                        >
                          <FormattedMessage id="PreviewListingPage.handByHand" defaultMessage="Hand-by-hand available" />
                        </button>
                        {currentUser?.attributes?.profile?.publicData?.customerType === 'company' && (
                          <button
                            type="button"
                            className={`${css.toggleButton} ${confirmBookingRequired ? css.toggleActive : ''}`}
                            onClick={handleConfirmBookingToggle}
                            disabled={updatingListing}
                            title={intl.formatMessage({
                              id: 'PreviewListingPage.confirmBookingTooltip',
                              defaultMessage: 'Conferma la disponibilità di questo prodotto per ogni nuova richiesta di noleggio',
                            })}
                            style={
                              confirmBookingRequired
                                ? {
                                    backgroundColor: config.branding?.marketplaceColor || '#4A90E2',
                                    borderColor: config.branding?.marketplaceColor || '#4A90E2',
                                  }
                                : {}
                            }
                          >
                            <FormattedMessage id="PreviewListingPage.confirmBooking" defaultMessage="Conferma noleggio" />
                          </button>
                        )}
                      </div>
                    </div>
                    {mapCenter && mapCenter.lat && mapCenter.lng ? (
                      <div className={css.mapWrapper}>
                        <Map
                          center={mapCenter}
                          obfuscatedCenter={mapCenter}
                          address={addressString}
                          zoom={13}
                          useStaticMap={false}
                          mapsConfig={{
                            ...config.maps,
                            fuzzy: {
                              enabled: true,
                              offset: config.maps?.fuzzy?.offset || 500,
                              defaultZoomLevel: config.maps?.fuzzy?.defaultZoomLevel || 13,
                              circleColor:
                                config.branding?.marketplaceColor || config.maps?.fuzzy?.circleColor || '#4A90E2',
                            },
                          }}
                        />
                        <div className={css.approximateLabel}>
                          <FormattedMessage
                            id="PreviewListingPage.approximateLocation"
                            defaultMessage="Approximate location for privacy"
                          />
                        </div>
                      </div>
                    ) : null}
                    {!mapCenter && addressString && (
                      <div className={css.addressDisplay}>
                        {isGeocoding ? (
                          <>
                            <IconSpinner />
                            <span>
                              <FormattedMessage id="PreviewListingPage.geocodingAddress" defaultMessage="Loading map..." />
                            </span>
                          </>
                        ) : (
                          <>
                            <span>📍</span>
                            <span>{addressString}</span>
                          </>
                        )}
                      </div>
                    )}
                    <div className={css.mapEditLink}>
                      <button
                        type="button"
                        onClick={() => !isGuestPreview && setShowLocationModal(true)}
                        className={css.modifyLink}
                        disabled={isGuestPreview}
                        style={isGuestPreview ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        title={isGuestPreview ? intl.formatMessage({ id: 'PreviewListingPage.guestTooltip' }) : undefined}
                      >
                        <FormattedMessage id="PreviewListingPage.editAddress" defaultMessage="Edit the address" />
                      </button>
                    </div>
                  </div>
                );
              })()}

            {!listing.attributes.publicData?.location && (
              <div className={css.mapSection}>
                <div className={css.noLocationSection}>
                  <div className={css.noLocationMessage}>
                    <span>📍</span>
                    <FormattedMessage
                      id="PreviewListingPage.noLocationMessage"
                      defaultMessage="No location set for this listing"
                    />
                  </div>
                  <div className={css.mapEditLink}>
                    <button
                      type="button"
                      onClick={() => !isGuestPreview && setShowLocationModal(true)}
                      className={css.modifyLink}
                      disabled={isGuestPreview}
                      style={isGuestPreview ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      title={isGuestPreview ? intl.formatMessage({ id: 'PreviewListingPage.guestTooltip' }) : undefined}
                    >
                      <FormattedMessage id="PreviewListingPage.addLocation" defaultMessage="Add location" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {publishListingError && (
          <div className={css.error}>
            <FormattedMessage id="PreviewListingPage.publishError" />
          </div>
        )}

        <div className={css.actions}>
          {/* TODO: disable deletion when the listing is involved in a transaction (active/past bookings or inquiries).
              Also wire a non-draft delete handler — handleDeleteDraft uses sdk.ownListings.discardDraft which only works on drafts. */}
          <SecondaryButton
            onClick={handleDeleteDraft}
            inProgress={deleteDraftInProgress}
            className={css.deleteButton}
          >
            {isDraftMode || isGuestPreview ? (
              <FormattedMessage id="PreviewListingPage.deleteDraftButton" defaultMessage="Elimina annuncio" />
            ) : (
              <FormattedMessage id="PreviewListingPage.deleteListingButton" defaultMessage="Elimina annuncio" />
            )}
          </SecondaryButton>
          <PrimaryButton onClick={handlePublish} inProgress={publishInProgress} className={css.publishButton}>
            {publishInProgress ? (
              isDraftMode ? (
                <FormattedMessage id="PreviewListingPage.publishingButton" />
              ) : (
                <FormattedMessage id="PreviewListingPage.savingButton" defaultMessage="Salvataggio..." />
              )
            ) : isDraftMode || isGuestPreview ? (
              <FormattedMessage id="PreviewListingPage.publishButton" />
            ) : (
              <FormattedMessage id="PreviewListingPage.saveButton" defaultMessage="Salva" />
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default PreviewListingPageProductLayout;
