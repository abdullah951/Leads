export const API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    verifyEmail: '/api/auth/verify-email',
    // Updates the user's IANA timezone (called silently on login/signup)
    timezone: '/api/auth/timezone',
    // Firebase Google auth — verifies Firebase ID token and issues our own JWT cookies
    firebaseGoogle: '/api/auth/firebase-google',
  },
  leads: {
    search: '/api/leads/search',
    companies: '/api/leads/companies',
    reveal: '/api/leads/reveal',
    export: '/api/leads/export',
  },
  filters: {
    jobTitles: '/api/job-titles',
    locations: '/api/locations',
    industries: '/api/industries',
    technologies: '/api/technologies',
    skills: '/api/skills',
    managementLevels: '/api/filters/management-levels',
    departments: '/api/filters/departments',
    companySizes: '/api/filters/company-sizes',
    countries: '/api/filters/countries',
  },
  education: {
    majors: '/api/education/majors',
  },
  lists: {
    all: '/api/lists/all',
    search: '/api/lists',
    create: '/api/lists/create',
    rename: '/api/lists/rename',
    delete: '/api/lists/delete',
    addLeads: '/api/lists/add-leads',
    removeLeads: '/api/lists/remove-leads',
  },
  savedSearches: {
    list: '/api/saved-searches/list',
    save: '/api/saved-searches/save',
  },
  contacts: {
    reveal: '/api/leads/reveal',
    export: '/api/leads/export',
  },
  exportJobs: {
    list: '/api/export-jobs/list',
    delete: '/api/export-jobs/delete',
    // Deletes ALL export jobs for the current user (DB rows + local files)
    deleteAll: '/api/export-jobs/delete-all',
  },
  favorites: {
    add: '/api/favorites/add',
    list: '/api/favorites/list',
    remove: '/api/favorites/remove',
  },
  settings: {
    get: '/api/settings/get',                         // POST → fetch all settings for current user
    profile: '/api/settings/profile',                 // POST → update name / email
    avatar: '/api/settings/avatar',                   // POST (multipart) → upload profile photo
    password: '/api/settings/password',               // POST → change password (requires currentPassword)
    preferences: '/api/settings/preferences',         // POST → save export columns + theme
    notifications: '/api/settings/notifications',     // POST → credit alert toggle + threshold
    deleteAccount: '/api/settings/delete-account',    // POST → hard-delete user + all data
    billingPortal: '/api/settings/billing-portal',    // POST → Stripe customer portal session URL
    twoFaSetup: '/api/settings/2fa/setup',            // POST → generate TOTP secret + QR code data URL
    twoFaEnable: '/api/settings/2fa/enable',          // POST → verify code + enable 2FA
    twoFaDisable: '/api/settings/2fa/disable',        // POST → verify code + disable 2FA
  },
  feedback: {
    submit: '/api/feedback/submit',   // POST → submit new feedback item
    list: '/api/feedback/list',       // POST → paginated public feed + user vote state
    vote: '/api/feedback/vote',       // POST → toggle upvote on a feedback item
  },
  team: {
    list: '/api/team/list',       // POST → list all members for the current owner
    invite: '/api/team/invite',   // POST → send invite (email, role, creditQuota)
    remove: '/api/team/remove',   // POST → remove a member or revoke a pending invite
    updateQuota: '/api/team/update-quota', // POST → change a member's credit quota
    toggleAlert: '/api/team/toggle-alert',       // POST → toggle low-credit alert for a member
    acceptInvite: '/api/team/accept-invite',     // POST → accept invite by token, links user to team row
  },
  revealHistory: {
    // POST → paginated, searchable reveal history with full lead details
    list: '/api/reveal-history/list',
    // POST → export selected revealed contacts to CSV (reuses leads/export logic)
    export: '/api/leads/export',
  },
  credits: {
    balance: '/api/credits/balance',
  },
  stripe: {
    checkout: '/api/stripe/checkout',
    webhook: '/api/stripe/webhook',
  },
  uploadedFiles: {
    list: '/api/uploaded-files/list',
    upload: '/api/uploaded-files/upload',
    import: '/api/uploaded-files/import',
    delete: '/api/uploaded-files/delete',
    download: '/api/uploaded-files/download', // streams the CSV back as a file download
  },
  integrations: {
    status: '/api/integrations/status',             // POST → connected list + notify-me list + webhook count
    notifyMe: '/api/integrations/notify-me',        // POST → persist notify-me for a coming-soon provider
    webhooks: {
      list:   '/api/integrations/webhooks/list',    // POST → list user's webhook endpoints
      save:   '/api/integrations/webhooks/save',    // POST → create or update a webhook endpoint
      delete: '/api/integrations/webhooks/delete',  // POST → delete a webhook endpoint by id
      test:   '/api/integrations/webhooks/test',    // POST → send a test ping to an endpoint
    },
    // OAuth flow routes — GET for connect/callback/providerStatus, POST for disconnect/settings
    connect:        (provider: string) => `/api/integrations/${provider}/connect`,
    callback:       (provider: string) => `/api/integrations/${provider}/callback`,
    disconnect:     (provider: string) => `/api/integrations/${provider}/disconnect`,
    settings:       (provider: string) => `/api/integrations/${provider}/settings`,
    // Returns { configured: boolean; callbackUrl: string } — checks server-side env vars
    providerStatus: (provider: string) => `/api/integrations/${provider}/status`,
  },
  // Release reactions — emoji reactions on What's New cards
  releaseReactions: {
    // POST { versions: string[] } → { counts, mine }
    list:   '/api/release-reactions/list',
    // POST { version: string; emoji: string } → { version, emoji, count, userReacted }
    toggle: '/api/release-reactions/toggle',
  },
};
