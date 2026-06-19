package com.sdlcpro.springlens.exception;

/**
 * Thrown when a field read or write operation fails.
 */
public final class FieldAccessException extends FieldAccessorException {

    public FieldAccessException(String message) {
        super(message);
    }

    public FieldAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}