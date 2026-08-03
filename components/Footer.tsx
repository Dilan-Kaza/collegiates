"use client";

import { Link } from "@/routerCompat";

// Small site-wide sign-off rendered under every page's content by the root
// layout, mirroring the old site's #siteInfo strip.
function Footer() {
  return (
    <footer className="text-center text-xs text-off-white py-6">
      <Link to="/contact" className="hover:underline">
        Questions? Contact us
      </Link>
    </footer>
  );
}

export { Footer };
