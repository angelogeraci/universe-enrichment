import '@testing-library/jest-dom'

// Mock de localStorage pour les tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
} as Storage

global.localStorage = localStorageMock 