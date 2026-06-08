export const entitlementMode = 'testing-open-all';

export const entitlementService = {
  mode: entitlementMode,

  async getModuleAccess(user, appModule) {
    return {
      moduleSlug: appModule.slug,
      userId: user?.id ?? null,
      canView: true,
      canOpen: true,
      reason: 'Testing mode: all modules are visible and open for Tod and Donna without login.',
    };
  },

  async listVisibleModules(user, modules) {
    const accessEntries = await Promise.all(
      modules.map(async (appModule) => ({
        appModule,
        access: await this.getModuleAccess(user, appModule),
      })),
    );

    return accessEntries
      .filter(({ access }) => access.canView)
      .map(({ appModule }) => appModule);
  },
};
