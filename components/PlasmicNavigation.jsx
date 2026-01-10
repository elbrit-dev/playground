'use client';

import React from 'react';
import Navigation from '../share/navigation/components/Navigation';

/**
 * A wrapper for the Navigation component from the share folder
 * to be used as a code component in Plasmic Studio.
 */
export default function PlasmicNavigation(props) {
  return <Navigation {...props} />;
}

