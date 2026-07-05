package com.sdlcpro.springlens.util;

import java.util.Collection;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Preconditions utility for validating arguments and state.
 */
public final class Preconditions {

    private Preconditions() {
    }

    // --- State Assertions ---

    public static void state(boolean expression, String message) {
        if (!expression) throw new IllegalStateException(message);
    }

    public static void state(boolean expression, Supplier<String> supplier) {
        if (!expression) throw new IllegalStateException(supplier.get());
    }

    // --- Boolean Assertions ---

    public static void isTrue(boolean expression, String message) {
        if (!expression) throw new IllegalArgumentException(message);
    }

    public static void isTrue(boolean expression, Supplier<String> messageSupplier) {
        if (!expression) throw new IllegalArgumentException(messageSupplier.get());
    }

    public static <X extends Throwable> void isTrueOrThrow(boolean expression, Supplier<? extends X> exceptionSupplier) throws X {
        if (!expression) throw exceptionSupplier.get();
    }

    // --- Nullability ---

    public static <T> T isNull(T obj, String msg) {
        if (obj != null) throw new IllegalArgumentException(msg);
        return obj;
    }

    public static <T> T notNull(T obj, String msg) {
        if (obj == null) throw new IllegalArgumentException(msg);
        return obj;
    }

    public static <T, X extends Throwable> T notNullOrThrow(T obj, Supplier<? extends X> exceptionSupplier) throws X {
        if (obj == null) throw exceptionSupplier.get();
        return obj;
    }

    // --- String Assertions ---

    public static String hasLength(String str, String msg) {
        if (str == null || str.isEmpty()) throw new IllegalArgumentException(msg);
        return str;
    }

    public static String hasText(String str, String msg) {
        if (str == null || str.isBlank()) throw new IllegalArgumentException(msg);
        return str;
    }

    public static <X extends Throwable> String hasTextOrThrow(String str, Supplier<? extends X> exceptionSupplier) throws X {
        if (str == null || str.isBlank()) throw exceptionSupplier.get();
        return str;
    }

    public static String doesNotContain(String text, String sub, String msg) {
        if (text != null && text.contains(sub)) throw new IllegalArgumentException(msg);
        return text;
    }

    // --- Collection/Array Assertions ---

    public static <T> T[] notEmpty(T[] array, String msg) {
        if (array == null || array.length == 0) throw new IllegalArgumentException(msg);
        return array;
    }

    public static <T extends Collection<?>> T notEmpty(T collection, String msg) {
        if (collection == null || collection.isEmpty()) throw new IllegalArgumentException(msg);
        return collection;
    }

    public static <T extends Collection<?>, X extends Throwable> T notEmptyOrThrow(T coll, Supplier<? extends X> supplier) throws X {
        if (coll == null || coll.isEmpty()) throw supplier.get();
        return coll;
    }

    public static <T extends Map<?, ?>> T notEmpty(T map, String msg) {
        if (map == null || map.isEmpty()) throw new IllegalArgumentException(msg);
        return map;
    }

    public static <T> T[] noNullElements(T[] array, String msg) {
        if (array != null) {
            for (T e : array) if (e == null) throw new IllegalArgumentException(msg);
        }
        return array;
    }

    // --- Type Checks ---

    public static void isInstanceOf(Class<?> type, Object obj, String msg) {
        if (type == null || !type.isInstance(obj)) throw new IllegalArgumentException(msg);
    }

    public static void isAssignable(Class<?> superType, Class<?> subType, String msg) {
        if (superType == null || subType == null || !superType.isAssignableFrom(subType)) {
            throw new IllegalArgumentException(msg);
        }
    }
}