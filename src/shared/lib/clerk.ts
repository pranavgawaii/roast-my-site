export const CLERK_PUBLISHABLE_KEY =
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "";

export const IS_CLERK_CONFIGURED = Boolean(CLERK_PUBLISHABLE_KEY);
