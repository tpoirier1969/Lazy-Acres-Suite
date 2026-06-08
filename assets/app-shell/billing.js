export const billingMode = 'not-implemented';

export const billingService = {
  mode: billingMode,

  async getBillingStatus() {
    return {
      enabled: false,
      provider: null,
      message: 'Billing is intentionally not implemented. Stripe should be added later behind this service.',
    };
  },

  async startCheckout() {
    return { ok: false, reason: 'Stripe checkout is intentionally not implemented yet.' };
  },
};
