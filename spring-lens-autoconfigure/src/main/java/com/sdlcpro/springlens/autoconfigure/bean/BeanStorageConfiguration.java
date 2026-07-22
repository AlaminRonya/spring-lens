package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import com.sdlcpro.springlens.storage.bean.definition.InMemoryBeanDefinitionInfoRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

@SpringLensInternalComponent
public class BeanStorageConfiguration {

    @Bean("springLensInMemoryBeanDefinitionInfoRepository")
    @ConditionalOnMissingBean(BeanDefinitionInfoRepository.class)
    public BeanDefinitionInfoRepository beanDefinitionInfoRepository() {
        return new InMemoryBeanDefinitionInfoRepository();
    }
}
