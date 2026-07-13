package com.sdlcpro.springlens.model.http.request;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import com.sdlcpro.springlens.util.Preconditions;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Immutable snapshot of an inbound HTTP request captured at the
 * interceptor boundary, used as the source data for trace recording.
 * <p>
 * Multi-value query parameter arrays are defensively copied both at
 * construction time and on every read via {@link #parameters()}, so that
 * neither the caller supplying the original map nor a caller mutating the
 * returned map's array values can affect this record's internal state.
 */
public record HttpRequestData(
        HttpRequestMethod method,
        String uri,
        Map<String, String[]> parameters,
        String protocol,
        String contentType,
        int contentSize,
        String clientIpAddress,
        List<Header> requestHeaders,
        String requestBody) {

    public HttpRequestData {
        Preconditions.notNull(method, "HttpRequestMethod must not be null");
        Preconditions.notNull(uri, "URI must not be null");
        Preconditions.notNull(protocol, "Protocol must not be null");

        parameters = cloneParameters(parameters);
        requestHeaders = requestHeaders == null ? List.of() : List.copyOf(requestHeaders);
    }

    @Override
    public Map<String, String[]> parameters() {
        return cloneParameters(parameters);
    }

    private static Map<String, String[]> cloneParameters(Map<String, String[]> source) {
        if (source == null) {
            return Map.of();
        }
        return Map.copyOf(source.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> entry.getValue() == null ? new String[0] : entry.getValue().clone())));
    }

    /**
     * Determines whether the captured request body was truncated relative
     * to the declared content size, e.g. when the interceptor stopped
     * reading before the full payload arrived.
     *
     * @return {@code true} if fewer bytes were captured than declared
     */
    public boolean isBodyTruncated() {
        if (this.requestBody == null) {
            return this.contentSize > 0;
        }

        int byteBodyLength = this.requestBody.getBytes(StandardCharsets.UTF_8).length;
        return byteBodyLength < this.contentSize;
    }
}