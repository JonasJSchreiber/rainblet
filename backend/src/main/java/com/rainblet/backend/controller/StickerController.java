package com.rainblet.backend.controller;

import com.rainblet.backend.entity.Sticker;
import com.rainblet.backend.repository.StickerRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/stickers")
public class StickerController {

    private final StickerRepository stickerRepository;

    public StickerController(StickerRepository stickerRepository) {
        this.stickerRepository = stickerRepository;
    }

    @GetMapping
    public List<Sticker> list() {
        return stickerRepository.findAll();
    }

    @GetMapping("/{id}")
    public Sticker getById(@PathVariable String id) {
        return stickerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sticker not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Sticker create(@Valid @RequestBody Sticker sticker) {
        if (stickerRepository.existsById(sticker.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sticker already exists: " + sticker.getId());
        }
        return stickerRepository.save(sticker);
    }

    @PutMapping("/{id}")
    public Sticker update(@PathVariable String id, @Valid @RequestBody Sticker sticker) {
        if (!stickerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sticker not found: " + id);
        }
        sticker.setId(id);
        return stickerRepository.save(sticker);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!stickerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sticker not found: " + id);
        }
        stickerRepository.deleteById(id);
    }
}