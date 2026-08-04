package com.sdlcpro.springlens.insight.http;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("HttpRequestMethodMatcher Tests")
class HttpRequestMethodMatcherTest {

    private static class TestHttpRequestMethodProvider implements HttpRequestMethodProvider {
        private final EnumSet<HttpRequestMethod> methods;

        TestHttpRequestMethodProvider(Set<HttpRequestMethod> methods) {
            this.methods = methods == null || methods.isEmpty()
                    ? EnumSet.noneOf(HttpRequestMethod.class)
                    : EnumSet.copyOf(methods);
        }

        @Override
        public EnumSet<HttpRequestMethod> getHttpRequestMethods() {
            return methods;
        }
    }

    @Nested
    @DisplayName("Constructor and Immutability Tests")
    class ConstructorTests {

        @Test
        @DisplayName("Should create matcher with provided EnumSet")
        void shouldCreateMatcherWithProvidedEnumSet() {
            var methods = EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST);
            var matcher = new HttpRequestMethodMatcher<>(methods);
            
            assertThat(matcher.getHttpRequestMethods())
                .containsExactlyInAnyOrder(HttpRequestMethod.GET, HttpRequestMethod.POST);
        }

        @Test
        @DisplayName("Should create matcher with empty EnumSet when null is provided")
        void shouldCreateMatcherWithEmptyEnumSetWhenNull() {
            var matcher = new HttpRequestMethodMatcher<>(null);
            
            assertThat(matcher.getHttpRequestMethods()).isEmpty();
        }

        @Test
        @DisplayName("Should defensively copy provided EnumSet to maintain immutability")
        void shouldDefensivelyCopyEnumSet() {
            var original = EnumSet.of(HttpRequestMethod.GET);
            var matcher = new HttpRequestMethodMatcher<>(original);
            
            // Modify original after construction
            original.add(HttpRequestMethod.POST);
            
            // Matcher's internal state should remain unchanged
            assertThat(matcher.getHttpRequestMethods()).containsExactly(HttpRequestMethod.GET);
        }

        @Test
        @DisplayName("Should return immutable EnumSet from getter")
        void shouldReturnImmutableEnumSet() {
            var matcher = new HttpRequestMethodMatcher<>(EnumSet.of(HttpRequestMethod.GET));
            var returned = matcher.getHttpRequestMethods();
            
            // Attempting to modify should throw UnsupportedOperationException
            assertThat(returned).isUnmodifiable();
        }
    }

    @Nested
    @DisplayName("Matching Logic Tests")
    class MatchingTests {

        @Test
        @DisplayName("Should return true when a candidate method matches target")
        void shouldReturnTrueWhenMethodMatches() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST)
            );
            var context = new TestHttpRequestMethodProvider(
                EnumSet.of(HttpRequestMethod.GET)
            );
            
            assertThat(matcher.matches(context)).isTrue();
        }

        @Test
        @DisplayName("Should return true when multiple candidate methods include a match")
        void shouldReturnTrueWhenMultipleMethodsIncludeMatch() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET)
            );
            var context = new TestHttpRequestMethodProvider(
                EnumSet.of(HttpRequestMethod.POST, HttpRequestMethod.GET, HttpRequestMethod.PUT)
            );
            
            assertThat(matcher.matches(context)).isTrue();
        }

        @Test
        @DisplayName("Should return false when no candidate method matches target")
        void shouldReturnFalseWhenNoMethodMatches() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET)
            );
            var context = new TestHttpRequestMethodProvider(
                EnumSet.of(HttpRequestMethod.POST, HttpRequestMethod.PUT)
            );
            
            assertThat(matcher.matches(context)).isFalse();
        }

        @Test
        @DisplayName("Should return false when target methods are empty")
        void shouldReturnFalseWhenTargetMethodsEmpty() {
            var matcher = new HttpRequestMethodMatcher<>(null);
            var context = new TestHttpRequestMethodProvider(
                EnumSet.of(HttpRequestMethod.GET)
            );
            
            assertThat(matcher.matches(context)).isFalse();
        }

        @Test
        @DisplayName("Should return false when context is null")
        void shouldReturnFalseWhenContextIsNull() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET)
            );
            
            assertThat(matcher.matches(null)).isFalse();
        }

        @Test
        @DisplayName("Should return false when context provides null method set")
        void shouldReturnFalseWhenContextProvidesNullMethods() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET)
            );
            var context = new TestHttpRequestMethodProvider(null);
            
            assertThat(matcher.matches(context)).isFalse();
        }

        @Test
        @DisplayName("Should return false when context provides empty method set")
        void shouldReturnFalseWhenContextProvidesEmptyMethods() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET)
            );
            var context = new TestHttpRequestMethodProvider(EnumSet.noneOf(HttpRequestMethod.class));
            
            assertThat(matcher.matches(context)).isFalse();
        }

        @Test
        @DisplayName("Should correctly match all HTTP method types")
        void shouldCorrectlyMatchAllMethodTypes() {
            var allMethods = EnumSet.allOf(HttpRequestMethod.class);
            
            for (HttpRequestMethod method : allMethods) {
                var matcher = new HttpRequestMethodMatcher<>(EnumSet.of(method));
                var context = new TestHttpRequestMethodProvider(EnumSet.of(method));
                
                assertThat(matcher.matches(context))
                    .as("Should match %s", method)
                    .isTrue();
            }
        }
    }

    @Nested
    @DisplayName("Equals and HashCode Tests")
    class EqualsAndHashCodeTests {

        @Test
        @DisplayName("Should return true when comparing equal matchers")
        void shouldReturnTrueWhenEqual() {
            var matcher1 = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST)
            );
            var matcher2 = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST)
            );
            
            assertThat(matcher1).isEqualTo(matcher2);
            assertThat(matcher1.hashCode()).isEqualTo(matcher2.hashCode());
        }

        @Test
        @DisplayName("Should return false when comparing different matchers")
        void shouldReturnFalseWhenDifferent() {
            var matcher1 = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET)
            );
            var matcher2 = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.POST)
            );
            
            assertThat(matcher1).isNotEqualTo(matcher2);
        }

        @Test
        @DisplayName("Should return false when comparing with null or different type")
        void shouldReturnFalseWhenNullOrDifferentType() {
            var matcher = new HttpRequestMethodMatcher<>(EnumSet.of(HttpRequestMethod.GET));
            
            assertThat(matcher).isNotEqualTo(null);
            assertThat(matcher).isNotEqualTo("not a matcher");
        }

        @Test
        @DisplayName("Should produce consistent hashCode")
        void shouldProduceConsistentHashCode() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST)
            );
            
            assertThat(matcher.hashCode()).isEqualTo(matcher.hashCode());
        }
    }

    @Nested
    @DisplayName("ToString Tests")
    class ToStringTests {

        @Test
        @DisplayName("Should produce meaningful string representation")
        void shouldProduceMeaningfulToString() {
            var matcher = new HttpRequestMethodMatcher<>(
                EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST)
            );
            
            assertThat(matcher.toString())
                .contains("HttpRequestMethodMatcher")
                .contains("GET")
                .contains("POST");
        }

        @Test
        @DisplayName("Should handle empty methods in toString")
        void shouldHandleEmptyMethodsInToString() {
            var matcher = new HttpRequestMethodMatcher<>(null);
            
            assertThat(matcher.toString())
                .contains("HttpRequestMethodMatcher")
                .contains("[]");
        }
    }
}
