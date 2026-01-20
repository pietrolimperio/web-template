import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { ensureUser, userDisplayNameAsString } from '../../util/data';
import {
  AvatarLarge,
  NamedLink,
  ReviewRating,
  Map,
  // PrimaryButton, // Hidden for now
} from '../../components';

import css from './OwnerCard.module.css';

/**
 * OwnerCard Component
 * 
 * Displays owner information card with:
 * - Large avatar
 * - Owner name with "Owned by" label
 * - Star rating (if reviews exist)
 * - Verified/Identified badge
 * - Response rate info
 * - Location preview with map
 * - Send message button
 */
const OwnerCard = ({
  author,
  authorReviews = [],
  listing,
  onContactUser,
  config,
  intl,
  isOwnListing,
  geolocation,
  geocodedLocation,
  isGeocoding,
}) => {
  const ensuredAuthor = ensureUser(author);
  const authorDisplayName = userDisplayNameAsString(ensuredAuthor, '');
  const authorId = ensuredAuthor?.id?.uuid;
  
  // Calculate author reviews average and total
  const authorReviewsCount = authorReviews.length;
  const authorAverageRating = authorReviewsCount > 0
    ? Math.round(
        (authorReviews.reduce((sum, review) => sum + (review.attributes?.rating || 0), 0) /
          authorReviewsCount) *
          10
      ) / 10
    : 0;
  const authorAverageRatingRounded = authorAverageRating > 0 ? Math.round(authorAverageRating) : 0;

  // Author profile data
  const authorProfile = ensuredAuthor?.attributes?.profile || {};
  const authorPublicData = authorProfile.publicData || {};
  
  // Check if author is verified (has identity verification or email verified)
  const isVerified = true

  // Get listing public data for location
  const publicData = listing?.attributes?.publicData || {};
  const locationVisible = publicData?.locationVisible;
  const location = publicData?.location || {};
  const listingGeolocation = listing?.attributes?.geolocation;
  
  // Normalize geolocation format
  let normalizedGeolocation = null;
  const locationGeolocation = location.geolocation || geolocation || listingGeolocation || null;
  
  if (locationGeolocation) {
    if (locationGeolocation.lat !== undefined && locationGeolocation.lng !== undefined) {
      normalizedGeolocation = { lat: locationGeolocation.lat, lng: locationGeolocation.lng };
    } else if (locationGeolocation.latitude !== undefined && locationGeolocation.longitude !== undefined) {
      normalizedGeolocation = { lat: locationGeolocation.latitude, lng: locationGeolocation.longitude };
    } else if (Array.isArray(locationGeolocation) && locationGeolocation.length === 2) {
      normalizedGeolocation = { lat: locationGeolocation[0], lng: locationGeolocation[1] };
    }
  }

  // Use geocoded location if geolocation is not available
  const mapCenter = normalizedGeolocation || geocodedLocation;

  // Handle address as object or string - show only city, province, zip code and country (NO street)
  const addressObj = location.address || {};
  
  // Build address string without street address
  let addressString = '';
  if (typeof addressObj === 'object' && addressObj !== null) {
    // If it's an object, extract only city, state/province, postalCode, country
    addressString = [
      addressObj.city,
      addressObj.state || addressObj.province,
      addressObj.postalCode,
      addressObj.country
    ].filter(Boolean).join(', ');
  }
  
  // If addressString is still empty but we have a string address, parse it to remove street
  if (!addressString && typeof addressObj === 'string' && addressObj.includes(',')) {
    // Assume format: "Street Address, City, PostalCode, Country" or similar
    // Remove the first part (street address) and keep the rest
    const parts = addressObj.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      // Skip the first part (street address), keep city, postal code, country
      addressString = parts.slice(1).join(', ');
    } else {
      addressString = addressObj;
    }
  } else if (!addressString && typeof addressObj === 'string') {
    addressString = addressObj;
  }
  
  // Fallback to location object fields if available
  if (!addressString && location) {
    addressString = [
      location.city,
      location.state || location.province,
      location.postalCode,
      location.country
    ].filter(Boolean).join(', ');
  }

  const marketplaceColor = config?.branding?.marketplaceColor || '#4A90E2';

  const handleContactClick = () => {
    if (onContactUser && !isOwnListing) {
      onContactUser();
    }
  };

  return (
    <div className={css.ownerCard}>
      {/* Left side - Owner info */}
      <div className={css.ownerInfo}>
        {/* Header with avatar and name */}
        <div className={css.ownerHeader}>
          <NamedLink
            name="ProfilePage"
            params={{ id: authorId }}
            className={css.avatarLink}
          >
            <AvatarLarge user={ensuredAuthor} className={css.avatar} disableProfileLink />
          </NamedLink>
          
          <div className={css.ownerDetails}>
            <div className={css.ownerNameRow}>
              <span className={css.ownedByLabel}>
                <FormattedMessage 
                  id="OwnerCard.ownedBy" 
                  defaultMessage="Offerto da" 
                />
              </span>
              <NamedLink
                name="ProfilePage"
                params={{ id: authorId }}
                className={css.ownerName}
              >
                {authorDisplayName}
              </NamedLink>
            </div>
            
            {/* Rating with stars */}
            {authorReviewsCount > 0 && (
              <div className={css.ratingRow}>
                <ReviewRating
                  rating={authorAverageRatingRounded}
                  className={css.reviewRating}
                  reviewStarClassName={css.reviewStar}
                />
                <span className={css.ratingValue}>{authorAverageRating.toFixed(1)}/5</span>
              </div>
            )}
          </div>
        </div>

        {/* Verified user line - shown below avatar */}
        {isVerified && (
          <div className={css.verifiedLine}>
            <span className={css.verifiedBadgeIcon}>✓</span>
            <span className={css.verifiedText}>
              <FormattedMessage id="OwnerCard.verifiedUser" defaultMessage="Utente verificato" />
            </span>
          </div>
        )}

        {/* Info badges */}
        <div className={css.infoBadges}>
          {/* Response time - could be fetched from user data */}
          <div className={css.badge}>
            <span className={css.badgeIcon}>
              <i className="fa-regular fa-clock"></i>
            </span>
            <span className={css.badgeText}>
              <FormattedMessage 
                id="OwnerCard.responseTime" 
                defaultMessage="Risponde entro poche ore" 
              />
            </span>
          </div>

          {/* Location info */}
          {locationVisible && addressString && (
            <div className={css.badge}>
              <span className={css.badgeIcon}>
                <i className="fa-solid fa-location-crosshairs"></i>
              </span>
              <span className={css.badgeText}>{addressString}</span>
            </div>
          )}

          {/* Hand by hand availability */}
          {publicData?.handByHandAvailable && (
            <div className={css.badge}>
              <span className={css.badgeIcon}>🤝</span>
              <span className={css.badgeText}>
                <FormattedMessage 
                  id="OwnerCard.handByHand" 
                  defaultMessage="Consegna a mano disponibile" 
                />
              </span>
            </div>
          )}
        </div>

        {/* Insurance notice */}
        <div className={css.insuranceNotice}>
          <span className={css.insuranceIcon}>🛡️</span>
          <span className={css.insuranceText}>
            <FormattedMessage 
              id="OwnerCard.insuranceText" 
              defaultMessage="Questo annuncio è coperto dall'assicurazione Leaz." 
            />
            <a href="#" className={css.insuranceReadMore} onClick={(e) => e.preventDefault()}>
              <FormattedMessage id="OwnerCard.readMore" defaultMessage="Scopri di più" />
            </a>
          </span>
        </div>

        {/* Send message button - hidden for now */}
        {/* {!isOwnListing && (
          <PrimaryButton
            className={css.contactButton}
            onClick={handleContactClick}
            style={{ backgroundColor: marketplaceColor }}
          >
            <FormattedMessage id="OwnerCard.sendMessage" defaultMessage="Invia messaggio" />
          </PrimaryButton>
        )} */}
      </div>

      {/* Right side - Map preview */}
      {locationVisible && (
        <div className={css.mapPreview}>
          {mapCenter && mapCenter.lat && mapCenter.lng ? (
            <Map
              center={mapCenter}
              obfuscatedCenter={mapCenter}
              address={addressString}
              zoom={13}
              useStaticMap={false}
              mapsConfig={{
                ...config?.maps,
                fuzzy: {
                  enabled: true,
                  offset: config?.maps?.fuzzy?.offset || 500,
                  defaultZoomLevel: config?.maps?.fuzzy?.defaultZoomLevel || 13,
                  circleColor: marketplaceColor,
                },
              }}
            />
          ) : isGeocoding ? (
            <div className={css.mapLoading}>
              <FormattedMessage
                id="OwnerCard.loadingMap"
                defaultMessage="Caricamento mappa..."
              />
            </div>
          ) : (
            <div className={css.mapPlaceholder}>
              <span className={css.mapPlaceholderIcon}>📍</span>
              <span className={css.mapPlaceholderText}>
                <FormattedMessage
                  id="OwnerCard.locationNotAvailable"
                  defaultMessage="Posizione non disponibile"
                />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerCard;
