package com.rainblet.backend.repository;

import com.rainblet.backend.entity.RarityLevel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RarityLevelRepository extends JpaRepository<RarityLevel, Long> {
    List<RarityLevel> findByActiveTrueOrderByRankValueAsc();
}
