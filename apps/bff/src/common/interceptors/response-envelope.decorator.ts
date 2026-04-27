import { SetMetadata } from "@nestjs/common";

export const SKIP_RESPONSE_ENVELOPE_KEY = "skipResponseEnvelope";
export const SUCCESS_RESPONSE_MESSAGE_KEY = "successResponseMessage";

export const SkipResponseEnvelope = () => SetMetadata(SKIP_RESPONSE_ENVELOPE_KEY, true);

export const SuccessResponseMessage = (message: string) => SetMetadata(SUCCESS_RESPONSE_MESSAGE_KEY, message);
