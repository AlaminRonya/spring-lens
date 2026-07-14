package com.sdlcpro.springlens.model.http.request;

import com.sdlcpro.springlens.model.http.HttpResponseStatus;
import com.sdlcpro.springlens.model.http.request.Header;
import com.sdlcpro.springlens.model.http.request.HttpResponseData;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HttpResponseDataTest {

    @Test
    @DisplayName("should reject null status")
    void rejectsNullStatus() {
        assertThrows(IllegalArgumentException.class, () ->
                new HttpResponseData(null, "application/json", 0, List.of(), null));
    }

    @Test
    @DisplayName("should expose status name and code from HttpResponseStatus")
    void exposesStatusNameAndCode() {
        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.NOT_FOUND, "application/json", 0, List.of(), null);

        assertEquals("NOT_FOUND", data.getStatusName());
        assertEquals(404, data.getStatusCode());
    }

    @Test
    @DisplayName("should default null response headers to an empty list")
    void defaultsNullHeadersToEmptyList() {
        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.OK, "text/plain", 0, null, null);

        assertTrue(data.getResponseHeaders().isEmpty());
    }

    @Test
    @DisplayName("should reject response headers list containing null elements")
    void rejectsNullElementInResponseHeaders() {
        List<Header> headers = new ArrayList<>();
        headers.add(new Header("Content-Type", List.of("application/json")));
        headers.add(null);

        assertThrows(IllegalArgumentException.class, () ->
                new HttpResponseData(HttpResponseStatus.OK, "application/json", 0, headers, null));
    }

    @Test
    @DisplayName("response headers list should be immutable")
    void responseHeadersListIsImmutable() {
        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.OK, "application/json", 0,
                List.of(new Header("Content-Type", List.of("application/json"))), null);

        assertThrows(UnsupportedOperationException.class,
                () -> data.getResponseHeaders().add(new Header("X-Extra", List.of("value"))));
    }

    @Test
    @DisplayName("should not be affected by mutating the original headers list after construction")
    void isNotAffectedByMutatingOriginalListAfterConstruction() {
        List<Header> original = new ArrayList<>();
        original.add(new Header("Content-Type", List.of("application/json")));

        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.OK, "application/json", 0, original, null);

        original.add(new Header("X-Extra", List.of("leaked")));

        assertEquals(1, data.getResponseHeaders().size());
    }

    @Test
    @DisplayName("should flag body as truncated when captured bytes are fewer than declared content size")
    void flagsTruncatedBody() {
        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.OK, "text/plain", 100, List.of(), "partial");

        assertTrue(data.isBodyTruncated());
    }

    @Test
    @DisplayName("should not flag body as truncated when full content was captured")
    void doesNotFlagCompleteBody() {
        String body = "{\"ok\":true}";
        int size = body.getBytes(StandardCharsets.UTF_8).length;

        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.OK, "application/json", size, List.of(), body);

        assertFalse(data.isBodyTruncated());
    }

    @Test
    @DisplayName("should flag body as truncated when body is null but content size is positive")
    void flagsTruncatedWhenBodyNullAndContentSizePositive() {
        HttpResponseData data = new HttpResponseData(
                HttpResponseStatus.OK, "application/json", 50, List.of(), null);

        assertTrue(data.isBodyTruncated());
    }
}