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
public final class HttpRequestData {
    private final HttpRequestMethod method;
    private final String uri;
    private final Map<String, List<String>> parameters;
    private final String protocol;
    private final String contentType;
    private final int contentSize;
    private final String clientIpAddress;
    private final List<HttpHeader> requestHeaders;
    private final String requestBody;
    private final boolean bodyTruncated;

    public HttpRequestData(
            HttpRequestMethod method, String uri, Map<String, List<String>> parameters, String protocol,
            String contentType, int contentSize, String clientIpAddress, List<HttpHeader> requestHeaders,
            String requestBody) {
        this.method = Preconditions.requireNonNull(method, "HttpRequestMethod must not be null");
        this.uri = Preconditions.requireNonNull(uri, "URI must not be null");
        this.protocol = Preconditions.requireNonNull(protocol, "Protocol must not be null");

        this.contentType = contentType;
        this.contentSize = contentSize;
        this.clientIpAddress = clientIpAddress;
        this.requestBody = requestBody;

        this.requestHeaders = requestHeaders == null ? List.of() : List.copyOf(requestHeaders);
        this.parameters = parameters == null ? Map.of() : parameters.entrySet()
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue() == null ? List.of() : List.copyOf(entry.getValue())
                ));

        this.bodyTruncated = this.requestBody == null
                ? this.contentSize > 0
                : this.requestBody.getBytes(StandardCharsets.UTF_8).length < this.contentSize;
    }

    public HttpRequestMethod getMethod() {
        return method;
    }

    public String getUri() {
        return uri;
    }

    public Map<String, List<String>> getParameters() {
        return parameters;
    }

    public String getProtocol() {
        return protocol;
    }

    public String getContentType() {
        return contentType;
    }

    public int getContentSize() {
        return contentSize;
    }

    public String getClientIpAddress() {
        return clientIpAddress;
    }

    public List<HttpHeader> getRequestHeaders() {
        return requestHeaders;
    }

    public String getRequestBody() {
        return requestBody;
    }

    /**
     * Determines whether the captured request body was truncated relative
     * to the declared content size, e.g. when the interceptor stopped
     * reading before the full payload arrived.
     *
     * @return {@code true} if fewer bytes were captured than declared
     */
    public boolean isBodyTruncated() {
        return this.bodyTruncated;
    }
}
