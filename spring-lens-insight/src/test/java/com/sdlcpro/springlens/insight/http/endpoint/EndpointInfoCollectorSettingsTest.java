package com.sdlcpro.springlens.insight.http.endpoint;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import com.sdlcpro.springlens.model.http.endpoint.HandlerType;

class EndpointInfoCollectorSettingsTest {

    @Test
    @DisplayName("should default excludeUriPatterns to empty set when null")
    void shouldDefaultExcludeUriPatternsToEmptySet() {
        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                true,
                null,
                Set.of(HttpRequestMethod.GET),
                Set.of(HandlerType.CONTROLLER)
        );

        assertTrue(settings.excludeUriPatterns().isEmpty());
    }

    @Test
    @DisplayName("should default excludeMethods to empty set when null")
    void shouldDefaultExcludeMethodsToEmptySet() {
        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                true,
                Set.of("/actuator/**"),
                null,
                Set.of(HandlerType.CONTROLLER)
        );

        assertTrue(settings.excludeMethods().isEmpty());
    }

    @Test
    @DisplayName("should default excludeHandlerTypes to empty set when null")
    void shouldDefaultExcludeHandlerTypesToEmptySet() {
        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                true,
                Set.of("/actuator/**"),
                Set.of(HttpRequestMethod.GET),
                null
        );

        assertTrue(settings.excludeHandlerTypes().isEmpty());
    }

    @Test
    @DisplayName("should default all null collections to empty sets")
    void shouldDefaultAllNullCollectionsToEmptySets() {
        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                false,
                null,
                null,
                null
        );

        assertTrue(settings.excludeUriPatterns().isEmpty());
        assertTrue(settings.excludeMethods().isEmpty());
        assertTrue(settings.excludeHandlerTypes().isEmpty());
    }

    @Test
    @DisplayName("should make defensive copies of all collections")
    void shouldMakeDefensiveCopies() {
        Set<String> uriPatterns = new HashSet<>();
        uriPatterns.add("/internal/**");

        Set<HttpRequestMethod> methods = new HashSet<>();
        methods.add(HttpRequestMethod.GET);

        Set<HandlerType> handlerTypes = new HashSet<>();
        handlerTypes.add(HandlerType.CONTROLLER);

        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                true,
                uriPatterns,
                methods,
                handlerTypes
        );

        uriPatterns.add("/admin/**");
        methods.add(HttpRequestMethod.POST);
        handlerTypes.add(HandlerType.FUNCTIONAL);

        assertEquals(Set.of("/internal/**"), settings.excludeUriPatterns());
        assertEquals(Set.of(HttpRequestMethod.GET), settings.excludeMethods());
        assertEquals(Set.of(HandlerType.CONTROLLER), settings.excludeHandlerTypes());
    }

    @Test
    @DisplayName("returned collections should be immutable")
    void shouldReturnImmutableCollections() {
        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                true,
                Set.of("/internal/**"),
                Set.of(HttpRequestMethod.GET),
                Set.of(HandlerType.CONTROLLER)
        );

        assertThrows(
                UnsupportedOperationException.class,
                () -> settings.excludeUriPatterns().add("/new")
        );

        assertThrows(
                UnsupportedOperationException.class,
                () -> settings.excludeMethods().add(HttpRequestMethod.POST)
        );

        assertThrows(
                UnsupportedOperationException.class,
                () -> settings.excludeHandlerTypes().add(HandlerType.FUNCTIONAL)
        );
    }

    @Test
    @DisplayName("should preserve includeToolInternal flag")
    void shouldPreserveIncludeToolInternalFlag() {
        EndpointInfoCollectorSettings settings = new EndpointInfoCollectorSettings(
                true,
                Set.of(),
                Set.of(),
                Set.of()
        );

        assertTrue(settings.includeToolInternal());
    }
}