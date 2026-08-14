package com.sdlcpro.springlens.autoconfigure.bean.condition;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class ConditionReportPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(TestConfiguration.class);

    @Test
    void defaultProperties() {
        this.contextRunner.run(context -> {
            ConditionReportProperties properties = context.getBean(ConditionReportProperties.class);
            assertThat(properties.isEnabled()).isTrue();
            assertThat(properties.getInclude().isToolInternal()).isFalse();
            assertThat(properties.getExclude().getPackagePatterns()).isEmpty();
        });
    }

    @Test
    void customProperties() {
        this.contextRunner
                .withPropertyValues(
                        "spring.lens.bean.condition-report.enabled=false",
                        "spring.lens.bean.condition-report.include.tool-internal=true",
                        "spring.lens.bean.condition-report.exclude.package-patterns=com.example.one,com.example.two"
                )
                .run(context -> {
                    ConditionReportProperties properties = context.getBean(ConditionReportProperties.class);
                    assertThat(properties.isEnabled()).isFalse();
                    assertThat(properties.getInclude().isToolInternal()).isTrue();
                    assertThat(properties.getExclude().getPackagePatterns()).containsExactly("com.example.one", "com.example.two");
                });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(ConditionReportProperties.class)
    static class TestConfiguration {
    }
}
