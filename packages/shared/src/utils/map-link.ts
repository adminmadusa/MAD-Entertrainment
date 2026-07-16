/**
 * Generates a platform-specific map directions URL for a venue.
 */
export function buildVenueMapLink(venue: string, coordinates?: { lat: number; lng: number }): string {
  if (coordinates && coordinates.lat && coordinates.lng) {
    const isApple = typeof navigator !== 'undefined' && /Mac|iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isApple) {
      return `maps://?q=${coordinates.lat},${coordinates.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
  }

  const query = encodeURIComponent(venue);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
