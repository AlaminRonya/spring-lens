package com.sdlcpro.springlens.model.http.request;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HttpRequestDataTest {

    private HttpRequestData sample(Map<String, List<String>> parameters, String requestBody, int contentSize) {
        return new HttpRequestData(
                HttpRequestMethod.GET,
                "/api/orders",
                parameters,
                "HTTP/1.1",
                "application/json",
                contentSize,
                "127.0.0.1",
                List.of(new Header("Content-Type", List.of("application/json"))),
                requestBody);
    }

    @Test
    @DisplayName("should reject null method, uri, or protocol")
    void rejectsNullRequiredFields() {
        assertThrows(IllegalArgumentException.class, () -> new HttpRequestData(null, "/x", Map.of(), "HTTP/1.1",
                "text/plain", 0, "127.0.0.1", List.of(), null));
        assertThrows(IllegalArgumentException.class, () -> new HttpRequestData(HttpRequestMethod.GET, null, Map.of(),
                "HTTP/1.1", "text/plain", 0, "127.0.0.1", List.of(), null));
        assertThrows(IllegalArgumentException.class, () -> new HttpRequestData(HttpRequestMethod.GET, "/x", Map.of(),
                null, "text/plain", 0, "127.0.0.1", List.of(), null));
    }

    @Test
    @DisplayName("should not be affected by mutating the original parameters map after construction")
    void isNotAffectedByMutatingOriginalMapAfterConstruction() {
        Map<String, List<String>> original = new HashMap<>();
        original.put("page", new ArrayList<>(List.of("1")));

        HttpRequestData data = sample(original, null, 0);
        original.get("page").set(0, "999");
        original.put("extra", List.of("leaked"));

        assertEquals("1", data.getParameters().get("page").get(0));
        assertFalse(data.getParameters().containsKey("extra"));
    }

    @Test
    @DisplayName("should not mutated internal state through the returned parameters map")
    void doesNotExposeInternalStateThroughAccessor() {
        Map<String, List<String>> original = Map.of("page", List.of("1"));
        HttpRequestData data = sample(original, null, 0);
        assertThrows(UnsupportedOperationException.class, () -> data.getParameters().get("page").set(0, "mutated"));
    }

    @Test
    @DisplayName("should flag body as truncated when captured bytes are fewer than declared content size")
    void flagsTruncatedBody() {
        HttpRequestData data = sample(Map.of(), "partial", 100);
        assertTrue(data.isBodyTruncated());
    }

    @Test
    @DisplayName("should not flag body as truncated when full content was captured")
    void doesNotFlagCompleteBody() {
        String body = "{\"ok\":true}";
        int size = body.getBytes(StandardCharsets.UTF_8).length;
        HttpRequestData data = sample(Map.of(), body, size);
        assertFalse(data.isBodyTruncated());
    }

    @Test
    @DisplayName("should flag body as truncated when body is null but content size is positive")
    void flagsTruncatedWhenBodyNullAndContentSizePositive() {
        HttpRequestData data = sample(Map.of(), null, 50);
        assertTrue(data.isBodyTruncated());
    }
}