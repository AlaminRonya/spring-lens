/**
 * HttpClient
 * Dedicated HTTP client responsible solely for handling API calls and returning pure data payloads.
 */
class HttpClient {
    async get(endpointUrl) {
        const response = await fetch(endpointUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    async getWithQuery(baseUrl, queryParams) {
        const requestUrl = `${baseUrl}?${queryParams}`;
        const response = await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
}

const httpClient = new HttpClient();
export default httpClient;