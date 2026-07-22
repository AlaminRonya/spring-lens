package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import com.sdlcpro.springlens.storage.bean.definition.InMemoryBeanDefinitionInfoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class BeanStorageConfigurationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(BeanStorageConfiguration.class);

    @Test
    void registersInMemoryRepositoryByDefault() {
        runner.run(context -> {
            assertThat(context).hasBean("springLensInMemoryBeanDefinitionInfoRepository");
            assertThat(context.getBean(BeanDefinitionInfoRepository.class))
                    .isInstanceOf(InMemoryBeanDefinitionInfoRepository.class);
        });
    }

    @Test
    void skipsInMemoryWhenCustomRepositoryPresent() {
        new ApplicationContextRunner()
                .withUserConfiguration(CustomRepoConfig.class, BeanStorageConfiguration.class)
                .run(context -> {
                    assertThat(context).doesNotHaveBean("springLensInMemoryBeanDefinitionInfoRepository");
                    assertThat(context.getBeansOfType(BeanDefinitionInfoRepository.class)).hasSize(1);
                });
    }

    @Configuration
    static class CustomRepoConfig {
        @Bean
        BeanDefinitionInfoRepository customRepo() {
            return mock(BeanDefinitionInfoRepository.class);
        }
    }
}
