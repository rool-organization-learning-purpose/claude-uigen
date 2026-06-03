// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieStore = { set: mockCookieSet, get: mockCookieGet };
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

// Import after mocks are set up
const { createSession, getSession } = await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function mintToken(
  payload: object,
  expirationTime: string | number = "7d"
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets a cookie named auth-token", async () => {
    await createSession("user-1", "test@example.com");
    expect(mockCookieSet).toHaveBeenCalledOnce();
    expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
  });

  it("sets the cookie with httpOnly, sameSite lax, and root path", async () => {
    await createSession("user-1", "test@example.com");
    const options = mockCookieSet.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets secure=false outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    await createSession("user-1", "test@example.com");
    const options = mockCookieSet.mock.calls[0][2];
    expect(options.secure).toBe(false);
  });

  it("sets secure=true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-1", "test@example.com");
    const options = mockCookieSet.mock.calls[0][2];
    expect(options.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  it("sets cookie expiry approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const expiry: Date = mockCookieSet.mock.calls[0][2].expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("issues a valid HS256 JWT containing userId and email", async () => {
    await createSession("user-42", "hello@example.com");
    const token: string = mockCookieSet.mock.calls[0][1];

    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  it("JWT expires in ~7 days", async () => {
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-1", "test@example.com");
    const after = Math.floor(Date.now() / 1000);

    const token: string = mockCookieSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysSec = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSec - 5);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSec + 5);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const token = await mintToken({ userId: "user-1", email: "a@b.com" });
    mockCookieGet.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("a@b.com");
  });

  it("returns null for a malformed token", async () => {
    mockCookieGet.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  it("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "x", email: "x@x.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);
    mockCookieGet.mockReturnValue({ value: token });

    expect(await getSession()).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 10;
    const token = await mintToken({ userId: "user-1", email: "a@b.com" }, pastTimestamp);
    mockCookieGet.mockReturnValue({ value: token });

    expect(await getSession()).toBeNull();
  });
});
