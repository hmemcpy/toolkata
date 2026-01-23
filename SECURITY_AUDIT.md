# toolkata Sandbox Security & Integration Audit

**Date**: 2026-01-23
**Auditor**: AI Security Review
**Scope**: Complete sandbox system - infrastructure, container isolation, API security, and frontend integration

---

## Executive Summary

The toolkata sandbox system demonstrates **strong security fundamentals** with multiple defense-in-depth layers including gVisor kernel isolation, network-less containers, rate limiting, and proper capability dropping. However, several **medium and high severity issues** were identified that should be addressed before production use.

**Key Findings**:
- 1 Critical severity issue
- 2 High severity issues
- 9 Medium severity issues
- 8 Low severity issues

**Overall Posture**: Production-viable with immediate remediation of Critical/High issues.

---

## Findings Table

| ID | Severity | Category | Title | File:Line | Description | Recommendation |
|----|----------|----------|-------|-----------|-------------|----------------|
| V-001 | **Critical** | Container Isolation | User in sudo group without password | docker/Dockerfile:28-29 | Container user `sandbox` is added to sudo group. While sudo requires password by default, this is unnecessary privilege escalation surface. | Remove `usermod -aG sudo sandbox` - user doesn't need sudo access for git/jj operations |
| V-002 | **High** | API Security | No authentication/authorization on API | src/index.ts:80-88, routes/sessions.ts | Anyone who can reach the API can create containers and execute commands. No API keys, tokens, or origin validation beyond CORS. | Implement API key authentication for production. Use shared secret or JWT between frontend and backend. |
| V-003 | **High** | Infrastructure | Root SSH access without rate limiting | scripts/hetzner/provision.sh:134 | SSH on port 22 allows root login with SSH key. No fail2ban or rate limiting. | Install fail2ban, consider non-standard SSH port, require bastion host for production |
| V-004 | **Medium** | Container Isolation | No gVisor runtime enforcement | src/services/container.ts:174-176 | gVisor is installed but runtime is conditionally added. If `SANDBOX_USE_GVISOR=false` is set, containers run with runc (less isolation). | Force gVisor in production by removing environment variable toggle or validating in production mode |
| V-005 | **Medium** | Rate Limiting | IP-based rate limiting bypassable | src/services/rate-limit.ts:54-74 | Rate limits tracked per IP. Attackers can use proxies/VPNs to bypass. No device fingerprinting or account-based limits. | Add CAPTCHA for high-volume requests. Implement account-based limits for authenticated users. |
| V-006 | **Medium** | Command Injection | No input sanitization on WebSocket | src/routes/websocket.ts:109-141 | WebSocket input is written directly to container exec stream without validation. | Implement allowlist for terminal input. Reject control characters and shell metacharacters. |
| V-007 | **Medium** | DoS | No connection limits per IP | src/index.ts:142-198 | No limit on concurrent WebSocket connections per IP. Each connection spawns a container. | Add max concurrent connections per IP (enforce in rate-limit service) |
| V-008 | **Medium** | Session Management | Session IDs guessable | src/services/session.ts:69-73 | Session IDs use `timestamp` + `random(6 chars)` - only ~36^6 = ~2B combinations, not cryptographically secure. | Use crypto.randomBytes(16) encoded as hex for session IDs (128-bit entropy) |
| V-009 | **Medium** | Error Handling | Errors leak internal information | routes/sessions.ts:77-133 | Error messages include container IDs, internal state details. | Sanitize error messages before returning to clients. Use generic messages for unexpected errors. |
| V-010 | **Medium** | Container Cleanup | No timeout on container destroy | src/services/container.ts:213-244 | Container destroy has no timeout - could hang indefinitely. | Add timeout to container.kill() and container.remove() operations |
| V-011 | **Medium** | WebSocket Security | No message size limits | src/routes/websocket.ts:109 | WebSocket messages have no size limit - could cause memory exhaustion. | Add max message size limit (e.g., 1KB for terminal input) |
| V-012 | **Medium** | Frontend Integration | WebSocket URL constructed from env | services/sandbox-client.ts:164-174 | WebSocket URL uses `process.env.NEXT_PUBLIC_SANDBOX_API_URL` without validation. | Validate URL format and protocol (ws/wss) before constructing WebSocket |
| V-013 | **Low** | Infrastructure | No automated security updates | scripts/hetzner/provision.sh | Ubuntu packages installed but no unattended-upgrades configured. | Enable unattended-upgrades for automatic security patches |
| V-014 | **Low** | Infrastructure | No firewall configuration | scripts/hetzner/provision.sh | Hetzner server has no explicit firewall (ufw/iptables) configured. | Configure ufw to only allow necessary ports (80, 443, 22 from specific IPs) |
| V-015 | **Low** | Infrastructure | No disk space monitoring | deploy/sandbox-api.service | Container images and logs could fill disk - no monitoring or log rotation. | Add logrotate, configure Docker log size limits, set up disk space alerts |
| V-016 | **Low** | Container Isolation | tmpfs size not enforced | src/services/container.ts:47-49 | tmpfs size is configured but Docker may not enforce strictly on all platforms. | Verify tmpfs limits work as expected. Add disk quota enforcement if needed. |
| V-017 | **Low** | API Security | CORS allows arbitrary origin | src/index.ts:80-88 | CORS origin from config but no validation against whitelist. | Validate origin against explicit whitelist in production |
| V-018 | **Low** | API Security | No API versioning | src/index.ts, routes/ | No version prefix on routes - breaking changes will affect all clients. | Add `/api/v1` prefix to all routes before public release |
| V-019 | **Low** | Operational Security | No audit logging | - | No logging of who created sessions, what commands were run. | Add structured logging (session ID, IP, timestamp, action) for security audits |
| V-020 | **Low** | WebSocket Security | No Origin header validation | src/routes/websocket.ts:39-58 | WebSocket upgrade doesn't validate Origin header - CSRF risk. | Validate Origin header matches expected frontend origin |

