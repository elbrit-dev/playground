import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Shared state for navigation items across hook instances
let sharedNavigationItems = [];

export function useSwipeNavigation(items) {
  const router = useRouter();
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchEndY, setTouchEndY] = useState(null);

  // Update shared items when they change
  useEffect(() => {
    if (items && items.length > 0) {
      sharedNavigationItems = items;
    }
  }, [items]);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchEndY(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  }, []);

  const onTouchEnd = useCallback(() => {
    // Only enable swipe on mobile-sized screens
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;

    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;

    const xDistance = touchStart - touchEnd;
    const yDistance = touchStartY - touchEndY;
    
    // Check if it's more of a horizontal swipe than vertical
    // and that the swipe distance is significant enough
    const isHorizontalSwipe = Math.abs(xDistance) > Math.abs(yDistance) * 1.5;
    const isLeftSwipe = xDistance > minSwipeDistance;
    const isRightSwipe = xDistance < -minSwipeDistance;

    if (isHorizontalSwipe && (isLeftSwipe || isRightSwipe)) {
      if (sharedNavigationItems.length === 0) return;

      // Filter items to only those that have a path and are not mobileOnly (unless we are on mobile)
      // Actually, it's better to just use all items that have a path as they appear in the bottom nav.
      const validItems = sharedNavigationItems.filter(item => item.path || item.route);
      
      const currentIndex = validItems.findIndex(item => {
        const itemPath = item.path || item.route;
        return pathname === itemPath || pathname.startsWith(itemPath + '/');
      });

      if (currentIndex === -1) return;

      if (isLeftSwipe && currentIndex < validItems.length - 1) {
        const nextItem = validItems[currentIndex + 1];
        if (nextItem?.path) {
          router.push(nextItem.path, { scroll: false });
        }
      } else if (isRightSwipe && currentIndex > 0) {
        const prevItem = validItems[currentIndex - 1];
        if (prevItem?.path) {
          router.push(prevItem.path, { scroll: false });
        }
      }
    }
  }, [touchStart, touchEnd, touchStartY, touchEndY, pathname, router]);

  // If items are passed, we just want to register them
  if (items) {
    return null;
  }

  // Otherwise return handlers
  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}
