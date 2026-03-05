package com.rainblet.backend.repository;

import com.rainblet.backend.entity.Collectible;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectibleRepository extends JpaRepository<Collectible, String> {

    long countByIdIn(Collection<String> ids);
}