---

## Detailed Analysis

### 1. Infrastructure & Provisioning

#### SSH Key Management
- **File**: `scripts/hetzner/provision.sh`
- **Status**: ✅ GOOD
- SSH keys are required for server access (password auth disabled)
- Key stored in `~/.ssh/id_ed25519.pub` or `~/.ssh/id_rsa.pub`

#### Firewall Configuration
- **File**: `scripts/hetzner/provision.sh`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-014)
- No explicit firewall rules configured
- Hetzner's default firewall allows all inbound traffic
- **Recommendation**: Configure ufw to restrict to ports 80, 443, and 22 from specific IPs

#### systemd Service Hardening
- **File**: `packages/sandbox-api/deploy/sandbox-api.service`
- **Status**: ✅ GOOD
- `NoNewPrivileges=true` - prevents privilege escalation
- `ProtectSystem=strict` - read-only system directories
- `ProtectHome=true` - home directory isolation
- `PrivateTmp=true` - isolated `/tmp`
- `ReadOnlyPaths=/` with specific `ReadWritePaths` - good least-privilege
- `MemoryMax=512M`, `CPUQuota=1.0` - resource limits
- **Note**: Service references `User=sandboxapi` but provision script doesn't create this user
  - Deploy script (deploy.sh) installs with root user
  - **Recommendation**: Create dedicated user in provision.sh

#### Caddy TLS Configuration
- **File**: `packages/sandbox-api/deploy/Caddyfile`
- **Status**: ✅ EXCELLENT
- Automatic Let's Encrypt certificate management
- HSTS header with preload
- Strong security headers (X-Content-Type-Options, X-Frame-Options, CSP-like headers)
- HTTP to HTTPS redirect

#### Secret Management
- **File**: `scripts/hetzner/provision.sh`, `deploy.sh`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-003)
- No secrets needed for current architecture (good!)
- Server IP stored in `sandbox.env` (committed to git)
- **Recommendation**: Use environment variables or secret management for sensitive config

#### Server Update Strategy
- **File**: `scripts/hetzner/provision.sh`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-013)
- Initial `apt-get update` but no ongoing security update mechanism
- **Recommendation**: Enable unattended-upgrades

---

### 2. Container Isolation & Security

#### Container Escape Vectors
- **File**: `packages/sandbox-api/src/services/container.ts`
- **Status**: ✅ GOOD with caveats

