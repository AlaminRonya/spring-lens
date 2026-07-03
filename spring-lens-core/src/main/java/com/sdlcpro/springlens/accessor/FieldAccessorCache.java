package com.sdlcpro.springlens.accessor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Centralized, high-performance reflection utility that caches functional
 * bean property extractors.
 *
 * <p>Accessors are stored in a two-tiered, thread-safe registry indexed
 * first by the root {@link Class} and then by the (possibly nested)
 * field path (e.g. {@code "address.city"}). Caching the resolved
 * {@link Function} avoids repeated runtime reflection overhead during
 * query parsing and structural inspection.</p>
 *
 * <p>This class is a static utility and cannot be instantiated or
 * extended.</p>
 */
public final class FieldAccessorCache {

    /**
     * Two-tiered accessor registry: root type &rarr; field path &rarr; extractor.
     */
    private static final Map<Class<?>, Map<String, Function<Object, Object>>> CACHE = new ConcurrentHashMap<>();

    private FieldAccessorCache() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    /**
     * Returns a cached property extractor for the given root type and
     * nested field path, resolving and caching it on first access.
     *
     * @param rootType  the class from which the field path is resolved
     * @param fieldPath the dot-separated path of the property to access
     * @return a function extracting the property value from an instance
     *         of {@code rootType}
     */
    public static Function<Object, Object> getAccessor(Class<?> rootType, String fieldPath) {
        // TODO: provide proper implementation later
        return null;
    }

    /**
     * Removes all cached accessors from the registry.
     */
    public static void clear() {
        CACHE.clear();
    }

    /**
     * Returns the total number of cached accessors across all root types.
     *
     * @return the aggregate count of cached field accessors
     */
    public static int cacheSize() {
        return CACHE.values()
                .stream()
                .mapToInt(Map::size)
                .sum();
    }
}
