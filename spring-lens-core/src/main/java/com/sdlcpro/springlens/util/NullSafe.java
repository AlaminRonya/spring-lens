package com.sdlcpro.springlens.util;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class NullSafe
{
    private NullSafe() {
        throw new UnsupportedOperationException("CollectionSanitizer is an utility class and cannot be instantiated");
    }

    public static <K, V> Map<K, V> emptyIfNull(Map<? extends K, ? extends V> map) {
        return (map == null) ? Map.of() : Map.copyOf(map);
    }

    public static <K>Set<K> emptyIfNull(Set<? extends K> set) {
        return (set == null) ? Set.of() : Set.copyOf(set);
    }

    public static <K> List<K> emptyIfNull(List<? extends K> list) {
        return (list == null) ? List.of() : List.copyOf(list);
    }

    public static <E extends Enum<E>> EnumSet<E> emptyIfNull(EnumSet<E> enumSet, Class<E> enumClass) {
        return (enumSet == null || enumSet.isEmpty()) ? EnumSet.noneOf(enumClass) : EnumSet.copyOf(enumSet);
    }
}