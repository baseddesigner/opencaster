class AppError extends Error {
  constructor(message, { status = 500, code = 'APP_ERROR', cause } = {}) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
    this.cause = cause
  }
}

class ProviderError extends AppError {
  constructor(message = 'Farcaster data is slow right now. Try again in a minute.', options = {}) {
    super(message, { status: options.status || 502, code: 'PROVIDER_ERROR', cause: options.cause })
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Couldn’t find that cast/profile.') {
    super(message, { status: 404, code: 'NOT_FOUND' })
  }
}

class BadRequestError extends AppError {
  constructor(message = 'That request was not valid.') {
    super(message, { status: 400, code: 'BAD_REQUEST' })
  }
}

module.exports = { AppError, ProviderError, NotFoundError, BadRequestError }
