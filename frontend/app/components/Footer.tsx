import PrivacyChoicesIcon from "@/components/icons/PrivacyChoices";
import TheStacksLogo from "@/components/icons/TheStacksLogo";
import Link from "@/components/Link";
import { showCookieConsentPreferences } from "@/lib/cookieConsent";

export default function Footer() {
  return (
    <footer className="text-body-20 bg-footer text-off-white py-10 print:hidden">
      <div className="max-w-container container:px-0 mx-auto w-full px-4">
        <div className="flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
          <Link to="/" aria-label="Home">
            <TheStacksLogo className="h-auto w-20 md:w-30" />
          </Link>
          <div className="flex flex-col items-start gap-10 md:items-end md:gap-5">
            <nav aria-label="Footer">
              <ul className="flex flex-col gap-3 md:flex-row md:gap-6">
                <li>
                  <Link
                    to="/about"
                    className="hover:underline hover:underline-offset-4"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <a
                    href="https://docs.thestacks.org"
                    className="hover:underline hover:underline-offset-4"
                  >
                    Docs
                  </a>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:underline hover:underline-offset-4"
                  >
                    Terms of use
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy-policy"
                    className="hover:underline hover:underline-offset-4"
                  >
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={showCookieConsentPreferences}
                    className="pointer-events-auto flex items-center gap-2"
                  >
                    <span className="hover:underline hover:underline-offset-4">
                      Your privacy choices
                    </span>
                    <PrivacyChoicesIcon height={16} aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </nav>
            <div>
              © {new Date().getFullYear()} Astera Institute. All rights
              reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
