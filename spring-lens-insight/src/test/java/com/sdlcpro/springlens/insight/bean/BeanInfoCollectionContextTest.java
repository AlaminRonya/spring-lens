package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.model.bean.BeanRole;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class BeanInfoCollectionContextTest {

    @Test
    void delegatesClassNameToSupplier() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_APPLICATION,
                () -> "com.example.MyService",
                () -> Object.class
        );

        assertThat(context.getClassName()).isEqualTo("com.example.MyService");
    }

    @Test
    void delegatesClazzToSupplier() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_APPLICATION,
                () -> "java.lang.String",
                () -> String.class
        );

        assertThat(context.getClazz()).isEqualTo(String.class);
    }

    @Test
    void returnsBeanRoleDirectly() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_INFRASTRUCTURE, null, null
        );

        assertThat(context.getBeanRole()).isEqualTo(BeanRole.ROLE_INFRASTRUCTURE);
    }

    @Test
    void getValueDelegatesToGetClassNameViaProvider() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_APPLICATION,
                () -> "com.example.Delegate",
                null
        );

        // getValue() is inherited from ClassNameProvider -> StringValueProvider
        assertThat(context.getValue()).isEqualTo("com.example.Delegate");
    }

    @Test
    void classSupplierIsNotInvokedUntilGetClazzIsCalled() {
        AtomicBoolean classLoaded = new AtomicBoolean(false);

        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_APPLICATION,
                () -> "com.example.Lazy",
                () -> {
                    classLoaded.set(true);
                    return Object.class;
                }
        );

        // Instantiation alone must NOT trigger the class supplier
        assertThat(classLoaded.get()).isFalse();

        // Accessing role or class name must NOT trigger the class supplier
        context.getBeanRole();
        context.getClassName();
        assertThat(classLoaded.get()).isFalse();

        // Only an explicit getClazz() call triggers the supplier
        Class<?> clazz = context.getClazz();
        assertThat(classLoaded.get()).isTrue();
        assertThat(clazz).isEqualTo(Object.class);
    }

    @Test
    void classNameSupplierIsNotInvokedUntilGetClassNameIsCalled() {
        AtomicBoolean nameResolved = new AtomicBoolean(false);

        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_SUPPORT,
                () -> {
                    nameResolved.set(true);
                    return "com.example.LazyName";
                },
                null
        );

        assertThat(nameResolved.get()).isFalse();

        context.getBeanRole();
        assertThat(nameResolved.get()).isFalse();

        String name = context.getClassName();
        assertThat(nameResolved.get()).isTrue();
        assertThat(name).isEqualTo("com.example.LazyName");
    }

    @Test
    void returnsNullWhenClassNameSupplierIsNull() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.UNKNOWN, null, () -> Object.class
        );

        assertThat(context.getClassName()).isNull();
        assertThat(context.getValue()).isNull();
    }

    @Test
    void returnsNullWhenClassSupplierIsNull() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.UNKNOWN, () -> "com.example.NoClass", null
        );

        assertThat(context.getClazz()).isNull();
    }

    @Test
    void returnsNullBeanRoleWhenConstructedWithNull() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                null, null, null
        );

        assertThat(context.getBeanRole()).isNull();
    }

    @Test
    void supplierIsInvokedOnEveryAccess() {
        AtomicInteger callCount = new AtomicInteger(0);

        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_APPLICATION,
                () -> "call-" + callCount.incrementAndGet(),
                null
        );

        assertThat(context.getClassName()).isEqualTo("call-1");
        assertThat(context.getClassName()).isEqualTo("call-2");
        assertThat(context.getClassName()).isEqualTo("call-3");
        assertThat(callCount.get()).isEqualTo(3);
    }

    @Test
    void recordComponentsAreAccessibleDirectly() {
        BeanInfoCollectionContext context = new BeanInfoCollectionContext(
                BeanRole.ROLE_SUPPORT, () -> "name", () -> Integer.class
        );

        assertThat(context.role()).isEqualTo(BeanRole.ROLE_SUPPORT);
        assertThat(context.classNameSupplier()).isNotNull();
        assertThat(context.classSupplier()).isNotNull();
    }
}
