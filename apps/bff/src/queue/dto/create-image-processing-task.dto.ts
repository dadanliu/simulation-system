import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateImageProcessingTaskDto {
  @ApiProperty({ description: "File ID returned by upload", example: "upload_10001" })
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @ApiPropertyOptional({ description: "Original MIME type", example: "image/png" })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: "Upload scene", example: "commodity" })
  @IsOptional()
  @IsString()
  scene?: string;

  @ApiPropertyOptional({ description: "Original file size in bytes", example: 102400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;
}

