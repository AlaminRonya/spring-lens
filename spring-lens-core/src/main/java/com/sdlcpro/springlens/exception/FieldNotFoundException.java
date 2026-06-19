package com.sdlcpro.springlens.exception;

/**
 * Thrown when a field cannot be resolved in the target type.
 */
public final class FieldNotFoundException extends FieldAccessorException {

    public FieldNotFoundException(Class<?> type, String fieldName) {
        super("Field '" + fieldName + "' not found in " + type);
    }
}