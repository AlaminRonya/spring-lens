package com.sdlcpro.springlens.model.http.request;

import com.sdlcpro.springlens.model.http.request.HttpResponseStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HttpResponseStatusTest {

    @Test
    void resolvesKnownStatusCode() {
        assertThat(HttpResponseStatus.from(200)).isEqualTo(HttpResponseStatus.OK);
        assertThat(HttpResponseStatus.from(404)).isEqualTo(HttpResponseStatus.NOT_FOUND);
        assertThat(HttpResponseStatus.from(500)).isEqualTo(HttpResponseStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    void returnsUnknownForNegativeCode() {
        assertThat(HttpResponseStatus.from(-15)).isEqualTo(HttpResponseStatus.UNKNOWN);
    }

    @Test
    void returnsUnknownForCodeAboveUpperBound() {
        assertThat(HttpResponseStatus.from(600)).isEqualTo(HttpResponseStatus.UNKNOWN);
    }

    @Test
    void returnsUnknownForInRangeButUnmappedCode() {
        assertThat(HttpResponseStatus.from(199)).isEqualTo(HttpResponseStatus.UNKNOWN);
    }

    @Test
    void getCodeReturnsUnderlyingValue() {
        assertThat(HttpResponseStatus.OK.getCode()).isEqualTo(200);
        assertThat(HttpResponseStatus.UNKNOWN.getCode()).isEqualTo(-1);
    }
}