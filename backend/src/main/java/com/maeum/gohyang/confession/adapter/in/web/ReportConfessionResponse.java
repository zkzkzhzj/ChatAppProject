package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.ReportConfessionUseCase;

public record ReportConfessionResponse(
        boolean added
) {

    public static ReportConfessionResponse from(ReportConfessionUseCase.Result result) {
        return new ReportConfessionResponse(result.added());
    }
}
