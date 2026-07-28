package com.sdlcpro.springlens.autoconfigure.bean.definition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.autoconfigure.bean.SpringLensBeanProperties;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Role;

@AutoConfiguration
@SpringLensInternalComponent
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@EnableConfigurationProperties(SpringLensBeanProperties.class)
@ConditionalOnProperty(
        prefix = "spring.lens.bean.definition",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
@Import({
        BeanDefinitionInfoCollectorConfiguration.class,
        BeanDefinitionInfoStorageConfiguration.class,
        BeanDefinitionInfoHttpExposureConfiguration.class
})
public class SpringLensBeanDefinitionInfoAutoConfiguration {

}
