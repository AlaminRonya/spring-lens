package com.sdlcpro.springlens.insight.support.delegator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashSet;
import java.util.Set;

import com.sdlcpro.springlens.insight.bean.BeanInfoCollectorSettings;
import org.junit.jupiter.api.Test;

class BeanInfoCollectorSettingsTest {

    @Test
    void should_not_be_affected_by_mutation_of_source_sets_after_construction() {

        Set<String> packages = new HashSet<>(Set.of("com.example.internal"));
        Set<String> classes = new HashSet<>(Set.of("com.example.Foo"));

        // When
        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(true, false, packages, classes);
        packages.add("com.example.hacked");
        classes.add("com.example.Injected");


        assertThat(settings.excludePackagePatterns())
                .containsExactly("com.example.internal");
        assertThat(settings.excludeClasses())
                .containsExactly("com.example.Foo");
    }

    @Test
    void should_throw_unsupported_operation_exception_when_mutating_internal_sets() {
        BeanInfoCollectorSettings settings = new BeanInfoCollectorSettings(
                true, true, Set.of("com.example"), Set.of("com.example.Foo"));
        
        assertThatThrownBy(() -> settings.excludePackagePatterns().add("x"))
                .isInstanceOf(UnsupportedOperationException.class);

        assertThatThrownBy(() -> settings.excludeClasses().add("y"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void should_normalize_null_sets_to_empty_set() {
        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(false, false, null, null);


        assertThat(settings.excludePackagePatterns()).isEmpty();
        assertThat(settings.excludeClasses()).isEmpty();
    }

    @Test
    void should_store_boolean_flags_as_is() {
        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(true, false, Set.of(), Set.of());

        assertThat(settings.includeInfraRole()).isTrue();
        assertThat(settings.includeToolInternal()).isFalse();
    }

    @Test
    void should_be_equal_when_all_fields_match() {

        BeanInfoCollectorSettings a = new BeanInfoCollectorSettings(
                true, false, Set.of("p1"), Set.of("c1"));
        BeanInfoCollectorSettings b = new BeanInfoCollectorSettings(
                true, false, Set.of("p1"), Set.of("c1"));

        assertThat(a).isEqualTo(b).hasSameHashCodeAs(b);
    }

    @Test
    void should_not_break_compact_constructor_when_sets_are_already_immutable() {
        BeanInfoCollectorSettings settings =
                new BeanInfoCollectorSettings(true, true, Set.of(), Set.of());

        assertThat(settings.excludePackagePatterns()).isEmpty();
        assertThat(settings.excludeClasses()).isEmpty();
    }
}