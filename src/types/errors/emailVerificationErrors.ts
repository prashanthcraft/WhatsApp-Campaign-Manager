export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'invalid_token_error';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'token_expired_error';
  }
}
