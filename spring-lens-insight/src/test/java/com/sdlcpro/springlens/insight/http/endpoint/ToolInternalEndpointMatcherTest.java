package com.sdlcpro.springlens.insight.http.endpoint;

import com.sdlcpro.springlens.annotation.SpringLensEndpoint;
import com.sdlcpro.springlens.insight.support.provider.ClassProvider;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ToolInternalEndpointMatcherTest {

    private final ToolInternalEndpointMatcher<ClassProvider> matcher = new ToolInternalEndpointMatcher<>();

    @Test
    void shouldMatchClassAnnotatedAsSpringLensEndpoint() {
        assertTrue(matcher.matches(() -> InternalEndpoint.class));
    }

    @Test
    void shouldNotMatchClassWithoutSpringLensEndpointAnnotation() {
        assertFalse(matcher.matches(() -> ApplicationEndpoint.class));
    }

    @SpringLensEndpoint
    private static class InternalEndpoint {
    }

    private static class ApplicationEndpoint {
    }
}
