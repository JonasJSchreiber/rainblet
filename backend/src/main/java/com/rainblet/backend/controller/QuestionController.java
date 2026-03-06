package com.rainblet.backend.controller;

import com.rainblet.backend.dto.QuestionPromptResponse;
import com.rainblet.backend.dto.QuestionValidationRequest;
import com.rainblet.backend.dto.QuestionValidationResponse;
import com.rainblet.backend.entity.Question;
import com.rainblet.backend.repository.QuestionRepository;
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
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @GetMapping
    public List<QuestionPromptResponse> list() {
        return questionRepository.findAll().stream().map(this::toPromptResponse).toList();
    }

    @GetMapping("/{id}")
    public Question getById(@PathVariable String id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found: " + id));
    }

    @PostMapping("/{id}/validate")
    public QuestionValidationResponse validateAnswer(
            @PathVariable String id,
            @RequestBody(required = false) QuestionValidationRequest request
    ) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found: " + id));

        if (request == null || request.getSelectedIndex() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "selectedIndex is required");
        }

        int selectedIndex = request.getSelectedIndex();
        if (selectedIndex < 0 || selectedIndex >= question.getOptions().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "selectedIndex must be within options bounds");
        }

        int correctIndex = question.getCorrectIndex();
        return new QuestionValidationResponse(selectedIndex == correctIndex, correctIndex);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Question create(@Valid @RequestBody Question question) {
        validateCorrectIndex(question);
        if (questionRepository.existsById(question.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question already exists: " + question.getId());
        }
        return questionRepository.save(question);
    }

    @PutMapping("/{id}")
    public Question update(@PathVariable String id, @Valid @RequestBody Question question) {
        validateCorrectIndex(question);
        if (!questionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found: " + id);
        }
        question.setId(id);
        return questionRepository.save(question);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!questionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found: " + id);
        }
        questionRepository.deleteById(id);
    }

    private void validateCorrectIndex(Question question) {
        if (question.getCorrectIndex() == null || question.getOptions() == null || question.getOptions().isEmpty()) {
            return;
        }

        if (question.getCorrectIndex() >= question.getOptions().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "correctIndex must be within options bounds");
        }
    }

    private QuestionPromptResponse toPromptResponse(Question question) {
        return new QuestionPromptResponse(
                question.getId(),
                question.getPrompt(),
                question.getOptions(),
                question.getTopic()
        );
    }
}
