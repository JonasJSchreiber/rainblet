package com.rainblet.backend.controller;

import com.rainblet.backend.entity.Collectible;
import com.rainblet.backend.repository.CollectibleRepository;
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
@RequestMapping("/api/collectibles")
public class CollectibleController {

    private final CollectibleRepository collectibleRepository;

    public CollectibleController(CollectibleRepository collectibleRepository) {
        this.collectibleRepository = collectibleRepository;
    }

    @GetMapping
    public List<Collectible> list() {
        return collectibleRepository.findAll();
    }

    @GetMapping("/{id}")
    public Collectible getById(@PathVariable String id) {
        return collectibleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collectible not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Collectible create(@Valid @RequestBody Collectible collectible) {
        if (collectibleRepository.existsById(collectible.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Collectible already exists: " + collectible.getId());
        }
        return collectibleRepository.save(collectible);
    }

    @PutMapping("/{id}")
    public Collectible update(@PathVariable String id, @Valid @RequestBody Collectible collectible) {
        if (!collectibleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collectible not found: " + id);
        }
        collectible.setId(id);
        return collectibleRepository.save(collectible);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!collectibleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collectible not found: " + id);
        }
        collectibleRepository.deleteById(id);
    }
}
