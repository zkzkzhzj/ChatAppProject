package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.ReportConfessionUseCase;
import com.maeum.gohyang.confession.application.port.out.AddConfessionReportPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionReport;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReportConfessionService implements ReportConfessionUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final AddConfessionReportPort addConfessionReportPort;

    @Override
    @Transactional
    public Result execute(Command command) {
        ConfessionRecord record = loadConfessionRecordPort.load(command.confessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isVisible()) {
            throw new ConfessionNotFoundException();
        }
        if (record.isAuthor(command.reporterUserId())) {
            throw new ConfessionAccessDeniedException();
        }
        boolean added = addConfessionReportPort.addIfAbsent(
                ConfessionReport.newReport(command.confessionId(), command.reporterUserId(), command.reason())
        );
        return new Result(added);
    }
}
