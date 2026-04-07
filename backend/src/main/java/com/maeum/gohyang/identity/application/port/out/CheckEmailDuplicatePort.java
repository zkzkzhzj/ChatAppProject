package com.maeum.gohyang.identity.application.port.out;

public interface CheckEmailDuplicatePort {

    boolean isEmailTaken(String email);
}
