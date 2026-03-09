package com.rainblet.backend.controller;

import com.rainblet.backend.dto.RarityLevelResponse;
import com.rainblet.backend.entity.RarityLevel;
import com.rainblet.backend.repository.RarityLevelRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rarities")
public class RarityController {

    private final RarityLevelRepository rarityLevelRepository;

    public RarityController(RarityLevelRepository rarityLevelRepository) {
        this.rarityLevelRepository = rarityLevelRepository;
    }

    @GetMapping
    public List<RarityLevelResponse> list() {
        return rarityLevelRepository.findByActiveTrueOrderByRankValueAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    private RarityLevelResponse toResponse(RarityLevel rarity) {
        return new RarityLevelResponse(
                rarity.getId(),
                rarity.getCode(),
                rarity.getDisplayName(),
                rarity.getRankValue(),
                rarity.getDescription(),
                rarity.getActive()
        );
    }
}
