package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.insight.bean.BeanDefinitionInfoCollector;
import com.sdlcpro.springlens.insight.bean.BeanInfoCollectorSettings;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;

@SpringLensInternalComponent
@ConditionalOnProperty(
        prefix = "spring.lens.bean.definition",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true)
public class BeanInfoCollectorConfiguration {

    @Bean("springLensBeanDefinitionInfoCollector")
    public BeanDefinitionInfoCollector beanDefinitionInfoCollector(
            ApplicationContext context,
            SpringLensBeanProperties properties,
            BeanDefinitionInfoRepository springLensBeanDefinitionInfoRepository) {
        return new BeanDefinitionInfoCollector(
                context, toSettings(properties), springLensBeanDefinitionInfoRepository);
    }

    static BeanInfoCollectorSettings toSettings(SpringLensBeanProperties properties) {
        return new BeanInfoCollectorSettings(
                properties.getInclude().isRoleInfra(),
                properties.getInclude().isToolInternal(),
                properties.getExclude().getPackagePatterns(),
                properties.getExclude().getClasses());
    }
}
