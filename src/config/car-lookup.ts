// The shape of every catalogue slug: anything else cannot be a car.
export const CAR_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_CAR_SLUG_LENGTH = 200;

/** How long one server instance trusts its list of active car slugs before reading it again. */
export const ACTIVE_SLUGS_REFRESH_MS = 5 * 60_000;

/** How long it waits after a failed read before trying again. */
export const ACTIVE_SLUGS_RETRY_MS = 30_000;

/** How long a request waits for the first read of the list before it passes through unchecked. */
export const ACTIVE_SLUGS_READ_TIMEOUT_MS = 5_000;
