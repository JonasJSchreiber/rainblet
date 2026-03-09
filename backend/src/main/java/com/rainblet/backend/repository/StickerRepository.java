package com.rainblet.backend.repository;

import com.rainblet.backend.entity.Sticker;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StickerRepository extends JpaRepository<Sticker, String> {

    List<Sticker> findByRarityIgnoreCaseOrderByNameAsc(String rarity);
}
