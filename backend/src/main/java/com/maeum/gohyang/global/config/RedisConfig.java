package com.maeum.gohyang.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * Redis Pub/Sub 인프라 설정.
 *
 * {@code spring-boot-starter-data-redis} 가 {@link RedisConnectionFactory}(Lettuce) 와
 * {@code StringRedisTemplate} 빈을 자동 구성하므로, 여기서는 raw WS broker(Step 2)가
 * 동적 SUBSCRIBE/UNSUBSCRIBE 에 사용할 {@link RedisMessageListenerContainer} 만 등록한다.
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}
