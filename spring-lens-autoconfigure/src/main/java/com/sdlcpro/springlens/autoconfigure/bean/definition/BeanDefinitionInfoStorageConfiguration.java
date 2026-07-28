package com.sdlcpro.springlens.autoconfigure.bean.definition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import com.sdlcpro.springlens.storage.bean.definition.BeanDefinitionInfoPersistenceHandler;
import com.sdlcpro.springlens.storage.bean.definition.InMemoryBeanDefinitionInfoRepository;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;


@SpringLensInternalComponent
@Configuration(proxyBeanMethods = false)
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@ConditionalOnClass({InMemoryBeanDefinitionInfoRepository.class})
class BeanDefinitionInfoStorageConfiguration {

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    @ConditionalOnMissingBean(BeanDefinitionInfoRepository.class)
    public BeanDefinitionInfoRepository inMemoryBeanDefinitionInfoRepository() {
        return new InMemoryBeanDefinitionInfoRepository();
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    @ConditionalOnBean(BeanDefinitionInfoRepository.class)
    @ConditionalOnMissingBean(BeanDefinitionInfoPersistenceHandler.class)
    public BeanDefinitionInfoPersistenceHandler beanDefinitionInfoPersistenceHandler(
            BeanDefinitionInfoRepository beanDefinitionInfoRepository) {
        return new BeanDefinitionInfoPersistenceHandler(beanDefinitionInfoRepository);
    }
}
