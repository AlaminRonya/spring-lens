package com.sdlcpro.springlens.model.http;

/**
 * Represents the HTTP response status codes recognized by Spring Lens.
 * <p>
 * This enumeration provides a type-safe representation of standard HTTP
 * response status codes captured at the interceptor filter layer. Lookups
 * by numeric code are resolved in constant time: valid codes are pre-indexed
 * into a fixed-size array during class initialization, avoiding both
 * repeated {@code values()} array cloning and any per-call linear scan.
 * Unknown or unsupported status codes are safely mapped to {@link #UNKNOWN}.
 */
public enum HttpResponseStatus {

    UNKNOWN(-1),

    CONTINUE(100),
    SWITCHING_PROTOCOLS(101),
    PROCESSING(102),

    OK(200),
    CREATED(201),
    ACCEPTED(202),
    NON_AUTHORITATIVE_INFORMATION(203),
    NO_CONTENT(204),
    RESET_CONTENT(205),
    PARTIAL_CONTENT(206),

    MULTIPLE_CHOICES(300),
    MOVED_PERMANENTLY(301),
    FOUND(302),
    SEE_OTHER(303),
    NOT_MODIFIED(304),
    TEMPORARY_REDIRECT(307),
    PERMANENT_REDIRECT(308),

    BAD_REQUEST(400),
    UNAUTHORIZED(401),
    PAYMENT_REQUIRED(402),
    FORBIDDEN(403),
    NOT_FOUND(404),
    METHOD_NOT_ALLOWED(405),
    NOT_ACCEPTABLE(406),
    PROXY_AUTHENTICATION_REQUIRED(407),
    REQUEST_TIMEOUT(408),
    CONFLICT(409),
    GONE(410),
    LENGTH_REQUIRED(411),
    PRECONDITION_FAILED(412),
    PAYLOAD_TOO_LARGE(413),
    URI_TOO_LONG(414),
    UNSUPPORTED_MEDIA_TYPE(415),
    EXPECTATION_FAILED(417),
    UNPROCESSABLE_ENTITY(422),
    TOO_EARLY(425),
    UPGRADE_REQUIRED(426),
    PRECONDITION_REQUIRED(428),
    TOO_MANY_REQUESTS(429),
    REQUEST_HEADER_FIELDS_TOO_LARGE(431),
    UNAVAILABLE_FOR_LEGAL_REASONS(451),

    INTERNAL_SERVER_ERROR(500),
    NOT_IMPLEMENTED(501),
    BAD_GATEWAY(502),
    SERVICE_UNAVAILABLE(503),
    GATEWAY_TIMEOUT(504),
    HTTP_VERSION_NOT_SUPPORTED(505),
    INSUFFICIENT_STORAGE(507),
    LOOP_DETECTED(508),
    NOT_EXTENDED(510),
    NETWORK_AUTHENTICATION_REQUIRED(511);

    private static final int MAX_CODE = 511;

    private static final HttpResponseStatus[] BY_CODE;

    static {
        BY_CODE = new HttpResponseStatus[MAX_CODE + 1];
        for (HttpResponseStatus status : values()) {
            if (status.code >= 0 && status.code <= MAX_CODE) {
                BY_CODE[status.code] = status;
            }
        }
    }

    private final int code;

    HttpResponseStatus(int code) {
        this.code = code;
    }

    /**
     * Returns the corresponding {@code HttpResponseStatus} for the supplied
     * numeric status code.
     * <p>
     * Resolution is performed in constant time via a pre-built lookup array,
     * with an early range check ({@code code < 0 || code > 511}) so that
     * out-of-range values fast-fail to {@link #UNKNOWN} without touching the
     * array. If the supplied code falls within range but has no mapped
     * constant, {@link #UNKNOWN} is also returned.
     *
     * @param code the HTTP response status code to resolve
     * @return the matching {@code HttpResponseStatus}, or {@link #UNKNOWN}
     * if no match exists
     */
    public static HttpResponseStatus from(int code) {
        if (code < 0 || code > MAX_CODE) {
            return UNKNOWN;
        }

        HttpResponseStatus status = BY_CODE[code];
        return status != null ? status : UNKNOWN;
    }

    /**
     * Returns the numeric HTTP response status code.
     *
     * @return the status code
     */
    public int getCode() {
        return this.code;
    }
}