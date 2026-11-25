import * as CookieConsent from "vanilla-cookieconsent";

const GOOGLE_ANALYTICS_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

// Reference: https://cookieconsent.orestbida.com/advanced/language-configuration.html.
const language = {
  default: "en",
  translations: {
    en: {
      consentModal: {
        title: "We value your privacy",
        description:
          'Optional analytics cookies help us understand how visitors interact with our site. <button type="button" class="cc-inline-link" data-cc="show-preferencesModal">Manage preferences</button>',
        acceptAllBtn: "Accept all",
        acceptNecessaryBtn: "Reject optional"
      },
      preferencesModal: {
        title: "Cookie preferences",
        acceptAllBtn: "Accept all",
        acceptNecessaryBtn: "Reject optional",
        savePreferencesBtn: "Accept preferences",
        closeIconLabel: "Close modal",
        sections: [
          {
            description:
              'For more information on how we use cookies, read our <a href="/privacy-policy">Privacy Policy</a>.'
          },
          {
            title: "Strictly necessary cookies",
            description:
              "Strictly necessary cookies only store your cookie preferences.",
            linkedCategory: "necessary"
          },
          {
            title: "Analytics",
            description:
              "Optional analytics cookies help us understand how visitors interact with our site by collecting pseudonymized information with Google Analytics.",
            linkedCategory: "analytics"
          }
        ]
      }
    }
  }
};

/**
 * Create the Google Analytics scripts and append them to the document head.
 * @see https://developers.google.com/tag-platform/gtagjs.
 */
function createGoogleAnalyticsScripts() {
  if (!GOOGLE_ANALYTICS_ID) {
    console.warn("Google Analytics ID is not set.");
    return;
  }

  // We don't expect this function to be called more than once, but just in case,
  // we'll check if the scripts already exist before creating them.
  const gtagScriptId = "stacks-google-analytics-script";
  let gtagScript = document.getElementById(gtagScriptId);

  const configScriptId = "stacks-google-analytics-config-script";
  let configScript = document.getElementById(configScriptId);

  // Create the Google Analytics script.
  if (!gtagScript) {
    gtagScript = document.createElement("script");
    gtagScript.setAttribute("id", gtagScriptId);
    // @ts-expect-error - The script element has a src attribute.
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`;
  }

  // Create the Google Analytics config script.
  if (!configScript) {
    configScript = document.createElement("script");
    configScript.setAttribute("id", configScriptId);
    configScript.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "${GOOGLE_ANALYTICS_ID}");
  `;
  }

  // Append the scripts to the document head.
  document.head.appendChild(gtagScript);
  document.head.appendChild(configScript);
}

const cookieConsentConfig: CookieConsent.CookieConsentConfig = {
  categories: {
    necessary: {
      enabled: true, // this category is enabled by default
      readOnly: true // this category cannot be disabled
    },
    analytics: {}
  },
  cookie: {
    name: "stacks_cc_cookie"
  },
  guiOptions: {
    consentModal: {
      layout: "bar inline",
      position: "bottom",
      flipButtons: true,
      equalWeightButtons: false
    },
    preferencesModal: {
      layout: "box",
      equalWeightButtons: false
    }
  },
  // This event is triggered the very first time the user expresses
  // their choice of consent, and also on every subsequent page load.
  onConsent: (consent) => {
    if (consent.cookie.categories.includes("analytics")) {
      createGoogleAnalyticsScripts();
    }
  },
  // This event is triggered when the user modifies their preferences,
  // and only if consent has already been provided.
  onChange: ({ cookie }) => {
    if (cookie.categories.includes("analytics")) {
      createGoogleAnalyticsScripts();
    } else {
      // Reload the page to re-run the updated cookie consent flow,
      // which will NOT initialize the Google Analytics scripts.
      // We could remove the scripts from the document head, but this
      // is simpler and provides the user with immediate feedback.
      window.location.reload();
    }
  },
  language
};

export function runCookieConsent() {
  CookieConsent.run(cookieConsentConfig);
}

export function getCookieConsentPreferences() {
  return CookieConsent.getUserPreferences();
}

export function showCookieConsentPreferences() {
  CookieConsent.showPreferences();
}
