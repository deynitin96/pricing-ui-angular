import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PricingService } from './pricing.services';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PricingService, provideHttpClient()]
    });
    service = TestBed.inject(PricingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
