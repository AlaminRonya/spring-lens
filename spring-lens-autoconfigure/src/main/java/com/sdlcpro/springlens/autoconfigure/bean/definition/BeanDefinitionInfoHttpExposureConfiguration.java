package com.sdlcpro.springlens.autoconfigure.bean.definition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.exposure.bean.BeanDefinitionInfoRestController;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;

import static org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type;

@SpringLensInternalComponent
@Configuration(proxyBeanMethods = false)
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@ConditionalOnWebApplication(type = Type.SERVLET)
@ConditionalOnClass({BeanDefinitionInfoRestController.class})
class BeanDefinitionInfoHttpExposureConfiguration {

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    @ConditionalOnBean(BeanDefinitionInfoRepository.class)
    public BeanDefinitionInfoRestController beanDefinitionInfoRestController(
            BeanDefinitionInfoRepository beanDefinitionInfoRepository) {
        return new BeanDefinitionInfoRestController(beanDefinitionInfoRepository);
    }
}
