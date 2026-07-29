package com.sdlcpro.springlens.insight.http;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HttpUriMatcherTest {

    private record TestProvider(String httpUri) implements HttpUriProvider {

        @Override
        public String getHttpUri() {
            return httpUri;
        }
    }

    @Test
    @DisplayName("should match an exact URI")
    void shouldMatchExactUri() {
        HttpUriMatcher<TestProvider> matcher = new HttpUriMatcher<>(Set.of("/health"));

        assertTrue(matcher.matches(new TestProvider("/health")));
    }

    @Test
    @DisplayName("should match Ant wildcard and URI template patterns")
    void shouldMatchAntPatterns() {
        HttpUriMatcher<TestProvider> matcher = new HttpUriMatcher<>(Set.of("/api/**", "/users/{id}"));

        assertTrue(matcher.matches(new TestProvider("/api/v1/orders/42")));
        assertTrue(matcher.matches(new TestProvider("/users/42")));
    }

    @Test
    @DisplayName("should return false for non-matching URIs")
    void shouldReturnFalseForNonMatchingUri() {
        HttpUriMatcher<TestProvider> matcher = new HttpUriMatcher<>(Set.of("/api/**", "/users/{id}"));

        assertFalse(matcher.matches(new TestProvider("/admin/users")));
    }

    @Test
    @DisplayName("should return false for null context or URI")
    void shouldReturnFalseForNullContextOrUri() {
        HttpUriMatcher<TestProvider> matcher = new HttpUriMatcher<>(Set.of("/api/**"));

        assertFalse(matcher.matches(null));
        assertFalse(matcher.matches(new TestProvider(null)));
    }

    @Test
    @DisplayName("should return false when constructed with null or empty patterns")
    void shouldReturnFalseForNullOrEmptyPatterns() {
        assertFalse(new HttpUriMatcher<TestProvider>(null).matches(new TestProvider("/api/users")));
        assertFalse(new HttpUriMatcher<TestProvider>(Set.of()).matches(new TestProvider("/api/users")));
    }

    @Test
    @DisplayName("should defensively copy supplied patterns")
    void shouldDefensivelyCopySuppliedPatterns() {
        Set<String> patterns = new HashSet<>();
        patterns.add("/health");
        HttpUriMatcher<TestProvider> matcher = new HttpUriMatcher<>(patterns);

        patterns.add("/private/**");

        assertTrue(matcher.matches(new TestProvider("/health")));
        assertFalse(matcher.matches(new TestProvider("/private/metrics")));
    }

    @Test
    @DisplayName("should reject null patterns to preserve immutable set semantics")
    void shouldRejectNullPatterns() {
        Set<String> patterns = new HashSet<>();
        patterns.add(null);

        assertThrows(NullPointerException.class, () -> new HttpUriMatcher<>(patterns));
    }
}
