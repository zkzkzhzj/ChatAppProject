package com.maeum.gohyang.global.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 비동기 처리 활성화.
 *
 * NPC 응답 생성 등 비동기 작업에서 @Async를 사용하기 위해 필요하다.
 * WebSocket 관련 TaskExecutor 빈이 여러 개 존재하므로,
 * 명시적으로 'taskExecutor' 빈을 정의하여 @Async의 기본 executor로 사용한다.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor(
            @Value("${npc.async.core-pool-size:2}") int corePoolSize,
            @Value("${npc.async.max-pool-size:4}") int maxPoolSize,
            @Value("${npc.async.queue-capacity:50}") int queueCapacity,
            @Value("${npc.async.thread-name-prefix:npc-async-}") String threadNamePrefix) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix(threadNamePrefix);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
