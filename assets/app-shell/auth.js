export const authMode = 'testing';

export const testUsers = [
  {
    id: 'tod-test-user',
    displayName: 'Tod',
    role: 'household-tester',
  },
  {
    id: 'donna-test-user',
    displayName: 'Donna',
    role: 'household-tester',
  },
];

export const authService = {
  mode: authMode,

  async getCurrentUser() {
    return {
      id: 'testing-household-session',
      displayName: 'Tod and Donna',
      role: 'testing-household',
      testers: testUsers,
      isAuthenticated: false,
      isTestingMode: true,
    };
  },

  async signIn() {
    return { ok: false, reason: 'Auth is intentionally not implemented yet.' };
  },

  async signOut() {
    return { ok: true, reason: 'No authenticated session exists in testing mode.' };
  },
};
