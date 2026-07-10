package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.accessor.FieldAccessorCache;

import java.util.Comparator;
import java.util.function.Function;

final class SortToComparatorConverter<T> {
    private final Class<T> type;

    public SortToComparatorConverter(Class<T> type) {
        this.type = type;
    }

    public Comparator<T> convert(Sort sort) {
        if (sort == null || !sort.isSorted()) {
            return (a, b) -> 0;
        }

        Function<Object, Object> accessor = FieldAccessorCache.getAccessor(type, sort.getProperty());
        Comparator<T> comparator = (obj1, obj2) -> compare(accessor.apply(obj1), accessor.apply(obj2));
        return sort.getDirection() == Sort.Direction.DESC ? comparator.reversed() : comparator;
    }

    @SuppressWarnings("unchecked")
    private int compare(Object a, Object b) {
        if (a == b) return 0;
        if (a == null) return 1;
        if (b == null) return -1;

        if (a instanceof Number && b instanceof Number) {
            return Double.compare(((Number) a).doubleValue(), ((Number) b).doubleValue());
        }

        if (a instanceof Comparable<?> comp) {
            return ((Comparable<Object>) comp).compareTo(b);
        }

        throw new IllegalArgumentException("Field value type '" + a.getClass() + "' is not comparable");
    }
}
