## Backend Setup

This backend provides secure email OTP authentication with Resend, JWT-based auth, MongoDB users, and Redis-backed OTP storage.

### Environment Variables

Set the following environment variables before running:

- `MONGODB_URI` (required): MongoDB connection string.
- `MONGODB_DB_NAME` (optional, default: `hackathon_portal`).
- `JWT_SECRET` (required): at least 32 characters.
- `JWT_ISSUER` (optional, default: `gcm-hackathon-portal`).
- `JWT_AUDIENCE` (optional, default: `gcm-hackathon-users`).
- `JWT_EXP_MINUTES` (optional, default: `60`).
- `OTP_PEPPER` (required): at least 16 characters, used in OTP hashing.
- `OTP_TTL_MINUTES` (optional, default: `10`).
- `OTP_MAX_ATTEMPTS` (optional, default: `5`).
- `OTP_REQUEST_LIMIT` (optional, default: `5`).
- `OTP_REQUEST_WINDOW_MINUTES` (optional, default: `15`).
- `RESEND_API_KEY` (required): Resend API key.
- `RESEND_FROM_EMAIL` (required): verified sender address in Resend.
- `REDIS_URL` (optional, default: `redis://localhost:6379/0`): Redis connection URL used for OTP storage and request rate limiting.

MongoDB pool tuning (optional):

- `MONGODB_MAX_POOL_SIZE` (default: `30`)
- `MONGODB_MIN_POOL_SIZE` (default: `5`)
- `MONGODB_MAX_IDLE_MS` (default: `300000`)
- `MONGODB_CONNECT_TIMEOUT_MS` (default: `5000`)
- `MONGODB_SOCKET_TIMEOUT_MS` (default: `30000`)
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default: `5000`)

### Auth Endpoints

- `POST /auth/request-otp`
	- Body: `{ "email": "user@example.com" }`
	- Sends OTP via Resend and applies per-email+IP rate limiting.
- `POST /auth/verify-otp`
	- Body: `{ "email": "user@example.com", "otp": "123456" }`
	- Verifies OTP, upserts user, returns JWT access token.
- `GET /auth/me`
	- Requires `Authorization: Bearer <token>`
	- Returns current user profile.

### Security Controls Included

- OTP is never stored in plain text (PBKDF2-HMAC with per-record salt + server pepper).
- Constant-time OTP comparison using `hmac.compare_digest`.
- OTP expiry enforced with Redis TTL.
- OTP attempt cap and automatic challenge invalidation.
- OTP request rate limiting by email and client IP.
- JWT claim hardening (`exp`, `iat`, `nbf`, `aud`, `iss`, `jti`, `sub`).
- Strict minimum secret lengths for `JWT_SECRET` and `OTP_PEPPER`.
