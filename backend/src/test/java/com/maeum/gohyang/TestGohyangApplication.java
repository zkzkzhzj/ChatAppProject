package com.maeum.gohyang;

import org.springframework.boot.SpringApplication;

public class TestGohyangApplication {

	public static void main(String[] args) {
		SpringApplication.from(GohyangApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
