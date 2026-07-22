package com.sdlcpro.springlens.autoconfigure.bean.definition;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.autoconfigure.bean.BeanInfoCollectorConfiguration;
import com.sdlcpro.springlens.autoconfigure.bean.BeanStorageConfiguration;
import com.sdlcpro.springlens.autoconfigure.bean.BeanWebConfiguration;
import com.sdlcpro.springlens.autoconfigure.bean.SpringLensBeanProperties;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@SpringLensInternalComponent
@EnableConfigurationProperties(SpringLensBeanProperties.class)
@ConditionalOnProperty(
        prefix = "spring.lens.bean.definition",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true)
@Import({
        BeanStorageConfiguration.class,
        BeanInfoCollectorConfiguration.class,
        BeanWebConfiguration.class
})
public class SpringLensBeanDefinitionInfoAutoConfiguration {
}
