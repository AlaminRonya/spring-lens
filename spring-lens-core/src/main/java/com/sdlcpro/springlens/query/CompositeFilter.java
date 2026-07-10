package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.util.Preconditions;

import java.util.List;
import java.util.stream.Collectors;

record CompositeFilter(LogicalOperator operator, List<Filter> filters) implements Filter {

    public CompositeFilter {
        Preconditions.notNull(operator,"LogicalOperator must not be null");
        Preconditions.notNull(filters,"List<Filter> must not be null");
        Preconditions.isTrue(filters.size() >= 2, "The length of List<Filter> must be at least 2");
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
