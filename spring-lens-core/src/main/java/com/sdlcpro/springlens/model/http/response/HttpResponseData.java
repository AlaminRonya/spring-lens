package com.sdlcpro.springlens.model.http.response;

import com.sdlcpro.springlens.model.http.HttpResponseStatus;
import com.sdlcpro.springlens.model.http.request.Header;
import com.sdlcpro.springlens.util.Preconditions;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Immutable snapshot of an outbound HTTP response captured at the
 * interceptor boundary, used as the source data for trace recording.
 * <p>
 * Declared as a classic final POJO rather than a record so that the
 * truncation flag can be pre-computed once in the constructor and
 * exposed as a plain field, avoiding repeated byte-length computation
 * on every {@link #isBodyTruncated()} call.
 */
public final class HttpResponseData {

    private final HttpResponseStatus status;
    private final String contentType;
    private final int contentSize;
    private final List<Header> responseHeaders;
    private final String responseBody;
    private final boolean bodyTruncated;

    public HttpResponseData(HttpResponseStatus status, String contentType, int contentSize,
            List<Header> responseHeaders, String responseBody) {
        this.status = Preconditions.requireNonNull(status, "HttpResponseStatus must not be null");
        this.contentType = contentType;
        this.contentSize = contentSize;
        this.responseBody = responseBody;

        if (responseHeaders == null) {
            this.responseHeaders = List.of();
        } else {
            Preconditions.noNullElements(responseHeaders, "The responseHeaders must not contain null elements");
            this.responseHeaders = List.copyOf(responseHeaders);
        }

        this.bodyTruncated = this.responseBody == null
                ? this.contentSize > 0
                : this.responseBody.getBytes(StandardCharsets.UTF_8).length < this.contentSize;
    }

    public HttpResponseStatus getStatus() {
        return this.status;
    }

    public String getStatusName() {
        return this.status.name();
    }

    public int getStatusCode() {
        return this.status.getCode();
    }

    public String getContentType() {
        return this.contentType;
    }

    public int getContentSize() {
        return this.contentSize;
    }

    public List<Header> getResponseHeaders() {
        return this.responseHeaders;
    }

    public String getResponseBody() {
        return this.responseBody;
    }

    /**
     * Indicates whether the captured response body was truncated relative
     * to the declared content size, e.g. when the interceptor stopped
     * reading before the full payload arrived.
     *
     * @return {@code true} if fewer bytes were captured than declared
     */
    public boolean isBodyTruncated() {
        return this.bodyTruncated;
    }
}