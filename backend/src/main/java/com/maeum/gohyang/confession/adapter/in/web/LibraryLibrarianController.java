package com.maeum.gohyang.confession.adapter.in.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.confession.application.port.in.ListLibrarianSimilarConfessionsUseCase;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/library/librarian")
@RequiredArgsConstructor
public class LibraryLibrarianController {

    private final ListLibrarianSimilarConfessionsUseCase listLibrarianSimilarConfessionsUseCase;

    @GetMapping("/similar-confessions")
    public List<ConfessionSummaryResponse> listSimilarConfessions(
            @RequestParam(required = false) ConfessionBookshelf bookshelf,
            @RequestParam(defaultValue = "5") int limit) {
        return listLibrarianSimilarConfessionsUseCase.execute(
                        new ListLibrarianSimilarConfessionsUseCase.Query(bookshelf, limit)
                )
                .stream()
                .map(ConfessionSummaryResponse::from)
                .toList();
    }
}
