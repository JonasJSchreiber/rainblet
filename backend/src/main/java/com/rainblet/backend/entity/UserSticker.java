package com.rainblet.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "user_stickers",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_stickers_user_sticker", columnNames = {"user_id", "sticker_id"})
        }
)
public class UserSticker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "sticker_id", nullable = false, length = 120)
    private String stickerId;

    @Column(name = "sticker_count", nullable = false)
    private int stickerCount;

    @Column(name = "first_obtained_at", nullable = false, updatable = false)
    private Instant firstObtainedAt;

    @Column(name = "last_obtained_at", nullable = false)
    private Instant lastObtainedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sticker_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Sticker sticker;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        if (firstObtainedAt == null) {
            firstObtainedAt = now;
        }
        if (lastObtainedAt == null) {
            lastObtainedAt = now;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.lastObtainedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getStickerId() {
        return stickerId;
    }

    public void setStickerId(String stickerId) {
        this.stickerId = stickerId;
    }

    public int getStickerCount() {
        return stickerCount;
    }

    public void setStickerCount(int stickerCount) {
        this.stickerCount = stickerCount;
    }

    public Instant getFirstObtainedAt() {
        return firstObtainedAt;
    }

    public void setFirstObtainedAt(Instant firstObtainedAt) {
        this.firstObtainedAt = firstObtainedAt;
    }

    public Instant getLastObtainedAt() {
        return lastObtainedAt;
    }

    public void setLastObtainedAt(Instant lastObtainedAt) {
        this.lastObtainedAt = lastObtainedAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Sticker getSticker() {
        return sticker;
    }

    public void setSticker(Sticker sticker) {
        this.sticker = sticker;
    }
}
