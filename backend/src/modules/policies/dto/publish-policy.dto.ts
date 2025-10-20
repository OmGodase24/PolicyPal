import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PublishPolicyDto {
  @ApiProperty({
    description: 'Confirmation to publish the policy',
    example: true,
  })
  @IsBoolean()
  confirmPublish: boolean;
}
