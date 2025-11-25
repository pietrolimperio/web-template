import { useState, useEffect } from 'react';

/**
 * Custom hook to detect when user has scrolled past a certain threshold
 *
 * @param {number} threshold - Scroll position in pixels to trigger
 * @returns {boolean} - True if scrolled past threshold
 */
export const useScrollTrigger = (threshold = 300) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
          setIsScrolled(scrollPosition > threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return isScrolled;
};

export default useScrollTrigger;
