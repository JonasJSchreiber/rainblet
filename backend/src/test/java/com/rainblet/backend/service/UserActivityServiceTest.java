package com.rainblet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rainblet.backend.entity.User;
import com.rainblet.backend.entity.UserActivity;
import com.rainblet.backend.repository.UserActivityRepository;
import com.rainblet.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class UserActivityServiceTest {

    @Mock
    private UserActivityRepository userActivityRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private UserActivityService userActivityService;

    @Captor
    private ArgumentCaptor<UserActivity> activityCaptor;

    private Authentication authenticatedUser;

    @BeforeEach
    void setUp() {
        authenticatedUser = new UsernamePasswordAuthenticationToken("user@example.com", "n/a", List.of());
    }

    @Test
    void record_shouldPersistResponseBody_whenProvided() {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/test");

        User user = new User();
        user.setId(42L);
        user.setEmail("User@Example.com");
        when(userRepository.findByEmailIgnoreCase(eq("user@example.com"))).thenReturn(Optional.of(user));

        userActivityService.record(request, authenticatedUser, "{\"message\":\"ok\"}");

        verify(userActivityRepository).save(activityCaptor.capture());
        UserActivity saved = activityCaptor.getValue();
        assertEquals(42L, saved.getUserId());
        assertEquals("user@example.com", saved.getUserEmail());
        assertEquals("/api/test", saved.getResourceCalled());
        assertEquals("{\"message\":\"ok\"}", saved.getResponseBody());
    }

    @Test
    void record_shouldPersistNullResponseBody_whenNotCaptured() {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/test");

        User user = new User();
        user.setId(42L);
        user.setEmail("User@Example.com");
        when(userRepository.findByEmailIgnoreCase(eq("user@example.com"))).thenReturn(Optional.of(user));

        userActivityService.record(request, authenticatedUser, null);

        verify(userActivityRepository).save(activityCaptor.capture());
        assertNull(activityCaptor.getValue().getResponseBody());
    }

    @Test
    void record_shouldSkipWhenUnauthenticated() {
        Authentication unauthenticated = new UsernamePasswordAuthenticationToken("user@example.com", "n/a");
        userActivityService.record(request, unauthenticated, "body");

        verify(userActivityRepository, never()).save(any(UserActivity.class));
    }

    @Test
    void record_shouldSkipWhenOptionsRequest() {
        when(request.getMethod()).thenReturn("OPTIONS");

        userActivityService.record(request, authenticatedUser, "body");

        verify(userActivityRepository, never()).save(any(UserActivity.class));
    }

    @Test
    void record_shouldSkipWhenResourceMissing() {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn(" ");

        userActivityService.record(request, authenticatedUser, "body");

        verify(userActivityRepository, never()).save(any(UserActivity.class));
    }
}
