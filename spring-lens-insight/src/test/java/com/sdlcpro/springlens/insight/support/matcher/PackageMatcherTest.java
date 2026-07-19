package com.sdlcpro.springlens.insight.support.matcher;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;

class PackageMatcherTest {

    private record TestClass(String className) implements ClassNameProvider {

        @Override
        public String getClassName() {
            return className;
        }
    }

    @Test
    @DisplayName("should return false when matcher is created with null set")
    void shouldReturnFalseForNullSet() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(null);
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.service.UserService")));
    }

    @Test
    @DisplayName("should return false when matcher is created with empty set")
    void shouldReturnFalseForEmptySet() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of());
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.service.UserService")));
    }

    @Test
    @DisplayName("should return false for null context")
    void shouldReturnFalseForNullContext() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.service.*"));
        assertFalse(matcher.matches(null));
    }

    @Test
    @DisplayName("should return false when class name is null")
    void shouldReturnFalseForNullClassName() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.service.*"));
        assertFalse(matcher.matches(new TestClass(null)));
    }

    @Test
    @DisplayName("should match direct sub-package with single wildcard")
    void shouldMatchDirectSubPackage() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.service.*"));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.service.UserService")));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.service.OrderService")));
    }

    @Test
    @DisplayName("should not match deeply nested packages with single wildcard")
    void shouldNotMatchDeeplyNestedWithSingleWildcard() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.service.*"));
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.service.sub.UserService")));
    }

    @Test
    @DisplayName("should match deeply nested packages with double wildcard")
    void shouldMatchDeeplyNestedWithDoubleWildcard() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.**.*Controller"));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.insight.http.endpoint.ResetController")));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.service.Controller")));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.a.b.c.DeepestController")));
    }

    @Test
    @DisplayName("should not match when class name does not satisfy pattern")
    void shouldNotMatchMismatchedPattern() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.service.*"));
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.storage.Repository")));
        assertFalse(matcher.matches(new TestClass("com.other.service.UserService")));
    }

    @Test
    @DisplayName("should not throw exception on mismatch")
    void shouldNotThrowOnMismatch() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of("com.sdlcpro.*"));
        assertFalse(matcher.matches(new TestClass(null)));
        assertFalse(matcher.matches(new TestClass("com.storage.CacheManager")));
    }

    @Test
    @DisplayName("should support multiple patterns and match any")
    void shouldMatchAnyPattern() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of(
                "com.sdlcpro.service.*",
                "com.sdlcpro.storage.*"
        ));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.service.UserService")));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.storage.CacheManager")));
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.ui.MainView")));
    }

    @Test
    @DisplayName("should defensively copy supplied set")
    void shouldDefensivelyCopyInputSet() {
        Set<String> patterns = new HashSet<>();
        patterns.add("com.sdlcpro.service.*");

        PackageMatcher<TestClass> matcher = new PackageMatcher<>(patterns);

        patterns.add("com.sdlcpro.storage.*");

        assertTrue(matcher.matches(new TestClass("com.sdlcpro.service.UserService")));
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.storage.CacheManager")));
    }

    @Test
    @DisplayName("should reject null elements in supplied set")
    void shouldRejectNullElements() {
        Set<String> patterns = new HashSet<>();
        patterns.add(null);

        assertThrows(
                NullPointerException.class,
                () -> new PackageMatcher<>(patterns)
        );
    }

    @Test
    @DisplayName("should handle exact class name match")
    void shouldHandleExactClassNameMatch() {
        PackageMatcher<TestClass> matcher = new PackageMatcher<>(Set.of(
                "com.sdlcpro.service.UserService"
        ));
        assertTrue(matcher.matches(new TestClass("com.sdlcpro.service.UserService")));
        assertFalse(matcher.matches(new TestClass("com.sdlcpro.service.OrderService")));
    }
}
