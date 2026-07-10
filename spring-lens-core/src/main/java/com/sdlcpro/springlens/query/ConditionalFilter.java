package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.util.Preconditions;

record ConditionalFilter(String property, ConditionalOperator operator, Object value) implements Filter {

    public ConditionalFilter {
        Preconditions.notNull(property, "The value of property must not be null");
        Preconditions.notNull(operator, "The value of operator must not be null");
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
