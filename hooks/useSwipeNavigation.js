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
    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;

    const xDistance = touchStart - touchEnd;
    const yDistance = touchStartY - touchEndY;
    
    // Check if it's more of a horizontal swipe than vertical
    const isHorizontalSwipe = Math.abs(xDistance) > Math.abs(yDistance);
    const isLeftSwipe = xDistance > minSwipeDistance;
    const isRightSwipe = xDistance < -minSwipeDistance;

    if (isHorizontalSwipe && (isLeftSwipe || isRightSwipe)) {
      if (sharedNavigationItems.length === 0) return;

      const currentIndex = sharedNavigationItems.findIndex(item => {
        const itemPath = item.path || item.route;
        if (!itemPath) return false;
        return pathname === itemPath || pathname.startsWith(itemPath + '/');
      });

      if (currentIndex === -1) return;

      if (isLeftSwipe && currentIndex < sharedNavigationItems.length - 1) {
        // Find next valid item with a path
        let nextIndex = currentIndex + 1;
        while (nextIndex < sharedNavigationItems.length) {
          const nextItem = sharedNavigationItems[nextIndex];
          if (nextItem?.path) {
            router.push(nextItem.path, { scroll: false });
            break;
          }
          nextIndex++;
        }
      } else if (isRightSwipe && currentIndex > 0) {
        // Find previous valid item with a path
        let prevIndex = currentIndex - 1;
        while (prevIndex >= 0) {
          const prevItem = sharedNavigationItems[prevIndex];
          if (prevItem?.path) {
            router.push(prevItem.path, { scroll: false });
            break;
          }
          prevIndex--;
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

