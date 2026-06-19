package com.maeum.gohyang.village.adapter.out.persistence;

import org.jspecify.annotations.Nullable;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "confession_record")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuppressWarnings("UnusedVariable")
class ConfessionDashboardReadEntity {

    @Id
    private @Nullable Long id;
}
