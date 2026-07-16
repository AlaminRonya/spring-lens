package com.sdlcpro.springlens.util;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;
import java.util.List;

public class ClassInspector {

    private ClassInspector() {
        throw new UnsupportedOperationException("The ClassInspector is an utility class and cannot be instantiated");
    }

    public static String getQualifiedClassName(Class<?> clazz) {
        Preconditions.notNull(clazz, "Class must not be null");
        return clazz.getTypeName();
    }

    public static String getClassName(Class<?> clazz) {
        Preconditions.notNull(clazz, "Class must not be null");
        return clazz.getSimpleName();
    }

    public static String getQualifiedMethodName(Method method) {
        return getQualifiedMethodName(method, (Class<?>) null);
    }

    public static String getQualifiedMethodName(Method method, Class<?> clazz) {
        Preconditions.notNull(method, "Method must not be null");
        String className = (clazz != null ? clazz : method.getDeclaringClass()).getName();
        return className + "." + method.getName();
    }

    public static String getMethodName(Method method) {
        Preconditions.notNull(method, "Method must not be null");
        return method.getName();
    }

    public static String getQualifiedMethodReturnType(Method method) {
        Preconditions.notNull(method, "Method must not be null");
        return method.getReturnType().getTypeName();
    }

    public static String getMethodReturnType(Method method) {
        Preconditions.notNull(method, "Method must not be null");
        return method.getReturnType().getSimpleName();
    }

    public static List<String> getMethodParameters(Method method) {
        Preconditions.notNull(method, "Method must not be null");
        return Arrays.stream(method.getParameters())
                .map(Parameter::toString)
                .toList();
    }

    public static boolean isAnnotationPresent(Class<?> clazz, Class<? extends Annotation> annotationType) {
        Preconditions.notNull(clazz, "Class must not be null");
        Preconditions.notNull(annotationType, "Annotation type must not be null");
        return clazz.isAnnotationPresent(annotationType);
    }

    public static boolean hasAnnotation(Class<?> clazz, Class<? extends Annotation> annotationType) {
        Preconditions.notNull(clazz, "Class must not be null");
        Preconditions.notNull(annotationType, "Annotation type must not be null");
        if (clazz.isAnnotationPresent(annotationType)) {
            return true;
        }

        for (Class<?> _interface : clazz.getInterfaces()) {
            if (isAnnotationPresent(_interface, annotationType)) {
                return true;
            }
        }

        return clazz.getSuperclass() != null && isAnnotationPresent(clazz.getSuperclass(), annotationType);
    }
}
