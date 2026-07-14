package com.sdlcpro.springlens.model.http.endpoint;

import com.sdlcpro.springlens.model.http.HttpRequestMethod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.*;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("EndpointInfo Domain Model Tests")
class EndpointInfoTest {

    private static final int VALID_ID = 1;
    private static final String VALID_PATH = "/api/v1/resource";
    private static final String VALID_HANDLER = "com.app.Controller";
    private static final String VALID_METHOD = "handleRequest";
    private static final String VALID_RETURN = "String";

    private static EndpointInfo buildValidEndpoint() {
        return new EndpointInfo(
                VALID_ID, VALID_PATH,
                EnumSet.of(HttpRequestMethod.GET),
                Set.of("application/json"),
                Set.of("application/xml"),
                VALID_HANDLER, VALID_METHOD,
                List.of("String id", "RequestBody body"),
                VALID_RETURN,
                HandlerType.CONTROLLER
        );
    }

    @Nested
    @DisplayName("Validation and Boundary Logic")
    class ValidationLogic {

        @ParameterizedTest(name = "{index} => {0}")
        @MethodSource("invalidProvider")
        @DisplayName("Should reject invalid constructor parameters")
        void shouldRejectInvalidInputs(String testName, int id, String path, EnumSet<HttpRequestMethod> methods,
                                       String handlerClass, String handlerMethod, String returnType, HandlerType hType) {
            assertThatThrownBy(() -> new EndpointInfo(id, path, methods, Set.of(), Set.of(),
                    handlerClass, handlerMethod, List.of(), returnType, hType))
                    .as("Testing case: %s", testName)
                    .isInstanceOf(IllegalArgumentException.class);
        }

