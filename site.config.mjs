// One place for everything you will change after the sandbox.
export default {
  siteUrl: 'https://www.codifiedresonance.com',

  // Formspree form id (the part after /f/ in your endpoint). Empty = Send Signal
  // shows its states but sends nothing.
  formspreeId: '',

  // Stripe Payment Link for acquiring the key to a sealed blueprint.
  // Empty = the "Acquire the key" link says it is not connected yet.
  stripeAcquireUrl: '',

  // Access keys for sealed blueprints. The text is encrypted with the key at
  // build time, so the published page holds no readable copy.
  // Set VAULT_KEY_THE_FLOOD in Cloudflare Pages > Settings > Environment variables.
  // The fallback below is the SANDBOX key only. Replace it before launch.
  sealedKeys: {
    'the-flood': process.env.VAULT_KEY_THE_FLOOD || 'ARK-0000',
  },
};
