const NOISE_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|otf|mp4|mp3|pdf)$/i,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^\.cache\//,
  /^coverage\//,
];

/**
 * Filters GitHub tree items, removing noise files that add no analysis value.
 * @param {Array} items - raw GitHub git/trees response items
 * @returns {Array} filtered items
 */
export function filterNoise(items) {
  return items.filter(
    (item) => !NOISE_PATTERNS.some((re) => re.test(item.path))
  );
}
