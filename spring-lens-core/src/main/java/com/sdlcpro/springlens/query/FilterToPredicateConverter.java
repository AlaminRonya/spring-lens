package com.sdlcpro.springlens.query;

import com.sdlcpro.springlens.accessor.FieldAccessorCache;
import com.sdlcpro.springlens.util.Preconditions;

import java.lang.reflect.Array;
import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;

final class FilterToPredicateConverter<T> {
    private final Class<T> type;

    public FilterToPredicateConverter(Class<T> type) {
        this.type = type;
    }

    public Predicate<T> convert(Filter filter) {
        return filter == null ? f -> true : compile(filter);
    }

    private Predicate<T> compile(Filter filter) {
        if (filter instanceof UnFilter) {
            return f -> true;
        } else if (filter instanceof ConditionalFilter cf) {
            return compileCondition(cf);
        } else if (filter instanceof CompositeFilter cmf) {
            return compileComposite(cmf);
        }

        throw new IllegalArgumentException("Found unsupported filter type");
    }

    private Predicate<T> compileCondition(ConditionalFilter cf) {
        Function<Object, Object> accessor = FieldAccessorCache.getAccessor(this.type, cf.property());

        Object expected = cf.value();
        ConditionalOperator operator = cf.operator();

        return obj -> {
            Object actual = accessor.apply(obj);
            return switch (operator) {
                case EQUALS -> Objects.equals(actual, expected);
                case EQUALS_IGNORE_CASE -> actual instanceof CharSequence charSequence
                        && equalsIgnoreCase(charSequence, expected);
                case NOT_EQUALS -> !Objects.equals(actual, expected);
                case GREATER_THAN -> safeCompare(actual, expected) > 0;
                case LESS_THAN -> safeCompare(actual, expected) < 0;
                case GREATER_THAN_OR_EQUALS -> safeCompare(actual, expected) >= 0;
                case LESS_THAN_OR_EQUALS -> safeCompare(actual, expected) <= 0;
                case CONTAINS -> contains(actual, expected);
                case CONTAINS_IGNORE_CASE -> actual instanceof CharSequence charSequence
                        && containsWithCase(charSequence, expected, true);
                case STARTS_WITH -> actual != null && actual.toString().startsWith(String.valueOf(expected));
                case ENDS_WITH -> actual != null && actual.toString().endsWith(String.valueOf(expected));
            };
        };
    }

    private Predicate<T> compileComposite(CompositeFilter compositeFilter) {
        List<Predicate<T>> predicates = compositeFilter.filters()
                .stream()
                .map(this::compile)
                .toList();

        return switch (compositeFilter.operator()) {
            case AND -> obj -> andOperatorOutcome(predicates, obj);
            case OR -> obj -> orOperatorOutcome(predicates, obj);
        };
    }

    private boolean andOperatorOutcome(List<Predicate<T>> predicates, T obj) {
        for (Predicate<T> p : predicates) {
            if (!p.test(obj)) return false;
        }

        return true;
    }

    private boolean orOperatorOutcome(List<Predicate<T>> predicates, T obj) {
        for (Predicate<T> p : predicates) {
            if (p.test(obj)) return true;
        }

        return false;
    }

    public static boolean equalsIgnoreCase(CharSequence actual, Object expected) {
        return (expected instanceof CharSequence
                || expected instanceof Number
                || expected instanceof Character
                || expected instanceof Boolean
                || expected instanceof Enum<?>) && actual.toString().equalsIgnoreCase(expected.toString());
    }

    @SuppressWarnings("unchecked")
    private int safeCompare(Object actual, Object expected) {
        if (actual == null || expected == null) {
            return -1;
        }

        if (!(actual instanceof Comparable<?> actualValue)) {
            throw new IllegalArgumentException("Field value type '" + actual.getClass() + "' is not comparable");
        }

        if (actual instanceof Number && expected instanceof Number) {
            double a = ((Number) actual).doubleValue();
            double b = ((Number) expected).doubleValue();
            return Double.compare(a, b);
        }

        try {
            return ((Comparable<Object>) actualValue).compareTo(expected);
        } catch (ClassCastException ex) {
            throw new IllegalArgumentException("Cannot compare values: " + actual.getClass() + " with " + expected.getClass(), ex);
        }
    }

    private static boolean contains(Object source, Object target) {
        if (source == null) {
            return false;
        }

        if (source instanceof CharSequence charSequence) {
            return containsWithCase(charSequence, target, false);
        }

        if (source instanceof Map<?, ?> sourceMap) {

            if (target instanceof Map<?, ?> targetMap) {
                for (Map.Entry<?, ?> e : targetMap.entrySet()) {
                    if (!sourceMap.containsKey(e.getKey())
                            || !Objects.equals(sourceMap.get(e.getKey()), e.getValue())) {
                        return false;
                    }
                }
                return true;
            }

            if (target instanceof Map.Entry<?, ?> entry) {
                return sourceMap.containsKey(entry.getKey())
                        && Objects.equals(sourceMap.get(entry.getKey()), entry.getValue());
            }

            return false;
        }

        if (source instanceof Collection<?> sourceCollection) {

            if (target instanceof Collection<?> targetCollection) {
                return sourceCollection.containsAll(targetCollection);
            }

            if (target != null && target.getClass().isArray()) {
                return evalForArray(sourceCollection, target);
            }

            return sourceCollection.contains(target);
        }


        if (source.getClass().isArray()) {

            Set<Object> sourceSet = new HashSet<>();
            int len = Array.getLength(source);

            for (int i = 0; i < len; i++) {
                sourceSet.add(Array.get(source, i));
            }

            if (target != null && target.getClass().isArray()) {
                return evalForArray(sourceSet, target);
            }

            if (target instanceof Collection<?> targetCollection) {
                return sourceSet.containsAll(targetCollection);
            }

            return sourceSet.contains(target);
        }

        if (source instanceof Iterable<?> iterable) {

            if (target instanceof Collection<?> targetCollection) {
                Set<Object> values = new HashSet<>();
                for (Object obj : iterable) {
                    values.add(obj);
                }
                return values.containsAll(targetCollection);
            }

            for (Object obj : iterable) {
                if (Objects.equals(obj, target)) {
                    return true;
                }
            }

            return false;
        }

        if (source instanceof Iterator<?> iterator) {

            if (target instanceof Collection<?> targetCollection) {
                Set<Object> values = new HashSet<>();
                iterator.forEachRemaining(values::add);
                return values.containsAll(targetCollection);
            }

            while (iterator.hasNext()) {
                if (Objects.equals(iterator.next(), target)) {
                    return true;
                }
            }

            return false;
        }

        return Objects.equals(source, target);
    }

    private static boolean containsWithCase(CharSequence source, Object target, boolean ignoreCase) {
        if (target instanceof CharSequence
                || target instanceof Number
                || target instanceof Character
                || target instanceof Boolean
                || target instanceof Enum<?>) {

            if (ignoreCase) {
                return source.toString()
                        .toLowerCase()
                        .contains(target.toString().toLowerCase());
            }

            return source.toString().contains(target.toString());
        }

        return false;
    }

    private static boolean evalForArray(Collection<?> source, Object target) {
        Preconditions.requiredArray(target.getClass().isArray(), "Target object must a type of Array");
        int len = Array.getLength(target);
        for (int i = 0; i < len; i++) {
            if (!source.contains(Array.get(target, i))) {
                return false;
            }
        }

        return true;
    }
}
