import LoadingScreen from "@components/LoadingScreen";

// Route-level Suspense fallback, shown while a page's server component resolves
// (session gate + first-load data). Covers every route without its own loading.tsx.
export default function Loading() {
  return <LoadingScreen />;
}
