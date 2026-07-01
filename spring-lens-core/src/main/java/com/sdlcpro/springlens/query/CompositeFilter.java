package com.sdlcpro.springlens.query;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public record CompositeFilter(LogicalOperator operator, List<Filter> filters) implements Filter {

    public CompositeFilter {
        // TODO: replace by the spring-lens provided Preconditions.notNull() instead of Objects.requireNonNull()
        Objects.requireNonNull(operator);
        Objects.requireNonNull(filters);

        if (filters.size() < 2) {
            throw new IllegalArgumentException("Filters length must be at least 2");
        }
    }

    public static CompositeFilter of(LogicalOperator operator, List<Filter> filters) {
        return new CompositeFilter(operator, filters);
    }

    @Override
    public String toString() {
        var delimiter = " " + operator + " ";
        return filters.stream()
                .map(this::formatChild)
                .collect(Collectors.joining(delimiter));
    }

    private String formatChild(Filter child) {
        if (child instanceof CompositeFilter composite) {
            return "(" + composite + ")";
        }

        return child.toString();
    }
}
