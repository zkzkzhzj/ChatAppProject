package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.ReportConfessionUseCase;
import com.maeum.gohyang.confession.domain.ConfessionReportReason;

import jakarta.validation.constraints.NotNull;

public record ReportConfessionRequest(
        @NotNull
        ConfessionReportReason reason
) {

    public ReportConfessionUseCase.Command toCommand(long reporterUserId, long confessionId) {
        return new ReportConfessionUseCase.Command(reporterUserId, confessionId, reason);
    }
}
