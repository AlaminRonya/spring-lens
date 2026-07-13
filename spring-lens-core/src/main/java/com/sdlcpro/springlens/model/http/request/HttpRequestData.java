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
 * Multi-value query parameter list are defensively copied
 * to prevent the mutating the original '{@link #parameters}'
 * when supply to the caller the original map
 */
public record HttpRequestData(
        HttpRequestMethod method,
        String uri,
        Map<String, List<String>> parameters,
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

        parameters = parameters == null ? Map.of() : parameters.entrySet()
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue() == null ? List.of() : List.copyOf(entry.getValue())
                ));


        requestHeaders = requestHeaders == null ? List.of() : List.copyOf(requestHeaders);
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