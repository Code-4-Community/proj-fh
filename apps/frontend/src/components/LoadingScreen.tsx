/**
 * Full-viewport loading indicator. The same markup and classes are used in index.html
 * (shown before React mounts), so the spinner doesn't visibly change when React takes over.
 *
 * @returns The loading screen.
 */
const LoadingScreen = () => (
  <div className="loading-screen" role="status" aria-live="polite">
    <span className="loading-spinner" aria-hidden="true" />
    <span className="loading-label">Loading</span>
  </div>
);

export default LoadingScreen;