**Strengths**:
- `NetworkMode: "none"` - no network access
- `ReadonlyRootfs: true` - read-only root filesystem
- `CapDrop: ["ALL"]` - all capabilities dropped
- `SecurityOpt: ["no-new-privileges"]` - prevents privilege escalation
- `Memory: 128MB`, `PidsLimit: 50` - resource limits
- gVisor runtime available (but see V-004)

**Issues**:
- V-001: User in sudo group (unnecessary privilege surface)
- V-004: gVisor not enforced by default
- V-016: tmpfs size enforcement should be verified

#### gVisor Integration
- **Files**: `container.ts`, `config.ts`, `provision.sh`
- **Status**: ⚠️ PARTIAL

**What Works**:
- gVisor (runsc) installed on production server
- Docker daemon configured with runsc runtime
- `checkGvisorAvailable()` function validates runtime availability
- `SandboxConfig` allows runtime selection via environment

**What's Missing** (V-004):
- gVisor is opt-in via `SANDBOX_USE_GVISOR` (defaults to `true` but can be disabled)
- No production mode that forces gVisor

**Recommendation**:
```typescript
// Add production mode enforcement
const isProduction = process.env.NODE_ENV === "production"
if (isProduction && !SandboxConfig.useGvisor) {
  throw new Error("gVisor must be enabled in production")
}
```

#### Network Isolation
- **Status**: ✅ EXCELLENT
- `NetworkMode: "none"` completely blocks network access
- Containers cannot make external requests or receive inbound connections
- No attack surface for SSRF or external data exfiltration

#### Filesystem Isolation
- **Status**: ✅ GOOD
- `ReadonlyRootfs: true` - root filesystem is read-only
- tmpfs for writable paths (`/home/sandbox/workspace`, `/tmp`)
- **Recommendation**: Verify that no other writable paths exist

#### Resource Limits
- **Status**: ✅ GOOD
- Memory: 128MB per container
- CPU: 0.5 cores
- PIDs: 50 (prevents fork bombs)
- **Recommendation**: Consider adding disk quota enforcement

#### Capability Dropping
- **Status**: ✅ EXCELLENT
- `CapDrop: ["ALL"]` - all Linux capabilities removed
- No `CapAdd` - containers run with zero capabilities
- This is stronger than most container security setups

#### User Namespaces
- **Status**: ⚠️ NOT IMPLEMENTED
- Container runs as `sandbox` user (UID 1000)
- Not using user namespace remapping
- **Note**: User namespaces would require Docker daemon configuration changes
- **Risk**: If container escape achieved, attacker has UID 1000 on host (non-root but still access)

#### Seccomp Profile
- **Status**: ⚠️ DEFAULT ONLY
- Using Docker's default seccomp profile
- gVisor provides syscall filtering as replacement
- **Recommendation**: For production with runc, consider custom seccomp profile

#### Image Supply Chain
- **File**: `docker/Dockerfile`
- **Status**: ✅ GOOD
- Base image: `debian:bookworm-slim` (official, pinned)
- jj installed from GitHub releases (pinned to 0.25.0)
- No floating tags
- **Recommendation**: Add image scanning to CI/CD (trivy, grype)

#### Sensitive File Access
- **File**: `docker/Dockerfile`, `entrypoint.sh`
- **Status**: ⚠️ NEEDS TESTING
- Container has access to `/proc`, `/sys` (needed for many operations)
- With gVisor: these are virtualized/filtered
- With runc: host filesystem might be accessible via escape
- **Recommendation**: Test container escape vectors with both runtimes

---

### 3. API Security

#### Authentication/Authorization
- **File**: `src/index.ts`, `routes/sessions.ts`
- **Status**: ❌ **CRITICAL GAP** (V-002)

**Current State**:
- No authentication required
- No API keys
- No authorization checks
- CORS is only access control

**Risk**: Anyone who can reach the API endpoint can:
- Create unlimited containers (subject to rate limiting)
- Execute arbitrary commands in containers
- Exhaust server resources

**Recommendation**: Implement at least one of:
1. **Shared Secret**: Frontend sends `X-API-Key` header
2. **JWT**: Short-lived tokens signed with shared secret
3. **Mutual TLS**: Client certificate validation

Example implementation:
```typescript
// Add to routes/sessions.ts
const API_KEY = process.env.SANDBOX_API_KEY
const validateAuth = (request: Request) => {
  const key = request.headers.get("X-API-Key")
  if (!key || key !== API_KEY) {
    throw new HttpRouteError({
      cause: "Unauthorized",
      message: "Invalid or missing API key",
      statusCode: 401,
    })
  }
}

// In POST /sessions:
validateAuth(c.req.raw)
```

