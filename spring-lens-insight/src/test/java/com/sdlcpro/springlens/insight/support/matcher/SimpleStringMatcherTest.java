package com.sdlcpro.springlens.insight.support.matcher;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.sdlcpro.springlens.insight.support.provider.StringValueProvider;

class SimpleStringMatcherTest {

    private record TestProvider(String value) implements StringValueProvider {

        @Override
        public String getValue() {
            return value;
        }
    }

    @Test
    @DisplayName("should return false when matcher is created with null set")
    void shouldReturnFalseForNullSet() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(null);
        assertFalse(matcher.matches(new TestProvider("abc")));
    }

    @Test
    @DisplayName("should return false when matcher is created with empty set")
    void shouldReturnFalseForEmptySet() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of());
        assertFalse(matcher.matches(new TestProvider("abc")));
    }

    @Test
    @DisplayName("should return false for null context")
    void shouldReturnFalseForNullContext() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of("abc"));
        assertFalse(matcher.matches(null));
    }

    @Test
    @DisplayName("should return false when context value is null")
    void shouldReturnFalseForNullValue() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of("abc"));
        assertFalse(matcher.matches(new TestProvider(null)));
    }

    @Test
    @DisplayName("should return false when value does not match")
    void shouldReturnFalseForNonMatchingValue() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of("abc", "def"));
        assertFalse(matcher.matches(new TestProvider("xyz")));
    }

    @Test
    @DisplayName("should return true when value matches")
    void shouldReturnTrueForMatchingValue() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of("abc", "def"));
        assertTrue(matcher.matches(new TestProvider("abc")));
    }

    @Test
    @DisplayName("should support empty string values")
    void shouldSupportEmptyString() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of(""));
        assertTrue(matcher.matches(new TestProvider("")));
    }

    @Test
    @DisplayName("should defensively copy supplied set")
    void shouldDefensivelyCopyInputSet() {
        Set<String> values = new HashSet<>();
        values.add("abc");

        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(values);

        values.add("xyz");

        assertFalse(matcher.matches(new TestProvider("xyz")));
        assertTrue(matcher.matches(new TestProvider("abc")));
    }

    @Test
    @DisplayName("should reject null elements in supplied set")
    void shouldRejectNullElements() {
        Set<String> values = new HashSet<>();
        values.add(null);

        assertThrows(
                NullPointerException.class,
                () -> new SimpleStringMatcher<>(values)
        );
    }

    @Test
    @DisplayName("should be case-sensitive")
    void shouldMatchCaseSensitively() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of("abc"));
        assertFalse(matcher.matches(new TestProvider("ABC")));
        assertFalse(matcher.matches(new TestProvider("Abc")));
        assertFalse(matcher.matches(new TestProvider("abc ")));
    }

    @Test
    @DisplayName("should match against second element when first does not match")
    void shouldMatchAgainstSecondElement() {
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(Set.of("abc", "def"));
        assertTrue(matcher.matches(new TestProvider("def")));
    }

    @Test
    @DisplayName("should handle large set of values")
    void shouldHandleLargeSet() {
        Set<String> values = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            values.add("value-" + i);
        }
        SimpleStringMatcher<TestProvider> matcher = new SimpleStringMatcher<>(values);

        assertTrue(matcher.matches(new TestProvider("value-500")));
        assertTrue(matcher.matches(new TestProvider("value-999")));
        assertFalse(matcher.matches(new TestProvider("value-1000")));
        assertFalse(matcher.matches(new TestProvider("")));
    }

}