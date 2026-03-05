package com.rainblet.backend.repository;

import com.rainblet.backend.entity.UserWallet;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWalletRepository extends JpaRepository<UserWallet, Long> {

    Optional<UserWallet> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}