        public static Stream<Arguments> invalidProvider() {
            return Stream.of(
                    Arguments.of("Negative ID", -1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Zero ID", 0, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Null Path", 1, null, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Empty Methods", 1, VALID_PATH, EnumSet.noneOf(HttpRequestMethod.class), VALID_HANDLER, VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Null Methods", 1, VALID_PATH, null, VALID_HANDLER, VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Null Handler Class", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Blank Handler Class", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), " ", VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Empty Handler Class", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), "", VALID_METHOD, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Null Method Name", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, null, VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Blank Method Name", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, "\t", VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Empty Method Name", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, "", VALID_RETURN, HandlerType.CONTROLLER),
                    Arguments.of("Null Return Type", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, VALID_METHOD, null, HandlerType.CONTROLLER),
                    Arguments.of("Empty Return Type", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, VALID_METHOD, "", HandlerType.CONTROLLER),
                    Arguments.of("Null HandlerType", 1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), VALID_HANDLER, VALID_METHOD, VALID_RETURN, null)
            );
        }
    }

    @Nested
    @DisplayName("State and Behavior Integrity")
    class BehaviorTests {

        @Test
        @DisplayName("Happy Path: Successful instantiation and all fields verified")
        void testValidInstantiation() {
            var endpoint = buildValidEndpoint();

            assertThat(endpoint.id()).isEqualTo(VALID_ID);
            assertThat(endpoint.path()).isEqualTo(VALID_PATH);
            assertThat(endpoint.httpMethods()).containsExactly(HttpRequestMethod.GET);
            assertThat(endpoint.consumes()).containsExactly("application/json");
            assertThat(endpoint.produces()).containsExactly("application/xml");
            assertThat(endpoint.handlerClassName()).isEqualTo(VALID_HANDLER);
            assertThat(endpoint.handlerMethodName()).isEqualTo(VALID_METHOD);
            assertThat(endpoint.methodParameters()).containsExactly("String id", "RequestBody body");
            assertThat(endpoint.returnType()).isEqualTo(VALID_RETURN);
            assertThat(endpoint.handlerType()).isEqualTo(HandlerType.CONTROLLER);
        }

        @Test
        @DisplayName("Happy Path: Multiple HTTP methods")
        void testMultipleHttpMethods() {
            var methods = EnumSet.of(HttpRequestMethod.GET, HttpRequestMethod.POST, HttpRequestMethod.PUT);
            var endpoint = new EndpointInfo(1, VALID_PATH, methods, null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.CONTROLLER);

            assertThat(endpoint.httpMethods()).hasSize(3);
            assertThat(endpoint.httpMethods()).containsExactlyInAnyOrder(HttpRequestMethod.GET, HttpRequestMethod.POST, HttpRequestMethod.PUT);
        }

        @Test
        @DisplayName("Happy Path: All HandlerType variants are accepted")
        void testAllHandlerTypes() {
            for (var type : HandlerType.values()) {
                var endpoint = new EndpointInfo(1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, null,
                        VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, type);
                assertThat(endpoint.handlerType()).isEqualTo(type);
            }
        }

        @Test
        @DisplayName("Collection Handling: Graceful null-to-empty conversion")
        void testNullCollections() {
            var endpoint = new EndpointInfo(1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.CONTROLLER);

            assertThat(endpoint.consumes()).isEmpty();
            assertThat(endpoint.produces()).isEmpty();
            assertThat(endpoint.methodParameters()).isEmpty();
        }

        @Test
        @DisplayName("Collection Handling: Empty collections are preserved as-is")
        void testEmptyCollections() {
            var endpoint = new EndpointInfo(1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), Set.of(), Set.of(),
                    VALID_HANDLER, VALID_METHOD, List.of(), VALID_RETURN, HandlerType.CONTROLLER);

            assertThat(endpoint.consumes()).isEmpty();
            assertThat(endpoint.produces()).isEmpty();
            assertThat(endpoint.methodParameters()).isEmpty();
        }

        @Test
        @DisplayName("Immutability: Defensive copying prevents external mutation of all collections")
        void testImmutability() {
            var methods = EnumSet.of(HttpRequestMethod.GET);
            var consumes = new HashSet<>(Set.of("c1"));
            var produces = new HashSet<>(Set.of("p1"));
            var params = new ArrayList<>(List.of("arg1"));
            var endpoint = new EndpointInfo(1, VALID_PATH, methods, consumes, produces,
                    VALID_HANDLER, VALID_METHOD, params, VALID_RETURN, HandlerType.CONTROLLER);

            methods.add(HttpRequestMethod.POST);
            consumes.add("c2");
            produces.add("p2");
            params.add("arg2");

            assertThat(endpoint.httpMethods()).doesNotContain(HttpRequestMethod.POST);
            assertThat(endpoint.consumes()).doesNotContain("c2");
            assertThat(endpoint.produces()).doesNotContain("p2");
            assertThat(endpoint.methodParameters()).doesNotContain("arg2");
        }

        @Test
        @DisplayName("Immutability: Set and List collections are unmodifiable")
        void testReturnedCollectionsAreUnmodifiable() {
            var endpoint = buildValidEndpoint();

            assertThatThrownBy(() -> endpoint.consumes().add("text/html"))
                    .isInstanceOf(UnsupportedOperationException.class);
            assertThatThrownBy(() -> endpoint.produces().add("text/html"))
                    .isInstanceOf(UnsupportedOperationException.class);
            assertThatThrownBy(() -> endpoint.methodParameters().add("extra"))
                    .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Record Mechanics: Equality and HashCode for identical instances")
        void testRecordEquality() {
            var e1 = new EndpointInfo(1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.CONTROLLER);
            var e2 = new EndpointInfo(1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.CONTROLLER);

            assertThat(e1).isEqualTo(e2);
            assertThat(e1.hashCode()).isEqualTo(e2.hashCode());
        }

        @Test
        @DisplayName("Record Mechanics: Inequality for different instances")
        void testRecordInequality() {
            var base = buildValidEndpoint();
            var differentId = new EndpointInfo(2, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.CONTROLLER);
            var differentPath = new EndpointInfo(1, "/other", EnumSet.of(HttpRequestMethod.GET), null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.CONTROLLER);
            var differentType = new EndpointInfo(1, VALID_PATH, EnumSet.of(HttpRequestMethod.GET), null, null,
                    VALID_HANDLER, VALID_METHOD, null, VALID_RETURN, HandlerType.FUNCTIONAL);

            assertThat(base).isNotEqualTo(differentId);
            assertThat(base).isNotEqualTo(differentPath);
            assertThat(base).isNotEqualTo(differentType);
        }

        @Test
        @DisplayName("Record Mechanics: ToString contains key identifiers")
        void testRecordToString() {
            var endpoint = buildValidEndpoint();
            var str = endpoint.toString();

            assertThat(str).contains("EndpointInfo");
            assertThat(str).contains(VALID_PATH);
            assertThat(str).contains("CONTROLLER");
        }
    }

    @Nested
    @DisplayName("HttpRequestMethod Enum Behavior")
    class HttpRequestMethodTests {

        @ParameterizedTest(name = "from(\"{0}\") => {1}")
        @DisplayName("Should resolve known HTTP methods")
        @MethodSource("knownMethodsProvider")
        void testKnownMethods(String input, HttpRequestMethod expected) {
            assertThat(HttpRequestMethod.from(input)).isEqualTo(expected);
        }

        static Stream<Arguments> knownMethodsProvider() {
            return Stream.of(
                    Arguments.of("GET", HttpRequestMethod.GET),
                    Arguments.of("HEAD", HttpRequestMethod.HEAD),
                    Arguments.of("POST", HttpRequestMethod.POST),
                    Arguments.of("PUT", HttpRequestMethod.PUT),
                    Arguments.of("PATCH", HttpRequestMethod.PATCH),
                    Arguments.of("DELETE", HttpRequestMethod.DELETE),
                    Arguments.of("OPTIONS", HttpRequestMethod.OPTIONS),
                    Arguments.of("TRACE", HttpRequestMethod.TRACE)
            );
        }

        @ParameterizedTest(name = "from(\"{0}\") => UNDEFINED")
        @DisplayName("Should return UNDEFINED for blank or null input")
        @NullAndEmptySource
        @ValueSource(strings = {"  ", "\t", "\n"})
        void testUndefinedForBlankInput(String input) {
            assertThat(HttpRequestMethod.from(input)).isEqualTo(HttpRequestMethod.UNDEFINED);
        }

        @ParameterizedTest(name = "from(\"{0}\") => UNDEFINED")
        @DisplayName("Should return UNDEFINED for unknown method strings")
        @ValueSource(strings = {"INVALID", "PATCHING", "FOO", "GETT"})
        void testUndefinedForUnknownMethods(String input) {
            assertThat(HttpRequestMethod.from(input)).isEqualTo(HttpRequestMethod.UNDEFINED);
        }

        @ParameterizedTest(name = "from(\"{0}\") => correct method (case-insensitive)")
        @DisplayName("Should match case-insensitively for known methods")
        @ValueSource(strings = {"get", "Get", "GET", "post", "Post", "POST", "delete", "Delete", "DELETE"})
        void testCaseInsensitiveMatching(String input) {
            String normalized = input.trim().toUpperCase(Locale.ROOT);
            HttpRequestMethod expected = HttpRequestMethod.valueOf(normalized);
            assertThat(HttpRequestMethod.from(input)).isEqualTo(expected);
        }

        @Test
        @DisplayName("Should return canonical value from value()")
        void testValueMethod() {
            for (var method : HttpRequestMethod.values()) {
                assertThat(method.value()).isNotBlank();
                assertThat(method.value()).isEqualTo(method.name());
            }
        }
    }
}
