package com.rainblet.backend.dto;

public record QuestionValidationResponse(
        boolean isCorrect,
        int correctIndex
) {
}
