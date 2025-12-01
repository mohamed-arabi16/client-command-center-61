/**
 * Extract Instagram username from various URL formats
 * Handles: instagram.com/username, instagram.com/username/, @username
 */
export function extractInstagramHandle(input: string): string | null {
  if (!input) return null;
  
  // Remove @ if present
  let cleaned = input.trim().replace('@', '');
  
  // If it's a URL, extract username
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/([a-zA-Z0-9._]+)/,
  ];
  
  for (const pattern of urlPatterns) {
    const match = cleaned.match(pattern);
    if (match) return match[1];
  }
  
  // If it's just a username
  if (/^[a-zA-Z0-9._]+$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Validate Instagram URL format
 */
export function isValidInstagramUrl(input: string): boolean {
  const handle = extractInstagramHandle(input);
  return handle !== null;
}
