package com.sdlcpro.springlens.exposure;

import com.sdlcpro.springlens.exception.DataNotFoundException;
import com.sdlcpro.springlens.exception.DataScopeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Optional;
import java.util.function.Supplier;

public final class ApiResponseHandler {

    private ApiResponseHandler() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    public static ResponseEntity<?> handle(Supplier<?> dataFetchLogicSupplier) {
        return handle(dataFetchLogicSupplier, null);
    }

    public static ResponseEntity<?> handle(Supplier<?> dataFetchLogicSupplier, String dataNotFoundMessage) {
        String message;
        HttpStatus status;

        try {
            var data = dataFetchLogicSupplier.get();
            if (data == null || data instanceof Optional<?> optional && optional.isEmpty()) {
                throw new DataNotFoundException(dataNotFoundMessage == null
                        ? "Requested resource was not found"
                        : dataNotFoundMessage
                );
            }

            return ResponseEntity.ok(data);
        } catch (Exception e) {
            message = e.getMessage();
            if (e instanceof DataScopeMismatchException || e instanceof IllegalArgumentException) {
                status = HttpStatus.BAD_REQUEST;
            } else if (e instanceof DataNotFoundException) {
                status = HttpStatus.NOT_FOUND;
            } else {
                status = HttpStatus.INTERNAL_SERVER_ERROR;
            }
        }

        var errorResponse = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message
        );

        return ResponseEntity.status(status).body(errorResponse);
    }
}
