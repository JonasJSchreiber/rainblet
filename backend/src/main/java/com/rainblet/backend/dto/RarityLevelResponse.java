package com.rainblet.backend.dto;

public class RarityLevelResponse {

    private final Long id;
    private final String code;
    private final String displayName;
    private final Integer rankValue;
    private final String description;
    private final Boolean active;

    public RarityLevelResponse(Long id, String code, String displayName, Integer rankValue, String description, Boolean active) {
        this.id = id;
        this.code = code;
        this.displayName = displayName;
        this.rankValue = rankValue;
        this.description = description;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Integer getRankValue() {
        return rankValue;
    }

    public String getDescription() {
        return description;
    }

    public Boolean getActive() {
        return active;
    }
}
