package com.sdlcpro.springlens.model.http.request;

import com.sdlcpro.springlens.util.Preconditions;

import java.util.List;

/**
 * Represents a single HTTP header entry captured during request/response
 * interception, preserving its canonical name and all associated values.
 */
public record Header(String name, List<String> values) {

    public Header {
        Preconditions.hasText(name, "Header name must not be blank");

        if (values != null) {
            Preconditions.noNullElements(values, "Header values must not contain null elements");
            values = List.copyOf(values);
        } else {
            values = List.of();
        }
    }
}