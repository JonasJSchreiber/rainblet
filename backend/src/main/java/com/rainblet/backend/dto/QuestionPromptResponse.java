package com.rainblet.backend.dto;

import java.util.List;

public record QuestionPromptResponse(
        String id,
        String prompt,
        List<String> options,
        String topic
) {
}