#### Rate Limiting
- **File**: `src/services/rate-limit.ts`
- **Status**: ✅ GOOD with limitations (V-005)

**Strengths**:
- 10 sessions/hour per IP
- 2 concurrent sessions per IP
- 60 commands/minute per IP (ready for future use)
- Time-based windows with automatic cleanup

**Limitations** (V-005):
- IP-based only (bypassable via proxies/VPNs)
- No device fingerprinting
- No account-based limits

**Recommendation**:
- Add CAPTCHA for suspicious patterns
- Implement account-based limits when user accounts are added

#### Session Management
- **File**: `src/services/session.ts`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-008)

**Strengths**:
- 5-minute idle timeout
- 30-minute max lifetime
- Automatic cleanup every 30 seconds
- Activity tracking

**Issues**:
- V-008: Session ID generation uses weak randomness
  ```typescript
  const timestamp = Date.now().toString(36)  // predictable
  const random = Math.random().toString(36).substring(2, 8)  // only 6 chars
  ```
  - ~36^6 ≈ 2 billion combinations (not enough)
  - Timestamp is predictable
  - Math.random() is not cryptographically secure

**Recommendation**:
```typescript
import { randomBytes } from "crypto"

const generateSessionId = (): string => {
  const bytes = randomBytes(16) // 128-bit entropy
  return `sess_${bytes.toString("hex")}`
}
```

#### Input Validation
- **File**: `routes/sessions.ts`
- **Status**: ✅ GOOD
- toolPair validated against whitelist (jj-git only)
- Session ID validated for format
- Request body type checking

#### WebSocket Security
- **File**: `routes/websocket.ts`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-020, V-011, V-006)

**Issues**:
- V-020: No Origin header validation
  ```typescript
  // In createWebSocketServer upgrade handler:
  const origin = request.headers.origin
  if (origin !== process.env.FRONTEND_ORIGIN) {
    socket.destroy()
    return
  }
  ```

- V-011: No message size limits
  ```typescript
  ws.on("message", async (data: Buffer) => {
    if (data.length > 1024) { // 1KB limit
      ws.close(1009, "Message too large")
      return
    }
    // ... process message
  })
  ```

- V-006: No input sanitization
  - Terminal input written directly to container
  - Could send escape sequences, control characters
  - **Recommendation**: Filter or escape control characters

#### Error Handling
- **File**: `routes/sessions.ts`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-009)
- Error messages include internal details (container IDs, state)
- **Recommendation**: Create sanitized error types for external responses

#### CORS Configuration
- **File**: `src/index.ts`
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-017)
- Origin from config, but no explicit whitelist
- **Recommendation**: Validate against explicit whitelist in production

#### DoS Vectors
- **File**: Multiple
- **Status**: ⚠️ PARTIALLY MITIGATED (V-007)

**Mitigations**:
- Rate limiting per IP
- Resource limits per container
- Session limits

**Gaps** (V-007):
- No limit on concurrent WebSocket connections per IP
- No protection against slow POST attacks
- No connection rate limiting (session creation rate only)

**Recommendation**:
```typescript
// Add to rate-limit service
maxConcurrentConnections: 3 // per IP
```

---

### 4. Command Injection & Input Sanitization

#### Shell Injection
- **File**: `src/services/container.ts`, `routes/websocket.ts`
- **Status**: ✅ GOOD

**Analysis**:
- Container commands run via Docker exec API (not shell)
- WebSocket input goes directly to PTY - not parsed by shell
- No user-controlled strings passed to shell commands

#### Path Traversal
- **Status**: ✅ NOT APPLICABLE
- No file operations on user-controlled paths
- Container workspace is fixed (`/home/sandbox/workspace`)

#### Environment Variable Injection
- **File**: `src/services/container.ts:182`
- **Status**: ✅ SAFE
- Only `TOOL_PAIR` env var set
- Value validated against whitelist

#### Terminal Escape Sequences
- **File**: `routes/websocket.ts`
- **Status**: ⚠️ PARTIALLY ADDRESSED (V-006)
- Terminal output sent directly to WebSocket client
- Malicious terminal output could contain escape sequences
- xterm.js handles most escapes safely
- **Recommendation**: Add escape sequence filtering for non-terminal output

