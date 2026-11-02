import { vi } from "vitest";

export function createResponse() {
  const response = {
    headersSent: false,
  };

  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);

  return response;
}