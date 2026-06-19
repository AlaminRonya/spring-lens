package com.sdlcpro.springlens.exception;

/**
 * Base exception for field accessor operations.
 *
 * <p>All field resolution and access related exceptions extend this type.</p>
 */
public abstract class FieldAccessorException extends RuntimeException {

    protected FieldAccessorException(String message, Throwable cause) {
        super(message, cause);
    }

    protected FieldAccessorException(String message) {
        super(message);
    }
}