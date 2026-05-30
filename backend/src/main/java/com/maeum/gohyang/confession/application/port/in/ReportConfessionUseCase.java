package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionReportReason;

public interface ReportConfessionUseCase {

    Result execute(Command command);

    record Command(long reporterUserId, long confessionId, ConfessionReportReason reason) { }

    record Result(boolean added) { }
}
