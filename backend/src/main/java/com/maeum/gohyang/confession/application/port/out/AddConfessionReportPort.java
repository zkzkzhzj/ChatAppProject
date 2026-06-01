package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionReport;

public interface AddConfessionReportPort {

    boolean addIfAbsent(ConfessionReport report);
}
