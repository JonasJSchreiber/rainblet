package com.rainblet.backend.dto;

import java.util.List;

public class UserCollectiblesRequest {

    private List<String> collectibleIds;

    public List<String> getCollectibleIds() {
        return collectibleIds;
    }

    public void setCollectibleIds(List<String> collectibleIds) {
        this.collectibleIds = collectibleIds;
    }
}