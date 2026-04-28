import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: "permission denied" })
  message!: string;

  @ApiProperty({ example: "/api/commodity/create" })
  path!: string;

  @ApiProperty({ example: "trace-123456" })
  traceId!: string;

  @ApiProperty({ example: 403 })
  statusCode!: number;

  @ApiProperty({ example: "2026-04-28T10:00:00.000Z" })
  timestamp!: string;
}
