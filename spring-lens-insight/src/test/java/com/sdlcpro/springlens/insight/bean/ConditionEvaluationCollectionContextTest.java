package com.sdlcpro.springlens.insight.bean;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;


class ConditionEvaluationCollectionContextTest {
    @Test
    void shouldReturnClassName(){
        String className = "com.example.TestClass";

        ConditionEvaluationCollectionContext context = new ConditionEvaluationCollectionContext(className);

        assertEquals(className, context.getClassName());
    }
}
