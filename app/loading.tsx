import LoadingScreen from "@components/LoadingScreen";

// Next.js route-level loading UI. Next wraps the page in a Suspense boundary
// whose fallback is this component, so it shows automatically whenever a page's
// server component is still resolving — i.e. while the server verifies the
// session (requireUser / requireOrganizer) and fetches first-load data, on the
// initial load and on navigation. Covers every route that doesn't define its
// own loading.tsx.
export default function Loading() {
  return <LoadingScreen />;
}
