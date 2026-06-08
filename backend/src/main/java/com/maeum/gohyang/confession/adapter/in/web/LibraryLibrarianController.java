package com.maeum.gohyang.confession.adapter.in.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.confession.application.port.in.ListLibrarianSimilarConfessionsUseCase;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/library/librarian")
@RequiredArgsConstructor
public class LibraryLibrarianController {

    private final ListLibrarianSimilarConfessionsUseCase listLibrarianSimilarConfessionsUseCase;

    @GetMapping("/similar-confessions")
    public List<ConfessionSummaryResponse> listSimilarConfessions(
            @Valid @ModelAttribute ListSimilarConfessionsRequest request) {
        return listLibrarianSimilarConfessionsUseCase.execute(
                        request.toQuery()
                )
                .stream()
                .map(ConfessionSummaryResponse::from)
                .toList();
    }

    public record ListSimilarConfessionsRequest(
            ConfessionBookshelf bookshelf,
            @Min(1) @Max(20) Integer limit
    ) {
        private static final int DEFAULT_LIMIT = 5;

        ListLibrarianSimilarConfessionsUseCase.Query toQuery() {
            return new ListLibrarianSimilarConfessionsUseCase.Query(
                    bookshelf,
                    limit != null ? limit : DEFAULT_LIMIT
            );
        }
    }
}
