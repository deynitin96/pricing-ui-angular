import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PricingService } from '../services/pricing.services';
import { Pricing } from './pricing';

describe('Pricing', () => {
  let component: Pricing;
  let fixture: ComponentFixture<Pricing>;

  beforeEach(async () => {
    const pricingService = {
      getAllTrucks: () => of({
        message: 'Trucks retrieved successfully',
        statusCode: 200,
        data: [
          { id: 1, truckNumber: 'TRK-1001', truckType: 'HEAVY_DUTY', status: 'RENTED', location: 'HYDERABAD', mileage: 45000, model: 'Freightliner', manufacturingYear: 2024 },
          { id: 2, truckNumber: 'TRK-1002', truckType: 'MEDIUM_DUTY', status: 'RENTED', location: 'PUNE', mileage: 32000, model: 'Isuzu', manufacturingYear: 2023 },
          { id: 3, truckNumber: 'TRK-1003', truckType: 'LIGHT_DUTY', status: 'AVAILABLE', location: 'HYDERABAD', mileage: 21000, model: 'Ford', manufacturingYear: 2025 },
          { id: 4, truckNumber: 'TRK-1004', truckType: 'HEAVY_DUTY', status: 'MAINTENANCE', location: 'BANGALORE', mileage: 78000, model: 'Volvo', manufacturingYear: 2022 },
          { id: 5, truckNumber: 'TRK-1009', truckType: 'MEDIUM_DUTY', status: 'AVAILABLE', location: 'CHENNAI', mileage: 29500, model: 'Kenworth', manufacturingYear: 2025 }
        ]
      }),
      calculateQuote: () => of({ message: 'success', statusCode: 200, data: { quoteId: 1, basePrice: 100, mileageCharge: 10, discount: 5, tax: 8, totalPrice: 113, currency: 'USD' } })
    };

    await TestBed.configureTestingModule({
      imports: [Pricing],
      providers: [
        provideHttpClient(),
        { provide: PricingService, useValue: pricingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Pricing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a location dropdown with available locations', () => {
    const locationSelect = fixture.nativeElement.querySelector('select[name="location"]') as HTMLSelectElement;
    const optionTexts = Array.from(locationSelect.options).map(option => option.textContent?.trim());

    expect(locationSelect).toBeTruthy();
    expect(optionTexts).toContain('Select Location');
    expect(optionTexts).toContain('HYDERABAD');
    expect(optionTexts).toContain('PUNE');
    expect(optionTexts).toContain('BANGALORE');
    expect(optionTexts).toContain('CHENNAI');
  });
});
