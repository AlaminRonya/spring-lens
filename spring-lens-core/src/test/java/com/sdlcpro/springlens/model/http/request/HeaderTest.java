package com.sdlcpro.springlens.model.http.request;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HeaderTest {

    @Test
    @DisplayName("should store name and values correctly")
    void storesNameAndValues() {
        Header header = new Header("Content-Type", List.of("application/json"));
        assertEquals("Content-Type", header.name());
        assertEquals(List.of("application/json"), header.values());
    }

    @Test
    @DisplayName("should default null values to an empty list")
    void defaultsNullValuesToEmptyList() {
        Header header = new Header("X-Custom", null);
        assertTrue(header.values().isEmpty());
    }

    @Test
    @DisplayName("should reject blank header name")
    void rejectsBlankName() {
        assertThrows(IllegalArgumentException.class, () -> new Header("  ", List.of("value")));
    }

    @Test
    @DisplayName("should reject null header name")
    void rejectsNullName() {
        assertThrows(IllegalArgumentException.class, () -> new Header(null, List.of("value")));
    }

    @Test
    @DisplayName("should reject values list containing null elements")
    void rejectsNullElementInValues() {
        List<String> values = new ArrayList<>();
        values.add("application/json");
        values.add(null);
        assertThrows(IllegalArgumentException.class, () -> new Header("Accept", values));
    }

    @Test
    @DisplayName("values list should be immutable")
    void valuesListIsImmutable() {
        Header header = new Header("Accept", List.of("application/json"));
        assertThrows(UnsupportedOperationException.class, () -> header.values().add("text/html"));
    }
}