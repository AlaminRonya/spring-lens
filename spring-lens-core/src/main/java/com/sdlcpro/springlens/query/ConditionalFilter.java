package com.sdlcpro.springlens.query;

import java.util.Objects;

public record ConditionalFilter(String property, ConditionalOperator operator, Object value) implements Filter {

    public ConditionalFilter {
        // TODO: replace by the spring-lens provided Preconditions.notNull() instead of Objects.requireNonNull()
        Objects.requireNonNull(property);
        Objects.requireNonNull(operator);
    }

    public static ConditionalFilter of(String property, ConditionalOperator operator, Object value) {
        return new ConditionalFilter(property, operator, value);
    }

    @Override
    public String toString() {
        return this.property + " " + this.operator + " " + formatValue(this.value);
    }

    private String formatValue(Object value) {
        return value instanceof String ? "\"" + value + "\"" : String.valueOf(value);
    }
}
