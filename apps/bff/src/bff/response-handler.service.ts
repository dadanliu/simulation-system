import { Injectable } from "@nestjs/common";
import { BackendRequestException, BffBusinessException, BffSystemException, type BackendEnvelope } from "./errors";

@Injectable()
export class ResponseHandlerService {
  unwrap<T>(payload: BackendEnvelope<T>): T {
    if (this.isSuccessEnvelope(payload)) {
      return payload.data;
    }

    if (this.isErrnoSuccessEnvelope(payload)) {
      return payload.data;
    }

    if (this.isBusinessErrorEnvelope(payload)) {
      throw new BffBusinessException(payload.message ?? payload.error ?? "Backend business error", payload.code);
    }

    if (this.isErrnoBusinessErrorEnvelope(payload)) {
      throw new BffBusinessException(payload.errmsg ?? "Backend business error", payload.errno);
    }

    throw new BffSystemException("Unexpected backend response");
  }

  async handleFetchResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new BackendRequestException(`Backend request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as BackendEnvelope<T>;
    return this.unwrap(payload);
  }

  private isSuccessEnvelope<T>(payload: BackendEnvelope<T>): payload is Extract<BackendEnvelope<T>, { success: true }> {
    return "success" in payload && payload.success === true;
  }

  private isBusinessErrorEnvelope<T>(
    payload: BackendEnvelope<T>
  ): payload is Extract<BackendEnvelope<T>, { success: false }> {
    return "success" in payload && payload.success === false;
  }

  private isErrnoSuccessEnvelope<T>(payload: BackendEnvelope<T>): payload is Extract<BackendEnvelope<T>, { errno: 0 }> {
    return "errno" in payload && payload.errno === 0;
  }

  private isErrnoBusinessErrorEnvelope<T>(
    payload: BackendEnvelope<T>
  ): payload is Extract<BackendEnvelope<T>, { errno: number }> {
    return "errno" in payload && payload.errno !== 0;
  }
}
