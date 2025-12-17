# Sprint 16: Secure User API Key Management

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 9 (AI Companion), Sprint 15 (Current Events AI)

## Overview

Enable users to bring their own Anthropic API key (BYOK) to power AI features throughout the application. When users attempt to use AI features without a configured key, they're prompted to enter one. Keys are stored securely in the browser with encryption and never sent to our servers—all AI calls go directly from the user's browser to Anthropic's API.

This approach:
- Respects user privacy (keys never touch our servers)
- Eliminates server-side API costs
- Gives users full control over their AI usage
- Enables unlimited AI interactions (based on user's Anthropic plan)

---

## Tasks

### 16.1 API Key Storage Service
- [ ] Create `apiKeyService.ts` for key management
- [ ] Implement AES encryption for localStorage storage
- [ ] Add key validation against Anthropic API
- [ ] Create key expiration/rotation utilities
- [ ] Add secure key deletion (memory cleanup)

### 16.2 API Key Input Modal
- [ ] Create `ApiKeyModal` component
- [ ] Show when user clicks AI feature without key
- [ ] Include clear instructions for getting an API key
- [ ] Add input field with visibility toggle
- [ ] Display validation status (checking, valid, invalid)
- [ ] Link to Anthropic console for key creation
- [ ] Remember "don't show again" preference (optional)

### 16.3 API Key Settings Panel
- [ ] Add API Key section to user settings/profile
- [ ] Show masked key (last 4 characters visible)
- [ ] Allow key update and removal
- [ ] Display usage statistics if available
- [ ] Show key validation status

### 16.4 Direct Anthropic API Integration
- [ ] Create `anthropicDirectApi.ts` service
- [ ] Implement CORS-compatible API calls
- [ ] Handle streaming responses for chat
- [ ] Add proper error handling for API errors
- [ ] Implement request retry with exponential backoff

### 16.5 AI Feature Gate
- [ ] Create `useApiKey` hook for key state
- [ ] Create `withApiKeyRequired` HOC or hook
- [ ] Update AI Companion to check for key
- [ ] Update "Ask AI" in NewsContextModal
- [ ] Add visual indicator when AI features require key

### 16.6 Security Hardening
- [ ] Implement Content Security Policy headers
- [ ] Add XSS protection for key handling
- [ ] Create secure clipboard paste handling
- [ ] Audit all key access points
- [ ] Add key rotation reminders

---

## Data Structures

### Encrypted Key Storage

```typescript
interface EncryptedKeyData {
  // Encrypted API key (AES-GCM)
  encryptedKey: string;
  // Initialization vector for decryption
  iv: string;
  // Timestamp when key was stored
  storedAt: string;
  // Optional expiration timestamp
  expiresAt?: string;
  // Key fingerprint (last 4 chars) for display
  keyFingerprint: string;
  // Version for migration support
  version: number;
}

interface ApiKeyState {
  hasKey: boolean;
  isValidating: boolean;
  isValid: boolean | null;
  keyFingerprint: string | null;
  error: string | null;
}
```

### Key Validation Response

```typescript
interface KeyValidationResult {
  isValid: boolean;
  error?: string;
  modelAccess?: {
    claude3Opus: boolean;
    claude3Sonnet: boolean;
    claude35Sonnet: boolean;
  };
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}
```

---

## UI Components

### API Key Modal

```
┌─────────────────────────────────────────────────────────────┐
│  🔑 API Key Required                              [X Close] │
│  ─────────────────────────────────────────────────          │
│                                                             │
│  To use AI features, you'll need an Anthropic API key.      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔒 SECURITY & PRIVACY                                   ││
│  │                                                         ││
│  │ • Your key is encrypted and stored ONLY in your browser ││
│  │ • We NEVER send your key to our servers                 ││
│  │ • AI requests go directly from your browser to Anthropic││
│  │ • You can remove your key at any time in Settings       ││
│  │ • Your key persists until you clear browser data        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Enter your Anthropic API key:                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ sk-ant-api03-••••••••••••••••••••••••••••••    [👁️]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [🔍 Validating key...]  or  [✓ Key is valid]              │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  HOW TO GET AN API KEY:                                     │
│                                                             │
│  1. Go to console.anthropic.com                            │
│  2. Sign up or log in                                       │
│  3. Navigate to API Keys section                            │
│  4. Create a new key and copy it here                       │
│                                                             │
│  [Get API Key →]                    [Save & Continue]       │
│                                                             │
│  □ Don't ask me again (use without AI features)             │
└─────────────────────────────────────────────────────────────┘
```

**Modal Behavior:**
- Modal ONLY appears when user clicks an AI feature AND no valid key exists
- Once a key is saved and validated, the modal will NOT appear again
- Key persists in localStorage across sessions until user removes it
- "Don't ask me again" sets a flag to skip AI features entirely

### Settings Panel

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ AI Settings                                             │
│  ─────────────────────────────────────────────────          │
│                                                             │
│  Anthropic API Key                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ••••••••••••••••••••••••••••••••••••••••••sk-A3xK     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Status: ✓ Valid key                                        │
│  Added: December 15, 2024                                   │
│                                                             │
│  [Update Key]  [Remove Key]                                 │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  SECURITY NOTE                                              │
│  Your API key is encrypted and stored only in your          │
│  browser. We never have access to your key.                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Key Storage Flow

```
User enters key → Validate with Anthropic API
                          ↓
                    Valid? ────No───→ Show error
                          │
                         Yes
                          ↓
            Generate encryption key (from user fingerprint)
                          ↓
            Encrypt API key with AES-GCM
                          ↓
            Store encrypted data in localStorage
                          ↓
            Clear plaintext key from memory
```

### API Call Flow

```
User triggers AI feature
         ↓
Check for stored key → No key → Show ApiKeyModal
         │
        Key exists
         ↓
Decrypt key in memory
         ↓
Make direct API call to Anthropic
(Key in Authorization header)
         ↓
Clear decrypted key from memory
         ↓
Return response to UI
```

### Encryption Details

```typescript
// Use Web Crypto API for secure encryption
async function encryptKey(apiKey: string): Promise<EncryptedKeyData> {
  // Generate a browser-specific encryption key
  const browserKey = await deriveEncryptionKey();

  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt using AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    browserKey,
    new TextEncoder().encode(apiKey)
  );

  return {
    encryptedKey: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    storedAt: new Date().toISOString(),
    keyFingerprint: apiKey.slice(-4),
    version: 1,
  };
}
```

---

## Hook Behavior & State Management

### `useApiKey` Hook

The `useApiKey` hook is the central gatekeeper for all AI features. It ensures users are only prompted once and the key persists correctly.

```typescript
interface UseApiKeyReturn {
  // TRUE if a valid key exists in localStorage (persists across sessions)
  hasKey: boolean;

  // TRUE if user checked "Don't ask me again" (also persists)
  hasOptedOut: boolean;

  // Last 4 characters of stored key for display
  keyFingerprint: string | null;

  // Opens the ApiKeyModal (only if !hasKey && !hasOptedOut)
  promptForKey: () => void;

  // Validates and stores a new key
  saveKey: (key: string) => Promise<boolean>;

  // Removes stored key
  removeKey: () => void;

  // Sets opt-out preference
  setOptOut: (optOut: boolean) => void;
}
```

### Prompt Logic (Guaranteed Once)

```typescript
function useApiKey(): UseApiKeyReturn {
  // Check localStorage on mount - this is synchronous
  const [hasKey, setHasKey] = useState(() => {
    return localStorage.getItem('ai_timeline_api_key') !== null;
  });

  const [hasOptedOut, setHasOptedOut] = useState(() => {
    return localStorage.getItem('ai_timeline_api_opt_out') === 'true';
  });

  // promptForKey only shows modal if BOTH conditions are false
  const promptForKey = useCallback(() => {
    if (hasKey || hasOptedOut) {
      return; // Already have key or user opted out - DO NOT show modal
    }
    setShowModal(true);
  }, [hasKey, hasOptedOut]);

  // After successful save, hasKey becomes true
  // Modal will NEVER show again for this browser
  const saveKey = async (key: string) => {
    const isValid = await validateKey(key);
    if (isValid) {
      await encryptAndStore(key);
      setHasKey(true); // Triggers re-render, hasKey is now true
      return true;
    }
    return false;
  };
}
```

### Storage Keys

| localStorage Key | Purpose | Persistence |
|-----------------|---------|-------------|
| `ai_timeline_api_key` | Encrypted API key data | Until user removes or clears browser data |
| `ai_timeline_api_opt_out` | "Don't ask again" flag | Until user changes preference |
| `ai_timeline_api_validated` | Last validation timestamp | For periodic re-validation |

---

## Integration Points

### With AI Companion (Sprint 9)

```typescript
// In ChatPanel.tsx
const { hasKey, promptForKey } = useApiKey();

const handleSendMessage = async (message: string) => {
  if (!hasKey) {
    promptForKey();
    return;
  }

  // Proceed with message sending
  await chatApi.sendMessage({ message });
};
```

### With Current Events AI (Sprint 15)

```typescript
// In NewsContextModal.tsx
const { hasKey, promptForKey } = useApiKey();

const handleAskAiWhyThisNews = async () => {
  if (!hasKey) {
    promptForKey();
    return;
  }

  // Proceed with AI explanation
  await getAiExplanation();
};
```

### Visual Indicators

```typescript
// Show lock icon on AI buttons when key not configured
<button disabled={!hasKey}>
  {hasKey ? <Sparkles /> : <Lock />}
  Ask AI
</button>
```

---

## Error Handling

### Key Validation Errors

| Error | User Message | Action |
|-------|-------------|--------|
| Invalid key format | "This doesn't look like a valid Anthropic API key" | Show format hint |
| Authentication failed | "This key is invalid or has been revoked" | Prompt to check key |
| Rate limited | "Please wait before trying again" | Show retry timer |
| Network error | "Unable to verify key. Check your connection" | Retry button |
| Key expired | "This key has expired" | Prompt for new key |

### Runtime Errors

| Error | User Message | Action |
|-------|-------------|--------|
| Key not found | "Please configure your API key" | Open ApiKeyModal |
| Decryption failed | "Unable to access stored key" | Prompt to re-enter |
| API error | "AI service temporarily unavailable" | Show retry option |
| CORS error | "Browser security blocked this request" | Show troubleshooting |

---

## Testing Requirements

### Unit Tests
- [ ] Key encryption/decryption roundtrip
- [ ] Key validation logic
- [ ] Error handling for invalid keys
- [ ] Memory cleanup after key use
- [ ] Storage service CRUD operations

### Integration Tests
- [ ] Full flow: enter key → validate → store → use
- [ ] Key removal and re-entry
- [ ] Error recovery scenarios
- [ ] Multiple tabs handling

### Security Tests
- [ ] XSS protection verification
- [ ] Key not exposed in console logs
- [ ] Key not sent to non-Anthropic endpoints
- [ ] Proper memory cleanup
- [ ] CSP header validation

---

## Success Criteria

- [ ] Users can enter API key via modal
- [ ] Keys are encrypted in localStorage
- [ ] Keys never sent to application server
- [ ] AI features work with user's key
- [ ] Clear error messages for invalid keys
- [ ] Key can be updated or removed
- [ ] Visual indication when key required
- [ ] Mobile-friendly key entry
- [ ] Secure against common web attacks

---

## Deployment & Production Verification

### Pre-Deployment Checklist
- [ ] All unit tests passing
- [ ] Security audit completed
- [ ] CSP headers configured
- [ ] No keys in logs or error reports
- [ ] TypeScript strict mode passing
- [ ] Build succeeds

### Production Verification
- [ ] Enter and validate API key
- [ ] Use AI companion with stored key
- [ ] Use "Ask AI" in news context modal
- [ ] Update existing key
- [ ] Remove key and verify AI features prompt
- [ ] Test on mobile devices
- [ ] Verify key not in network requests to app server

### Rollback Plan
If issues found:
1. Disable AI features via feature flag
2. Clear problematic localStorage entries
3. Revert to server-side API key (if available)

---

## Privacy Considerations

1. **Key Isolation**: API keys are stored encrypted in browser localStorage, never sent to application servers

2. **Direct API Calls**: All AI requests go directly from user's browser to Anthropic's API (api.anthropic.com)

3. **No Analytics**: API key usage is not tracked or logged by our application

4. **User Control**: Users can view, update, or delete their key at any time

5. **Transparency**: Clear UI indicates when keys are being used and stored

---

## Future Enhancements

- [ ] Support for multiple AI providers (OpenAI, etc.)
- [ ] Usage tracking and cost estimation
- [ ] Key sharing between devices (opt-in, encrypted sync)
- [ ] Organization-wide key management
- [ ] Automatic key rotation reminders
