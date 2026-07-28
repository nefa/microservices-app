// Kept as a plain class for now, no validation decorators yet - same
// deliberate deferral as ChatMessageDto in the chat module. Proper
// request validation (class-validator) is a distinct future step.
export class LoginDto {
  email: string;
  password: string;
}
