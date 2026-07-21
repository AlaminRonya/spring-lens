package com.sdlcpro.springlens.insight.http.endpoint;

import com.sdlcpro.springlens.model.http.endpoint.HandlerType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HandlerTypeMatcherTest {

    private record TestProvider(HandlerType handlerType) implements HandlerTypeProvider {

        @Override
        public HandlerType getHandlerType() {
            return handlerType;
        }
    }

    @Test
    @DisplayName("should return false when matcher is created with null set")
    void shouldReturnFalseForNullSet() {
        HandlerTypeMatcher<TestProvider> matcher = new HandlerTypeMatcher<>(null);
        assertFalse(matcher.matches(new TestProvider(HandlerType.CONTROLLER)));
    }

    @Test
    @DisplayName("should return false when matcher is created with empty set")
    void shouldReturnFalseForEmptySet() {
        HandlerTypeMatcher<TestProvider> matcher = new HandlerTypeMatcher<>(Set.of());
        assertFalse(matcher.matches(new TestProvider(HandlerType.CONTROLLER)));
    }

    @Test
    @DisplayName("should return false for null context")
    void shouldReturnFalseForNullContext() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.of(HandlerType.CONTROLLER));
        assertFalse(matcher.matches(null));
    }

    @Test
    @DisplayName("should return false when context handler type is null")
    void shouldReturnFalseForNullHandlerType() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.of(HandlerType.CONTROLLER));
        assertFalse(matcher.matches(new TestProvider(null)));
    }

    @Test
    @DisplayName("should return false when handler type does not match")
    void shouldReturnFalseForNonMatchingHandlerType() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.of(HandlerType.CONTROLLER));
        assertFalse(matcher.matches(new TestProvider(HandlerType.FUNCTIONAL)));
        assertFalse(matcher.matches(new TestProvider(HandlerType.UNKNOWN)));
    }

    @Test
    @DisplayName("should return true when handler type matches")
    void shouldReturnTrueForMatchingHandlerType() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.of(HandlerType.CONTROLLER, HandlerType.FUNCTIONAL));
        assertTrue(matcher.matches(new TestProvider(HandlerType.CONTROLLER)));
        assertTrue(matcher.matches(new TestProvider(HandlerType.FUNCTIONAL)));
    }

    @Test
    @DisplayName("should match UNKNOWN when included in target set")
    void shouldMatchUnknownWhenConfigured() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.of(HandlerType.UNKNOWN));
        assertTrue(matcher.matches(new TestProvider(HandlerType.UNKNOWN)));
        assertFalse(matcher.matches(new TestProvider(HandlerType.CONTROLLER)));
    }

    @Test
    @DisplayName("should defensively copy supplied set")
    void shouldDefensivelyCopyInputSet() {
        Set<HandlerType> handlerTypes = new HashSet<>();
        handlerTypes.add(HandlerType.CONTROLLER);

        HandlerTypeMatcher<TestProvider> matcher = new HandlerTypeMatcher<>(handlerTypes);

        handlerTypes.add(HandlerType.FUNCTIONAL);

        assertFalse(matcher.matches(new TestProvider(HandlerType.FUNCTIONAL)));
        assertTrue(matcher.matches(new TestProvider(HandlerType.CONTROLLER)));
    }

    @Test
    @DisplayName("should reject null elements in supplied set")
    void shouldRejectNullElements() {
        Set<HandlerType> handlerTypes = new HashSet<>();
        handlerTypes.add(null);

        assertThrows(
                NullPointerException.class,
                () -> new HandlerTypeMatcher<>(handlerTypes)
        );
    }

    @Test
    @DisplayName("should match against second element when first does not match")
    void shouldMatchAgainstSecondElement() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.of(HandlerType.CONTROLLER, HandlerType.FUNCTIONAL));
        assertTrue(matcher.matches(new TestProvider(HandlerType.FUNCTIONAL)));
    }

    @Test
    @DisplayName("should accept all HandlerType values when configured with allOf")
    void shouldMatchAllHandlerTypesWhenConfiguredWithAllOf() {
        HandlerTypeMatcher<TestProvider> matcher =
                new HandlerTypeMatcher<>(EnumSet.allOf(HandlerType.class));

        for (HandlerType type : HandlerType.values()) {
            assertTrue(matcher.matches(new TestProvider(type)));
        }
    }
}
