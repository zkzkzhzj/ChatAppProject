package com.maeum.gohyang.confession.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.confession.application.port.in.CreateConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.DeleteConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.GetConfessionDetailUseCase;
import com.maeum.gohyang.confession.application.port.in.ListConfessionsUseCase;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/confessions")
@RequiredArgsConstructor
public class ConfessionController {

    private final CreateConfessionUseCase createConfessionUseCase;
    private final ListConfessionsUseCase listConfessionsUseCase;
    private final GetConfessionDetailUseCase getConfessionDetailUseCase;
    private final DeleteConfessionUseCase deleteConfessionUseCase;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConfessionResponse create(
            @Valid @RequestBody CreateConfessionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        ConfessionRecord record = createConfessionUseCase.execute(request.toCommand(user.userId()));
        return ConfessionResponse.from(record);
    }

    @GetMapping
    public List<ConfessionSummaryResponse> list(
            @RequestParam(required = false) ConfessionBookshelf bookshelf,
            @RequestParam(defaultValue = "20") int limit) {
        return listConfessionsUseCase.execute(new ListConfessionsUseCase.Query(bookshelf, limit))
                .stream()
                .map(ConfessionSummaryResponse::from)
                .toList();
    }

    @GetMapping("/{confessionId}")
    public ConfessionResponse get(@PathVariable long confessionId) {
        return ConfessionResponse.from(getConfessionDetailUseCase.execute(confessionId));
    }

    @DeleteMapping("/{confessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable long confessionId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        deleteConfessionUseCase.execute(new DeleteConfessionUseCase.Command(user.userId(), confessionId));
    }

    private void requireMember(AuthenticatedUser user) {
        if (user == null || user.isGuest()) {
            throw new ConfessionAccessDeniedException();
        }
    }
}
