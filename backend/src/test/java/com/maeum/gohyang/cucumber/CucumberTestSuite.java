package com.maeum.gohyang.cucumber;

import static io.cucumber.junit.platform.engine.Constants.FILTER_TAGS_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.PLUGIN_PROPERTY_NAME;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;

/**
 * Cucumber 테스트 전체를 실행하는 JUnit Platform Suite 진입점.
 *
 * IDE 또는 Gradle에서 이 클래스 하나를 실행하면 features/ 하위 모든 시나리오가 실행된다.
 *
 * junit-platform.properties와 병행 사용:
 * - Gradle test 태스크는 junit-platform.properties를 읽어 Cucumber 엔진을 직접 구동한다.
 * - IDE에서 이 Suite 클래스를 실행하면 아래 @ConfigurationParameter가 적용된다.
 */
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(
        key = GLUE_PROPERTY_NAME,
        value = "com.maeum.gohyang.support,com.maeum.gohyang.cucumber"
)
@ConfigurationParameter(
        key = PLUGIN_PROPERTY_NAME,
        value = "pretty,html:build/reports/cucumber/cucumber.html,json:build/reports/cucumber/cucumber.json"
)
@ConfigurationParameter(
        key = FILTER_TAGS_PROPERTY_NAME,
        value = "not @ignore"
)
public class CucumberTestSuite {
}
