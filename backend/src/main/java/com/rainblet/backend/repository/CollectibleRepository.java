package com.rainblet.backend.repository;

import com.rainblet.backend.entity.Collectible;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectibleRepository extends JpaRepository<Collectible, String> {
}
