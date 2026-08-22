package com.sdlcpro.springlens.insight.bean.condition;

import com.sdlcpro.springlens.insight.support.provider.ClassNameProvider;

public record ConditionEvaluationCollectionContext(String className) implements ClassNameProvider {

    @Override
    public String getClassName(){
        return this.className;
    }
}
