package com.maeum.gohyang;

import org.springframework.boot.SpringApplication;

// 로컬에서 Testcontainers 기반으로 애플리케이션을 실행할 때 사용하는 진입점.
// 현재 Testcontainers 설정은 BaseTestContainers + @DynamicPropertySource 패턴으로 이관됨.
// 이 클래스는 향후 필요 시 확장한다.
public class TestGohyangApplication {

	public static void main(String[] args) {
		SpringApplication.from(GohyangApplication::main).run(args);
	}
}
