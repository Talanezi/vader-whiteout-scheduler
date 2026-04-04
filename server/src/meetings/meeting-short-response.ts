import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import MeetingResponse from '../meetings/meeting-response';

export default class MeetingShortResponse extends OmitType(MeetingResponse, [
  'selfRespondentID',
  'respondents',
] as const) {
  @ApiPropertyOptional({ example: 'Thamer Alanezi | Executive Producer' })
  createdBy?: string;
}

export class MeetingsShortResponse {
  @ApiProperty({ type: () => MeetingShortResponse, isArray: true })
  meetings: MeetingShortResponse[];
}
