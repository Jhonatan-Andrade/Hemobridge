import { Equals } from 'class-validator';
import { TOUR_VERSION } from '../onboarding.service.js';

export class ConcluirTourDto {
  @Equals(TOUR_VERSION)
  versao!: number;
}
