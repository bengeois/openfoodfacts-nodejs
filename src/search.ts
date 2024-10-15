import createClient from "openapi-fetch";

import { components, paths } from "./schemas/search";
import { SearchALiciousError } from "./error";

export type Flag = components["schemas"]["FlagCreate"];
export type Ticket = components["schemas"]["Ticket"];
export type FlagResponse = {
    __data__: Flag;
    _dirty: any[];
    __rel__: object;
};

export type FlagsResponse = {
    flags: Flag[];
};

export type FlagBatchResponse = {
    ticket_id_to_flags: {
        [ticketId: string]: Flag[];
    };
};

export type TicketsResponse = {
    tickets: Ticket[];
};

export type HealthResponse = {
    hostname: string;
    status: string;
    timestamp: number;
    results: [{
        checker: string;
        output: string;
        passed: boolean;
        timestamp: number;
        expires: number;
        response_time: number;
    }]
};

export class SearchALicious {
    private readonly fetch: typeof global.fetch;
    private readonly baseUrl: string;
    readonly raw: ReturnType<typeof createClient<paths>>;

    constructor(fetch: typeof global.fetch) {
        this.baseUrl = "https://nutripatrol.openfoodfacts.org";

        this.fetch = fetch;
        this.raw = createClient({
            baseUrl: this.baseUrl,
            fetch,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    private async fetchApi<T>(
        method: "GET" | "POST" | "PUT" | "DELETE",
        path: string,
        options: any = {},
    ): Promise<T | NutriPatrolError> {
        const methods = {
            GET: this.raw.GET,
            POST: this.raw.POST,
            PUT: this.raw.PUT,
            DELETE: this.raw.DELETE,
        };

        try {
            const fct = methods[method] as any;
            const res = await fct(path as any, options as any);

            if (!res.response.ok) {
                switch (res.response.status) {
                    case 422:
                        return {
                            error: {
                                statusCode: 422,
                                message: "Validation error",
                                details: res.error?.detail?.map((d: any) => d.msg),
                            },
                        } as NutriPatrolError;
                    default:
                        const errorDetails = await res.response.json();
                        return {
                            error: {
                                statusCode: res.response.status,
                                message: "Error while requesting Nutripatrol API",
                                details: errorDetails,
                            },
                        } as NutriPatrolError;
                }
            }

            const data = await res.response.json();

            if (!data) {
                return {
                    error: {
                        statusCode: 500,
                        message: "Malformed API response",
                    },
                };
            }

            return data;
        } catch (error) {
            return {
                error: {
                    statusCode: 500,
                    message: "An unexpected error occurred",
                },
            };
        }
    }

    /**
     * List all flags.
     *
     * @returns {Promise<Flag[] | NutriPatrolError>} - A promise that resolves with the list of flag data or error.
     *
     * The error can be one of the following:
     * - A `NutriPatrolError` with status 422 if there is a validation issue (e.g., invalid flag ID).
     * - A `NutriPatrolError` with the corresponding HTTP status code for other types of errors (e.g., 404, 500).
     * - A generic `NutriPatrolError` with status 500 for unexpected errors.
     *
     */
    async getFlags(): Promise<Flag[] | NutriPatrolError> {
        const data = await this.fetchApi<FlagsResponse>("GET", `/api/v1/flags`);
        if ("error" in data) {
            return data;
        }
        return data.flags;
    }

    /**
     * Get the health of the Search-A-Licious API.
     *
     * @returns {Promise<HealthResponse | NutriPatrolError>} - A promise that resolves with the API health status or error.
     *
     * The error can be one of the following:
     * - A `SearchALiciousError` with the corresponding HTTP status code for other types of errors (e.g., 404, 500).
     * - A generic `SearchALiciousError` with status 500 for unexpected errors.
    *
    */
    async getApiHealth(): Promise<HealthResponse | SearchALiciousError> {
        const data = await this.fetchApi<HealthResponse>(
            "GET",
            `/health`,
        );
        if ("error" in data) {
            return data;
        }
        return data;
    }
}