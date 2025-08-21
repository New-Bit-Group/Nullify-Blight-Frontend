declare global {
    namespace NodeJS {
        interface ProcessEnv {
            readonly RUN_ANALY: string;
            readonly API_URL: string;
            readonly GITHUB_CLIENT_ID: string;
            readonly TURNSTILE_SITE_KEY: string;
        }
    }
}

export {};
