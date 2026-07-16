package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.exposure.bean.BeanDetailsRestController;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class BeanWebConfigurationTest {

    private static final String CONTROLLER_BEAN_NAME = "springLensBeanDetailsRestController";

    private final WebApplicationContextRunner webContextRunner = new WebApplicationContextRunner()
            .withBean(BeanDefinitionInfoRepository.class, () -> mock(BeanDefinitionInfoRepository.class))
            .withUserConfiguration(BeanWebConfiguration.class);

    private final ApplicationContextRunner nonWebContextRunner = new ApplicationContextRunner()
            .withBean(BeanDefinitionInfoRepository.class, () -> mock(BeanDefinitionInfoRepository.class))
            .withUserConfiguration(BeanWebConfiguration.class);

    @Test
    void registersRestControllerInServletWebApplication() {
        webContextRunner.run(context -> {
            assertThat(context).hasBean(CONTROLLER_BEAN_NAME);
            assertThat(context.getBean(CONTROLLER_BEAN_NAME))
                    .isInstanceOf(BeanDetailsRestController.class);
        });
    }

    @Test
    void doesNotRegisterRestControllerInNonWebApplication() {
        nonWebContextRunner.run(context -> {
            assertThat(context).doesNotHaveBean(CONTROLLER_BEAN_NAME);
            assertThat(context).doesNotHaveBean(BeanDetailsRestController.class);
        });
    }

    @Test
    void wiresRestControllerToRepository() {
        webContextRunner.run(context -> {
            assertThat(context).hasSingleBean(BeanDetailsRestController.class);
            assertThat(context.getBean(BeanDetailsRestController.class)).isNotNull();
        });
    }
}