#### Command Allowlisting
- **File**: `src/services/container.ts:79-82`
- **Status**: ✅ GOOD
- `isValidToolPair` validates against whitelist
- Only `jj-git` supported for MVP

#### Binary Execution
- **File**: `docker/Dockerfile`
- **Status**: ⚠️ NEEDS CONSIDERATION
- Container has git, jj, bash
- User could potentially download and execute arbitrary binaries
- **BUT**: Network is disabled (`NetworkMode: "none"`)
- **Recommendation**: Monitor for future features that might enable network

---

### 5. Frontend Integration

#### WebSocket Connection Security
- **File**: `services/sandbox-client.ts:266-294`
- **Status**: ✅ GOOD
- Uses `wss://` in production (derived from https URL)
- Environment variable for API URL
- **Issue** (V-012): No URL validation before use

#### Credential Exposure
- **Status**: ✅ GOOD
- No secrets in browser code
- API URL is public (no credentials needed)
- Session IDs transmitted but are temporary tokens

#### XSS Vectors
- **File**: `components/ui/InteractiveTerminal.tsx`
- **Status**: ⚠️ POTENTIAL RISK

**Analysis**:
- Terminal output inserted via `terminal.write(data)` (xterm.js API)
- xterm.js handles content as text, not HTML (safe from XSS)
- **BUT**: If terminal output contains malicious escape sequences, could affect terminal

#### State Manipulation
- **File**: `contexts/TerminalContext.tsx`
- **Status**: ⚠️ MINOR RISK
- Terminal state managed in React context
- Could be manipulated via browser DevTools
- **Impact**: Low - only affects local UI, not server sessions

#### Error Handling
- **File**: `components/ui/InteractiveTerminal.tsx`
- **Status**: ✅ GOOD
- User-friendly error messages
- No internal details exposed
- Fallback to static mode when sandbox unavailable

---

### 6. Operational Security

#### Monitoring & Alerting
- **Status**: ❌ NOT IMPLEMENTED (V-019)
- No structured logging
- No alerting on suspicious activity
- No metrics collection

**Recommendation**:
- Add structured logging (pino, winston)
- Log: session creation, commands run, errors, rate limit hits
- Set up alerts for: high failure rates, unusual patterns, resource exhaustion

#### Incident Response
- **Status**: ⚠️ BASIC
- Container cleanup on timeout
- No documented incident response procedure
- No automated containment for detected attacks

#### Container Cleanup
- **Status**: ✅ GOOD
- Automatic cleanup every 30 seconds
- Cleanup on session destroy
- WebSocket connection triggers cleanup

#### Log Retention
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-015)
- Caddy logs configured (100MB roll, keep 5)
- No application log rotation
- **Recommendation**: Configure journald log rotation

#### Cost Controls
- **Status**: ✅ GOOD
- Fixed-cost server (€3.79/mo)
- Resource limits prevent runaway costs
- Session limits prevent abuse

---

### 7. Integration Gaps

#### Frontend ↔ API Contract
- **Status**: ✅ GOOD
- All error states handled
- Fallback mode implemented
- Graceful degradation

#### Timeout Handling
- **Status**: ✅ GOOD
- Session timeouts enforced (5min idle, 30min max)
- WebSocket timeout handling
- Container destroy timeout needed (V-010)

#### Fallback Mode
- **Status**: ✅ EXCELLENT
- Static mode when sandbox unavailable
- Clear user communication
- Cheat sheet link provided

#### Health Checks
- **File**: `src/index.ts:90-120`
- **Status**: ✅ GOOD
- `/health` endpoint with session stats
- gVisor status included
- **Recommendation**: Add Docker health check for container monitoring

#### Version Compatibility
- **Status**: ⚠️ NEEDS IMPROVEMENT (V-018)
- No API versioning
- Breaking changes will require coordinated deployment

**Recommendation**:
```typescript
// Add version prefix to routes
app.route("/api/v1/sessions", sessionRoutes)
```

---

## Architecture Diagram Issues

### Current Architecture

