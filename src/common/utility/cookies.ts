import { serviceConfig } from "../../config/env.config";

export function getRefreshCookieOptions() {
    return {
        httpOnly: true,
        secure: serviceConfig.service.nodeEnv,
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}