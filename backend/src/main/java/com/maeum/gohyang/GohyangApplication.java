package com.maeum.gohyang;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GohyangApplication {

	public static void main(String[] args) {
		SpringApplication.run(GohyangApplication.class, args);
	}

}
