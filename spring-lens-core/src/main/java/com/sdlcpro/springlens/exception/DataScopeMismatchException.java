package com.sdlcpro.springlens.exception;

/**
 * Exception thrown when there is a mismatch in the expected data scope.
 */
public class DataScopeMismatchException extends RuntimeException {
    public DataScopeMismatchException(String message) {
        super(message);
    }
    public DataScopeMismatchException(String message, Throwable cause) {
        super(message, cause);
    }
}
