package com.sdlcpro.springlens.model.http.request;

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
    EARLY_HINTS(103),
    @Deprecated
    CHECKPOINT(103),

    OK(200),
    CREATED(201),
    ACCEPTED(202),
    NON_AUTHORITATIVE_INFORMATION(203),
    NO_CONTENT(204),
    RESET_CONTENT(205),
    PARTIAL_CONTENT(206),
    MULTI_STATUS(207),
    ALREADY_REPORTED(208),
    IM_USED(226),

    MULTIPLE_CHOICES(300),
    MOVED_PERMANENTLY(301),
    FOUND(302),
    @Deprecated
    MOVED_TEMPORARILY(302),
    SEE_OTHER(303),
    NOT_MODIFIED(304),
    USE_PROXY(305),
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
    @Deprecated
    REQUEST_ENTITY_TOO_LARGE(413),
    URI_TOO_LONG(414),
    @Deprecated
    REQUEST_URI_TOO_LONG(414),
    UNSUPPORTED_MEDIA_TYPE(415),
    REQUESTED_RANGE_NOT_SATISFIABLE(416),
    EXPECTATION_FAILED(417),
    I_AM_A_TEAPOT(418),
    INSUFFICIENT_SPACE_ON_RESOURCE(419),
    METHOD_FAILURE(420),
    DESTINATION_LOCKED(421),
    UNPROCESSABLE_ENTITY(422),
    LOCKED(423),
    FAILED_DEPENDENCY(424),
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
    VARIANT_ALSO_NEGOTIATES(506),
    INSUFFICIENT_STORAGE(507),
    LOOP_DETECTED(508),
    BANDWIDTH_LIMIT_EXCEEDED(509),
    NOT_EXTENDED(510),
    NETWORK_AUTHENTICATION_REQUIRED(511);

    private static final int MAX_CODE = 511;
    private static final HttpResponseStatus[] VALUES;

    private final int code;

    static {
        VALUES = values();
    }


    HttpResponseStatus(int code) {
        this.code = code;
    }

    /**
     * Returns the corresponding {@code HttpResponseStatus} for the supplied
     * numeric status code.
     * <p>
     *
     * @param code the HTTP response status code to resolve
     * @return the matching {@code HttpResponseStatus}, or {@link #UNKNOWN}
     * if no match exists
     */
    public static HttpResponseStatus from(int code) {
        if (code < 0 || code > MAX_CODE) {
            return UNKNOWN;
        }

        for (HttpResponseStatus status : VALUES) {
            if (status.code == code) {
                return status;
            }
        }

        return UNKNOWN;
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
