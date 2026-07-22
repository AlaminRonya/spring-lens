package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.insight.bean.BeanDefinitionInfoCollector;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class BeanInfoCollectorConfigurationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(BeanInfoCollectorConfiguration.class, SupportConfig.class);

    @Test
    void registersCollectorBean() {
        runner.run(context -> {
            assertThat(context).hasBean("springLensBeanDefinitionInfoCollector");
            assertThat(context.getBean("springLensBeanDefinitionInfoCollector"))
                    .isInstanceOf(BeanDefinitionInfoCollector.class);
        });
    }

    @Configuration
    @EnableConfigurationProperties(SpringLensBeanProperties.class)
    static class SupportConfig {
        @Bean
        BeanDefinitionInfoRepository repo() {
            return mock(BeanDefinitionInfoRepository.class);
        }
    }
}
