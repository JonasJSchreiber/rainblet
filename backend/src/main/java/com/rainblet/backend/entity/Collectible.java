package com.rainblet.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name = "collectibles")
public class Collectible {

    @Id
    @NotBlank
    @Column(nullable = false, updatable = false, length = 100)
    private String id;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 500)
    private String description;

    @NotBlank
    @Pattern(regexp = "common|rare|epic")
    @Column(nullable = false, length = 16)
    private String rarity;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String unlockRule;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRarity() {
        return rarity;
    }

    public void setRarity(String rarity) {
        this.rarity = rarity;
    }

    public String getUnlockRule() {
        return unlockRule;
    }

    public void setUnlockRule(String unlockRule) {
        this.unlockRule = unlockRule;
    }
}
