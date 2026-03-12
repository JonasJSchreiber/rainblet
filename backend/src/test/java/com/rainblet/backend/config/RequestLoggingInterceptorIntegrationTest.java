package com.rainblet.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rainblet.backend.exception.ApiExceptionHandler;
import com.rainblet.backend.service.UserActivityService;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

class RequestLoggingInterceptorIntegrationTest {

    private MockMvc mockMvc;
    private UserActivityService userActivityService;

    @BeforeEach
    void setUp() {
        userActivityService = org.mockito.Mockito.mock(UserActivityService.class);
        RequestLoggingInterceptor interceptor = new RequestLoggingInterceptor(userActivityService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestController())
                .setControllerAdvice(new ResponseBodyCaptureAdvice(), new ApiExceptionHandler())
                .addInterceptors(interceptor)
                .build();

        SecurityContextHolder.clearContext();
        reset(userActivityService);
    }

    @Test
    void shouldCaptureAndRedactJsonResponseBody() throws Exception {
        mockMvc.perform(get("/api/test/success"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> responseBodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(userActivityService)
                .record(any(), nullable(org.springframework.security.core.Authentication.class), responseBodyCaptor.capture());

        String captured = responseBodyCaptor.getValue();
        assertTrue(captured.contains("\"token\":\"***\""));
        assertTrue(captured.contains("\"accessToken\":\"***\""));
        assertTrue(captured.contains("\"password\":\"***\""));
        assertTrue(captured.contains("\"message\":\"ok\""));
        assertFalse(captured.contains("secret-token"));
    }

    @Test
    void shouldCaptureErrorResponseBody() throws Exception {
        mockMvc.perform(get("/api/test/error"))
                .andExpect(status().isBadRequest())
                .andExpect(result -> assertTrue(result.getResponse().getContentAsString().contains("bad request")));

        ArgumentCaptor<String> responseBodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(userActivityService)
                .record(any(), nullable(org.springframework.security.core.Authentication.class), responseBodyCaptor.capture());

        assertTrue(responseBodyCaptor.getValue().contains("\"message\":\"bad request\""));
    }

    @Test
    void shouldTruncateResponseBodyAt2000Chars() throws Exception {
        mockMvc.perform(get("/api/test/long"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> responseBodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(userActivityService)
                .record(any(), nullable(org.springframework.security.core.Authentication.class), responseBodyCaptor.capture());

        assertEquals(2000, responseBodyCaptor.getValue().length());
    }

    @Test
    void shouldSkipBinaryResponseBodyCapture() throws Exception {
        mockMvc.perform(get("/api/test/binary"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> responseBodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(userActivityService)
                .record(any(), nullable(org.springframework.security.core.Authentication.class), responseBodyCaptor.capture());

        assertNull(responseBodyCaptor.getValue());
    }

    @RestController
    @RequestMapping("/api/test")
    static class TestController {

        @GetMapping(value = "/success", produces = MediaType.APPLICATION_JSON_VALUE)
        Map<String, Object> success() {
            return Map.of(
                    "token", "secret-token",
                    "accessToken", "abc123",
                    "password", "my-password",
                    "message", "ok"
            );
        }

        @GetMapping(value = "/error", produces = MediaType.APPLICATION_JSON_VALUE)
        Map<String, Object> error() {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "bad request");
        }

        @GetMapping(value = "/long", produces = MediaType.APPLICATION_JSON_VALUE)
        Map<String, Object> longBody() {
            return Map.of("data", "x".repeat(5000));
        }

        @GetMapping(value = "/binary", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
        byte[] binary() {
            return "binary".getBytes(StandardCharsets.UTF_8);
        }
    }
}