```
┌─────────────┐     HTTPS/WSS      ┌──────────────┐
│   Browser   │ ◄─────────────────► │    Caddy    │
│  (Frontend) │                     │  (Reverse   │
└─────────────┘                     │   Proxy)    │
                                     └──────┬───────┘
                                            │
                                            │ HTTP/WS
                                            ▼
                                     ┌──────────────┐
                                     │  sandbox-api │
                                     │   (Hono)     │
                                     └──────┬───────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
            ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
            │   Session   │         │ Rate Limit  │         │   Docker    │
            │   Service   │         │   Service   │         │  (gVisor)   │
            └─────────────┘         └─────────────┘         └──────┬──────┘
                                                                     │
                                                                     ▼
                                                          ┌──────────────────┐
                                                          │  Container       │
                                                          │  (Network: none, │
                                                          │   Readonly: true)│
                                                          └──────────────────┘
```

### Issues

1. **No Authentication Layer** (V-002)
   - Should add auth between Caddy and sandbox-api

2. **Single Server** (Availability)
   - No redundancy - single point of failure
   - Consider load balancer + multiple API servers for production

3. **No WAF/Protection Layer**
   - Consider adding web application firewall (WAF)
   - Could add CrowdSec or similar for additional protection

---

## Recommended Immediate Actions

### Priority 1: Critical (Do before production)

1. **V-001: Remove sudo group membership from container user**
   ```dockerfile
   # In docker/Dockerfile, change line 28-29 from:
   RUN useradd -m -s /bin/bash sandbox && \
       usermod -aG sudo sandbox
   # To:
   RUN useradd -m -s /bin/bash sandbox
   ```

2. **V-002: Implement API authentication**
   ```typescript
   // Add shared secret authentication
   const API_KEY = process.env.SANDBOX_API_KEY
   if (!API_KEY && process.env.NODE_ENV === "production") {
     throw new Error("SANDBOX_API_KEY required in production")
   }
   ```

3. **V-008: Use cryptographically secure session IDs**
   ```typescript
   import { randomBytes } from "crypto"
   const generateSessionId = (): string => {
     return `sess_${randomBytes(16).toString("hex")}`
   }
   ```

### Priority 2: High (Do within first week)

4. **V-003: Configure fail2ban for SSH**
5. **V-004: Force gVisor in production mode**
6. **V-020: Validate Origin header on WebSocket upgrade**

### Priority 3: Medium (Do within first month)

7. **V-005: Add CAPTCHA for rate limit bypass**
8. **V-006: Implement terminal input sanitization**
9. **V-007: Add per-IP connection limits**
10. **V-009-V-012**: Address remaining medium severity issues

---

## Recommended Future Improvements

### Security Enhancements

1. **Content Security Policy** - Add CSP headers to Caddy config
2. **Certificate Pinning** - Consider for mobile app if developed
3. **Audit Logging** - Comprehensive logging for security audits
4. **Secret Scanning** - Scan repo for accidentally committed secrets
5. **Penetration Testing** - Annual professional pen test
6. **Bug Bounty** - Consider managed bug bounty program

### Operational Improvements

1. **Monitoring Dashboard** - Grafana/Prometheus for metrics
2. **Automated Backups** - Backup strategy for server configuration
3. **Disaster Recovery** - Documented DR procedures
4. **Load Testing** - Verify system handles expected load
5. **Chaos Engineering** - Test failure scenarios

### Architecture Evolution

1. **Multi-region Deployment** - Reduce latency, improve availability
2. **Message Queue** - For async session management
3. **Rate Limiting Service** - Standalone service with Redis
4. **API Gateway** - Kong, Ambassador for advanced routing

---

## Conclusion

The toolkata sandbox system demonstrates **strong security fundamentals** with defense-in-depth layers including gVisor kernel isolation, network-less containers, capability dropping, and rate limiting. The container isolation is particularly well-designed.

However, **immediate action is required** on:
- Container user privilege reduction (V-001)
- API authentication implementation (V-002)
- Session ID randomness improvement (V-008)

After addressing the Critical and High severity issues, the system will be **production-ready** for educational use. The Medium and Low severity issues should be addressed incrementally to further harden the system.

**Overall Risk Assessment**: Medium-High (before remediation), Medium (after Critical/High fixes)

**Recommendation**: Address Critical/High issues before public production launch. Consider staging environment for penetration testing.
