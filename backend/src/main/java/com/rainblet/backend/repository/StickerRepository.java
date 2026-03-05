package com.rainblet.backend.repository;

import com.rainblet.backend.entity.Sticker;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StickerRepository extends JpaRepository<Sticker, String> {
}