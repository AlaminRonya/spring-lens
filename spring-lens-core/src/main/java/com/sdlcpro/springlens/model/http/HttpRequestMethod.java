package com.sdlcpro.springlens.model.http;

import java.util.Arrays;
import java.util.Locale;

/**
 * Represents the HTTP request methods recognized by Spring Lens.
 * <p>
 * This enumeration provides a type-safe representation of standard HTTP
 * request methods used during endpoint discovery and telemetry collection.
 * Unknown or unsupported request methods are safely mapped to
 * {@link #UNDEFINED}.
 */
public enum HttpRequestMethod {

    /**
     * HTTP GET method.
     */
    GET("GET"),

    /**
     * HTTP HEAD method.
     */
    HEAD("HEAD"),

    /**
     * HTTP POST method.
     */
    POST("POST"),

    /**
     * HTTP PUT method.
     */
    PUT("PUT"),

    /**
     * HTTP PATCH method.
     */
    PATCH("PATCH"),

    /**
     * HTTP DELETE method.
     */
    DELETE("DELETE"),

    /**
     * HTTP OPTIONS method.
     */
    OPTIONS("OPTIONS"),

    /**
     * HTTP TRACE method.
     */
    TRACE("TRACE"),

    /**
     * Represents an unknown or unsupported HTTP request method.
     */
    UNDEFINED("UNDEFINED");

    private final String value;

    HttpRequestMethod(String value) {
        this.value = value;
    }

    /**
     * Returns the corresponding {@code HttpRequestMethod} for the supplied
     * request method value.
     * <p>
     * Leading and trailing whitespace is ignored, and matching is performed
     * in a case-insensitive manner. If the supplied value is {@code null},
     * blank, or does not match any supported HTTP method,
     * {@link #UNDEFINED} is returned.
     *
     * @param value the HTTP request method to parse
     * @return the matching {@code HttpRequestMethod}, or {@link #UNDEFINED}
     * if no match exists
     */
    public static HttpRequestMethod from(String value) {
        if (value == null || value.isBlank()) {
            return UNDEFINED;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);

        return Arrays.stream(values())
                .filter(method -> method.value.equals(normalized))
                .findFirst()
                .orElse(UNDEFINED);
    }

    /**
     * Returns the canonical string representation of this HTTP request method.
     *
     * @return the HTTP request method value
     */
    public String value() {
        return this.value;
    }
}