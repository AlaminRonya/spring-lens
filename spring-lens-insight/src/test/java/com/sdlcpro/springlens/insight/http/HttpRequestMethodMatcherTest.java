package com.sdlcpro.springlens.insight.http;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
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
}
