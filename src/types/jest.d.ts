import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toBeDisabled(): R
      toHaveBeenCalledTimes(times: number): R
      toHaveBeenCalledWith(...args: any[]): R
    }
  }
} 