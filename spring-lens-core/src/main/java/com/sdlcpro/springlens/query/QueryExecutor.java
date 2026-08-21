package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.util.Preconditions;

import java.util.Collection;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;

public final class QueryExecutor<T> {
    private final FilterToPredicateConverter<T> filterToPredicateConverter;
    private final SortToComparatorConverter<T> sortToComparatorConverter;

    public QueryExecutor(Class<T> type) {
        Preconditions.notNull(type, "Type must be specify");
        this.filterToPredicateConverter = new FilterToPredicateConverter<>(type);
        this.sortToComparatorConverter = new SortToComparatorConverter<>(type);
    }

    public List<T> execute(Collection<T> data, Filter filter) {
        return this.execute(data, filter, Sort.unsorted());
    }

    public List<T> execute(Collection<T> data, Filter filter, Sort sort) {
        Preconditions.notNull(data, "Data must not be null");
        return this.execute(data.stream(), filter, sort);
    }

    public List<T> execute(Stream<T> stream, Filter filter) {
        return this.execute(stream, filter, Sort.unsorted());
    }

    public List<T> execute(Stream<T> stream, Filter filter, Sort sort) {
        Preconditions.notNull(stream, "Data stream must not be null");
        Preconditions.notNull(filter, "Filter must not be null");
        Preconditions.notNull(sort, "Sort must not be null");
        return stream.filter(filterToPredicateConverter.convert(filter))
                .sorted(sortToComparatorConverter.convert(sort))
                .toList();
    }

    public PageResponse<T> execute(Collection<T> data, Filter filter, PageRequest pageRequest) {
        Preconditions.notNull(data, "Data must not be null");
        return this.execute(data.stream(), filter, pageRequest);
    }

    public PageResponse<T> execute(Stream<T> stream, Filter filter, PageRequest pageRequest) {
        Preconditions.notNull(pageRequest, "PageRequest must not be null");
        Sort sort = pageRequest.sort();
        List<T> filteredAndSortedData = this.execute(stream, filter, sort);
        List<T> content = paginate(filteredAndSortedData, pageRequest.pageNumber(), pageRequest.pageSize());
        return new PageResponse<>(content, pageRequest, filteredAndSortedData.size());
    }

    public <R> List<R> executeAndMap(Collection<T> data, Filter filter, Function<? super T, R> mapper) {
        return this.executeAndMap(data, filter, Sort.unsorted(), mapper);
    }

    public <R> List<R> executeAndMap(Collection<T> data, Filter filter, Sort sort, Function<? super T, R> mapper) {
        Preconditions.notNull(data, "Data must not be null");
        return this.executeAndMap(data.stream(), filter, sort, mapper);
    }

    public <R> List<R> executeAndMap(Stream<T> stream, Filter filter, Function<? super T, R> mapper) {
        return this.executeAndMap(stream, filter, Sort.unsorted(), mapper);
    }

    public <R> List<R> executeAndMap(Stream<T> stream, Filter filter, Sort sort, Function<? super T, R> mapper) {
        Preconditions.notNull(stream, "Data stream must not be null");
        Preconditions.notNull(filter, "Filter must not be null");
        Preconditions.notNull(sort, "Sort must not be null");
        Preconditions.notNull(mapper, "Mapper must not be null");
        return stream.filter(filterToPredicateConverter.convert(filter))
                .sorted(sortToComparatorConverter.convert(sort))
                .map(mapper)
                .toList();
    }

    public <R> PageResponse<R> executeAndMap(Collection<T> data, Filter filter, Function<? super T, R> mapper, PageRequest pageRequest) {
        Preconditions.notNull(data, "Data must not be null");
        return this.executeAndMap(data.stream(), filter, mapper, pageRequest);
    }

    public <R> PageResponse<R> executeAndMap(Stream<T> stream, Filter filter, Function<? super T, R> mapper, PageRequest pageRequest) {
        Preconditions.notNull(pageRequest, "PageRequest must not be null");
        Sort sort = pageRequest.sort();
        List<R> processedData = this.executeAndMap(stream, filter, sort, mapper);
        List<R> content = paginate(processedData, pageRequest.pageNumber(), pageRequest.pageSize());
        return new PageResponse<>(content, pageRequest, processedData.size());
    }

    private static <T> List<T> paginate(List<T> data, int page, int size) {
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
