package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.util.Preconditions;

import java.util.Collection;
import java.util.List;

public final class QueryExecutor<T> {
    private final FilterToPredicateConverter<T> filterToPredicateConverter;
    private final SortToComparatorConverter<T> sortToComparatorConverter;

    public QueryExecutor(Class<T> type) {
        Preconditions.notNull(type, "Type must not be null");
        this.filterToPredicateConverter = new FilterToPredicateConverter<>(type);
        this.sortToComparatorConverter = new SortToComparatorConverter<>(type);
    }

    public List<T> execute(Collection<T> data, Filter filter) {
        Preconditions.notNull(data, "Data must not be null");
        Preconditions.notNull(filter, "Filter must not be null");
        return data.stream()
                .filter(filterToPredicateConverter.convert(filter))
                .toList();
    }

    public List<T> execute(Collection<T> data, Filter filter, Sort sort) {
        Preconditions.notNull(data, "Data must not be null");
        Preconditions.notNull(filter, "Filter must not be null");
        Preconditions.notNull(sort, "Sort must not be null");
        return data.stream()
                .filter(filterToPredicateConverter.convert(filter))
                .sorted(sortToComparatorConverter.convert(sort))
                .toList();
    }

    public PageResponse<T> execute(Collection<T> data, Filter filter, PageRequest pageRequest) {
        Preconditions.notNull(pageRequest, "PageRequest must not be null");
        Sort sort = pageRequest.sort();
        List<T> filteredAndSortedData = this.execute(data, filter, sort);
        List<T> content = paginate(filteredAndSortedData, pageRequest.pageNumber(), pageRequest.pageSize());
        return new PageResponse<>(content, pageRequest, filteredAndSortedData.size());
    }

    private List<T> paginate(List<T> data, int page, int size) {
        if (data == null || data.isEmpty()) {
            return List.of();
        }

        if (size <= 0) {
            throw new IllegalArgumentException("Page size must be > 0");
        }

        if (page < 0) {
            throw new IllegalArgumentException("Page number must be >= 0");
        }

        int fromIndex = page * size;
        if (fromIndex >= data.size()) {
            return List.of();
        }

        int toIndex = Math.min(fromIndex + size, data.size());
        return data.subList(fromIndex, toIndex);
    }
}
