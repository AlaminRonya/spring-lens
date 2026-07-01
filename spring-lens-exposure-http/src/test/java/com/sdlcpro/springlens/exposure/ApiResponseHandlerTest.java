package com.sdlcpro.springlens.exposure;

import com.sdlcpro.springlens.exception.DataNotFoundException;
import com.sdlcpro.springlens.exception.DataScopeMismatchException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseHandlerTest {

    @Test
    void shouldReturnOkResponseForSuccessfulSupplier() {
        ResponseEntity<?> response = ApiResponseHandler.handle(() -> "Success");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Success", response.getBody());
    }

    @Test
    void shouldReturnNotFoundForDataNotFoundException() {
        ResponseEntity<?> response = ApiResponseHandler.handle(() -> {
            throw new DataNotFoundException("Metadata not found");
        });

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());

        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertNotNull(body);
        assertEquals(404, body.status());
        assertEquals("Not Found", body.error());
        assertEquals("Metadata not found", body.message());
        assertNotNull(body.timestamp());
    }

    @Test
    void shouldReturnBadRequestForDataScopeMismatchException() {
        ResponseEntity<?> response = ApiResponseHandler.handle(() -> {
            throw new DataScopeMismatchException("Scope mismatch");
        });

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertNotNull(body);
        assertEquals(400, body.status());
        assertEquals("Bad Request", body.error());
        assertEquals("Scope mismatch", body.message());
        assertNotNull(body.timestamp());
    }

    @Test
    void shouldReturnBadRequestForIllegalArgumentException() {
        ResponseEntity<?> response = ApiResponseHandler.handle(() -> {
            throw new IllegalArgumentException("Invalid argument");
        });

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertNotNull(body);
        assertEquals(400, body.status());
        assertEquals("Bad Request", body.error());
        assertEquals("Invalid argument", body.message());
        assertNotNull(body.timestamp());
    }

    @Test
    void shouldReturnInternalServerErrorForUnexpectedException() {
        ResponseEntity<?> response = ApiResponseHandler.handle(() -> {
            throw new RuntimeException("Unexpected error");
        });

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());

        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertNotNull(body);
        assertEquals(500, body.status());
        assertEquals("Internal Server Error", body.error());
        assertEquals("Unexpected error", body.message());
        assertNotNull(body.timestamp());
    }
}