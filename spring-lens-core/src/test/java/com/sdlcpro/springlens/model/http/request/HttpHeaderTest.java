package com.sdlcpro.springlens.model.http.request;

import com.sdlcpro.springlens.model.http.request.HttpHeader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HttpHeaderTest {

    @Test
    @DisplayName("should store name and values correctly")
    void storesNameAndValues() {
        HttpHeader header = new HttpHeader("Content-Type", List.of("application/json"));
        assertEquals("Content-Type", header.name());
        assertEquals(List.of("application/json"), header.values());
    }

    @Test
    @DisplayName("should default null values to an empty list")
    void defaultsNullValuesToEmptyList() {
        HttpHeader header = new HttpHeader("X-Custom", null);
        assertTrue(header.values().isEmpty());
    }

    @Test
    @DisplayName("should reject blank header name")
    void rejectsBlankName() {
        assertThrows(IllegalArgumentException.class, () -> new HttpHeader("  ", List.of("value")));
    }

    @Test
    @DisplayName("should reject null header name")
    void rejectsNullName() {
        assertThrows(IllegalArgumentException.class, () -> new HttpHeader(null, List.of("value")));
    }

    @Test
    @DisplayName("should reject values list containing null elements")
    void rejectsNullElementInValues() {
        List<String> values = new ArrayList<>();
        values.add("application/json");
        values.add(null);
        assertThrows(IllegalArgumentException.class, () -> new HttpHeader("Accept", values));
    }

    @Test
    @DisplayName("values list should be immutable")
    void valuesListIsImmutable() {
        HttpHeader header = new HttpHeader("Accept", List.of("application/json"));
        assertThrows(UnsupportedOperationException.class, () -> header.values().add("text/html"));
    }
}